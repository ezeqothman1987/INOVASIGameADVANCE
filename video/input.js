/* =====================================================
   input.js — FINAL (SAFE & CLEAN)
   ===================================================== */

let inputInitialized = false;

export function initInputHandlers(game) {
  if (inputInitialized) return;
  inputInitialized = true;

  document.addEventListener("keydown", (e) => {
    if (e.repeat) return;
    if (!game.isActive()) return;

    // PEMAIN 1
    if (!game.hasAnsweredP1() && (e.key === "a" || e.key === "A")) {
      game.submitAnswer(1, "A");
    }
    if (!game.hasAnsweredP1() && (e.key === "b" || e.key === "B")) {
      game.submitAnswer(1, "B");
    }

    // PEMAIN 2
    if (!game.hasAnsweredP2() && e.key === "ArrowLeft") {
      game.submitAnswer(2, "A");
    }
    if (!game.hasAnsweredP2() && e.key === "ArrowRight") {
      game.submitAnswer(2, "B");
    }
  });
}
