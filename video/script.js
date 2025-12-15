/* ============================================================
   script.js — GEOQUIZ BATTLE MODE (2 PEMAIN)
   BASED ON ORIGINAL SCRIPT (SAFE EXTENSION)
   Depends on: gameData.js, input.js, jsQR.js
============================================================ */

/* =========================
   DEBUG
========================= */
const DEBUG = true;
function debugLog(...args) {
  if (DEBUG) console.log("[BATTLE]", ...args);
}

/* =========================
   DOM
========================= */
const video = document.getElementById("video");
const canvas = document.getElementById("qr-canvas");
const ctx = canvas.getContext("2d", { willReadFrequently: true });
const cameraStatus = document.getElementById("cameraStatus");

const timerText = document.getElementById("timer");
const roundText = document.getElementById("round");

const scoreP1Text = document.getElementById("scoreP1");
const scoreP2Text = document.getElementById("scoreP2");
const statusText = document.getElementById("statusText");

const startBtn = document.getElementById("startGameBtn");
const stopBtn  = document.getElementById("stopGameBtn");

const questionBox = document.getElementById("questionBox");
const questionText = document.getElementById("questionText");

/* =========================
   GAME STATE
========================= */
const STATE = {
  IDLE: "idle",
  SCANNING: "scanning",
  ANSWERING: "answering",
  END: "end"
};

let currentState = STATE.IDLE;
let currentRound = 0;
let usedQR = new Set();

let currentAnswer = null;
let timer = null;
let timeLeft = 0;

/* =========================
   PLAYER DATA (BATTLE)
========================= */
const players = {
  1: { score: 0, answered: false, correct: false, answerTime: null },
  2: { score: 0, answered: false, correct: false, answerTime: null }
};

/* =========================
   INIT
========================= */
function initBattle() {
  debugLog("Init Battle Mode");

function updateUI() {
  if (roundText) {
    roundText.textContent = currentRound;
  }

  if (timerText) {
    timerText.textContent = timeLeft ?? GAME_CONFIG.ANSWER_TIME;
  }

  if (scoreP1Text) {
    scoreP1Text.textContent = scoreP1;
  }

  if (scoreP2Text) {
    scoreP2Text.textContent = scoreP2;
  }
}

document.addEventListener("DOMContentLoaded", initBattle);

/* =========================
   START / STOP
========================= */
function handleStartButton() {
  if (currentState === STATE.IDLE || currentState === STATE.END) {
    startGame();
  } else {
    if (confirm("Hentikan permainan Battle Mode?")) {
      resetGame();
    }
  }
}

async function startGame() {
  debugLog("Battle start");

  currentRound = 0;
  usedQR.clear();

  players[1].score = 0;
  players[2].score = 0;

  updateUI();

  currentState = STATE.SCANNING;
  cameraStatus.textContent = UI_TEXT.SCANNING;

  await startCamera();
  scanLoop();
}

function resetGame() {
  debugLog("Reset battle game");

  if (timer) {
    clearInterval(timer);
    timer = null;
  }

  stopCamera();

  currentState = STATE.IDLE;
  currentRound = 0;
  usedQR.clear();

  questionBox.style.display = "none";
  cameraStatus.textContent = UI_TEXT.IDLE;

  updateUI();
}

/* =========================
   CAMERA
========================= */
async function startCamera() {
  const stream = await navigator.mediaDevices.getUserMedia({ video: true });
  video.srcObject = stream;

  return new Promise(res => {
    video.onloadedmetadata = () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      res();
    };
  });
}

function stopCamera() {
  if (video.srcObject) {
    video.srcObject.getTracks().forEach(t => t.stop());
    video.srcObject = null;
  }
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

/* =========================
   QR SCAN LOOP
========================= */
function scanLoop(ts = performance.now()) {
  if (currentState !== STATE.SCANNING) return;

  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const qr = jsQR(img.data, img.width, img.height);

  if (qr && VALID_QR.includes(qr.data)) {
    if (!usedQR.has(qr.data)) {
      usedQR.add(qr.data);
      askQuestion(qr.data);
      return;
    }
  }

  requestAnimationFrame(scanLoop);
}

/* =========================
   UI
========================= */
function updateUI() {
  roundText.textContent = `${currentRound} / ${GAME_CONFIG.TOTAL_ROUNDS}`;
  startBtn.textContent =
    currentState === STATE.IDLE || currentState === STATE.END
      ? "MULA BATTLE"
      : "HENTIKAN";
}
