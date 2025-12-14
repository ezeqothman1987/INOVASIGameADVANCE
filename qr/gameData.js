/* ============================================================
   gameData.js
   ------------------------------------------------------------
   EDIT FAIL INI SAHAJA UNTUK UBAH GAME
   JANGAN TAMBAH LOGIK / TIMER / EVENT
============================================================ */

/* =========================
   GAME CONFIG
========================= */
const GAME_CONFIG = {
  TOTAL_ROUNDS: 5,          // bilangan objek / pusingan
  ANSWER_TIME: 20,          // masa jawab (saat)
  PAUSE_AFTER_CORRECT: 3,   // pause lepas betul (saat)

  SCORE: {
    MAX: 10,
    MIN: 1
  }
};

/* =========================
   QR PAYLOAD
   (Pemain TIDAK NAMPAK)
========================= */
const QR_PAYLOAD = {
  BETUL: "betul",
  SALAH: "salah"
};

/* =========================
   AUDIO FILE
========================= */
const GAME_AUDIO = {
  CORRECT: "qr/static/sound/correct.mp3",
  WRONG: "qr/static/sound/wrong.mp3",
  CONGRATS: "qr/static/sound/congrats.mp3",
  COUNTDOWN: "qr/static/sound/countdown.mp3"
};

/* =========================
   UI TEXT
========================= */
const UI_TEXT = {
  IDLE: "TEKAN MULA BERMAIN",
  SCANNING: "SCANNING...",
  ANSWER: "SILA MENJAWAB",
  CONGRATS: "TAHNIAH!",
  GAME_OVER: "PERMAINAN TAMAT"
};
