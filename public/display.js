const socket = io();

const numberView = document.getElementById("numberView");
const bingoView = document.getElementById("bingoView");
const fireworks = document.getElementById("fireworks");
const currentNumberBadge = document.getElementById("currentNumberBadge");
const currentLetter = document.getElementById("currentLetter");
const currentNumber = document.getElementById("currentNumber");
const previousNumber = document.getElementById("previousNumber");
const remainingCount = document.getElementById("remainingCount");
const displayPattern = document.getElementById("displayPattern");

const fireworkColors = ["#ffd84d", "#ff5d73", "#54d6ff", "#7ef0a8", "#c78cff"];
const bingoLetters = ["B", "I", "N", "G", "O"];
const totalBingoNumbers = 75;
let fireworksStarted = false;
let fireworksTimer = null;

function createFirework(x, y, color) {
  const burst = document.createElement("div");
  burst.className = "firework";
  burst.style.left = `${x}%`;
  burst.style.top = `${y}%`;
  burst.style.setProperty("--firework-color", color);

  for (let sparkIndex = 0; sparkIndex < 12; sparkIndex += 1) {
    const spark = document.createElement("span");
    const angle = sparkIndex * 30;
    spark.style.setProperty("--spark-angle", `${angle}deg`);
    burst.appendChild(spark);
  }

  fireworks.appendChild(burst);

  burst.addEventListener("animationend", () => {
    burst.remove();
  });
}

function startFireworks() {
  if (fireworksStarted) {
    return;
  }

  fireworksStarted = true;

  function launchRandomFirework() {
    const x = 12 + Math.random() * 76;
    const y = 12 + Math.random() * 54;
    const color = fireworkColors[Math.floor(Math.random() * fireworkColors.length)];
    createFirework(x, y, color);
  }

  // Stagger several bursts so BINGO mode feels celebratory right away.
  for (let index = 0; index < 12; index += 1) {
    window.setTimeout(() => {
      if (!fireworksStarted) {
        return;
      }

      launchRandomFirework();
    }, index * 220);
  }

  // Keep launching bursts while the BINGO screen is showing.
  fireworksTimer = window.setInterval(launchRandomFirework, 650);
}

function stopFireworks() {
  fireworksStarted = false;
  window.clearInterval(fireworksTimer);
  fireworksTimer = null;

  document.querySelectorAll(".firework").forEach((burst) => {
    burst.remove();
  });
}

function updateCurrentNumberStyle(number) {
  const letter = number ? number.charAt(0) : "";

  currentNumberBadge.classList.remove(
    "letter-b",
    "letter-i",
    "letter-n",
    "letter-g",
    "letter-o"
  );

  if (!bingoLetters.includes(letter)) {
    currentLetter.classList.add("hidden");
    currentLetter.textContent = "";
    return;
  }

  currentLetter.classList.remove("hidden");
  currentLetter.textContent = letter;
  currentNumberBadge.classList.add(`letter-${letter.toLowerCase()}`);
}

function formatDisplayNumber(number) {
  if (!number) {
    return null;
  }

  const letter = number.charAt(0);
  const value = number.slice(1);

  if (!bingoLetters.includes(letter)) {
    return number;
  }

  return `${letter} ${value}`;
}

function showCurrentNumber(number) {
  currentNumber.innerHTML = "";
  currentNumber.classList.toggle("ready-number", !number);

  if (!number) {
    currentNumber.textContent = "Ready";
    return;
  }

  const letter = number.charAt(0);
  const value = number.slice(1);

  if (!bingoLetters.includes(letter)) {
    currentNumber.textContent = number;
    return;
  }

  const letterSpan = document.createElement("span");
  letterSpan.className = "display-number-letter";
  letterSpan.textContent = letter;

  if (letter === "I") {
    letterSpan.classList.add("display-number-letter-i");
  }

  const valueSpan = document.createElement("span");
  valueSpan.className = "display-number-value";
  valueSpan.textContent = value;

  currentNumber.append(letterSpan, valueSpan);
}

function updateDisplay(state) {
  if (state.showBingo) {
    numberView.classList.add("hidden");
    bingoView.classList.remove("hidden");
    startFireworks();
    return;
  }

  stopFireworks();
  bingoView.classList.add("hidden");
  numberView.classList.remove("hidden");

  showCurrentNumber(state.currentNumber);
  updateCurrentNumberStyle(state.currentNumber);
  displayPattern.textContent = state.pattern || "Regular Bingo";
  previousNumber.textContent = formatDisplayNumber(state.previousNumber) || "None";
  remainingCount.textContent = totalBingoNumbers - state.calledNumbers.length;
}

socket.on("state:update", updateDisplay);
