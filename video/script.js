/* =====================================================
   GEO QUIZ – 2 PLAYER EVENT MODE
   script.js (FINAL, DISUSUN & DIKEMASKAN)

   CIRI UTAMA:
   - 2 pemain serentak
   - Input keyboard:
       Pemain 1 → A / B
       Pemain 2 → ← / →
   - Jawapan dikunci selepas kedua-dua jawab
   - Bonus kelajuan +5 (jawab terpantas)
   - Timer ikut gameData.js
   - Hall of Fame 2 pemain
   ===================================================== */

/* =====================
   IMPORT KONFIGURASI GAME
   (UBAH DI gameData.js SAHAJA)
   ===================== */
import { TOTAL_ROUNDS, ROUND_TIME, SPEED_BONUS, ROUNDS } from "./gameData.js";
import { initInputHandlers } from "./input.js";

/* =====================
   DEBUG MODE(CHATGPT suruh untuk chek semua)
   ===================== */
const DEBUG = false; //tukar true/false  debug

/* =====================
   DEBUG OVERLAY
   ===================== */
let debugBox = null;

function initDebugOverlay() {
  if (!DEBUG) return;

  debugBox = document.createElement("div");
  debugBox.id = "debugOverlay";

  Object.assign(debugBox.style, {
    position: "fixed",
    bottom: "10px",
    right: "10px",
    width: "300px",
    maxHeight: "40vh",
    overflowY: "auto",
    background: "rgba(0,0,0,0.85)",
    color: "#0f0",
    fontFamily: "monospace",
    fontSize: "12px",
    padding: "10px",
    borderRadius: "8px",
    zIndex: 9999
  });

  debugBox.innerHTML = "<b>DEBUG MODE</b><hr>";
  document.body.appendChild(debugBox);
}

function debugLog(msg, data = null) {
  if (!DEBUG || !debugBox) return;

  const div = document.createElement("div");
  div.textContent =
    `[${new Date().toLocaleTimeString()}] ${msg}` +
    (data ? " → " + JSON.stringify(data) : "");

  debugBox.appendChild(div);
  debugBox.scrollTop = debugBox.scrollHeight;
}
function debugState(tag = "") {
  debugLog("STATE " + tag, {
    gameActive,
    roundLocked,
    currentRound,
    timer,
    answeredP1,
    answeredP2
  });
}

/* =====================
   ELEMENT UI
   ===================== */
const startBtn = document.getElementById("startGameBtn");
const stopBtn = document.getElementById("stopGameBtn");
const timerEl = document.getElementById("timer");
const roundEl = document.getElementById("round");
const scoreP1El = document.getElementById("scoreP1");
const scoreP2El = document.getElementById("scoreP2");
const statusText = document.getElementById("statusText");
const questionImage = document.getElementById("questionImage");

const endModal = document.getElementById("endModal");
const finalScoreP1El = document.getElementById("finalScoreP1");
const finalScoreP2El = document.getElementById("finalScoreP2");
const restartBtn = document.getElementById("restartBtn");
const saveHOFBtn = document.getElementById("saveHOFBtn");
const clearHOFBtn = document.getElementById("clearHOFBtn");
const HOF_KEY = "hof_video";


/* =====================
   FULLSCREEN HANDLER
   ===================== */
const fullscreenBtn = document.getElementById("fullscreenBtn");
if (fullscreenBtn) {
  fullscreenBtn.addEventListener("click", () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen();
    }
  });
}

/* =====================
   AUDIO EFFECT
   ===================== */
const AUDIO_PATH = "../static/sound/";

const soundCorrect = new Audio(`${AUDIO_PATH}yay.mp3`);
const soundWrong   = new Audio(`${AUDIO_PATH}boo.mp3`);

function playSound(audio) {
  if (!audio) return;
  try {
    audio.currentTime = 0;
    audio.play().catch(() => {});
  } catch(e) {}
}

/* =====================
   STATE GAME
   ===================== */
let currentRound = 1;
let timer = ROUND_TIME;
let timerInterval = null;
let gameActive = false;
let roundLocked = false;
let imageLoaded = false;

/* =====================
   STATE PEMAIN
   ===================== */
let scoreP1 = 0;
let scoreP2 = 0;

let answeredP1 = false;
let answeredP2 = false;

let timeP1 = null;
let timeP2 = null;

let answerP1 = null;
let answerP2 = null;

/* =====================
   SET SOALAN RAWAK
   ===================== */
let activeRounds = [];
function setupRandomRounds() {
  const shuffled = [...ROUNDS].sort(() => Math.random() - 0.5);
  activeRounds = shuffled.slice(0, TOTAL_ROUNDS);
  
   debugLog("setupRandomRounds()", {
    totalRounds: TOTAL_ROUNDS,
    available: ROUNDS.length,
    active: activeRounds.length
  });
}

/* =====================
   API UNTUK input.js
   ===================== */
function submitAnswer(player, answer) {
    debugLog(`submitAnswer P${player}`, answer);
  if (!gameActive || roundLocked) return;

  if (player === 1 && !answeredP1) {
    answeredP1 = true;
    answerP1 = answer;
    timeP1 = ROUND_TIME - timer;
    statusText.textContent = "Pemain 1 telah jawab";
  }

  if (player === 2 && !answeredP2) {
    answeredP2 = true;
    answerP2 = answer;
    timeP2 = ROUND_TIME - timer;
    statusText.textContent = "Pemain 2 telah jawab";
  }

  if (answeredP1 && answeredP2) {
    lockAnswers();
  }
}

function isActive() { return gameActive; }
function hasAnsweredP1() { return answeredP1; }
function hasAnsweredP2() { return answeredP2; }

// Init input sekali sahaja
initInputHandlers({ submitAnswer, isActive, hasAnsweredP1, hasAnsweredP2 });

/* =====================
   UTILITI UI
   ===================== */
function updateUI() {
  scoreP1El.textContent = scoreP1;
  scoreP2El.textContent = scoreP2;
  timerEl.textContent = timer;
  roundEl.textContent = currentRound;
}

function resetRoundState() {
  answeredP1 = false;
  answeredP2 = false;
  answerP1 = null;
  answerP2 = null;
  timeP1 = null;
  timeP2 = null;
  imageLoaded = false;
}

/* =====================
   START / STOP GAME
   ===================== */
startBtn.addEventListener("click", startGame);
if (stopBtn) stopBtn.addEventListener("click", stopGame);

function startGame() {
     debugLog("startGame()");
  scoreP1 = 0;
  scoreP2 = 0;
  currentRound = 1;

  setupRandomRounds();
  updateUI();

  gameActive = true;
  roundLocked = false;

  statusText.textContent = "Pusingan bermula!";
  startRound();
}

function stopGame() {
   debugLog("stopGame()");
  gameActive = false;
  roundLocked = true;
  clearInterval(timerInterval);
  statusText.textContent = "Permainan dihentikan.";
}

/* =====================
   START ROUND
   ===================== */
function startRound() {
     debugLog("startRound()", currentRound);
  resetRoundState();
  roundLocked = false;

  timer = ROUND_TIME;
  updateUI();

  const roundData = activeRounds[currentRound - 1];
  if (!roundData) return endGame();

  questionImage.style.opacity = "0.3";
  questionImage.src = roundData.image;
  statusText.textContent = "Memuatkan soalan…";

  questionImage.onload = () => {
     debugLog("image loaded", questionImage.src);
    imageLoaded = true;
    questionImage.style.opacity = "1";
    statusText.textContent = "Jawab sekarang!";

    timerInterval = setInterval(() => {
      timer--;
      timerEl.textContent = timer;
      if (timer <= 0) {
        clearInterval(timerInterval);
        lockAnswers();
      }
    }, 1000);
  };

questionImage.onerror = () => {
  debugLog("IMAGE LOAD FAILED", questionImage.src);

  statusText.textContent = "Soalan gagal dimuatkan";
  lockAnswers(); // elak game tersekat
};
}

/* =====================
   LOCK & SCORE
   ===================== */
function lockAnswers() {
     debugLog("lockAnswers()", {
    round: currentRound,
    correct: activeRounds[currentRound - 1]?.correct,
    p1: answerP1,
    p2: answerP2,
    timeP1,
    timeP2
  });
  if (roundLocked) return;
  roundLocked = true;
  clearInterval(timerInterval);

  const roundData = activeRounds[currentRound - 1];
  const correct = roundData.correct; // "A" / "B"

  let anyCorrect = false;

  if (answerP1 === correct) { scoreP1 += 10; anyCorrect = true; }
  if (answerP2 === correct) { scoreP2 += 10; anyCorrect = true; }

  if (answerP1 === correct && answerP2 === correct) {
    if (timeP1 < timeP2) scoreP1 += SPEED_BONUS;
    if (timeP2 < timeP1) scoreP2 += SPEED_BONUS;
  }

  playSound(anyCorrect ? soundCorrect : soundWrong);
  updateUI();

  setTimeout(nextRound, 1000);
}

/* =====================
   NEXT ROUND / END GAME
   ===================== */
function nextRound() {
     debugLog("nextRound()", {
    next: currentRound + 1,
    total: TOTAL_ROUNDS
  });
  currentRound++;
  if (currentRound > TOTAL_ROUNDS) endGame();
  else startRound();
}

function endGame() {
     debugLog("endGame()");
  gameActive = false;
  roundLocked = true;

  finalScoreP1El.textContent = scoreP1;
  finalScoreP2El.textContent = scoreP2;
   saveHOFBtn.disabled = false;              // ✅ reset butang
  saveHOFBtn.textContent = "Simpan Hall of Fame";
  endModal.style.display = "flex";
requestAnimationFrame(() => {
  endModal.classList.add("show");
});
     setTimeout(() => {
    const nameInput = document.getElementById("playerName");
    if (nameInput) {
      nameInput.focus();
      nameInput.select();
      debugLog("Name input focused");
    }
  }, 100);
}

restartBtn.addEventListener("click", () => {
  endModal.classList.remove("show");

  setTimeout(() => {
    endModal.style.display = "none";
    startGame();
  }, 300);
});

/* =====================
   HALL OF FAME (2 PEMAIN)
   ===================== */
saveHOFBtn.addEventListener("click", saveHallOfFame);

function saveHallOfFame() {
  if (saveHOFBtn.disabled) return;

  saveHOFBtn.disabled = true;

  const nameInput = document.getElementById("playerName");
  const name = nameInput?.value.trim() || "Tanpa Nama";

  const record = {
    name,
    scoreP1,
    scoreP2,
    total: scoreP1 + scoreP2,
    date: new Date().toLocaleString(),
    isNew: true
  };

  const hof = JSON.parse(localStorage.getItem("HOF_KEY") || "[]");
  hof.forEach(r => r.isNew = false);
  hof.push(record);
hof.sort((a, b) => b.total - a.total);

// Semak ranking baru
const rank = hof.findIndex(r => r === record);
if (rank >= 0 && rank < 3) {
  debugLog("🎉 TOP 3!", { rank: rank + 1 });
  launchConfetti();
}
localStorage.setItem("HOF_KEY", JSON.stringify(hof.slice(0, 10)));

  loadHallOfFame();
  debugLog("HOF saved", record);

  // Clear input
  if (nameInput) nameInput.value = "";

  endModal.classList.remove("show");

  setTimeout(() => {
    endModal.style.display = "none";
    saveHOFBtn.disabled = false;
  }, 300);
}
//boleh tekan enter nak add hof
document.addEventListener("keydown", (e) => {
  if (!endModal || endModal.style.display !== "flex") return;
  if (saveHOFBtn.disabled) return;

  if (e.key === "Enter") {
    e.preventDefault();
    debugLog("Enter pressed → saveHallOfFame()");
    saveHallOfFame();
  }
});
//masuk top3 ade confetti
function launchConfetti(count = 120) {
  for (let i = 0; i < count; i++) {
    const confetti = document.createElement("div");
    confetti.className = "confetti";

    const colors = ["#FFD700", "#FF5733", "#33FF57", "#3399FF", "#FF33A8"];
    confetti.style.backgroundColor =
      colors[Math.floor(Math.random() * colors.length)];

    confetti.style.left = Math.random() * 100 + "vw";
    confetti.style.animationDuration = 2 + Math.random() * 2 + "s";

    document.body.appendChild(confetti);

    setTimeout(() => confetti.remove(), 4000);
  }
}
//reset hof
if (clearHOFBtn) {
  clearHOFBtn.addEventListener("click", resetHallOfFame);
}
function resetHallOfFame() {
  if (!confirm("Anda pasti mahu padam Hall of Fame?")) return;
  localStorage.removeItem("HOF_KEY");
  loadHallOfFame();
  debugLog("HALL OF FAME RESET");
}
function updateClearHOFButton() {
  const hof = JSON.parse(localStorage.getItem("HOF_KEY") || "[]");
  clearHOFBtn.disabled = hof.length === 0;
}
//load hof
function loadHallOfFame() {
  const list = document.getElementById("hofList");
  if (!list) return;

  const hof = JSON.parse(localStorage.getItem("HOF_KEY") || "[]");
  list.innerHTML = "";

  hof.forEach((r, i) => {
    const li = document.createElement("li");
    li.classList.add("hof-item");
    if (i === 0) li.classList.add("hof-top", "gold");
    else if (i === 1) li.classList.add("hof-top", "silver");
    else if (i === 2) li.classList.add("hof-top", "bronze");
    if (r.isNew) li.classList.add("hof-new");

    li.innerHTML = `
      <div class="hof-name">${i + 1}. ${r.name}</div>
      <div class="hof-score">P1: ${r.scoreP1} | P2: ${r.scoreP2} | <strong>Jumlah: ${r.total}</strong></div>
      <div class="hof-date">📅 ${r.date}</div>
    `;
    list.appendChild(li);
  });
}
updateClearHOFButton();
/* =====================
   INIT
   ===================== */
document.addEventListener("DOMContentLoaded", () => {
  loadHallOfFame();
  initDebugOverlay();

  const backBtn = document.getElementById("backHomeBtn");

  if (backBtn && !backBtn.dataset.bound) {
    backBtn.dataset.bound = "1";

    backBtn.addEventListener("click", () => {
      if (!confirm("Keluar dan kembali ke Menu Utama?")) return;

      // 🛑 SAFE CLEANUP (tak akan error walaupun function tiada)
      if (typeof stopGame === "function") stopGame();
      if (typeof stopVideo === "function") stopVideo();
      if (typeof stopCamera === "function") stopCamera();
      if (typeof stopTimer === "function") stopTimer();

      window.location.href = "../index.html";
    });
  }
});
