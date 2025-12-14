/* ============================================================
   gameData.js
   - Enjin permainan
   - Simpan STATE & LOGIK sahaja
   - Tiada event listener
============================================================ */

/* =========================
   CONFIG GAME
========================= */
const TOTAL_ROUNDS = 5;
const ROUND_TIME = 20;
const NEXT_ROUND_TIME = 20;
const MAX_POINTS = 10;
const MIN_POINTS = 1;

/* =========================
   STATE GAME
========================= */
let awaitingAnswer = false;
let lastQR = "";
let roundCount = 0;
let score = 0;
let timeRemaining = ROUND_TIME;
let questionInterval = null;
let pausedUntilNextQR = false;

/* =========================
   RESET STATE GAME
========================= */
function resetGameState() {
  awaitingAnswer = false;
  lastQR = "";
  roundCount = 0;
  score = 0;
  timeRemaining = ROUND_TIME;
  pausedUntilNextQR = false;
  stopQuestionTimer();
}

/* =========================
   TERIMA QR
========================= */
function processScannedQR(payload) {
  const txt = String(payload).trim().toLowerCase();
  if (txt !== "betul" && txt !== "salah") return;

  lastQR = txt;
  awaitingAnswer = true;
  timeRemaining = ROUND_TIME;
  pausedUntilNextQR = false;

  setText("timer", timeRemaining);
  setText("rockName", "MULA MENJAWAB");

  startQuestionTimer();
}

/* =========================
   TIMER SOALAN
========================= */
function startQuestionTimer() {
  stopQuestionTimer();

  questionInterval = setInterval(() => {
    if (pausedUntilNextQR) return;

    timeRemaining--;
    setText("timer", timeRemaining);

    if (timeRemaining <= 0) {
      safePlay(soundTimeup);
      endGame();
    }
  }, 1000);
}

function stopQuestionTimer() {
  if (questionInterval) {
    clearInterval(questionInterval);
    questionInterval = null;
  }
}

/* =========================
   JAWAPAN PEMAIN
========================= */
function playerAnswer(answer) {
  if (!awaitingAnswer) return;

  const a = String(answer).toLowerCase();

  if (a === lastQR) {
    // BETUL
    stopQuestionTimer();
    safePlay(soundCorrect);

    const earned = Math.max(
      MIN_POINTS,
      Math.ceil((timeRemaining / ROUND_TIME) * MAX_POINTS)
    );

    score += earned;
    roundCount++;

    setText("score", score);

    awaitingAnswer = false;
    pausedUntilNextQR = true;
    timeRemaining = NEXT_ROUND_TIME;
    setText("timer", timeRemaining);
    setText("rockName", "–");

    if (roundCount >= TOTAL_ROUNDS) {
      setTimeout(endGame, 600);
    }

  } else {
    // SALAH
    stopQuestionTimer();
    safePlay(soundWrong);
    endGame();
  }
}
