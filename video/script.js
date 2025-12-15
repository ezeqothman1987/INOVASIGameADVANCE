/* ============================================================
   script.js — GEOQUIZ BATTLE MODE (2 PLAYER)
   - Based on QR GeoQuiz
   - Flow: Scan → Question → P1 & P2 Answer → Score → Next
============================================================ */

/* =========================
   DEBUG
========================= */
const DEBUG = true;
function debugLog(...args) {
  if (DEBUG) console.log("[DEBUG]", ...args);
}

/* =========================
   SCAN THROTTLE
========================= */
const SCAN_INTERVAL = 120;
let lastScanTime = 0;

/* =========================
   DOM
========================= */
const video = document.getElementById("video");
const canvas = document.getElementById("qr-canvas");
const ctx = canvas.getContext("2d", { willReadFrequently: true });

const startBtn = document.getElementById("startBtn");
const cameraStatus = document.getElementById("cameraStatus");

const roundText = document.getElementById("roundText");
const scoreText = document.getElementById("scoreText");
const timeText = document.getElementById("timeText");

const questionBox = document.getElementById("questionBox");
const questionText = document.getElementById("questionText");
const timeBarFill = document.getElementById("timeBarFill");

const fullscreenBtn = document.getElementById("fullscreenBtn");
const backHomeBtn = document.querySelector(".back-home-btn");

/* =========================
   AUDIO
========================= */
const AUDIO_PATH = "../static/sound/";
const soundCorrect = new Audio(`${AUDIO_PATH}yay.mp3`);
const soundWrong = new Audio(`${AUDIO_PATH}boo.mp3`);
const audioClap = new Audio(`${AUDIO_PATH}clap.mp3`);
const soundBlocked = new Audio(`${AUDIO_PATH}blocked.mp3`);

function playSound(a) {
  try {
    a.currentTime = 0;
    a.play().catch(() => {});
  } catch {}
}

/* =========================
   GAME STATE
========================= */
const STATE = {
  IDLE: "idle",
  SCANNING: "scanning",
  ANSWERING: "answering",
  PAUSE: "pause",
  QR_BLOCKED: "qr_blocked",
  END: "end"
};

let currentState = STATE.IDLE;
let currentRound = 0;
let usedQR = new Set();
let timer = null;
let timeLeft = 0;
let currentAnswer = null;

/* =========================
   PLAYER STATE (BATTLE)
========================= */
let scoreP1 = 0;
let scoreP2 = 0;

let players = {
  1: { answered: false, correct: false, time: 0 },
  2: { answered: false, correct: false, time: 0 }
};

function resetPlayerAnswers() {
  players[1] = { answered: false, correct: false, time: 0 };
  players[2] = { answered: false, correct: false, time: 0 };
}

/* =========================
   BUTTON LOCK
========================= */
function updateStartButtonLock() {
  startBtn.disabled =
    currentState === STATE.ANSWERING || currentState === STATE.PAUSE;
}

/* =========================
   INIT
========================= */
function init() {
  updateUI();

  startBtn.addEventListener("click", handleStartButton);

  document.querySelectorAll(".battle-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const p = Number(btn.dataset.player);
      const ans =
        btn.dataset.answer === "true"
          ? true
          : btn.dataset.answer === "false"
          ? false
          : null;

      playerAnswer(p, ans);
    });
  });

  fullscreenBtn?.addEventListener("click", toggleFullscreen);
  backHomeBtn?.addEventListener("click", goBackHome);

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stopCameraAndScan();
  });
}

document.addEventListener("DOMContentLoaded", init);

/* =========================
   START / STOP
========================= */
function handleStartButton() {
  if (currentState === STATE.IDLE || currentState === STATE.END) {
    startGame();
    return;
  }

  if (confirm("Hentikan permainan?")) {
    resetGame();
  }
}

/* =========================
   UI
========================= */
function updateUI() {
  roundText.textContent = `${currentRound} / ${GAME_CONFIG.TOTAL_ROUNDS}`;
  scoreText.textContent = `P1: ${scoreP1} | P2: ${scoreP2}`;
  startBtn.textContent =
    currentState === STATE.IDLE || currentState === STATE.END
      ? "MULA PERMAINAN"
      : "HENTIKAN";
}

/* =========================
   GAME FLOW
========================= */
async function startGame() {
  scoreP1 = 0;
  scoreP2 = 0;
  currentRound = 0;
  usedQR.clear();

  currentState = STATE.SCANNING;
  updateUI();
  updateStartButtonLock();

  cameraStatus.textContent = UI_TEXT.SCANNING;

  await startCamera();
  scanLoop();
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

function stopCameraAndScan() {
  currentState = STATE.IDLE;
  if (video?.srcObject) {
    video.srcObject.getTracks().forEach(t => t.stop());
    video.srcObject = null;
  }
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

/* =========================
   SCAN LOOP
========================= */
function scanLoop(ts) {
  if (currentState !== STATE.SCANNING) return;

  if (ts - lastScanTime < SCAN_INTERVAL) {
    requestAnimationFrame(scanLoop);
    return;
  }
  lastScanTime = ts;

  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const qr = jsQR(img.data, img.width, img.height);

  if (qr) {
    handleQR(qr.data.trim());
    return;
  }

  requestAnimationFrame(scanLoop);
}

/* =========================
   QR HANDLER
========================= */
function handleQR(payload) {
  if (!VALID_QR.includes(payload)) {
    scanLoop();
    return;
  }

  if (usedQR.has(payload)) {
    showQRBlockedMessage();
    return;
  }

  usedQR.add(payload);
  askQuestion(payload);
}

function showQRBlockedMessage() {
  currentState = STATE.QR_BLOCKED;
  cameraStatus.textContent = "QR telah digunakan";
  playSound(soundBlocked);

  setTimeout(() => {
    if (currentState === STATE.QR_BLOCKED) {
      currentState = STATE.SCANNING;
      cameraStatus.textContent = UI_TEXT.SCANNING;
      scanLoop();
    }
  }, 1200);
}

/* =========================
   QUESTION
========================= */
function askQuestion(topic) {
  currentState = STATE.ANSWERING;
  updateStartButtonLock();
  resetPlayerAnswers();

  const set = QUESTION_BANK[topic];
  const pick = set[Math.floor(Math.random() * set.length)];

  currentAnswer = pick.a;
  questionText.textContent = pick.q;
  questionBox.style.display = "block";

  startTimer();
}

/* =========================
   TIMER
========================= */
function startTimer() {
  timeLeft = GAME_CONFIG.ANSWER_TIME;
  timeText.textContent = timeLeft;
  timeBarFill.style.width = "100%";

  timer = setInterval(() => {
    timeLeft--;
    timeText.textContent = timeLeft;
    timeBarFill.style.width =
      (timeLeft / GAME_CONFIG.ANSWER_TIME) * 100 + "%";

    if (timeLeft <= 0) {
      clearInterval(timer);
      if (!players[1].answered) playerAnswer(1, null);
      if (!players[2].answered) playerAnswer(2, null);
    }
  }, 1000);
}

/* =========================
   PLAYER ANSWER
========================= */
function playerAnswer(playerId, answer) {
  if (currentState !== STATE.ANSWERING) return;
  if (players[playerId].answered) return;

  players[playerId].answered = true;
  players[playerId].correct = answer === currentAnswer;
  players[playerId].time = timeLeft;

  updateWaitingStatus();

  if (players[1].answered && players[2].answered) {
    clearInterval(timer);
    scoreBattleRound();
    pauseNext();
  }
}

function updateWaitingStatus() {
  if (!players[1].answered)
    cameraStatus.textContent = "Menunggu Pemain 1...";
  else if (!players[2].answered)
    cameraStatus.textContent = "Menunggu Pemain 2...";
}

/* =========================
   SCORE
========================= */
function scoreBattleRound() {
  [1, 2].forEach(id => {
    const p = players[id];
    if (!p.correct) return;

    const earned = Math.max(
      GAME_CONFIG.SCORE.MIN,
      Math.min(GAME_CONFIG.SCORE.MAX, p.time)
    );

    id === 1 ? (scoreP1 += earned) : (scoreP2 += earned);
    playSound(soundCorrect);
  });

  currentRound++;
  updateUI();
}

/* =========================
   PAUSE / NEXT
========================= */
function pauseNext() {
  currentState = STATE.PAUSE;
  updateStartButtonLock();

  setTimeout(() => {
    questionBox.style.display = "none";

    if (currentRound >= GAME_CONFIG.TOTAL_ROUNDS) {
      endGame();
    } else {
      currentState = STATE.SCANNING;
      cameraStatus.textContent = UI_TEXT.SCANNING;
      scanLoop();
    }
  }, GAME_CONFIG.PAUSE_AFTER_CORRECT * 1000);
}

/* =========================
   END
========================= */
function endGame() {
  currentState = STATE.END;
  updateStartButtonLock();

  stopCameraAndScan();
  playSound(audioClap);
  cameraStatus.textContent = UI_TEXT.CONGRATS;
}

/* =========================
   RESET
========================= */
function resetGame() {
  if (timer) clearInterval(timer);

  stopCameraAndScan();

  currentState = STATE.IDLE;
  currentRound = 0;
  scoreP1 = 0;
  scoreP2 = 0;
  usedQR.clear();
  resetPlayerAnswers();

  questionBox.style.display = "none";
  cameraStatus.textContent = UI_TEXT.IDLE;

  updateUI();
}

/* =========================
   UTIL
========================= */
function toggleFullscreen() {
  if (!document.fullscreenElement)
    document.documentElement.requestFullscreen().catch(() => {});
  else document.exitFullscreen();
}

function goBackHome() {
  if (currentState !== STATE.IDLE && !confirm("Keluar ke menu utama?")) return;
  window.location.href = "../index.html";
}
