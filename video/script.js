/* ============================================================
   script.js — GEOQUIZ BATTLE MODE (2 PEMAIN)
============================================================ */

const STATE = {
  IDLE: "idle",
  SCANNING: "scanning",
  ANSWERING: "answering",
  END: "end"
};

let currentState = STATE.IDLE;
let currentRound = 0;
let usedQR = new Set();

let currentAnswer = null;
let timer = null;
let timeLeft = 0;

// PLAYER DATA
const players = {
  1: { score: 0, answered: false, correct: false },
  2: { score: 0, answered: false, correct: false }
};

/* =========================
   START GAME
========================= */
async function startGame() {
  currentRound = 0;
  usedQR.clear();

  players[1].score = 0;
  players[2].score = 0;

  updateUI();
  currentState = STATE.SCANNING;

  await startCamera();
  scanLoop();
}

/* =========================
   CAMERA
========================= */
async function startCamera() {
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
   QR SCAN LOOP
========================= */
function scanLoop(ts = performance.now()) {
  if (currentState !== STATE.SCANNING) return;

  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const qr = jsQR(img.data, img.width, img.height);

  if (qr && VALID_QR.includes(qr.data)) {
    if (!usedQR.has(qr.data)) {
      usedQR.add(qr.data);
      askQuestion(qr.data);
      return;
    }
  }

  requestAnimationFrame(scanLoop);
}
/* =========================
   QUESTION
========================= */
function askQuestion(topic) {
  currentState = STATE.ANSWERING;

  const set = QUESTION_BANK[topic];
  const pick = set[Math.floor(Math.random() * set.length)];

  currentAnswer = pick.a;
  questionText.textContent = pick.q;
  questionBox.style.display = "block";

  players[1].answered = false;
  players[2].answered = false;

  startTimer();
}

/* =========================
   TIMER
========================= */
function startTimer() {
  timeLeft = GAME_CONFIG.ANSWER_TIME;
  timeText.textContent = timeLeft;

  timer = setInterval(() => {
    timeLeft--;
    timeText.textContent = timeLeft;

    if (timeLeft <= 0) {
      clearInterval(timer);
      finishRound();
    }
  }, 1000);
}

/* =========================
   INPUT CALLBACK
========================= */
window.playerAnswer = function (player, ans) {
  if (currentState !== STATE.ANSWERING) return;
  if (players[player].answered) return;

  players[player].answered = true;
  players[player].correct = ans === currentAnswer;

  // siapa paling cepat & betul
  if (players[player].correct) {
    const earned = Math.max(
      GAME_CONFIG.SCORE.MIN,
      Math.min(GAME_CONFIG.SCORE.MAX, timeLeft)
    );
    players[player].score += earned;
  }

  // tunggu kedua-dua jawab
  if (players[1].answered && players[2].answered) {
    clearInterval(timer);
    finishRound();
  }
};

/* =========================
   ROUND END
========================= */
function finishRound() {
  currentRound++;
  updateUI();

  questionBox.style.display = "none";

  if (currentRound >= GAME_CONFIG.TOTAL_ROUNDS) {
    endGame();
  } else {
    currentState = STATE.SCANNING;
    scanLoop();
  }
}

/* =========================
   END GAME + HOF
========================= */
function endGame() {
  currentState = STATE.END;

  if (video.srcObject) {
    video.srcObject.getTracks().forEach(t => t.stop());
    video.srcObject = null;
  }

  const winner =
    players[1].score > players[2].score ? "P1" :
    players[2].score > players[1].score ? "P2" : "DRAW";

  addBattleHOF(players[1].score, players[2].score, winner);
}

/* =========================
   HALL OF FAME (BATTLE)
========================= */
const HOF_KEY = "geoquiz_battle_hof";

function addBattleHOF(p1, p2, winner) {
  const list = JSON.parse(localStorage.getItem(HOF_KEY) || "[]");

  list.push({
    p1, p2, winner,
    date: new Date().toLocaleDateString("ms-MY")
  });

  list.sort((a, b) => (b.p1 + b.p2) - (a.p1 + a.p2));
  localStorage.setItem(HOF_KEY, JSON.stringify(list.slice(0, 5)));
  renderBattleHOF();
}

function renderBattleHOF() {
  const ul = document.getElementById("hofVideo");
  if (!ul) return;

  ul.innerHTML = "";
  const list = JSON.parse(localStorage.getItem(HOF_KEY) || "[]");

  list.forEach((r, i) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <strong>${i + 1}. ${r.winner}</strong><br>
      P1: ${r.p1} | P2: ${r.p2}
      <small>(${r.date})</small>
    `;
    ul.appendChild(li);
  });
}

