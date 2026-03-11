/* ═══════════════════════════════════════════════════════════════════
   KOMPUTASI AWAN — Google Apps Script Backend
   Versi Fix: device_id = NIM (sinkron di presence, accel, GPS)
              user_id   = Nama mahasiswa

   PENTING: GAS tidak support CORS header di doPost/doGet.
   Solusi: response selalu lewat doGet, POST disimulasi via
   query param ?path=...&data=... dari browser.
   ═══════════════════════════════════════════════════════════════════ */

const SPREADSHEET_ID = "1L2CrgvqHC8eS8LggzJhW4EAj8d9lWs_YOMoqxXPV7-8";
const SHEET_TOKENS   = "tokens";
const SHEET_PRESENCE = "presence";
const SHEET_ACCEL    = "accel";
const SHEET_GPS      = "gps";
const TOKEN_TTL_MS   = 2 * 60 * 1000;


/* ═══════════════════════════════════════════════
   HELPER
   ═══════════════════════════════════════════════ */
function getPath(e) {
  const fromPathInfo = normalizePath(e.pathInfo);
  if (fromPathInfo) return fromPathInfo;
  return normalizePath(e.parameter && e.parameter.path);
}

function getBody(e) {
  if (e.parameter && e.parameter.data) {
    try { return JSON.parse(e.parameter.data); } catch(_) { return null; }
  }
  if (e.postData && e.postData.contents) {
    try { return JSON.parse(e.postData.contents); } catch(_) { return null; }
  }
  return {};
}

function makeOutput(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function ok(data)  { return makeOutput({ ok: true,  data: data }); }
function err(msg)  { return makeOutput({ ok: false, error: msg }); }


/* ═══════════════════════════════════════════════
   doGet
   ═══════════════════════════════════════════════ */
function doGet(e) {
  try {
    const path = getPath(e);
    const body = getBody(e);

    if (path === "presence/qr/generate") return handleGenerateQR(body);
    if (path === "presence/checkin")      return handleCheckin(body);
    if (path === "presence/status")       return handleGetStatus(e.parameter);

    if (path === "telemetry/accel")        return handleAccelPost(body);
    if (path === "telemetry/accel/latest") return handleAccelLatest(e.parameter);

    if (path === "telemetry/gps")          return handleGpsPost(body);
    if (path === "telemetry/gps/latest")   return handleGpsLatest(e.parameter);
    if (path === "telemetry/gps/history")  return handleGpsHistory(e.parameter);

    return ok({ message: "AirPresensi API ✅", modules: ["1-Presensi", "2-Accel", "3-GPS"] });

  } catch (ex) {
    return err("server_error: " + ex.message);
  }
}


/* ═══════════════════════════════════════════════
   doPost
   ═══════════════════════════════════════════════ */
function doPost(e) {
  try {
    const path = getPath(e);
    const body = getBody(e);

    if (!body) return err("invalid_json_body");

    if (path === "presence/qr/generate") return handleGenerateQR(body);
    if (path === "presence/checkin")      return handleCheckin(body);
    if (path === "telemetry/accel")       return handleAccelPost(body);
    if (path === "telemetry/gps")         return handleGpsPost(body);

    return err("endpoint_not_found: " + path);

  } catch (ex) {
    return err("server_error: " + ex.message);
  }
}


/* ═══════════════════════════════════════════════
   MODUL 1 — PRESENSI QR
   ═══════════════════════════════════════════════ */

function handleGenerateQR(body) {
  if (!body || !body.course_id)  return err("missing_field: course_id");
  if (!body.session_id)          return err("missing_field: session_id");

  const courseId  = String(body.course_id).trim();
  const sessionId = String(body.session_id).trim();

  const hex   = Utilities.getUuid().replace(/-/g, "");
  const token = "TKN-" + hex.substring(0, 6).toUpperCase();

  const now       = new Date();
  const expiresAt = new Date(now.getTime() + TOKEN_TTL_MS);

  const ss         = SpreadsheetApp.openById(SPREADSHEET_ID);
  const tokenSheet = getOrCreateSheet(ss, SHEET_TOKENS, [
    "token", "course_id", "session_id", "expires_at", "created_at", "used"
  ]);

  tokenSheet.appendRow([
    token, courseId, sessionId,
    expiresAt.toISOString(), now.toISOString(), "false"
  ]);

  return ok({ qr_token: token, expires_at: expiresAt.toISOString() });
}


function handleCheckin(body) {
  if (!body || !body.device_id)  return err("missing_field: device_id");   // NIM
  if (!body.user_id)             return err("missing_field: user_id");      // Nama
  if (!body.course_id)           return err("missing_field: course_id");
  if (!body.session_id)          return err("missing_field: session_id");
  if (!body.qr_token)            return err("missing_field: qr_token");

  // device_id = NIM, user_id = Nama
  const nim       = String(body.device_id).trim();
  const nama      = String(body.user_id).trim();
  const courseId  = String(body.course_id).trim();
  const sessionId = String(body.session_id).trim();

  // Auto-parse jika qr_token berisi JSON string
  let rawToken = String(body.qr_token || '').trim();
  try {
    const parsed = JSON.parse(rawToken);
    if (parsed.token)      rawToken = parsed.token;
    else if (parsed.TOKEN) rawToken = parsed.TOKEN;
  } catch(_) {}
  const qrToken = rawToken.toUpperCase();

  const tsNow = body.ts ? new Date(body.ts) : new Date();

  const ss         = SpreadsheetApp.openById(SPREADSHEET_ID);
  const tokenSheet = getOrCreateSheet(ss, SHEET_TOKENS, [
    "token", "course_id", "session_id", "expires_at", "created_at", "used"
  ]);

  const tokenRows    = tokenSheet.getDataRange().getValues();
  let foundToken     = null;
  let sheetRowNumber = -1;

  for (let i = 1; i < tokenRows.length; i++) {
    if (String(tokenRows[i][0]).trim().toUpperCase() === qrToken) {
      foundToken     = tokenRows[i];
      sheetRowNumber = i + 1;
      break;
    }
  }

  if (!foundToken)                                            return err("token_invalid");
  if (new Date() > new Date(foundToken[3]))                   return err("token_expired");
  if (String(foundToken[1]).trim().toLowerCase() !== courseId.toLowerCase())  return err("token_mismatch: course_id");
  if (String(foundToken[2]).trim().toLowerCase() !== sessionId.toLowerCase()) return err("token_mismatch: session_id");

  // Sheet presence: device_id = NIM (kolom utama identifier), user_id = Nama
  const presenceSheet = getOrCreateSheet(ss, SHEET_PRESENCE, [
    "presence_id", "device_id", "user_id", "course_id", "session_id", "ts", "status"
    //              ^^^ NIM      ^^^ Nama
  ]);

  // Cek sudah hadir sebelumnya (berdasarkan NIM)
  const presenceRows = presenceSheet.getDataRange().getValues();
  for (let i = 1; i < presenceRows.length; i++) {
    const row = presenceRows[i];
    if (String(row[1]).trim() === nim &&          // device_id = NIM
        String(row[3]).trim() === courseId &&
        String(row[4]).trim() === sessionId) {
      return ok({ presence_id: String(row[0]), status: "checked_in" });
    }
  }

  // Tandai token terpakai
  if (sheetRowNumber > 0) {
    tokenSheet.getRange(sheetRowNumber, 6).setValue("true");
  }

  const presenceId = "PR-" + Utilities.getUuid().replace(/-/g, "").substring(0, 8).toUpperCase();
  presenceSheet.appendRow([
    presenceId,
    nim,        // device_id = NIM  ← sinkron dengan accel & GPS
    nama,       // user_id   = Nama
    courseId,
    sessionId,
    tsNow.toISOString(),
    "checked_in"
  ]);

  return ok({ presence_id: presenceId, status: "checked_in" });
}


function handleGetStatus(params) {
  if (!params || !params.device_id) return err("missing_field: device_id");

  const nim       = String(params.device_id).trim();
  const courseId  = params.course_id  ? String(params.course_id).trim()  : null;
  const sessionId = params.session_id ? String(params.session_id).trim() : null;

  const ss            = SpreadsheetApp.openById(SPREADSHEET_ID);
  const presenceSheet = getOrCreateSheet(ss, SHEET_PRESENCE, [
    "presence_id", "device_id", "user_id", "course_id", "session_id", "ts", "status"
  ]);

  const rows = presenceSheet.getDataRange().getValues();
  let found  = null;

  for (let i = rows.length - 1; i >= 1; i--) {
    const row = rows[i];
    if (String(row[1]).trim() === nim &&
        (!courseId  || String(row[3]).trim() === courseId) &&
        (!sessionId || String(row[4]).trim() === sessionId)) {
      found = row; break;
    }
  }

  if (found) {
    return ok({
      device_id : nim,
      user_id   : String(found[2]),   // Nama
      course_id : String(found[3]),
      session_id: String(found[4]),
      status    : "checked_in",
      last_ts   : String(found[5])
    });
  }

  return ok({
    device_id : nim,
    course_id : courseId  || "",
    session_id: sessionId || "",
    status    : "not_checked_in"
  });
}


/* ═══════════════════════════════════════════════
   MODUL 2 — ACCELEROMETER
   (tidak ada perubahan, device_id sudah = NIM)
   ═══════════════════════════════════════════════ */

function handleAccelPost(body) {
  if (!body || !body.device_id) return err("missing_field: device_id");
  if (!body.samples || !Array.isArray(body.samples) || body.samples.length === 0)
    return err("missing_field: samples");

  const deviceId = String(body.device_id).trim();  // NIM
  const batchTs  = body.ts || new Date().toISOString();
  const batchId  = "ACL-" + Utilities.getUuid().replace(/-/g, "").substring(0, 8).toUpperCase();

  const ss         = SpreadsheetApp.openById(SPREADSHEET_ID);
  const accelSheet = getOrCreateSheet(ss, SHEET_ACCEL, [
    "batch_id", "device_id", "batch_ts", "t", "x", "y", "z"
    //           ^^^ NIM
  ]);

  const rows = body.samples.map(s => [
    batchId, deviceId, batchTs,
    s.t || batchTs,
    Number(s.x) || 0,
    Number(s.y) || 0,
    Number(s.z) || 0
  ]);

  const lastRow = accelSheet.getLastRow();
  accelSheet.getRange(lastRow + 1, 1, rows.length, 7).setValues(rows);

  return ok({ accepted: rows.length });
}


function handleAccelLatest(params) {
  if (!params || !params.device_id) return err("missing_field: device_id");

  const deviceId = String(params.device_id).trim();  // NIM

  const ss         = SpreadsheetApp.openById(SPREADSHEET_ID);
  const accelSheet = getOrCreateSheet(ss, SHEET_ACCEL, [
    "batch_id", "device_id", "batch_ts", "t", "x", "y", "z"
  ]);

  const rows = accelSheet.getDataRange().getValues();
  let latest = null;

  for (let i = rows.length - 1; i >= 1; i--) {
    if (String(rows[i][1]).trim() === deviceId) {
      latest = rows[i]; break;
    }
  }

  if (!latest) return err("device_not_found");

  return ok({
    t: String(latest[3]),
    x: Number(latest[4]),
    y: Number(latest[5]),
    z: Number(latest[6])
  });
}


/* ═══════════════════════════════════════════════
   MODUL 3 — GPS
   (tidak ada perubahan, device_id sudah = NIM)
   ═══════════════════════════════════════════════ */

function handleGpsPost(body) {
  if (!body || !body.device_id) return err("missing_field: device_id");
  if (body.lat === undefined)   return err("missing_field: lat");
  if (body.lng === undefined)   return err("missing_field: lng");

  const deviceId  = String(body.device_id).trim();  // NIM
  const ts        = body.ts || new Date().toISOString();
  const lat       = Number(body.lat);
  const lng       = Number(body.lng);
  const accuracy  = body.accuracy_m !== undefined ? Number(body.accuracy_m) : "";
  const gpsId     = "GPS-" + Utilities.getUuid().replace(/-/g, "").substring(0, 8).toUpperCase();

  const ss       = SpreadsheetApp.openById(SPREADSHEET_ID);
  const gpsSheet = getOrCreateSheet(ss, SHEET_GPS, [
    "gps_id", "device_id", "ts", "lat", "lng", "accuracy_m"
    //         ^^^ NIM
  ]);

  gpsSheet.appendRow([gpsId, deviceId, ts, lat, lng, accuracy]);

  return ok({ accepted: true });
}


function handleGpsLatest(params) {
  if (!params || !params.device_id) return err("missing_field: device_id");

  const deviceId = String(params.device_id).trim();  // NIM

  const ss       = SpreadsheetApp.openById(SPREADSHEET_ID);
  const gpsSheet = getOrCreateSheet(ss, SHEET_GPS, [
    "gps_id", "device_id", "ts", "lat", "lng", "accuracy_m"
  ]);

  const rows = gpsSheet.getDataRange().getValues();
  let latest = null;

  for (let i = rows.length - 1; i >= 1; i--) {
    if (String(rows[i][1]).trim() === deviceId) {
      latest = rows[i]; break;
    }
  }

  if (!latest) return err("device_not_found");

  return ok({
    ts        : String(latest[2]),
    lat       : Number(latest[3]),
    lng       : Number(latest[4]),
    accuracy_m: latest[5] !== "" ? Number(latest[5]) : null
  });
}


function handleGpsHistory(params) {
  if (!params || !params.device_id) return err("missing_field: device_id");

  const deviceId = String(params.device_id).trim();  // NIM
  const limit    = params.limit ? Math.min(parseInt(params.limit), 500) : 200;

  const ss       = SpreadsheetApp.openById(SPREADSHEET_ID);
  const gpsSheet = getOrCreateSheet(ss, SHEET_GPS, [
    "gps_id", "device_id", "ts", "lat", "lng", "accuracy_m"
  ]);

  const rows  = gpsSheet.getDataRange().getValues();
  const items = [];

  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][1]).trim() === deviceId) {
      items.push({
        ts : String(rows[i][2]),
        lat: Number(rows[i][3]),
        lng: Number(rows[i][4])
      });
    }
  }

  return ok({ device_id: deviceId, items: items.slice(-limit) });
}


/* ═══════════════════════════════════════════════
   UTILITY
   ═══════════════════════════════════════════════ */
function normalizePath(pathInfo) {
  return (pathInfo || "").toLowerCase().trim().replace(/^\/+|\/+$/g, "");
}

function getOrCreateSheet(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    const range = sheet.getRange(1, 1, 1, headers.length);
    range.setBackground("#003478").setFontColor("#ffffff")
         .setFontWeight("bold").setHorizontalAlignment("center");
    sheet.setFrozenRows(1);
    sheet.autoResizeColumns(1, headers.length);
  }
  return sheet;
}