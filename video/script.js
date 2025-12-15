/* ============================================================
   script.js — GEOQUIZ BATTLE MODE (2 PLAYER)
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
const soundBlocked = new Audio(`${AUDIO_PATH}blocked.mp3`);
const audioClap = new Audio(`${AUDIO_PATH}clap.mp3`);

function playSound(a) {
  try {
    a.currentTime = 0;
    a.play().catch(() => {});
  } catch {}
}
/* =========================
   HALL OF FAME (BATTLE)
========================= */
const HOF_BATTLE_KEY = "geoquiz_battle_hof";
const HOF_BATTLE_MAX = 5;

function loadBattleHOF() {
  try {
    return JSON.parse(localStorage.getItem(HOF_BATTLE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveBattleHOF(list) {
  localStorage.setItem(HOF_BATTLE_KEY, JSON.stringify(list));
}

function renderBattleHOF() {
  const ul = document.getElementById("hofList"); // ikut HTML awak
  if (!ul) return;

  const hof = loadBattleHOF();
  ul.innerHTML = "";

  hof.forEach((r, i) => {
    const li = document.createElement("li");
    li.className = "hof-item";
    li.innerHTML = `
      <strong>${i + 1}. ${r.p1} vs ${r.p2}</strong><br>
      <span>${r.s1} - ${r.s2}</span>
      <small>${r.date}</small>
    `;
    ul.appendChild(li);
  });
}

function addBattleHOF(p1, p2, s1, s2) {
  const hof = loadBattleHOF();

  hof.push({
    p1, p2,
    s1, s2,
    date: new Date().toLocaleDateString("ms-MY")
  });

  hof.sort((a, b) => (b.s1 + b.s2) - (a.s1 + a.s2));
  saveBattleHOF(hof.slice(0, HOF_BATTLE_MAX));
  renderBattleHOF();
}
//reset HOF
function clearBattleHOF() {
  if (!confirm("Padam semua rekod Battle Mode?")) return;

  localStorage.removeItem(HOF_BATTLE_KEY);
  renderBattleHOF();
}
/* =========================
   STATE
========================= */
const STATE = {
  IDLE: "idle",
  SCANNING: "scanning",
  ANSWERING: "answering",
  QR_BLOCKED: "qr_blocked",
  PAUSE: "pause",
  END: "end"
};

let currentState = STATE.IDLE;
let currentRound = 0;
let usedQR = new Set();
let timer = null;
let timeLeft = 0;
let currentAnswer = null;

/* =========================
   PLAYER (BATTLE)
========================= */
let scoreP1 = 0;
let scoreP2 = 0;

let players = {
  1: { answered: false, answer: null, correct: false, time: 0 },
  2: { answered: false, answer: null, correct: false, time: 0 }
};

function resetPlayerAnswers() {
  players[1] = { answered: false, answer: null, correct: false, time: 0 };
  players[2] = { answered: false, answer: null, correct: false, time: 0 };
}

function updateAnswerStatus() {
  if (players[1].answered && !players[2].answered)
    cameraStatus.textContent = "Menunggu jawapan Pemain 2...";
  else if (!players[1].answered && players[2].answered)
    cameraStatus.textContent = "Menunggu jawapan Pemain 1...";
  else
    cameraStatus.textContent = "Menunggu kedua-dua pemain...";
}

/* =========================
   INIT
========================= */
function init() {
  updateUI();
  renderBattleHOF();

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
   const clearBtn = document.getElementById("clearHOFBtn");
   if (clearBtn) {
     clearBtn.addEventListener("click", clearBattleHOF);
   }
   
  fullscreenBtn?.addEventListener("click", toggleFullscreen);
  backHomeBtn?.addEventListener("click", goBackHome);

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stopCameraAndScan();
  });
}
document.addEventListener("DOMContentLoaded", init);

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
async function handleStartButton() {
  if (currentState === STATE.IDLE || currentState === STATE.END) {
    startGame();
  } else if (confirm("Hentikan permainan?")) {
    resetGame();
  }
}

async function startGame() {
  scoreP1 = 0;
  scoreP2 = 0;
  currentRound = 0;
  usedQR.clear();

  currentState = STATE.SCANNING;
  updateUI();
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
  if (video?.srcObject) {
    video.srcObject.getTracks().forEach(t => t.stop());
    video.srcObject = null;
  }
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

/* =========================
   QR SCAN
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

function handleQR(payload) {
  if (!VALID_QR.includes(payload)) return scanLoop();

  if (usedQR.has(payload)) {
    currentState = STATE.QR_BLOCKED;
    playSound(soundBlocked);
    cameraStatus.textContent = "QR telah digunakan";
    return setTimeout(() => {
      currentState = STATE.SCANNING;
      cameraStatus.textContent = UI_TEXT.SCANNING;
      scanLoop();
    }, 1200);
  }

  usedQR.add(payload);
  askQuestion(payload);
}

/* =========================
   QUESTION
========================= */
function askQuestion(topic) {
  currentState = STATE.ANSWERING;
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
   ANSWER
========================= */
window.playerAnswer = function (id, ans) {
  if (currentState !== STATE.ANSWERING) return;
  if (players[id].answered) return;

  players[id].answered = true;
  players[id].answer = ans;
  players[id].time = timeLeft;

  updateAnswerStatus();

  if (players[1].answered && players[2].answered) {
    clearInterval(timer);
    evaluateRound();
  }
};

function evaluateRound() {
  [1, 2].forEach(id => {
    players[id].correct = players[id].answer === currentAnswer;
    playSound(players[id].correct ? soundCorrect : soundWrong);
  });

  scoreBattleRound();
  pauseNext();
}

/* =========================
   SCORE
========================= */
function scoreBattleRound() {
  [1, 2].forEach(id => {
    if (!players[id].correct) return;
    const earned = Math.max(
      GAME_CONFIG.SCORE.MIN,
      Math.min(GAME_CONFIG.SCORE.MAX, players[id].time)
    );
    id === 1 ? (scoreP1 += earned) : (scoreP2 += earned);
  });

  currentRound++;
  updateUI();
}

/* =========================
   NEXT / END
========================= */
function pauseNext() {
  currentState = STATE.PAUSE;

  setTimeout(() => {
    questionBox.style.display = "none";
    resetPlayerAnswers();

    if (currentRound >= GAME_CONFIG.TOTAL_ROUNDS) {
      endGame();
    } else {
      currentState = STATE.SCANNING;
      cameraStatus.textContent = UI_TEXT.SCANNING;
      scanLoop();
    }
  }, GAME_CONFIG.PAUSE_AFTER_CORRECT * 1000);
}

function endGame() {
  currentState = STATE.END;
  stopCameraAndScan();
  playSound(audioClap);
  cameraStatus.textContent = UI_TEXT.CONGRATS;
}

/* =========================
   RESET / UTIL
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

function toggleFullscreen() {
  if (!document.fullscreenElement)
    document.documentElement.requestFullscreen().catch(() => {});
  else document.exitFullscreen();
}

function goBackHome() {
  if (currentState !== STATE.IDLE && !confirm("Keluar ke menu utama?")) return;
  stopCameraAndScan();
  window.location.href = "../index.html";
}
