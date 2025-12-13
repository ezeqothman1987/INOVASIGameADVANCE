const HOF_QR_KEY = "hof_qr";
const HOF_VIDEO_KEY = "hof_video";

/* =========================
   NAVIGATION
========================= */
function goQR() {
  window.location.href = "qr/index.html";
}

function goVideo() {
  window.location.href = "video/index.html";
}

/* =========================
   LOAD HALL OF FAME
========================= */
function loadHOF() {
  loadQRHOF();
  loadVideoHOF();
}

function loadQRHOF() {
  const list = document.getElementById("hofQR");
  if (!list) return;

  const hof = JSON.parse(localStorage.getItem(HOF_QR_KEY) || "[]");
  list.innerHTML = "";

  if (hof.length === 0) {
    list.innerHTML = "<li class='empty'>Tiada rekod</li>";
    return;
  }

  hof.slice(0, 3).forEach((r, i) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <strong>${i + 1}. ${r.name}</strong>
      <span>${r.score} markah</span>
    `;
    list.appendChild(li);
  });
}

function loadVideoHOF() {
  const list = document.getElementById("hofVideo");
  if (!list) return;
  // cuba baca dari dua tempat
  const rawVideo1 = localStorage.getItem(HOF_VIDEO_KEY);  // hof_video
  const rawVideo2 = localStorage.getItem("HOF_KEY");      // key lama
  const raw = rawVideo1 || rawVideo2;

  const hof = raw ? JSON.parse(raw) : [];
  list.innerHTML = "";

  if (hof.length === 0) {
    list.innerHTML = "<li class='empty'>Tiada rekod</li>";
    return;
  }

  hof.slice(0, 3).forEach((r, i) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <strong>${i + 1}. ${r.name}</strong>
      <span>Jumlah: ${r.total}</span>
    `;
    list.appendChild(li);
  });
}

document.addEventListener("DOMContentLoaded", loadHOF);

/* =========================
   AUTO REFRESH MAIN PAGE
========================= */
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    console.log("Page active again → refresh HOF");
    loadHOF();
  }
});
