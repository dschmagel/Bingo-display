const path = require("path");
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;
const bingoPatterns = [
  "Regular Bingo",
  "Double Bingo",
  "Corners",
  "X",
  "Blackout"
];
const bingoColumns = [
  { letter: "B", start: 1, end: 15 },
  { letter: "I", start: 16, end: 30 },
  { letter: "N", start: 31, end: 45 },
  { letter: "G", start: 46, end: 60 },
  { letter: "O", start: 61, end: 75 }
];
const bingoNumbers = bingoColumns.flatMap((column) => {
  const numbers = [];

  for (let value = column.start; value <= column.end; value += 1) {
    numbers.push(`${column.letter}${value}`);
  }

  return numbers;
});

// Serve the plain HTML, CSS, and browser JavaScript files from /public.
// Disable browser caching so display/admin pages pick up style changes quickly.
app.use(express.static(path.join(__dirname, "public"), {
  etag: false,
  lastModified: false,
  setHeaders: (res) => {
    res.setHeader("Cache-Control", "no-store");
  }
}));

// Keep route names friendly and explicit for the two app pages.
app.get("/", (req, res) => {
  res.redirect("/display");
});

app.get("/display", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "display.html"));
});

app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin.html"));
});

// In-memory game state. This resets whenever the server restarts.
const gameState = {
  calledNumbers: [],
  showBingo: false,
  pattern: "Regular Bingo"
};

function getPublicState() {
  const currentNumber = gameState.calledNumbers.at(-1) || null;
  const previousNumber = gameState.calledNumbers.at(-2) || null;

  return {
    calledNumbers: gameState.calledNumbers,
    currentNumber,
    previousNumber,
    showBingo: gameState.showBingo,
    pattern: gameState.pattern
  };
}

function sendStateToEveryone() {
  io.emit("state:update", getPublicState());
}

io.on("connection", (socket) => {
  // Send the latest state as soon as a page connects.
  socket.emit("state:update", getPublicState());

  socket.on("number:call", (number) => {
    if (!bingoNumbers.includes(number) || gameState.calledNumbers.includes(number)) {
      return;
    }

    gameState.calledNumbers.push(number);
    gameState.showBingo = false;
    sendStateToEveryone();
  });

  socket.on("number:call-random", () => {
    const remainingNumbers = bingoNumbers.filter((number) => {
      return !gameState.calledNumbers.includes(number);
    });

    if (remainingNumbers.length === 0) {
      return;
    }

    const randomIndex = Math.floor(Math.random() * remainingNumbers.length);
    gameState.calledNumbers.push(remainingNumbers[randomIndex]);
    gameState.showBingo = false;
    sendStateToEveryone();
  });

  socket.on("number:uncall", (number) => {
    if (!bingoNumbers.includes(number) || !gameState.calledNumbers.includes(number)) {
      return;
    }

    gameState.calledNumbers = gameState.calledNumbers.filter((calledNumber) => {
      return calledNumber !== number;
    });
    gameState.showBingo = false;
    sendStateToEveryone();
  });

  socket.on("game:undo", () => {
    gameState.calledNumbers.pop();
    gameState.showBingo = false;
    sendStateToEveryone();
  });

  socket.on("game:set-pattern", (pattern) => {
    if (!bingoPatterns.includes(pattern)) {
      return;
    }

    gameState.pattern = pattern;
    sendStateToEveryone();
  });

  socket.on("game:show-bingo", () => {
    gameState.showBingo = true;
    sendStateToEveryone();
  });

  socket.on("game:resume", () => {
    gameState.showBingo = false;
    sendStateToEveryone();
  });

  socket.on("game:reset", () => {
    gameState.calledNumbers = [];
    gameState.showBingo = false;
    gameState.pattern = "Regular Bingo";
    sendStateToEveryone();
  });
});

server.listen(PORT, () => {
  console.log(`Bingo Display is running at http://localhost:${PORT}`);
});
