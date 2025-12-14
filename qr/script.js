/* ============================================================
   script.js — (clean, commented)
   ------------------------------------------------------------
   ENGINE GAME + UI + CAMERA + HALL OF FAME
============================================================ */
/* ============================================================
   0) SERIAL STATE
============================================================ */
let serialPort = null;
let serialWriter = null;
let serialReader = null;
let serialConnected = false;

/* ============================================================
   1) AUDIO
============================================================ */

const soundCorrect = new Audio(GAME_AUDIO.CORRECT);
const soundWrong   = new Audio(GAME_AUDIO.WRONG);
const soundCongrats = new Audio(GAME_AUDIO.CONGRATS);
const soundCountdown = new Audio(GAME_AUDIO.COUNTDOWN);

function safePlay(audio) {
  try {
    audio.currentTime = 0;
    audio.play().catch(() => {});
  } catch (e) {}
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
   3) GAME STATE MACHINE (INI JANTUNG ENGINE)
============================================================ */

const GAME_STATE = {
  IDLE: "IDLE",          // wait
  SCANNING: "SCANNING",  // kamera scan QR
  ANSWERING: "ANSWERING",// pemain jawab
  PAUSE: "PAUSE",        // pause sat
  END: "END"             // tamat
};

let gameState = GAME_STATE.IDLE;


/* ============================================================
   4) GAME STATE DATA
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
     if (DEBUG_MODE) {
    console.warn("DEBUG MODE: Kamera dimatikan");
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
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(img.data, canvas.width, canvas.height);

    if (
      code &&
      gameState === GAME_STATE.SCANNING &&
      !qrDebounce
    ) {
      qrDebounce = true;
      setTimeout(() => qrDebounce = false, 1200);

      onQRScanned(code.data);
    }
  }

  requestAnimationFrame(scanLoop);
}

function updateScanUI() {
  document.body.classList.remove("scanning");

  if (gameState === GAME_STATE.SCANNING) {
    document.body.classList.add("scanning");
  }
}

/* ============================================================
   6) GAME FLOW FUNCTIONS
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
   sendToESP32("GAME:START");
  resetGame();

  gameState = GAME_STATE.SCANNING;
  setText("rockName", UI_TEXT.SCANNING);
  if (el("cameraStatus")) {
    el("cameraStatus").textContent = UI_TEXT.SCANNING;
  }

  startCamera();
}


/* ============================================================
   7) QR BERJAYA DISCAN
============================================================ */

function onQRScanned(payload) {
  const txt = payload.trim().toLowerCase();
  if (txt !== QR_PAYLOAD.BETUL && txt !== QR_PAYLOAD.SALAH) return;

  lastQR = txt;
  gameState = GAME_STATE.ANSWERING;

  timeRemaining = GAME_CONFIG.ANSWER_TIME;
  setText("timer", timeRemaining);
  setText("rockName", UI_TEXT.ANSWER);

  if (el("cameraStatus")) {
    el("cameraStatus").textContent = UI_TEXT.ANSWER;
  }

  startQuestionTimer();
}


/* ============================================================
   8) TIMER JAWAPAN
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
   9) JAWAPAN PEMAIN (DIPANGGIL DARI input.js)
============================================================ */

function playerAnswer(answer) {
  if (gameState !== GAME_STATE.ANSWERING) return;

  if (answer === lastQR) {
    handleCorrectAnswer();
  } else {
    handleWrongAnswer();
  }
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
    (timeRemaining / GAME_CONFIG.ANSWER_TIME) *
    GAME_CONFIG.SCORE.MAX
  );

  score += Math.max(GAME_CONFIG.SCORE.MIN, raw);
  roundCount++;

  setText("score", score);

  gameState = GAME_STATE.PAUSE;

  setTimeout(() => {
    if (roundCount >= GAME_CONFIG.TOTAL_ROUNDS) {
      handleGameWin();
    } else {
      gameState = GAME_STATE.SCANNING;
      setText("rockName", UI_TEXT.SCANNING);
    }
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
   12) MENANG (CUKUP ROUND)
============================================================ */

function handleGameWin() 
  sendToESP32("LED:GOLD");
  gameState = GAME_STATE.END;

  safePlay(soundCongrats);
  flashScreen("gold");
  launchConfetti();

  endGame();
}


/* ============================================================
   13) END GAME → IDLE
============================================================ */

function endGame() 
  sendToESP32("GAME:END");
  stopCamera();
  stopQuestionTimer();

  gameState = GAME_STATE.END;

  setTextAll("finalScore", score);
  el("endModal").style.display = "block";
}


/* ============================================================
   14) VISUAL EFFECT
============================================================ */

function flashScreen(color) {
  document.body.classList.remove("flash-green", "flash-red", "flash-gold");

  if (color === "green") document.body.classList.add("flash-green");
  if (color === "red") document.body.classList.add("flash-red");
  if (color === "gold") document.body.classList.add("flash-gold");

  setTimeout(() => {
    document.body.classList.remove("flash-green", "flash-red", "flash-gold");
  }, 400);
}
/* ============================================================
   16) HALL OF FAME
============================================================ */
function savePlayerName() {
  const nameInput = el("playerName");
  const name = nameInput.value.trim() || "Tanpa Nama";

  const record = {
    name,
    score,
    date: new Date().toLocaleDateString()
  };

  const hof = JSON.parse(localStorage.getItem("hof_QR") || "[]");
  hof.push(record);

  hof.sort((a, b) => b.score - a.score);
  localStorage.setItem("hallOfFame", JSON.stringify(hof.slice(0, 10)));

  updateHallOfFameUI();

  // RESET KE IDLE
  nameInput.value = "";
  el("endModal").style.display = "none";

  resetGame();
  gameState = GAME_STATE.IDLE;

  setText("rockName", UI_TEXT.IDLE);
}
/* ============================================================
   16) STATUS CONTROLR
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

  serialPort = null;
  updateSerialStatus();
}

function updateSerialStatus() {
  el("serialStatus").textContent = serialConnected
    ? "CONNECTED"
    : "DISCONNECTED";
}
async function readSerialLoop() {
  const decoder = new TextDecoder();

  while (serialConnected) {
    try {
      const { value, done } = await serialReader.read();
      if (done) break;

      const msg = decoder.decode(value).trim();
      handleSerialInput(msg);
    } catch {
      break;
    }
  }
}
function handleSerialInput(msg) {
  if (gameState !== GAME_STATE.ANSWERING) return;

  if (msg === "BTN:1") playerAnswer("betul");
  if (msg === "BTN:2") playerAnswer("salah");
}

function sendToESP32(message) {
  if (!serialConnected || !serialWriter) return;

  const encoder = new TextEncoder();
  serialWriter.write(encoder.encode(message + "\n"));
}

/* ============================================================
   17) INIT
============================================================ */

document.addEventListener("DOMContentLoaded", () => {

  // START BUTTON (URUSETIA)
  el("startBtn")?.addEventListener("click", startGame);

  setText("rockName", UI_TEXT.IDLE);
  setText("timer", GAME_CONFIG.ANSWER_TIME);
document.addEventListener("keydown", (e) => {
  if (!DEBUG_MODE) return;

  if (e.key === "b" && gameState === GAME_STATE.SCANNING) {
    onQRScanned(QR_PAYLOAD.BETUL);
  }

  if (e.key === "s" && gameState === GAME_STATE.SCANNING) {
    onQRScanned(QR_PAYLOAD.SALAH);
  }
});
});
