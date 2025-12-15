/* ============================================================
   gameData.js — GEOQUIZ (GAME 1)
   ------------------------------------------------------------
   ❗ EDIT FAIL INI SAHAJA UNTUK UBAH GAME
   ❌ JANGAN TAMBAH LOGIK / TIMER / EVENT
   ✔ DIGUNAKAN OLEH script.js
============================================================ */

/* =========================
   GAME CONFIG
========================= */
const GAME_CONFIG = {
  TOTAL_ROUNDS: 5,          // Bilangan pusingan / QR
  ANSWER_TIME: 20,          // Masa jawab (saat)
  PAUSE_AFTER_CORRECT: 3,   // Pause lepas betul (saat)

  SCORE: {
    MAX: 10,
    MIN: 1
  }
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

/* =========================
   QUESTION BANK (GAME 1)
   - QR payload → set soalan
   - Boleh tambah batu / topik
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
  ]

  // 🔒 Simpan untuk masa depan
  // Basalt: [],
  // Gneiss: [],
  // Marble: []
};

/* =========================
   VALID QR LIST
   (DIGUNAKAN OLEH script.js)
========================= */
const VALID_QR = Object.keys(QUESTION_BANK);
