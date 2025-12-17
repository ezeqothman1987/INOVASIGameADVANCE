/* ============================================================
   gameData.js — GEOQUIZ (GAME 2)
   ------------------------------------------------------------
   ❗ EDIT FAIL INI SAHAJA UNTUK UBAH GAME
   ❌ JANGAN TAMBAH LOGIK / TIMER / EVENT
   ✔ DIGUNAKAN OLEH script.js(game2)
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
  Coal: [
    { q: "Batuan ini merupakan antara sumber utama tenaga bahan api di dunia.", a: true },
    { q: "Batuan ini tergolong dalam batuan igneus.", a: false }
  ],

  Syis: [
    { q: "Syis ialah batuan metamorf?", a: true },
    { q: "Syis terbentuk dari lava?", a: false }
  ],

  Kuarza: [
    { q: "Mineral ini merupaka nsalah satu di antara mineral paling banyak di kerak bumi", a: true },
    { q: "Mineral ini digunakan dalam pembuatan utama senjata api, cawan plastik & kertas.", a: false }
  ],
   
  Serpentinite: [
    { q: "Batuan ini tergolong dalam batuan metamorfik.", a: true },
    { q: "Nama batuan ini ialah Serpentinite.", a: true }
  ],
   
  Muskovit: [
    { q: "Mineral ini mempunyai sifat berkeping dan berwarna hitam", a: false },
    { q: "Mineral ini tergolong dalam kumpulan mika", a: false }
  ],  
   
   REE: [
    { q: "REE karbonat mengandungi mineral emas dan bijih timah.", a: false },
    { q: "REE digunakan dalam pembuatan Telefon pintar, tablet, kenderaan elektrik, turbin angin dan panel solar.", a: true }
  ],   
   
   Granit: [
    { q: "Mineral biasa yang terkandung dalam batuan ini ialah kuarza, alkali feldspar dan biotit.", a: true },
    { q: "Lesung batu dan meja dapur diperbuat daripada batuan ini.", a: true }
  ],   
   
   Syal: [
    { q: "Debu hitam dalam batuan ini disebabkan oleh kandungan karbon (grafit) yang tinggi.", a: true },
    { q: "Batuan ini merupakan batuan sedimen berbutir halus.", a: true }
  ],   
   
   Cassiterite: [
    { q: "Nama lain bagi mineral ini ialah BIJIH TIMAH.", a: true },
    { q: "Terdapat lombong mineral ini di Negeri Sembilan.", a: true }
  ],   
   
   Chalcopyrite: [
    { q: "Chalcopyrite juga dikenali sebagai fool’s gold.", a: true },
    { q: "Mineral ini merupakan sumber TEMBAGA.", a: true }
  ],
   
  Gneiss: [
    { q: "Batuan ini terbentuk melalui proses metamorfisme sentuhan.", a: false },
    { q: "Nama batuan ini ialah gneiss", a: true }
  ]

  // Simpan untuk masa depan
  // Basalt: [],
  // Gneiss: [],
  // Marble: []
};

/* =========================
   VALID QR LIST
   (DIGUNAKAN OLEH script.js)
========================= */
const VALID_QR = Object.keys(QUESTION_BANK);
