/* =========================
   HALL OF FAME — INDEX PAGE
========================= */

// KEY MESTI SAMA DENGAN GAME
const HOF_QR_KEY = "geoquiz_hall_of_fame";
const HOF_BATTLE_KEY = "geoquiz_hall_of_fame_2p";

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
  loadBattleHOF();
}

/* =========================
   SOLO (QR)
========================= */
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
    li.className = "hof-item";
    li.innerHTML = `
      <strong>${i + 1}. ${r.name}</strong>
      <span>${r.score} markah</span>
    `;
    list.appendChild(li);
  });
}

/* =========================
   2 PLAYER / BATTLE
========================= */
function loadBattleHOF() {
  const list = document.getElementById("hofBattleList");
  if (!list) return;

  const hof = JSON.parse(localStorage.getItem(HOF_BATTLE_KEY) || "[]");
  list.innerHTML = "";

  if (hof.length === 0) {
    list.innerHTML = "<li class='empty'>Tiada rekod</li>";
    return;
  }

  hof.slice(0, 3).forEach((r, i) => {
    const li = document.createElement("li");
    li.className = "hof-item";
    li.innerHTML = `
      <strong>${i + 1}. ${r.name}</strong>
      <div class="hof-sub">
        P1: ${r.scoreP1} markah &nbsp;|&nbsp; P2: ${r.scoreP2} markah
      </div>
    `;
    list.appendChild(li);
  });
}

/* =========================
   INIT & AUTO REFRESH
========================= */
document.addEventListener("DOMContentLoaded", loadHOF);

document.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    loadHOF();
  }
});
