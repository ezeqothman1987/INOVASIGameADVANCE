/* ============================================================
   input.js — GEOQUIZ BATTLE MODE (2 PLAYER)
------------------------------------------------------------
   TUGAS FAIL INI:
   - Terima input dari pelbagai sumber
   - Terjemah kepada:
       window.playerAnswer(1, true/false)
       window.playerAnswer(2, true/false)
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
   - data-player="1" / "2"
   - data-answer="true" / "false"
========================= */
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".battle-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      if (!canAnswer()) return;

      const player = Number(btn.dataset.player);
      const answer =
        btn.dataset.answer === "true"
          ? true
          : btn.dataset.answer === "false"
          ? false
          : null;

      if (player && answer !== null) {
        window.playerAnswer(player, answer);
      }
    });
  });
});

/* =========================
   2) KEYBOARD INPUT
------------------------------------------------
   PLAYER 1:
     A  → true
     B  → false

   PLAYER 2:
     ArrowLeft  → true
     ArrowRight → false

   (Dancepad special case)
     Player 1: ArrowUp / ArrowDown
     Player 2: ArrowLeft / ArrowRight
========================= */
document.addEventListener("keydown", e => {
  if (!canAnswer()) return;

  switch (e.key) {
    /* ===== PLAYER 1 ===== */
    case "a":
    case "A":
    case "ArrowUp":       // dancepad P1
      window.playerAnswer(1, true);
      break;

    case "b":
    case "B":
    case "ArrowDown":     // dancepad P1
      window.playerAnswer(1, false);
      break;

    /* ===== PLAYER 2 ===== */
    case "ArrowLeft":
      window.playerAnswer(2, true);
      break;

    case "ArrowRight":
      window.playerAnswer(2, false);
      break;
  }
});

/* =========================
   3) GAMEPAD / DANCEPAD
------------------------------------------------
   Pad 0 → Player 1
     Button 0 → true
     Button 1 → false

   Pad 1 → Player 2
     Button 0 → true
     Button 1 → false
========================= */
let lastGamepadState = {};

function pollGamepad() {
  const pads = navigator.getGamepads?.();
  if (!pads) return requestAnimationFrame(pollGamepad);

  pads.forEach((pad, padIndex) => {
    if (!pad || padIndex > 1) return;

    pad.buttons.forEach((btn, i) => {
      const key = `${padIndex}-${i}`;
      const prev = lastGamepadState[key] || false;

      if (btn.pressed && !prev && canAnswer()) {
        const player = padIndex + 1;

        if (i === 0) window.playerAnswer(player, true);
        if (i === 1) window.playerAnswer(player, false);
      }

      lastGamepadState[key] = btn.pressed;
    });
  });

  requestAnimationFrame(pollGamepad);
}

pollGamepad();

/* =========================
   4) ARDUINO / SERIAL INPUT
------------------------------------------------
   FORMAT DISYORKAN:
     P1:A   P1:B
     P2:A   P2:B

   (fallback legacy)
     A / B → Player 1
========================= */
window.handleArduinoInput = function (msg) {
  if (!canAnswer()) return;

  const v = msg.trim().toUpperCase();

  if (v === "P1:A") window.playerAnswer(1, true);
  if (v === "P1:B") window.playerAnswer(1, false);
  if (v === "P2:A") window.playerAnswer(2, true);
  if (v === "P2:B") window.playerAnswer(2, false);

  // fallback (lama)
  if (v === "A" || v === "1") window.playerAnswer(1, true);
  if (v === "B" || v === "0") window.playerAnswer(1, false);
};
