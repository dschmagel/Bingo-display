const socket = io();

const displayScreen = document.querySelector(".display-screen");
const numberView = document.getElementById("numberView");
const bingoView = document.getElementById("bingoView");
const fireworks = document.getElementById("fireworks");
const currentNumberBadge = document.getElementById("currentNumberBadge");
const currentLetter = document.getElementById("currentLetter");
const currentNumber = document.getElementById("currentNumber");
const recentCalls = document.getElementById("recentCalls");
const displayPattern = document.getElementById("displayPattern");
const patternBoardTitle = document.getElementById("patternBoardTitle");
const patternBoard = document.getElementById("patternBoard");

const fireworkColors = ["#ffd84d", "#ff5d73", "#54d6ff", "#7ef0a8", "#c78cff"];
const bingoLetters = ["B", "I", "N", "G", "O"];
let fireworksStarted = false;
let fireworksTimer = null;
let currentPattern = "Regular Bingo";
let patternCycleIndex = 0;

function getRow(rowIndex) {
  return Array.from({ length: 5 }, (unused, columnIndex) => rowIndex * 5 + columnIndex);
}

function getColumn(columnIndex) {
  return Array.from({ length: 5 }, (unused, rowIndex) => rowIndex * 5 + columnIndex);
}

function getSquareCells(startRow, startColumn, size) {
  const cells = [];

  for (let rowIndex = startRow; rowIndex < startRow + size; rowIndex += 1) {
    for (let columnIndex = startColumn; columnIndex < startColumn + size; columnIndex += 1) {
      cells.push(rowIndex * 5 + columnIndex);
    }
  }

  return cells;
}

function combineCells(...cellGroups) {
  return [...new Set(cellGroups.flat())];
}

function getTwoShapeCycles(shapeCycles) {
  const cycles = [];

  for (let firstIndex = 0; firstIndex < shapeCycles.length; firstIndex += 1) {
    for (let secondIndex = firstIndex + 1; secondIndex < shapeCycles.length; secondIndex += 1) {
      const firstCells = new Set(shapeCycles[firstIndex]);
      const shapesOverlap = shapeCycles[secondIndex].some((cell) => firstCells.has(cell));

      if (shapesOverlap) {
        continue;
      }

      cycles.push(combineCells(shapeCycles[firstIndex], shapeCycles[secondIndex]));
    }
  }

  return cycles;
}

const regularPatternCycles = [
  getRow(0),
  getRow(1),
  getRow(2),
  getRow(3),
  getRow(4),
  getColumn(0),
  getColumn(1),
  getColumn(2),
  getColumn(3),
  getColumn(4),
  [0, 6, 12, 18, 24],
  [4, 8, 12, 16, 20]
];

const hardLineNoSpaceCycles = regularPatternCycles.filter((cells) => {
  return !cells.includes(12);
});

const doublePatternCycles = [
  combineCells(getRow(0), getRow(1)),
  combineCells(getRow(2), getRow(3)),
  combineCells(getColumn(0), getColumn(4)),
  combineCells(getColumn(1), getColumn(3)),
  [0, 6, 12, 18, 24, 4, 8, 12, 16, 20]
];

const cornerPostageStampCycles = [
  getSquareCells(0, 0, 2),
  getSquareCells(0, 3, 2),
  getSquareCells(3, 0, 2),
  getSquareCells(3, 3, 2)
];

const floatingPostageStampCycles = [];
const boxCycles = [];

for (let rowIndex = 0; rowIndex <= 3; rowIndex += 1) {
  for (let columnIndex = 0; columnIndex <= 3; columnIndex += 1) {
    floatingPostageStampCycles.push(getSquareCells(rowIndex, columnIndex, 2));
  }
}

for (let rowIndex = 0; rowIndex <= 2; rowIndex += 1) {
  for (let columnIndex = 0; columnIndex <= 2; columnIndex += 1) {
    boxCycles.push(getSquareCells(rowIndex, columnIndex, 3));
  }
}

const patternCycles = {
  "Regular Bingo": regularPatternCycles,
  "Hard Line No Space": hardLineNoSpaceCycles,
  "Double Bingo": doublePatternCycles,
  "Four Corners or Inner Corners": [
    [0, 4, 20, 24],
    [6, 8, 16, 18]
  ],
  "Postage Stamp": cornerPostageStampCycles,
  "Two Postage Stamps": getTwoShapeCycles(cornerPostageStampCycles),
  "Floating Postage Stamp": floatingPostageStampCycles,
  "Floating Two Postage Stamps": getTwoShapeCycles(floatingPostageStampCycles),
  "Box": boxCycles
};

const patternCells = {
  "Corners": [0, 4, 20, 24],
  "X": [0, 4, 6, 8, 12, 16, 18, 20, 24],
  "Checkbox": [4, 8, 10, 12, 15, 16, 20],
  "Picture Frame": [
    ...getRow(0),
    ...getRow(4),
    ...getColumn(0),
    ...getColumn(4)
  ],
  "Blackout": Array.from({ length: 25 }, (unused, index) => index)
};

for (let index = 0; index < 25; index += 1) {
  const cell = document.createElement("span");
  cell.className = "pattern-board-cell";
  cell.dataset.index = index;

  if (index === 12) {
    cell.textContent = "FREE";
  }

  patternBoard.appendChild(cell);
}

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

function getPatternCells(pattern) {
  if (patternCycles[pattern]) {
    const cycles = patternCycles[pattern];
    return cycles[patternCycleIndex % cycles.length];
  }

  return patternCells[pattern] || regularPatternCycles[0];
}

function updatePatternBoard(pattern) {
  const activeCells = new Set(getPatternCells(pattern));

  document.querySelectorAll(".pattern-board-cell").forEach((cell) => {
    const cellIndex = Number(cell.dataset.index);
    cell.classList.toggle("active", activeCells.has(cellIndex));
  });
}

function updateRecentCalls(calledNumbers) {
  const newestCalls = calledNumbers.slice(-10).reverse();
  recentCalls.innerHTML = "";

  if (newestCalls.length === 0) {
    const emptyItem = document.createElement("span");
    emptyItem.className = "recent-call-empty";
    emptyItem.textContent = "No calls yet";
    recentCalls.appendChild(emptyItem);
    return;
  }

  for (const number of newestCalls) {
    const letter = number.charAt(0).toLowerCase();
    const item = document.createElement("span");
    item.className = `recent-call recent-call-${letter}`;
    item.textContent = formatDisplayNumber(number);
    recentCalls.appendChild(item);
  }
}

function updateDisplayMode(displayMode) {
  const mode = displayMode || "main";

  displayScreen.classList.remove(
    "display-mode-main",
    "display-mode-number",
    "display-mode-pattern",
    "display-mode-recent"
  );
  displayScreen.classList.add(`display-mode-${mode}`);
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
  updateDisplayMode(state.displayMode);

  showCurrentNumber(state.currentNumber);
  updateCurrentNumberStyle(state.currentNumber);
  const nextPattern = state.pattern || "Regular Bingo";

  if (nextPattern !== currentPattern) {
    patternCycleIndex = 0;
  }

  currentPattern = nextPattern;
  displayPattern.textContent = currentPattern;
  patternBoardTitle.textContent = `Pattern: ${currentPattern}`;
  updatePatternBoard(currentPattern);
  updateRecentCalls(state.calledNumbers);
}

socket.on("state:update", updateDisplay);

window.setInterval(() => {
  patternCycleIndex += 1;
  updatePatternBoard(currentPattern);
}, 2200);
