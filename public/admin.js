const socket = io();

const numberBoard = document.getElementById("numberBoard");
const adminCurrentNumber = document.getElementById("adminCurrentNumber");
const calledCount = document.getElementById("calledCount");
const callHistoryList = document.getElementById("callHistoryList");
const patternSelect = document.getElementById("patternSelect");
const undoButton = document.getElementById("undoButton");
const bingoButton = document.getElementById("bingoButton");
const resumeButton = document.getElementById("resumeButton");
const resetButton = document.getElementById("resetButton");
const darkModeToggle = document.getElementById("darkModeToggle");
const correctionModeButton = document.getElementById("correctionModeButton");

const darkModeStorageKey = "bingoAdminDarkMode";
let correctionMode = false;
let latestCalledNumbers = [];

const bingoColumns = [
  { letter: "B", start: 1, end: 15 },
  { letter: "I", start: 16, end: 30 },
  { letter: "N", start: 31, end: 45 },
  { letter: "G", start: 46, end: 60 },
  { letter: "O", start: 61, end: 75 }
];

// Create all number buttons once. Socket updates will change their state.
for (const column of bingoColumns) {
  const group = document.createElement("section");
  group.className = "number-group";

  const heading = document.createElement("h2");
  heading.textContent = column.letter;
  group.appendChild(heading);

  const grid = document.createElement("div");
  grid.className = "number-grid";

  for (let value = column.start; value <= column.end; value += 1) {
    const number = `${column.letter}${value}`;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "number-button";
    button.textContent = number;
    button.dataset.number = number;
    button.addEventListener("click", () => {
      if (button.classList.contains("called") && correctionMode) {
        socket.emit("number:uncall", number);
        return;
      }

      socket.emit("number:call", number);
    });
    grid.appendChild(button);
  }

  group.appendChild(grid);
  numberBoard.appendChild(group);
}

function setDarkMode(isDarkMode) {
  document.body.classList.toggle("dark-mode", isDarkMode);
  darkModeToggle.checked = isDarkMode;
  localStorage.setItem(darkModeStorageKey, isDarkMode ? "true" : "false");
}

function setCorrectionMode(isCorrectionMode) {
  correctionMode = isCorrectionMode;
  document.body.classList.toggle("correction-mode", correctionMode);
  correctionModeButton.classList.toggle("active", correctionMode);
  correctionModeButton.setAttribute("aria-pressed", correctionMode ? "true" : "false");
  updateNumberButtons(latestCalledNumbers);
}

function updateCallHistory(calledNumbers) {
  const recentCalls = calledNumbers.slice(-10).reverse();
  calledCount.textContent = calledNumbers.length;
  callHistoryList.innerHTML = "";

  if (recentCalls.length === 0) {
    const emptyItem = document.createElement("li");
    emptyItem.className = "empty-history";
    emptyItem.textContent = "No numbers called yet";
    callHistoryList.appendChild(emptyItem);
    return;
  }

  for (const number of recentCalls) {
    const item = document.createElement("li");
    item.textContent = number;
    callHistoryList.appendChild(item);
  }
}

function updateNumberButtons(calledNumbers) {
  const calledNumberSet = new Set(calledNumbers);

  document.querySelectorAll(".number-button").forEach((button) => {
    const isCalled = calledNumberSet.has(button.dataset.number);
    button.disabled = isCalled && !correctionMode;
    button.classList.toggle("called", isCalled);
  });
}

function updateAdmin(state) {
  latestCalledNumbers = state.calledNumbers;
  adminCurrentNumber.textContent = state.currentNumber || "None";
  patternSelect.value = state.pattern || "Regular Bingo";
  updateCallHistory(state.calledNumbers);
  updateNumberButtons(state.calledNumbers);

  undoButton.disabled = state.calledNumbers.length === 0;
  resumeButton.disabled = !state.showBingo;
}

undoButton.addEventListener("click", () => {
  socket.emit("game:undo");
});

bingoButton.addEventListener("click", () => {
  socket.emit("game:show-bingo");
});

resumeButton.addEventListener("click", () => {
  socket.emit("game:resume");
});

resetButton.addEventListener("click", () => {
  const shouldReset = confirm("Reset the game and clear all called numbers?");

  if (shouldReset) {
    socket.emit("game:reset");
  }
});

darkModeToggle.addEventListener("change", () => {
  setDarkMode(darkModeToggle.checked);
});

correctionModeButton.addEventListener("click", () => {
  setCorrectionMode(!correctionMode);
});

patternSelect.addEventListener("change", () => {
  socket.emit("game:set-pattern", patternSelect.value);
});

setDarkMode(localStorage.getItem(darkModeStorageKey) === "true");
setCorrectionMode(false);

socket.on("state:update", updateAdmin);
