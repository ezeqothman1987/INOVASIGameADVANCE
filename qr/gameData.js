/* ============================================================
   gameData.js
   ------------------------------------------------------------
   EDIT FAIL INI SAHAJA UNTUK UBAH GAME
   JANGAN SENTUH FILE LAIN
============================================================ */

/* =========================
   GAME SETTING
========================= */

// Bilangan pusingan
const GAME_CONFIG = {
  TOTAL_ROUNDS: 5,

  // Masa jawab (saat)
  ANSWER_TIME: 20,

  // Pause lepas jawab betul (saat)
  PAUSE_AFTER_CORRECT: 3,

  // Markah
  SCORE: {
    MAX: 10,
    MIN: 1
  }
};

/* =========================
   QR DATA
========================= */
/*
  ⚠️ Pemain TAK NAMPAK data ini
  QR hanya simpan text:
  - "betul"
  - "salah"
*/

const QR_DATA = {
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
  GAME_OVER: "PERMAINAN TAMAT",
  CONGRATS: "TAHNIAH!"
};
