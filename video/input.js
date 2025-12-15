/* ============================================================
   input.js  (2 PLAYER)
   ------------------------------------------------------------
   TUGAS FAIL INI:
   - Terima input dari pelbagai sumber
   - Terjemah kepada:
       window.playerAnswer(player, answer)
         player: 1 | 2
         answer: true | false
   - TIADA logik permainan di sini
============================================================ */

/* =========================
   SAFETY CHECK
========================= */
function canAnswer() {
  return typeof window.playerAnswer === "function";
}

/* =========================
   1) ON-SCREEN BUTTONS
========================= */
document.addEventListener("DOMContentLoaded", () => {
  // PLAYER 1
  const btnP1A = document.getElementById("btnP1A");
  const btnP1B = document.getElementById("btnP1B");

  btnP1A?.addEventListener("click", () => {
    if (canAnswer()) window.playerAnswer(1, true);
  });

  btnP1B?.addEventListener("click", () => {
    if (canAnswer()) window.playerAnswer(1, false);
  });

  // PLAYER 2
  const btnP2Left  = document.getElementById("btnP2Left");
  const btnP2Right = document.getElementById("btnP2Right");

  btnP2Left?.addEventListener("click", () => {
    if (canAnswer()) window.playerAnswer(2, true);
  });

  btnP2Right?.addEventListener("click", () => {
    if (canAnswer()) window.playerAnswer(2, false);
  });
});

/* =========================
   2) KEYBOARD INPUT
========================= */
/*
   PLAYER 1
     A  → true
     B  → false

   PLAYER 2
     ArrowLeft  → true
     ArrowRight → false
*/
document.addEventListener("keydown", e => {
  if (!canAnswer()) return;

  switch (e.key) {
    // PLAYER 1
    case "a":
    case "A":
      window.playerAnswer(1, true);
      break;

    case "b":
    case "B":
      window.playerAnswer(1, false);
      break;

    // PLAYER 2
    case "ArrowLeft":
      window.playerAnswer(2, true);
      break;

    case "ArrowRight":
      window.playerAnswer(2, false);
      break;
  }
});

/* =========================
   3) GAMEPAD (2 PLAYER)
   - Pad 1:
       Btn 0 → P1 A
       Btn 1 → P1 B
   - Pad 2:
       Btn 0 → P2 A
       Btn 1 → P2 B
========================= */
let lastGamepadState = [{}, {}];

function pollGamepad() {
  const pads = navigator.getGamepads?.();
  if (!pads) return requestAnimationFrame(pollGamepad);

  pads.forEach((pad, index) => {
    if (!pad || index > 1) return;

    pad.buttons.forEach((btn, i) => {
      const prev = lastGamepadState[index][i] || false;

      if (btn.pressed && !prev) {
        if (!canAnswer()) return;

        if (i === 0) window.playerAnswer(index + 1, true);
        if (i === 1) window.playerAnswer(index + 1, false);
      }

      lastGamepadState[index][i] = btn.pressed;
    });
  });

  requestAnimationFrame(pollGamepad);
}

pollGamepad();

/* =========================
   4) ARDUINO / SERIAL INPUT
========================= */
/*
   Contoh mesej:
     P1:A
     P1:B
     P2:L
     P2:R
*/
window.handleArduinoInput = function (msg) {
  if (!canAnswer()) return;

  const v = msg.trim().toUpperCase();

  if (v === "P1:A") window.playerAnswer(1, true);
  if (v === "P1:B") window.playerAnswer(1, false);

  if (v === "P2:L") window.playerAnswer(2, true);
  if (v === "P2:R") window.playerAnswer(2, false);
};

