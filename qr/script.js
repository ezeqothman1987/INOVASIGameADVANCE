/* ============================================================
   script.js — GEOQUIZ GAME LOGIC
   - Depends on: gameData.js, input.js, jsQR.js
============================================================ */

/* =========================
   DEBUG MODE
========================= */
const DEBUG = true;
function debugLog(...args) {
  if (DEBUG) console.log("[DEBUG]", ...args);
}

/* =========================
   DOM REFERENCES
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

/* =========================
   AUDIO
========================= */
const AUDIO_PATH = "../static/sound/";

const soundCorrect = new Audio(`${AUDIO_PATH}yay.mp3`);
const soundWrong   = new Audio(`${AUDIO_PATH}boo.mp3`);
const audioClap    = new Audio(`${AUDIO_PATH}clap.mp3`);

function playSound(audio) {
  if (!audio) return;
  try {
    audio.currentTime = 0;
    audio.play().catch(() => {});
  } catch(e) {}
}

/* =========================
   GAME STATE
========================= */
const STATE = {
  IDLE: "idle",
  SCANNING: "scanning",
  ANSWERING: "answering",
  PAUSE: "pause",
  END: "end"
};

let currentState = STATE.IDLE;
let currentRound = 0;
let score = 0;

let currentAnswer = null;
let timer = null;
let timeLeft = 0;

/* =========================
   QUESTION BANK (AKTIF 3 SAHAJA)
========================= */
const QUESTION_BANK = {
  Granit: [
    { q: "Granit ialah batuan igneus?", a: true },
    { q: "Granit terbentuk di permukaan bumi?", a: false }
  ],
  Syis: [
    { q: "Syis ialah batuan metamorf?", a: true },
    { q: "Syis terbentuk dari lava?", a: false }
  ],
  Kuarzit: [
    { q: "Kuarzit berasal dari batu pasir?", a: true },
    { q: "Kuarzit ialah batuan igneus?", a: false }
  ],

  // Batu lain (DISIMPAN)
  // Basalt: [],
  // Gneiss: [],
  // Marble: []
};

const VALID_QR = Object.keys(QUESTION_BANK);

/* =========================
   INIT
========================= */
function init() {
  debugLog("Init game");
  updateUI();
  startBtn.addEventListener("click", startGame);
}
document.addEventListener("DOMContentLoaded", init);

/* =========================
   UI UPDATE
========================= */
function updateUI() {
  roundText.textContent = `${currentRound} / ${GAME_CONFIG.TOTAL_ROUNDS}`;
  scoreText.textContent = score;
}

/* =========================
   GAME FLOW
========================= */
async function startGame() {
  debugLog("Game started");
  score = 0;
  currentRound = 0;
  updateUI();

  document.body.className = "scanning game-started";
  currentState = STATE.SCANNING;
  cameraStatus.textContent = UI_TEXT.SCANNING;

  await startCamera();
  scanLoop();
}

/* =========================
   CAMERA
========================= */
async function startCamera() {
  debugLog("Starting camera");
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

/* =========================
   QR SCAN LOOP
========================= */
function scanLoop() {
  if (currentState !== STATE.SCANNING) return;

  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);

  const qr = jsQR(img.data, img.width, img.height);

  if (qr) {
    debugLog("QR detected:", qr.data);
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
    debugLog("QR ignored:", payload);
    scanLoop();
    return;
  }

  debugLog("Valid QR:", payload);
  askQuestion(payload);
}

/* =========================
   QUESTION LOGIC
========================= */
function askQuestion(topic) {
  currentState = STATE.ANSWERING;
  document.body.className = "answering";

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
    timeBarFill.style.width = `${(timeLeft / GAME_CONFIG.ANSWER_TIME) * 100}%`;

    if (timeLeft <= 0) {
      clearInterval(timer);
      handleWrong();
    }
  }, 1000);
}

/* =========================
   PLAYER INPUT CALLBACK
   (dipanggil dari input.js)
========================= */
window.playerAnswer = function (ans) {
  if (currentState !== STATE.ANSWERING) return;

  clearInterval(timer);

  ans === currentAnswer ? handleCorrect() : handleWrong();
};

/* =========================
   CORRECT
========================= */
function handleCorrect() {
  debugLog("Correct!");
  audioCorrect.play();

  const earned = Math.max(
    GAME_CONFIG.SCORE.MIN,
    Math.min(GAME_CONFIG.SCORE.MAX, timeLeft)
  );

  score += earned;
  currentRound++;
  updateUI();

  questionBox.classList.add("question-correct");

  pauseNext();
}

/* =========================
   WRONG / TIMEOUT
========================= */
function handleWrong() {
  debugLog("Wrong or timeout");
  audioWrong.play();

  questionBox.classList.add("question-wrong");
  endGame(false);
}

/* =========================
   PAUSE & NEXT
========================= */
function pauseNext() {
  currentState = STATE.PAUSE;

  setTimeout(() => {
    questionBox.className = "question-box";
    questionBox.style.display = "none";

    if (currentRound >= GAME_CONFIG.TOTAL_ROUNDS) {
      endGame(true);
    } else {
      currentState = STATE.SCANNING;
      document.body.className = "scanning game-started";
      cameraStatus.textContent = UI_TEXT.SCANNING;
      scanLoop();
    }
  }, GAME_CONFIG.PAUSE_AFTER_CORRECT * 1000);
}

/* =========================
   END GAME
========================= */
function endGame(win) {
  currentState = STATE.END;

  if (win) {
    audioClap.play();
    cameraStatus.textContent = UI_TEXT.CONGRATS;
  } else {
    cameraStatus.textContent = UI_TEXT.GAME_OVER;
  }

  document.body.className = "idle";
}
