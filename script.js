const GAS_URL = "https://script.google.com/macros/s/AKfycbwLRww6HqFhaOaK8zfFFEfbWCYyDcCFjqYopiFjMadImeWP-F7FV1QuuxJ9OG37VP8z/exec";

const generateBtn = document.getElementById("generateBtn");
const qrContainer = document.getElementById("qrContainer");
const statusMessage = document.getElementById("statusMessage");
const fileInput = document.getElementById("fileInput");

let qrEngine = null;
let isProcessing = false;

/* ========================= */
/* GENERATE QR */
/* ========================= */

generateBtn.addEventListener("click", async () => {

  qrContainer.innerHTML = "Loading...";

  const formData = new URLSearchParams();
  formData.append("action", "generate");
  formData.append("course_id", "cloud-101");
  formData.append("session_id", "sesi-01");

  try {

    const response = await fetch(GAS_URL, {
      method: "POST",
      body: formData
    });

    const data = await response.json();

    if (data.success) {

      const token = data.data.qr_token;

      const qrUrl =
        `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${token}&t=${Date.now()}`;

      qrContainer.innerHTML = `<img src="${qrUrl}" width="300"/>`;

    } else {
      qrContainer.innerHTML =
        `<div style="color:red;">${data.data}</div>`;
    }

  } catch (err) {
    qrContainer.innerHTML =
      `<div style="color:red;">Fetch Error</div>`;
  }

});


/* ========================= */
/* START CAMERA */
/* ========================= */

async function startCamera() {

  statusMessage.innerHTML = "";
  isProcessing = false;

  const reader = document.getElementById("reader");
  reader.innerHTML = "";

  qrEngine = new Html5Qrcode("reader");

  const cameras = await Html5Qrcode.getCameras();

  await qrEngine.start(
    cameras[0].id,
    { fps: 10, qrbox: 250 },
    async (decodedText) => {

      if (isProcessing) return; // ⛔ cegah double scan
      isProcessing = true;

      await sendCheckin(decodedText);

      await stopCamera();
    }
  );
}


/* ========================= */
/* STOP CAMERA */
/* ========================= */

async function stopCamera() {

  try {
    if (qrEngine) {
      await qrEngine.stop();
      await qrEngine.clear();
      qrEngine = null;
    }
  } catch (err) {
    console.log("Camera already stopped");
  }

}


/* ========================= */
/* CHECKIN */
/* ========================= */

async function sendCheckin(token) {

  statusMessage.innerHTML = "Memproses...";

  const formData = new URLSearchParams();
  formData.append("action", "checkin");
  formData.append("user_id", "20230001");
  formData.append("device_id", "dev-001");
  formData.append("course_id", "cloud-101");
  formData.append("session_id", "sesi-01");
  formData.append("token", token);

  try {

    const response = await fetch(GAS_URL, {
      method: "POST",
      body: formData
    });

    const data = await response.json();

    if (data.success) {
      statusMessage.innerHTML =
        `<div style="color:green;font-weight:bold;">Berhasil Presensi ✅</div>`;
    } else {
      statusMessage.innerHTML =
        `<div style="color:red;">${data.data}</div>`;
    }

  } catch (err) {
    statusMessage.innerHTML =
      `<div style="color:red;">Server Error</div>`;
  }
}


/* ========================= */
/* SCAN FILE */
/* ========================= */

fileInput.addEventListener("change", async function(e){

  if (isProcessing) return;
  isProcessing = true;

  const file = e.target.files[0];
  if(!file) return;

  statusMessage.innerHTML = "Memproses QR...";

  try {

    const scanner = new Html5Qrcode("reader");

    const decodedText =
      await scanner.scanFile(file, true);

    await sendCheckin(decodedText);

    await scanner.clear();

  } catch (err) {

    statusMessage.innerHTML =
      `<div style="color:red;">QR Tidak Terbaca ❌</div>`;

  }

  isProcessing = false;
});