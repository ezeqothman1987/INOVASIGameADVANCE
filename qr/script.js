/* ============================================================
   script.js — ENGINE GAME (FINAL, CLEAN, STABLE)
============================================================ */
const HOF_QR_KEY = "hofQR";
/* =====================
   GLOBAL DEBUG SWITCH
   ===================== */
const DEBUG_MODE = false;
// tukar ke true bila nak debug

/* ============================================================
   0) SERIAL STATE (ESP32)
============================================================ */
let serialPort = null;
let serialWriter = null;
let serialReader = null;
let serialConnected = false;

/* ============================================================
   1) AUDIO
============================================================ */
const SOUND_PATH = "../static/sound/";
const soundCorrect  = new Audio(SOUND_PATH + "correct.mp3");
const soundWrong    = new Audio(SOUND_PATH + "wrong.mp3");
const soundCongrats = new Audio(SOUND_PATH + "timeup.mp3");

function safePlay(a) {
  try {
    a.currentTime = 0;
    a.play().catch(() => {});
  } catch {}
}

/* ============================================================
   2) DOM HELPER
============================================================ */
const el = id => document.getElementById(id);
const setText = (id, txt) => el(id) && (el(id).textContent = txt);
const setTextAll = (id, txt) =>
  document.querySelectorAll(`#${id}`).forEach(n => n.textContent = txt);

/* ============================================================
   3) GAME STATE MACHINE
============================================================ */
const GAME_STATE = {
  IDLE: "IDLE",
  SCANNING: "SCANNING",
  ANSWERING: "ANSWERING",
  PAUSE: "PAUSE",
  END: "END"
};

let gameState = GAME_STATE.IDLE;
const setGameState = s => {
  gameState = s;
  DEBUG_MODE && console.log("[STATE]", s);
};

/* ============================================================
   4) GAME DATA
============================================================ */
let roundCount = 0;
let score = 0;
let lastQR = null;
let timeRemaining = 0;
let timerInterval = null;

/* ============================================================
   5) CAMERA & QR
============================================================ */
const video = el("video");
const canvas = el("qr-canvas");
const ctx = canvas?.getContext("2d");

let scanning = false;
let qrDebounce = false;

async function startCamera() {
  if (DEBUG_MODE) return console.warn("[DEBUG] Kamera OFF");

  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: "environment" }
  });

  video.srcObject = stream;
  video.setAttribute("playsinline", true);
  await video.play();

  scanning = true;
  requestAnimationFrame(scanLoop);
}

function stopCamera() {
  video?.srcObject?.getTracks().forEach(t => t.stop());
  video.srcObject = null;
  scanning = false;
}

function scanLoop() {
  if (!scanning || gameState !== GAME_STATE.SCANNING) {
    requestAnimationFrame(scanLoop);
    return;
  }

  if (video.readyState === video.HAVE_ENOUGH_DATA) {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(img.data, canvas.width, canvas.height);

    if (code && !qrDebounce) {
      qrDebounce = true;
      setTimeout(() => qrDebounce = false, 1200);
      onQRScanned(code.data);
    }
  }
  requestAnimationFrame(scanLoop);
}

/* ============================================================
   6) GAME FLOW
============================================================ */
/* =========================
   +ESP32 SAFE STUB
   (elak ReferenceError)
   ========================= */
function sendToESP32(msg) {
  if (DEBUG_MODE) {
    console.log("[ESP32 STUB]", msg);
  }
}

function resetGame() {
  roundCount = 0;
  score = 0;
  lastQR = null;
  stopQuestionTimer();

  setText("score", "0");
  setText("timer", GAME_CONFIG.ANSWER_TIME);
  setText("rockName", UI_TEXT.IDLE);
}

function startGame() {
  if (gameState !== GAME_STATE.IDLE) return;

  sendToESP32("GAME:START");
  resetGame();

  setGameState(GAME_STATE.SCANNING);
  setText("rockName", UI_TEXT.SCANNING);
  el("cameraStatus") && (el("cameraStatus").textContent = UI_TEXT.SCANNING);

  startCamera();
}

/* ============================================================
   7) QR SCANNED
============================================================ */
function onQRScanned(payload) {
  const t = payload.trim().toLowerCase();
  if (t !== QR_PAYLOAD.BETUL && t !== QR_PAYLOAD.SALAH) return;

  lastQR = t;
  timeRemaining = GAME_CONFIG.ANSWER_TIME;

  setGameState(GAME_STATE.ANSWERING);
  setText("timer", timeRemaining);
  setText("rockName", UI_TEXT.ANSWER);

  startQuestionTimer();
}

/* ============================================================
   8) TIMER
============================================================ */
function startQuestionTimer() {
  stopQuestionTimer();
  timerInterval = setInterval(() => {
    if (gameState !== GAME_STATE.ANSWERING) return;
    timeRemaining--;
    setText("timer", timeRemaining);
    if (timeRemaining <= 0) handleWrongAnswer();
  }, 1000);
}

function stopQuestionTimer() {
  clearInterval(timerInterval);
  timerInterval = null;
}

/* ============================================================
   9) ANSWER
============================================================ */
function playerAnswer(ans) {
  if (gameState !== GAME_STATE.ANSWERING) return;
  ans === lastQR ? handleCorrectAnswer() : handleWrongAnswer();
}

/* ============================================================
   10) BETUL
============================================================ */
function handleCorrectAnswer() {
  stopQuestionTimer();
  safePlay(soundCorrect);
  flashScreen("green");

  const raw = Math.ceil(
    (timeRemaining / GAME_CONFIG.ANSWER_TIME) * GAME_CONFIG.SCORE.MAX
  );
  score += Math.max(GAME_CONFIG.SCORE.MIN, raw);
  roundCount++;

  setText("score", score);
  setGameState(GAME_STATE.PAUSE);

  setTimeout(() => {
    roundCount >= GAME_CONFIG.TOTAL_ROUNDS
      ? handleGameWin()
      : (setGameState(GAME_STATE.SCANNING),
         setText("rockName", UI_TEXT.SCANNING));
  }, GAME_CONFIG.PAUSE_AFTER_CORRECT * 1000);
}

/* ============================================================
   11) SALAH
============================================================ */
function handleWrongAnswer() {
  stopQuestionTimer();
  safePlay(soundWrong);
  flashScreen("red");
  endGame();
}

/* ============================================================
   12) MENANG
============================================================ */
function handleGameWin() {
  safePlay(soundCongrats);
  flashScreen("gold");
  endGame(true);
}

/* ============================================================
   13) END GAME
============================================================ */
function endGame(isWin = false) {
  stopCamera();
  stopQuestionTimer();
  setGameState(GAME_STATE.END);

  setTextAll("finalScore", score);
  el("endModal").style.display = "block";
}

/* ============================================================
   14) VISUAL
============================================================ */
function flashScreen(color) {
  document.body.classList.remove("flash-green","flash-red","flash-gold");
  document.body.classList.add(`flash-${color}`);
  setTimeout(() =>
    document.body.classList.remove(`flash-${color}`), 400);
}
/* ============================================================
   BACK TO HOME HANDLER (SAFE)
============================================================ */
function setupBackHomeButton() {
  const backBtn = document.getElementById("backHomeBtn");
  if (!backBtn || backBtn.dataset.bound) return;

  backBtn.dataset.bound = "1";

  backBtn.addEventListener("click", () => {
    if (!confirm("Keluar dan kembali ke Menu Utama?")) return;

    try {
      stopCamera();
      stopQuestionTimer();
      setGameState(GAME_STATE.IDLE);
    } catch {}

    // tutup modal kalau ada
    el("endModal") && (el("endModal").style.display = "none");

    // balik ke halaman utama
    window.location.href = "../index.html";
  });
}

/* ============================================================
   15) HALL OF FAME (ANTI SALAH TEKAN + TOP 3 CONFETTI)
============================================================ */
function saveHallOfFame() {
const name =
    document.getElementById("playerName")?.value.trim() || "Tanpa Nama";

  const record = {
    name,
    score,
    ts: Date.now()
  };

  const hof = JSON.parse(localStorage.getItem(HOF_QR_KEY) || "[]");
  hof.push(record);

  // Susun ikut markah tertinggi
  hof.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

  // Simpan maksimum
  localStorage.setItem(
    HOF_QR_KEY,
    JSON.stringify(hof.slice(0, HOF_MAX))
  );

  // Cari ranking pemain baru
  const rank = hof.findIndex(
    r => r.ts === record.ts
  ) + 1;

  loadHallOfFame();

  // CONFETTI JIKA TOP 3
  if (rank > 0 && rank <= 3) {
    launchConfettiTop3();
  }

  // Reset UI
  document.getElementById("playerName").value = "";
  document.getElementById("endModal").style.display = "none";

  resetGame();
  setGameState(GAME_STATE.IDLE);
}

function loadHallOfFame() {
  const list = el("hofList");
  if (!list) return;

  const hof = JSON.parse(localStorage.getItem(HOF_QR_KEY) || "[]");
  list.innerHTML = "";

  hof.forEach((r, i) => {
    const li = document.createElement("li");
    li.className = "hof-item";
    li.innerHTML = `
      <span class="rank">#${i + 1}</span>
      <span class="name">${r.name}</span>
      <span class="score">${r.score}</span>`;
    list.appendChild(li);
  });
}
function launchConfettiTop3() {
  const colors = ["#ffd700", "#c0c0c0", "#cd7f32", "#7CFC00", "#00ffff"];

  for (let i = 0; i < 80; i++) {
    const conf = document.createElement("div");
    conf.className = "confetti";

    conf.style.left = Math.random() * 100 + "vw";
    conf.style.backgroundColor =
      colors[Math.floor(Math.random() * colors.length)];

    conf.style.animationDuration =
      2 + Math.random() * 2 + "s";

    conf.style.opacity = Math.random();

    document.body.appendChild(conf);

    setTimeout(() => conf.remove(), 4000);
  }
}
/* ============================================================
   16) RESET HOF
============================================================ */
function setupClearHOFButton() {
  const btn = document.getElementById("clearHOFBtn");
  if (!btn || btn.dataset.bound) return;

  btn.dataset.bound = "1";

  btn.addEventListener("click", () => {
    if (!confirm("Padam semua rekod Hall of Fame?")) return;

    localStorage.removeItem(HOF_QR_KEY);
    loadHallOfFame();

    if (DEBUG_MODE) {
      console.warn("[HOF] Semua rekod telah dipadam");
    }
  });
}

/* ============================================================
   17) CONFETTI
============================================================ */
function launchConfetti(count = 120) {
  for (let i = 0; i < count; i++) {
    const c = document.createElement("div");
    c.className = "confetti";
    c.style.left = Math.random() * 100 + "vw";
    c.style.background =
      ["#FFD700","#FF5733","#33FF57","#3399FF"]
      [Math.floor(Math.random()*4)];
    document.body.appendChild(c);
    setTimeout(() => c.remove(), 4000);
  }
}

/* ============================================================
   18) INIT
============================================================ */
document.addEventListener("DOMContentLoaded", () => {
  el("startScanBtn")?.addEventListener("click", startGame);
  setupClearHOFButton();
  loadHallOfFame();
  setText("rockName", UI_TEXT.IDLE);
  setText("timer", GAME_CONFIG.ANSWER_TIME);

  if (DEBUG_MODE) {
    document.addEventListener("keydown", e => {
      if (gameState === GAME_STATE.SCANNING) {
        if (e.key === "b") onQRScanned(QR_PAYLOAD.BETUL);
        if (e.key === "s") onQRScanned(QR_PAYLOAD.SALAH);
      }
    });
  }
});
