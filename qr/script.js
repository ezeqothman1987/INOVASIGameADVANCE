/* ============================================================
   script.js — GEOQUIZ TEXT QR (HTML-SYNC VERSION)
============================================================ */

/* ============================================================
   0) DEBUG MODE
============================================================ */
const DEBUG = false;
const log = (...a) => DEBUG && console.log("[DEBUG]", ...a);

/* ============================================================
   1) AUDIO (ROOT /static/sound)
============================================================ */
const SOUND = {
  CORRECT: new Audio("../static/sound/yay.mp3"),
  WRONG:   new Audio("../static/sound/boo.mp3"),
  WIN:     new Audio("../static/sound/clap.mp3")
};

function playSound(a) {
  try { a.currentTime = 0; a.play(); } catch {}
}

/* ============================================================
   2) STATE MACHINE
============================================================ */
const STATE = {
  IDLE: "IDLE",
  SCANNING: "SCANNING",
  ANSWERING: "ANSWERING",
  PAUSE: "PAUSE",
  END: "END"
};

let gameState = STATE.IDLE;
const setState = s => {
  gameState = s;
  document.body.className = s.toLowerCase();
  log("STATE →", s);
};

/* ============================================================
   3) QUESTION BANK (3 AKTIF)
============================================================ */
const QUESTIONS = {
  Granit: [
    { q: "Granit ialah batuan igneus.", a: true },
    { q: "Granit terbentuk melalui pemendapan.", a: false }
  ],
  Syis: [
    { q: "Syis ialah batuan metamorf.", a: true },
    { q: "Syis ialah batuan igneus.", a: false }
  ],
  Kuarzit: [
    { q: "Kuarzit berasal daripada batu pasir.", a: true },
    { q: "Kuarzit ialah batuan sedimen.", a: false }
  ]
  // Lain DISIMPAN
};

/* ============================================================
   4) DOM HELPER
============================================================ */
const el = id => document.getElementById(id);
const txt = (id, v) => el(id) && (el(id).textContent = v);

/* ============================================================
   5) GAME VARIABLE
============================================================ */
let round = 0;
let score = 0;
let timer = null;
let timeLeft = 0;
let correctAnswer = null;

/* ============================================================
   6) CAMERA & QR
============================================================ */
const video = el("video");
const canvas = el("qr-canvas");
const ctx = canvas.getContext("2d", { willReadFrequently: true });
let scanning = false;

async function startCamera() {
  log("Camera ON");
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: "environment" }
  });
  video.srcObject = stream;
  scanning = true;
  requestAnimationFrame(scanLoop);
}

function stopCamera() {
  log("Camera OFF");
  video.srcObject?.getTracks().forEach(t => t.stop());
  video.srcObject = null;
  scanning = false;
}

function scanLoop() {
  if (!scanning || gameState !== STATE.SCANNING) return;

  if (video.readyState === video.HAVE_ENOUGH_DATA) {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const qr = jsQR(img.data, canvas.width, canvas.height);
    if (qr) onQRScanned(qr.data);
  }
  requestAnimationFrame(scanLoop);
}

/* ============================================================
   7) QR HANDLER (TEXT ONLY)
============================================================ */
function onQRScanned(text) {
  if (gameState !== STATE.SCANNING) return;
  text = text.trim();
  log("QR:", text);

  if (!QUESTIONS[text]) return; // ignore QR lain

  stopCamera();
  showQuestion(text);
}

/* ============================================================
   8) QUESTION FLOW
============================================================ */
function showQuestion(topic) {
  const q = QUESTIONS[topic];
  const pick = q[Math.floor(Math.random() * q.length)];

  correctAnswer = pick.a;
  el("questionText").textContent = pick.q;
  el("questionBox").style.display = "block";

  timeLeft = GAME_CONFIG.ANSWER_TIME;
  txt("timeText", timeLeft);

  setState(STATE.ANSWERING);
  startTimer();
}

/* ============================================================
   9) TIMER
============================================================ */
function startTimer() {
  clearInterval(timer);
  timer = setInterval(() => {
    timeLeft--;
    txt("timeText", timeLeft);
    el("timeBarFill").style.width =
      (timeLeft / GAME_CONFIG.ANSWER_TIME) * 100 + "%";

    if (timeLeft <= 0) handleWrong();
  }, 1000);
}

function stopTimer() {
  clearInterval(timer);
}

/* ============================================================
   10) INPUT CALLBACK (DARI input.js)
============================================================ */
window.playerAnswer = function (ans) {
  if (gameState !== STATE.ANSWERING) return;
  log("Answer:", ans);
  ans === correctAnswer ? handleCorrect() : handleWrong();
};

/* ============================================================
   11) BETUL
============================================================ */
function handleCorrect() {
  stopTimer();
  playSound(SOUND.CORRECT);

  const gain = Math.max(
    1,
    Math.ceil((timeLeft / GAME_CONFIG.ANSWER_TIME) * 20)
  );

  score += gain;
  round++;

  txt("scoreText", score);
  txt("roundText", `${round} / ${GAME_CONFIG.TOTAL_ROUNDS}`);

  setState(STATE.PAUSE);

  setTimeout(() => {
    round >= GAME_CONFIG.TOTAL_ROUNDS ? winGame() : nextRound();
  }, GAME_CONFIG.PAUSE_AFTER_CORRECT * 1000);
}

/* ============================================================
   12) SALAH / TIMEOUT
============================================================ */
function handleWrong() {
  stopTimer();
  playSound(SOUND.WRONG);
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
   14) WIN / END
============================================================ */
function winGame() {
  playSound(SOUND.WIN);
  endGame(true);
}

function endGame() {
  stopCamera();
  stopTimer();
  setState(STATE.END);
  alert("Permainan Tamat! Markah: " + score);
}

/* ============================================================
   15) START GAME
============================================================ */
function startGame() {
  log("START GAME");
  round = 0;
  score = 0;
  txt("scoreText", 0);
  txt("roundText", `0 / ${GAME_CONFIG.TOTAL_ROUNDS}`);
  el("questionBox").style.display = "none";
  setState(STATE.SCANNING);
  startCamera();
}

/* ============================================================
   16) INIT
============================================================ */
document.addEventListener("DOMContentLoaded", () => {
  el("startBtn")?.addEventListener("click", startGame);
});
