/* ============================================================
   script.js — GEOQUIZ TEXT QR (v2 FINAL)
============================================================ */

/* ============================================================
   0) DEBUG MODE
   true  → papar console log
   false → senyap
============================================================ */
const DEBUG = false;
const debug = (...args) => DEBUG && console.log("[DEBUG]", ...args);

/* ============================================================
   1) CONSTANT & AUDIO
============================================================ */
const SOUND = {
  CORRECT: new Audio("static/sound/yay.mp3"),
  WRONG:   new Audio("static/sound/boo.mp3"),
  WIN:     new Audio("static/sound/clap.mp3")
};

function playSound(aud) {
  try {
    aud.currentTime = 0;
    aud.play();
  } catch {}
}

/* ============================================================
   2) GAME STATE
============================================================ */
const STATE = {
  IDLE: "IDLE",
  SCANNING: "SCANNING",
  ANSWERING: "ANSWERING",
  PAUSE: "PAUSE",
  END: "END"
};

let gameState = STATE.IDLE;
function setState(s) {
  gameState = s;
  debug("STATE →", s);
}

/* ============================================================
   3) GAME DATA (SOALAN)
   ▶ 3 aktif, selebihnya DISIMPAN
============================================================ */
const QUESTION_BANK = {
  Granit: [
    {
      q: "Granit ialah batuan jenis igneus?",
      a: true
    },
    {
      q: "Granit terbentuk melalui pemendapan?",
      a: false
    }
  ],

  Syis: [
    {
      q: "Syis ialah batuan metamorf?",
      a: true
    },
    {
      q: "Syis terbentuk daripada lava?",
      a: false
    }
  ],

  Kuarzit: [
    {
      q: "Kuarzit berasal daripada batu pasir?",
      a: true
    },
    {
      q: "Kuarzit ialah batuan igneus?",
      a: false
    }
  ]

  // ===== SIMPAN UNTUK MASA DEPAN =====
  // BatuKapur: [],
  // Gneiss: [],
  // Basalt: [],
};

/* ============================================================
   4) DOM HELPER
============================================================ */
const el = id => document.getElementById(id);
const setText = (id, t) => el(id) && (el(id).textContent = t);

/* ============================================================
   5) GAME VARIABLE
============================================================ */
let roundCount = 0;
let score = 0;
let timer = null;
let timeLeft = 0;

let currentAnswer = null;

/* ============================================================
   6) CAMERA & QR SCAN
   (LOGIK ASAL KEKAL)
============================================================ */
let scanning = false;
const video = el("video");
const canvas = el("qr-canvas");
const ctx = canvas.getContext("2d");

async function startCamera() {
  debug("Camera start");
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: "environment" }
  });
  video.srcObject = stream;
  await video.play();
  scanning = true;
  requestAnimationFrame(scanLoop);
}

function stopCamera() {
  debug("Camera stop");
  video.srcObject?.getTracks().forEach(t => t.stop());
  video.srcObject = null;
  scanning = false;
}

function scanLoop() {
  if (!scanning || gameState !== STATE.SCANNING) {
    requestAnimationFrame(scanLoop);
    return;
  }

  if (video.readyState === video.HAVE_ENOUGH_DATA) {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(img.data, canvas.width, canvas.height);

    if (code) onQRScanned(code.data);
  }

  requestAnimationFrame(scanLoop);
}

/* ============================================================
   7) QR SCANNED (TEXT ONLY)
============================================================ */
function onQRScanned(payload) {
  if (gameState !== STATE.SCANNING) return;

  const text = payload.trim();
  debug("QR:", text);

  if (!QUESTION_BANK[text]) return; // IGNORE QR LAIN

  stopCamera();
  showQuestion(text);
}

/* ============================================================
   8) QUESTION FLOW
============================================================ */
function showQuestion(topic) {
  const list = QUESTION_BANK[topic];
  const pick = list[Math.floor(Math.random() * list.length)];

  currentAnswer = pick.a;

  el("questionText").textContent = pick.q;
  el("questionBox").style.display = "block";

  timeLeft = GAME_CONFIG.ANSWER_TIME;
  setText("timer", timeLeft);

  setState(STATE.ANSWERING);
  startTimer();
}

/* ============================================================
   9) TIMER
============================================================ */
function startTimer() {
  clearInterval(timer);

  timer = setInterval(() => {
    if (gameState !== STATE.ANSWERING) return;

    timeLeft--;
    setText("timer", timeLeft);

    if (timeLeft <= 0) {
      handleWrong();
    }
  }, 1000);
}

function stopTimer() {
  clearInterval(timer);
}

/* ============================================================
   10) PLAYER ANSWER (CALLED FROM input.js)
============================================================ */
window.playerAnswer = function (ans) {
  if (gameState !== STATE.ANSWERING) return;

  debug("Player answer:", ans);

  ans === currentAnswer ? handleCorrect() : handleWrong();
};

/* ============================================================
   11) BETUL
============================================================ */
function handleCorrect() {
  stopTimer();
  playSound(SOUND.CORRECT);

  const gained = Math.max(
    1,
    Math.ceil((timeLeft / GAME_CONFIG.ANSWER_TIME) * 20)
  );

  score += gained;
  roundCount++;

  setText("score", score);
  setState(STATE.PAUSE);

  debug("Correct | Score +", gained);

  setTimeout(() => {
    if (roundCount >= GAME_CONFIG.TOTAL_ROUNDS) {
      handleWin();
    } else {
      nextRound();
    }
  }, GAME_CONFIG.PAUSE_AFTER_CORRECT * 1000);
}

/* ============================================================
   12) SALAH / MASA HABIS
============================================================ */
function handleWrong() {
  stopTimer();
  playSound(SOUND.WRONG);
  debug("Wrong / Time up");
  endGame(false);
}

/* ============================================================
   13) NEXT ROUND
============================================================ */
function nextRound() {
  el("questionBox").style.display = "none";
  setState(STATE.SCANNING);
  startCamera();
}

/* ============================================================
   14) WIN
============================================================ */
function handleWin() {
  playSound(SOUND.WIN);
  debug("GAME WIN");
  endGame(true);
}

/* ============================================================
   15) END GAME
============================================================ */
function endGame(win) {
  stopCamera();
  stopTimer();
  setState(STATE.END);

  el("finalScore").textContent = score;
  el("endModal").style.display = "block";
}

/* ============================================================
   16) START GAME
============================================================ */
function startGame() {
  debug("Game start");

  roundCount = 0;
  score = 0;
  setText("score", 0);

  el("questionBox").style.display = "none";
  el("endModal").style.display = "none";

  setState(STATE.SCANNING);
  startCamera();
}

document.addEventListener("DOMContentLoaded", () => {
  el("startScanBtn").addEventListener("click", startGame);
});
