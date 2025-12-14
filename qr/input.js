/* ============================================================
   input.js — INPUT CONTROLLER
   ------------------------------------------------------------
   - Butang BETUL / SALAH
   - Keyboard (DEBUG)
   - Arduino Mode toggle
   - Anti salah tekan
============================================================ */

/* ============================================================
   1) HELPER
============================================================ */
function bindOnce(el, event, fn) {
  if (!el || el.dataset.bound) return;
  el.dataset.bound = "1";
  el.addEventListener(event, fn);
}

/* ============================================================
   2) ANSWER BUTTONS (ON-SCREEN)
============================================================ */
function initAnswerButtons() {
  const btnCorrect = document.getElementById("btnCorrect");
  const btnWrong   = document.getElementById("btnWrong");

  bindOnce(btnCorrect, "click", () => {
    if (typeof playerAnswer === "function") {
      playerAnswer(QR_PAYLOAD.BETUL);
    }
  });

  bindOnce(btnWrong, "click", () => {
    if (typeof playerAnswer === "function") {
      playerAnswer(QR_PAYLOAD.SALAH);
    }
  });
}

/* ============================================================
   3) KEYBOARD INPUT (DEBUG ONLY)
============================================================ */
function initKeyboardDebug() {
  if (!DEBUG_MODE) return;

  document.addEventListener("keydown", e => {
    if (e.repeat) return; // anti hold

    // Jawab semasa ANSWERING sahaja
    if (typeof gameState !== "undefined" &&
        gameState !== GAME_STATE.ANSWERING) return;

    if (e.key === "1") playerAnswer(QR_PAYLOAD.BETUL);
    if (e.key === "2") playerAnswer(QR_PAYLOAD.SALAH);
  });
}

/* ============================================================
   4) ARDUINO MODE TOGGLE
============================================================ */
function initArduinoToggle() {
  const toggle = document.getElementById("arduinoMode");
  const btn    = document.getElementById("connectArduinoBtn");

  if (!toggle || !btn) return;

  bindOnce(btn, "click", () => {
    if (!toggle.checked) {
      alert("Aktifkan Arduino Mode dahulu");
      return;
    }

    if (typeof serialConnected !== "undefined" && serialConnected) {
      disconnectArduino?.();
    } else {
      connectArduino?.();
    }
  });
}

/* ============================================================
   5) FULLSCREEN BUTTON
============================================================ */
function initFullscreenBtn() {
  const btn = document.getElementById("fullscreenBtn");
  if (!btn) return;

  bindOnce(btn, "click", () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen();
    }
  });
}

/* ============================================================
   6) BACK HOME BUTTON
============================================================ */
function initBackHomeBtn() {
  const btn = document.getElementById("backHomeBtn");
  if (!btn) return;

  bindOnce(btn, "click", () => {
    if (!confirm("Keluar dan kembali ke Menu Utama?")) return;

    // SAFE CLEANUP
    stopCamera?.();
    stopQuestionTimer?.();
    disconnectArduino?.();

    window.location.href = "../index.html";
  });
}

/* ============================================================
   7) CLEAR HALL OF FAME
============================================================ */
function initClearHOF() {
  const btn = document.getElementById("clearHOFBtn");
  if (!btn) return;

  bindOnce(btn, "click", () => {
    if (!confirm("Padam semua rekod Hall of Fame?")) return;
    clearHallOfFame?.();
  });
}

/* ============================================================
   8) INIT INPUT
============================================================ */
document.addEventListener("DOMContentLoaded", () => {
  initAnswerButtons();
  initKeyboardDebug();
  initArduinoToggle();
  initFullscreenBtn();
  initBackHomeBtn();
  initClearHOF();
});
