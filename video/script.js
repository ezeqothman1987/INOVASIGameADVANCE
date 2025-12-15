/* ============================================================
   script.js — GEOQUIZ 2P WIP
   - Depends on: gameData.js, input.js, jsQR.js
============================================================ */

/* =========================
   DEBUG MODE
========================= */
const DEBUG = true;
function debugLog(...args) {
  if (DEBUG) console.log("[DEBUG]", ...args);
}

/* =========================
   SCAN THROTTLE (reduce cpu usage?)
========================= */
const SCAN_INTERVAL = 120; // ms → ±8 scan/s
let lastScanTime = 0;

/* =========================
   DOM REFERENCES
========================= */
const video = document.getElementById("video");
const canvas = document.getElementById("qr-canvas");
const ctx = canvas.getContext("2d", { willReadFrequently: true });

const startBtn = document.getElementById("startBtn");
const cameraStatus = document.getElementById("cameraStatus");

const roundText = document.getElementById("roundText");
const scoreText = document.getElementById("scoreText");
const timeText = document.getElementById("timeText");

const questionBox = document.getElementById("questionBox");
const questionText = document.getElementById("questionText");
const timeBarFill = document.getElementById("timeBarFill");

const fullscreenBtn = document.getElementById("fullscreenBtn");
const backHomeBtn = document.querySelector(".back-home-btn");

const scoreP1Text  = document.getElementById("scoreP1");
const scoreP2Text  = document.getElementById("scoreP2");
const endModal     = document.getElementById("endModal");
const finalScoreP1 = document.getElementById("finalScoreP1");
const finalScoreP2 = document.getElementById("finalScoreP2");

/* =========================
   AUDIO
========================= */
//const AUDIO_PATH = "../static/sound/";

//const soundCorrect = new Audio(`${AUDIO_PATH}yay.mp3`);
//const soundWrong   = new Audio(`${AUDIO_PATH}boo.mp3`);
//const audioClap    = new Audio(`${AUDIO_PATH}clap.mp3`);
//const soundBlocked = new Audio(`${AUDIO_PATH}blocked.mp3`);

//function playSound(audio) {
//  if (!audio) return;
//  try {
//    audio.currentTime = 0;
//    audio.play().catch(() => {});
//  } catch(e) {}
//}
/* ============================================================
   HALL OF FAME — GEOQUIZ QR (2 PLAYER / BATTLE)
   - Simpan ke localStorage (KEY BARU)
   - Papar markah P1 & P2
   - Top 5 sahaja
============================================================ */

// CONFIG
const HOF_BATTLE_KEY = "geoquiz_hall_of_fame_2p";
const HOF_BATTLE_MAX = 5;

//LOAD
function loadHallOfFameBattle() {
  try {
    return JSON.parse(localStorage.getItem(HOF_BATTLE_KEY)) || [];
  } catch (e) {
    console.warn("HOF Battle load error", e);
    return [];
  }
}

//SAVE
function saveHallOfFameBattle(list) {
  localStorage.setItem(HOF_BATTLE_KEY, JSON.stringify(list));
}

//ADD RECORD
/*
  name     → nama pasukan / pemain
  scoreP1  → markah pemain 1
  scoreP2  → markah pemain 2
*/
function addToHallOfFameBattle(name, scoreP1, scoreP2) {
  scoreP1 = Number(scoreP1);
  scoreP2 = Number(scoreP2);

  if (isNaN(scoreP1) || isNaN(scoreP2)) {
    console.warn("HOF Battle: markah tidak sah");
    return;
  }

  debugLog("HOF BATTLE ADD:", name, scoreP1, scoreP2);

  const hof = loadHallOfFameBattle();

  hof.push({
    name: name?.trim() || "Tanpa Nama",
    scoreP1,
    scoreP2,
    total: scoreP1 + scoreP2,
    date: new Date().toLocaleDateString("ms-MY")
  });

  // Susun ikut JUMLAH MARKAH (battle ranking)
  hof.sort((a, b) => b.total - a.total);

  // Simpan top 5 sahaja
  saveHallOfFameBattle(hof.slice(0, HOF_BATTLE_MAX));

  renderHallOfFameBattle();
}

//RENDER UI
function renderHallOfFameBattle() {
  const ul = document.getElementById("hofBattleList");
  if (!ul) {
    console.warn("HOF Battle: elemen #hofBattleList tidak ditemui");
    return;
  }

  const hof = loadHallOfFameBattle();
  ul.innerHTML = "";

  if (hof.length === 0) {
    const li = document.createElement("li");
    li.className = "hof-item";
    li.style.opacity = "0.6";
    li.textContent = "Belum ada rekod";
    ul.appendChild(li);
    return;
  }

  hof.forEach((item, index) => {
    const li = document.createElement("li");
    li.className = "hof-item";

    li.innerHTML = `
      <div class="hof-name">
        ${index + 1}. ${item.name}
      </div>
      <div class="hof-scores">
        <span class="p1-score">P1: ${item.scoreP1}</span>
        <span class="p2-score">P2: ${item.scoreP2}</span>
      </div>
      <small style="opacity:.55">(${item.date})</small>
    `;

    ul.appendChild(li);
  });
}

//CLEAR RECORD
function clearHallOfFameBattle() {
  if (!confirm("Padam semua rekod Hall of Fame (2 Pemain)?")) return;

  localStorage.removeItem(HOF_BATTLE_KEY);
  renderHallOfFameBattle();

  debugLog("HOF Battle cleared");
}

//BIND RESET BUTTON
document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("clearHOFBattleBtn");
  btn?.addEventListener("click", clearHallOfFameBattle);

  renderHallOfFameBattle();
});

/* =========================
   GAME STATE
========================= */
const STATE = {
  IDLE: "idle",
  SCANNING: "scanning",
  ANSWERING: "answering",
  PAUSE: "pause",
  QR_BLOCKED: "qr_blocked",
  END: "end"
};

let currentState = STATE.IDLE;
let currentRound = 0;

let scoreP1 = 0;
let scoreP2 = 0;

let answeredP1 = false;
let answeredP2 = false;

let usedQR = new Set();
let currentAnswer = null;

let timer = null;
let timeLeft = 0;

/* =========================
   FUNGS HELPER
========================= */
function updateStartButtonLock() {
  if (currentState === STATE.ANSWERING || currentState === STATE.PAUSE) {
    startBtn.disabled = true;
    startBtn.classList.add("btn-locked");
  } else {
    startBtn.disabled = false;
    startBtn.classList.remove("btn-locked");
  }
}
/* =========================
   INIT
========================= */
function init() {
  debugLog("Init game");
  updateUI();

  startBtn.addEventListener("click", handleStartButton);

  if (fullscreenBtn) {
    fullscreenBtn.addEventListener("click", toggleFullscreen);
  }

  if (backHomeBtn) {
    backHomeBtn.addEventListener("click", goBackHome);
  }
//autostop time tuka page?
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      debugLog("Page hidden → stop camera & scan");
      stopCameraAndScan();
    }
  });
}

document.addEventListener("DOMContentLoaded", init);
/* =========================
   START BUTTON HANDLER
========================= */
function handleStartButton() {
  if (currentState === STATE.IDLE || currentState === STATE.END) {
    startGame();
    startBtn.textContent = "HENTIKAN";
    return;
  }

  // Game sedang berjalan
  const confirmStop = confirm("Anda pasti mahu menghentikan permainan?");
  if (confirmStop) {
    resetGame();
  }
}
/* =========================
   UI UPDATE
========================= */
function updateUI() {
  roundText.textContent = `${currentRound} / ${GAME_CONFIG.TOTAL_ROUNDS}`;
  scoreP1Text.textContent = scoreP1;
  scoreP2Text.textContent = scoreP2;

  if (currentState === STATE.IDLE || currentState === STATE.END) {
    startBtn.textContent = "MULA PERMAINAN";
  } else {
    startBtn.textContent = "HENTIKAN PERMAINAN";
  }
}

/* =========================
   GAME FLOW
========================= */
async function startGame() {
  debugLog("Game started");
  scoreP1 = 0;
  scoreP2 = 0;
  currentRound = 0;
  usedQR.clear();
  updateUI();
   

  document.body.className = "scanning game-started";
  currentState = STATE.SCANNING;
  updateStartButtonLock();
  cameraStatus.textContent = UI_TEXT.SCANNING;

  await startCamera();
  scanLoop();
}

/* =========================
   CAMERA
========================= */
async function startCamera() {
  debugLog("Starting camera");
  const stream = await navigator.mediaDevices.getUserMedia({ video: true });
  video.srcObject = stream;

  return new Promise(res => {
    video.onloadedmetadata = () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      res();
    };
  });
}

/* =========================
   STOP CAMERA & SCAN
========================= */
function stopCameraAndScan() {
  debugLog("Stopping camera & scan");

  currentState = STATE.IDLE;

  // Hentikan scan loop
  // (scanLoop akan auto stop sebab currentState bukan SCANNING)
  
  // Hentikan kamera
  if (video && video.srcObject) {
    video.srcObject.getTracks().forEach(track => track.stop());
    video.srcObject = null;
  }

  // Reset canvas (optional tapi elok)
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}
/* =========================
   QR SCAN LOOP (THROTTLED)
========================= */
function scanLoop(timestamp) {
  if (currentState !== STATE.SCANNING) return;

  //THROTTLE code
  if (timestamp - lastScanTime < SCAN_INTERVAL) {
    requestAnimationFrame(scanLoop);
    return;
  }
  lastScanTime = timestamp;

  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);

  const qr = jsQR(img.data, img.width, img.height);

  if (qr) {
    debugLog("QR detected:", qr.data);
    handleQR(qr.data.trim());
    return;
  }

  requestAnimationFrame(scanLoop);
}

/* =========================
   QR HANDLER
========================= */
function handleQR(payload) {
  if (!VALID_QR.includes(payload)) {
    debugLog("QR ignored:", payload);
    scanLoop();
    return;
  }

  // QR sama → JANGAN scanLoop terus
   if (usedQR.has(payload)) {
     debugLog("QR BLOCKED:", payload);
     showQRBlockedMessage();
     return;
   }

  // QR baru
  usedQR.add(payload);

  debugLog("QR accepted:", payload);
  askQuestion(payload);
}

 // Paus kalau guna QR sama-elak loop dan hanged
function showQRBlockedMessage() {
  currentState = STATE.QR_BLOCKED;
  cameraStatus.textContent = "QR ini sudah digunakan. Sila scan batuan lain";

  debugLog("QR BLOCKED: sama dengan yang telah digunakan");
  playSound(soundBlocked);

  setTimeout(() => {
    if (currentState === STATE.QR_BLOCKED) {
      currentState = STATE.SCANNING;
      cameraStatus.textContent = UI_TEXT.SCANNING;
      scanLoop();
    }
  }, 1200);
}

/* =========================
   QUESTION LOGIC
========================= */
function askQuestion(topic) {
  currentState = STATE.ANSWERING;
  updateStartButtonLock();
  document.body.className = "answering";
  answeredP1 = false;
  answeredP2 = false;

  const set = QUESTION_BANK[topic];
  const pick = set[Math.floor(Math.random() * set.length)];

  currentAnswer = pick.a;
  questionText.textContent = pick.q;
  questionBox.style.display = "block";

  startTimer();
}

/* =========================
   TIMER
========================= */
function startTimer() {
  timeLeft = GAME_CONFIG.ANSWER_TIME;
  timeText.textContent = timeLeft;
  timeBarFill.style.width = "100%";

  timer = setInterval(() => {
    timeLeft--;
    timeText.textContent = timeLeft;
    timeBarFill.style.width = `${(timeLeft / GAME_CONFIG.ANSWER_TIME) * 100}%`;

    if (timeLeft <= 0) {
    clearInterval(timer);
    timer = null;

    answeredP1 = true;
    answeredP2 = true;

    handleRoundEnd();
  }
  }, 1000);
}

/* =========================
   PLAYER INPUT
   dipanggil dari input.js
========================= */
window.playerAnswer = function (player, ans) {
  if (currentState !== STATE.ANSWERING) return;

  if (player === 1 && answeredP1) return;
  if (player === 2 && answeredP2) return;

  const correct = ans === currentAnswer;
  const score = correct ? 10 + timeLeft : 0;

  if (player === 1) {
    answeredP1 = true;
    scoreP1 += score;
  }

  if (player === 2) {
    answeredP2 = true;
    scoreP2 += score;
  }

  updateUI();

  if (answeredP1 && answeredP2) {
    clearInterval(timer);
    timer = null;
    handleRoundEnd();
  }
};

/* =========================
   ROUND END HANDLER
   - Dipanggil bila P1 & P2 selesai jawab
========================= */
function handleRoundEnd() {
  currentRound++;
  updateUI();

  questionBox.className = "question-box";
  questionBox.style.display = "none";

  // Tamat game jika cukup round
  if (currentRound >= GAME_CONFIG.TOTAL_ROUNDS) {
    endGame();
    return;
  }

  // Reset untuk round seterusnya
  answeredP1 = false;
  answeredP2 = false;
  currentAnswer = null;

  currentState = STATE.SCANNING;
  document.body.className = "scanning game-started";
  cameraStatus.textContent = UI_TEXT.SCANNING;

  scanLoop();
}

/* =========================
   END GAME (2 PLAYER)
========================= */
function endGame() {
  currentState = STATE.END;
  updateStartButtonLock();

  // Hentikan timer
  if (timer) {
    clearInterval(timer);
    timer = null;
  }

  // Hentikan kamera
  if (video?.srcObject) {
    video.srcObject.getTracks().forEach(t => t.stop());
    video.srcObject = null;
  }

  usedQR.clear();

  cameraStatus.textContent = "Permainan Tamat";

  document.body.className = "idle";

  // Simpan ke Hall of Fame (P1 vs P2)
  setTimeout(() => {
    const nameP1 = prompt("Nama Pemain 1:");
    const nameP2 = prompt("Nama Pemain 2:");

    if (nameP1 || nameP2) {
      addToHallOfFameBattle(
  (nameP1 || "Pemain 1") + " vs " + (nameP2 || "Pemain 2"),
  scoreP1,
  scoreP2
);
    }
  }, 300);
}

/* =========================
   RESET GAME
========================= */
function resetGame() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }

  if (video?.srcObject) {
    video.srcObject.getTracks().forEach(t => t.stop());
    video.srcObject = null;
  }

  currentState = STATE.IDLE;
  updateStartButtonLock();

  currentRound = 0;
  scoreP1 = 0;
  scoreP2 = 0;

  answeredP1 = false;
  answeredP2 = false;

  usedQR.clear();
  currentAnswer = null;

  questionBox.style.display = "none";
  questionBox.className = "question-box";
  cameraStatus.textContent = UI_TEXT.IDLE;
  document.body.className = "idle";

  updateUI();
}
/* =========================
   UI UTILITIES
========================= */

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {});
  } else {
    document.exitFullscreen();
  }
}

function goBackHome() {
  if (
    currentState !== STATE.IDLE &&
    !confirm("Keluar ke menu utama?")
  ) {
    return;
  }

  window.location.href = "../index.html";
}
