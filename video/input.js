
/* ============================================================
   input.js — BATTLE MODE (2 PEMAIN)
============================================================ 

function canAnswer() {
  return typeof window.playerAnswer === "function";
}
 =========================
   1) ON-SCREEN BUTTON
   - btnCorrect  → P1 A
   - btnWrong    → P1 B
   - btnCorrect2 → P2 A
   - btnWrong2   → P2 B
========================= 
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("btnCorrect")?.addEventListener("click", () => {
    if (canAnswer()) window.playerAnswer(1, true);
  });

  document.getElementById("btnWrong")?.addEventListener("click", () => {
    if (canAnswer()) window.playerAnswer(1, false);
  });

  document.getElementById("btnCorrect2")?.addEventListener("click", () => {
    if (canAnswer()) window.playerAnswer(2, true);
  });

  document.getElementById("btnWrong2")?.addEventListener("click", () => {
    if (canAnswer()) window.playerAnswer(2, false);
  });
});

 =========================
   2) KEYBOARD
   P1: A / ← , B / →
   P2: J / L
========================= 
document.addEventListener("keydown", e => {
  if (!canAnswer()) return;

  switch (e.key) {
    // PLAYER 1
    case "ArrowLeft":
    case "a":
    case "A":
      window.playerAnswer(1, true);
      break;

    case "ArrowRight":
    case "b":
    case "B":
      window.playerAnswer(1, false);
      break;

    // PLAYER 2
    case "j":
    case "J":
      window.playerAnswer(2, true);
      break;

    case "l":
    case "L":
      window.playerAnswer(2, false);
      break;
  }
});

 =========================
   3) GAMEPAD (PLAYER 1)
========================= 
let lastGamepadState = {};

function pollGamepad() {
  const pads = navigator.getGamepads?.();
  if (!pads) return requestAnimationFrame(pollGamepad);

  const pad = pads[0];
  if (!pad) return requestAnimationFrame(pollGamepad);

  pad.buttons.forEach((btn, i) => {
    const prev = lastGamepadState[i] || false;

    if (btn.pressed && !prev) {
      if (!canAnswer()) return;
      if (i === 0) window.playerAnswer(1, true);
      if (i === 1) window.playerAnswer(1, false);
    }

    lastGamepadState[i] = btn.pressed;
  });

  requestAnimationFrame(pollGamepad);
}
pollGamepad();

 =========================
   4) ARDUINO (PLAYER 1)
========================= 
window.handleArduinoInput = function (msg) {
  if (!canAnswer()) return;

  const v = msg.trim().toUpperCase();
  if (v === "A" || v === "1") window.playerAnswer(1, true);
  if (v === "B" || v === "0") window.playerAnswer(1, false);
};
*/
/* ============================================================
   input.js — GEOQUIZ BATTLE MODE (2 PLAYER)
   ------------------------------------------------------------
   TUGAS FAIL INI:
   - Terima input dari:
       1) On-screen buttons
       2) Keyboard
   - Terjemah kepada:
       window.playerAnswer(player, answer)
   - ❌ TIADA logik permainan
============================================================ */

/* =========================
   SAFETY CHECK
========================= */
function canAnswer() {
  return typeof window.playerAnswer === "function";
}

/* =========================
   1) ON-SCREEN BUTTONS
   (ikut index.html)
========================= */
document.addEventListener("DOMContentLoaded", () => {
  const buttons = document.querySelectorAll(".battle-btn");

  buttons.forEach(btn => {
    btn.addEventListener("click", () => {
      if (!canAnswer()) return;

      const player = Number(btn.dataset.player);
      const answer = btn.dataset.answer === "true";

      window.playerAnswer(player, answer);
    });
  });
});

/* =========================
   2) KEYBOARD INPUT
========================= */
/*
  PEMAIN 1:
    A → true
    B → false

  PEMAIN 2:
    ← → true
    → → false
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

