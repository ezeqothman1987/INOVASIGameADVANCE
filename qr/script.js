/* ============================================================
   script.js — ENGINE GAME (FINAL, STABLE)
   ------------------------------------------------------------
   Bergantung kepada:
   - jsQR.js
   - gameData.js (GAME_CONFIG, UI_TEXT, AUDIO, DEBUG_MODE, dll)
   - input.js (controller)
============================================================ */

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
const soundCorrect   = new Audio(GAME_AUDIO.CORRECT);
const soundWrong     = new Audio(GAME_AUDIO.WRONG);
const soundCongrats  = new Audio(GAME_AUDIO.CONGRATS);
const soundCountdown = new Audio(GAME_AUDIO.COUNTDOWN);

function safePlay(audio) {
  try {
    audio.currentTime = 0;
    audio.play().catch(() => {});
  } catch {}
}

/* ============================================================
   2) DOM HELPER
============================================================ */
function el(id) {
  return document.getElementById(id);
}
function setText(id, txt) {
  const n = el(id);
  if (n) n.textContent = txt;
}
function setTextAll(id, txt) {
  document.querySelectorAll(`#${id}`).forEach(n => n.textContent = txt);
}

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

function setGameState(state) {
  gameState = state;
  if (DEBUG_MODE) console.log("[STATE]", state);
}

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
const video  = el("video");
const canvas = el("qr-canvas");
const ctx    = canvas?.getContext("2d");

let scanning = false;
let qrDebounce = false;

async function startCamera() {
  if (DEBUG_MODE) {
    console.warn("[DEBUG] Kamera dimatikan");
    return;
  }

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
  if (video?.srcObject) {
    video.srcObject.getTracks().forEach(t => t.stop());
    video.srcObject = null;
  }
  scanning = false;
}

function scanLoop() {
  if (!scanning) return;

  if (video.readyState === video.HAVE_ENOUGH_DATA) {
    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height);

    const code = jsQR(img.data, canvas.width, canvas.height);

    if (code && gameState === GAME_STATE.SCANNING && !qrDebounce) {
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
function resetGame() {
  roundCount = 0;
  score = 0;
  lastQR = null;
  timeRemaining = 0;

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

  el("cameraStatus") &&
    (el("cameraStatus").textContent =
      DEBUG_MODE ? "[DEBUG] SIMULASI QR" : UI_TEXT.SCANNING);

  startCamera();
}

/* ============================================================
   7) QR SCANNED
============================================================ */
function onQRScanned(payload) {
  const txt = payload.trim().toLowerCase();
  if (txt !== QR_PAYLOAD.BETUL && txt !== QR_PAYLOAD.SALAH) return;

  lastQR = txt;
  setGameState(GAME_STATE.ANSWERING);

  timeRemaining = GAME_CONFIG.ANSWER_TIME;
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

    if (timeRemaining <= 0) {
      handleWrongAnswer();
    }
  }, 1000);
}

function stopQuestionTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

/* ============================================================
   9) PLAYER ANSWER (DARI input.js)
============================================================ */
function playerAnswer(answer) {
  if (gameState !== GAME_STATE.ANSWERING) return;
  answer === lastQR ? handleCorrectAnswer() : handleWrongAnswer();
}

/* ============================================================
   10) BETUL
============================================================ */
function handleCorrectAnswer() {
  sendToESP32("LED:GREEN");
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
  sendToESP32("LED:RED");
  stopQuestionTimer();
  safePlay(soundWrong);
  flashScreen("red");
  endGame();
}

/* ============================================================
   12) MENANG
============================================================ */
function handleGameWin() {
  sendToESP32("LED:GOLD");
  setGameState(GAME_STATE.END);

  safePlay(soundCongrats);
  flashScreen("gold");
  launchConfetti();

  endGame();
}

/* ============================================================
   13) END GAME
============================================================ */
function endGame() {
  sendToESP32("GAME:END");
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
  document.body.classList.remove("flash-green", "flash-red", "flash-gold");
  document.body.classList.add(`flash-${color}`);

  setTimeout(() => {
    document.body.classList.remove(`flash-${color}`);
  }, 400);
}

/* ============================================================
   15) HALL OF FAME (LOCAL STORAGE)
============================================================ */
function savePlayerName() {
  const name = el("playerName").value.trim() || "Tanpa Nama";

  const record = {
    name,
    score,
    date: new Date().toLocaleDateString()
  };

  const hof = JSON.parse(localStorage.getItem(HOF_QR_KEY) || "[]");
  hof.push(record);
  hof.sort((a, b) => b.score - a.score);

  localStorage.setItem(HOF_QR_KEY, JSON.stringify(hof.slice(0, 10)));
  updateHallOfFameUI();

  el("playerName").value = "";
  el("endModal").style.display = "none";

  resetGame();
  setGameState(GAME_STATE.IDLE);
}

/* ============================================================
   16) SERIAL (ESP32)
============================================================ */
async function connectArduino() {
  try {
    serialPort = await navigator.serial.requestPort();
    await serialPort.open({ baudRate: 115200 });

    serialWriter = serialPort.writable.getWriter();
    serialReader = serialPort.readable.getReader();

    serialConnected = true;
    updateSerialStatus();
    readSerialLoop();
  } catch (e) {
    console.error("Serial error:", e);
  }
}

async function disconnectArduino() {
  serialConnected = false;
  try {
    await serialReader?.cancel();
    await serialWriter?.close();
    await serialPort?.close();
  } catch {}
  updateSerialStatus();
}

function updateSerialStatus() {
  el("serialStatus").textContent =
    serialConnected ? "CONNECTED" : "DISCONNECTED";
}

async function readSerialLoop() {
  const decoder = new TextDecoder();
  while (serialConnected) {
    const { value, done } = await serialReader.read();
    if (done) break;
    handleSerialInput(decoder.decode(value).trim());
  }
}

function handleSerialInput(msg) {
  if (gameState !== GAME_STATE.ANSWERING) return;
  if (msg === "BTN:1") playerAnswer(QR_PAYLOAD.BETUL);
  if (msg === "BTN:2") playerAnswer(QR_PAYLOAD.SALAH);
}

function sendToESP32(message) {
  if (!serialConnected || !serialWriter) return;
  serialWriter.write(new TextEncoder().encode(message + "\n"));
}

/* ============================================================
   17) INIT
============================================================ */
document.addEventListener("DOMContentLoaded", () => {
  el("startBtn")?.addEventListener("click", startGame);

  setText("rockName", UI_TEXT.IDLE);
  setText("timer", GAME_CONFIG.ANSWER_TIME);

  if (DEBUG_MODE) {
    document.addEventListener("keydown", e => {
      if (gameState !== GAME_STATE.SCANNING) return;
      if (e.key === "b") onQRScanned(QR_PAYLOAD.BETUL);
      if (e.key === "s") onQRScanned(QR_PAYLOAD.SALAH);
    });
  }
});
