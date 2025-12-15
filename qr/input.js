/* ============================================================
   input.js
   ------------------------------------------------------------
   TUGAS FAIL INI:
   - Terima input dari pelbagai sumber
   - Terjemah kepada:
       window.playerAnswer(true)  → Jawapan A / BETUL
       window.playerAnswer(false) → Jawapan B / SALAH
   - TIADA logik permainan di sini
============================================================ */

/* =========================
   SAFETY CHECK
========================= */
function canAnswer() {
  return typeof window.playerAnswer === "function";
}

/* =========================
   1) ON-SCREEN BUTTON
========================= */
document.addEventListener("DOMContentLoaded", () => {
  const btnA = document.getElementById("btnCorrect"); // A
  const btnB = document.getElementById("btnWrong");   // B

  btnA?.addEventListener("click", () => {
    if (canAnswer()) window.playerAnswer(true);
  });

  btnB?.addEventListener("click", () => {
    if (canAnswer()) window.playerAnswer(false);
  });
});

/* =========================
   2) KEYBOARD INPUT
   - ArrowLeft / A  → A (true)
   - ArrowRight / B → B (false)
========================= */
document.addEventListener("keydown", e => {
  if (!canAnswer()) return;

  switch (e.key) {
    case "ArrowLeft":
    case "a":
    case "A":
      window.playerAnswer(true);
      break;

    case "ArrowRight":
    case "b":
    case "B":
      window.playerAnswer(false);
      break;
  }
});

/* =========================
   3) GAMEPAD / DANCEPAD
   - Button 0 → A
   - Button 1 → B
========================= */
let lastGamepadState = {};

function pollGamepad() {
  const pads = navigator.getGamepads?.();
  if (!pads) return requestAnimationFrame(pollGamepad);

  const pad = pads[0];
  if (!pad) return requestAnimationFrame(pollGamepad);

  pad.buttons.forEach((btn, i) => {
    const prev = lastGamepadState[i] || false;

    // tekan baru sahaja
    if (btn.pressed && !prev) {
      if (!canAnswer()) return;

      if (i === 0) window.playerAnswer(true);   // A
      if (i === 1) window.playerAnswer(false);  // B
    }

    lastGamepadState[i] = btn.pressed;
  });

  requestAnimationFrame(pollGamepad);
}

pollGamepad();

/* =========================
   4) ARDUINO / SERIAL INPUT
   - ESP32 hantar:
       "A" atau "1" → true
       "B" atau "0" → false
========================= */
window.handleArduinoInput = function (msg) {
  if (!canAnswer()) return;

  const v = msg.trim().toUpperCase();

  if (v === "A" || v === "1") {
    window.playerAnswer(true);
  }

  if (v === "B" || v === "0") {
    window.playerAnswer(false);
  }
};
