/* ============================================================
   gameData.js
   ============================================================ */

/* =================================================================
  DATA ROUND PERMAINAN (SOALAN KAT SINI, tambah kalau nak tambah round)
 format: 
 { image: "static/image/gambar+soalan", correct: "letak jawapan betul A/B" },
  =========================*/
export const ROUNDS = [
  { image: "static/image/gambar1.png", correct: "A" },
  { image: "static/image/gambar2.png", correct: "B" },
  { image: "static/image/gambar3.png", correct: "A" },
  { image: "static/image/gambar4.png", correct: "B" },
  { image: "static/image/gambar5.png", correct: "A" },
  { image: "static/image/gambar6.png", correct: "A" }
];

// =========================
// KONFIGURASI AUTO
// =========================
export const TOTAL_ROUNDS = 5; //berapa round?
export const ROUND_TIME  = 10; //masa per round
export const SPEED_BONUS = 5;

// =========================
// UTILITI
// =========================
export function getRoundData(roundNumber) {
  return ROUNDS[roundNumber - 1] || null;
}

/* ============================================================
   NOTA PENTING
   ------------------------------------------------------------
   1. Nak tukar gambar?
      → Tukar path image sahaja

   2. Nak tukar jawapan betul?
      → Tukar "correct": "A" atau "B"

   3. Nak tambah round (contoh 10)?
      → Tambah objek baru dalam array ROUNDS

   4. script.js, html dan lain2 JANGAN DIUSIK!

   5. cari Ezeq kalau nak ubah apa-apa (Tanya dulu sebelum buat)
============================================================ */
