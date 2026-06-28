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

// Serve the plain HTML, CSS, and browser JavaScript files from /public.
app.use(express.static(path.join(__dirname, "public")));

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
    if (gameState.calledNumbers.includes(number)) {
      return;
    }

    gameState.calledNumbers.push(number);
    gameState.showBingo = false;
    sendStateToEveryone();
  });

  socket.on("number:uncall", (number) => {
    if (!gameState.calledNumbers.includes(number)) {
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
