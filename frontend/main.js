
// Battleship Game: Single & Multiplayer

let mode = null; // 'single' or 'multi'
let socket = null;
const statusDiv = document.getElementById('status');
const gameDiv = document.getElementById('game');
const scoreboardDiv = document.getElementById('scoreboard');
const restartBtn = document.getElementById('restartBtn');
let room = null;
let isMyTurn = false;
let board = Array(5).fill().map(() => Array(5).fill(''));
let opponentBoard = Array(5).fill().map(() => Array(5).fill(''));
let aiBoard = Array(5).fill().map(() => Array(5).fill(''));
let aiShips = 2;
let playerShips = 2;
let playerScore = 0;
let computerScore = 0;
let multiScore = { me: 0, opponent: 0 };

function updateScoreboard() {
  if (mode === 'single') {
    scoreboardDiv.textContent = `You: ${playerScore} | Computer: ${computerScore}`;
  } else if (mode === 'multi') {
    scoreboardDiv.textContent = `You: ${multiScore.me} | Opponent: ${multiScore.opponent}`;
  } else {
    scoreboardDiv.textContent = '';
  }
}

restartBtn.onclick = () => {
  if (mode === 'single') startSinglePlayer();
  else if (mode === 'multi') startMultiplayer();
};

document.getElementById('singleBtn').onclick = () => {
  mode = 'single';
  // Do not reset playerScore or computerScore here
  updateScoreboard();
  restartBtn.style.display = '';
  startSinglePlayer();
};
document.getElementById('multiBtn').onclick = () => {
  mode = 'multi';
  multiScore = { me: 0, opponent: 0 };
  updateScoreboard();
  restartBtn.style.display = '';
  startMultiplayer();
};

function renderBoard(board, containerId, clickable = false, singlePlayer = false) {
  let html = '<div class="board">';
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      let cellClass = 'cell';
      if (board[r][c] === 'hit') cellClass += ' hit';
      if (board[r][c] === 'miss') cellClass += ' miss';
      html += `<div class="${cellClass}" data-row="${r}" data-col="${c}">${(board[r][c] === 'ship' && containerId === 'myBoard') ? '🚢' : ''}</div>`;
    }
  }
  html += '</div>';
  document.getElementById(containerId).innerHTML = html;
  if (clickable) {
    document.querySelectorAll(`#${containerId} .cell`).forEach(cell => {
      cell.onclick = (e) => {
        const row = parseInt(cell.getAttribute('data-row'));
        const col = parseInt(cell.getAttribute('data-col'));
        if (isMyTurn && (board[row][col] === '' || board[row][col] === 'ship')) {
          if (mode === 'single' && singlePlayer) {
            handlePlayerMove(row, col);
          } else if (mode === 'multi') {
            socket.emit('move', { room, row, col });
            isMyTurn = false;
            statusDiv.textContent = 'Waiting for opponent...';
          }
        }
      };
    });
  }
}

// --- SINGLE PLAYER MODE ---
function startSinglePlayer() {
  board = Array(5).fill().map(() => Array(5).fill(''));
  aiBoard = Array(5).fill().map(() => Array(5).fill(''));
  placeShipsRandomly(board);
  placeShipsRandomly(aiBoard);
  aiShips = 2;
  playerShips = 2;
  gameDiv.innerHTML = `
    <div class="board-container">
      <h2>Your Board</h2>
      <div id="myBoard"></div>
    </div>
    <div class="board-container">
      <h2>Computer Board</h2>
      <div id="opponentBoard"></div>
    </div>
  `;
  renderBoard(board, 'myBoard');
  renderBoard(aiBoard, 'opponentBoard', true, true);
  statusDiv.textContent = 'Game started! Your turn.';
  isMyTurn = true;
  updateScoreboard();
}

function handlePlayerMove(row, col) {
  if (aiBoard[row][col] === 'ship') {
    aiBoard[row][col] = 'hit';
    aiShips--;
    statusDiv.textContent = 'You hit a ship!';
  } else if (aiBoard[row][col] === '') {
    aiBoard[row][col] = 'miss';
    statusDiv.textContent = 'You missed!';
  } else {
    // Already hit/miss, do nothing
    return;
  }
  renderBoard(aiBoard, 'opponentBoard', true, true);
  if (aiShips === 0) {
    statusDiv.textContent = 'You win! All computer ships are sunk!';
    playerScore++;
    updateScoreboard();
    isMyTurn = false;
    return;
  }
  isMyTurn = false;
  setTimeout(aiMove, 1000);
}

function aiMove() {
  // Simple AI: pick random cell
  let r, c;
  do {
    r = Math.floor(Math.random() * 5);
    c = Math.floor(Math.random() * 5);
  } while (board[r][c] === 'hit' || board[r][c] === 'miss');
  if (board[r][c] === 'ship') {
    board[r][c] = 'hit';
    playerShips--;
    statusDiv.textContent = 'Computer hit your ship!';
  } else {
    board[r][c] = 'miss';
    statusDiv.textContent = 'Computer missed!';
  }
  renderBoard(board, 'myBoard');
  if (playerShips === 0) {
    statusDiv.textContent = 'All your ships are sunk! You lose.';
    computerScore++;
    updateScoreboard();
    return;
  }
  isMyTurn = true;
  statusDiv.textContent += ' Your turn.';
}

// --- MULTIPLAYER MODE ---
function startMultiplayer() {
  socket = io();
  board = Array(5).fill().map(() => Array(5).fill(''));
  opponentBoard = Array(5).fill().map(() => Array(5).fill(''));
  // Multiplayer logic continues as before...
  // The rest of the multiplayer code remains unchanged
}

function placeShipsRandomly(board) {
  let shipsPlaced = 0;
  while (shipsPlaced < 2) {
    let r = Math.floor(Math.random() * 5);
    let c = Math.floor(Math.random() * 5);
    if (board[r][c] === '') {
      board[r][c] = 'ship';
      shipsPlaced++;
    }
  }
}

function startGame() {
  placeShipsRandomly(board);
  renderBoard(board, 'game');
  statusDiv.textContent = 'Game started! Waiting for your turn...';
}

socket.on('waiting', () => {
  statusDiv.textContent = 'Waiting for another player to join...';
  gameDiv.innerHTML = '<div style="margin:30px;font-size:1.2em;">Please open this page in another tab or device to start the game.</div>';
});

socket.on('start', (data) => {
  room = data.room;
  isMyTurn = true;
  gameDiv.innerHTML = `
    <div class="board-container">
      <h2>Your Board</h2>
      <div id="myBoard"></div>
    </div>
    <div class="board-container">
      <h2>Opponent Board</h2>
      <div id="opponentBoard"></div>
    </div>
  `;
  placeShipsRandomly(board);
  renderBoard(board, 'myBoard');
  renderBoard(opponentBoard, 'opponentBoard', true);
  statusDiv.textContent = 'Game started! Your turn.';
});

socket.on('move', (data) => {
  // Opponent made a move on your board
  const { row, col } = data;
  if (board[row][col] === 'ship') {
    board[row][col] = 'hit';
    socket.emit('move', { room, row, col, result: 'hit' });
    statusDiv.textContent = 'Opponent hit your ship!';
  } else {
    board[row][col] = 'miss';
    socket.emit('move', { room, row, col, result: 'miss' });
    statusDiv.textContent = 'Opponent missed!';
  }
  renderBoard(board, 'myBoard');
  isMyTurn = true;
  statusDiv.textContent += ' Your turn.';
});

// Handle result of your move
socket.on('move', (data) => {
  if (data.result) {
    opponentBoard[data.row][data.col] = data.result;
    renderBoard(opponentBoard, 'opponentBoard', true);
    if (data.result === 'hit') {
      statusDiv.textContent = 'You hit a ship!';
    } else {
      statusDiv.textContent = 'You missed!';
    }
  }
});


function allShipsSunk(board) {
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      if (board[r][c] === 'ship') return false;
    }
  }
  return true;
}

// Listen for moves (opponent's move and result of your move)
socket.on('move', (data) => {
  if (typeof data.result === 'undefined') {
    // Opponent made a move on your board
    const { row, col } = data;
    if (board[row][col] === 'ship') {
      board[row][col] = 'hit';
      socket.emit('move', { room, row, col, result: 'hit' });
      statusDiv.textContent = 'Opponent hit your ship!';
    } else {
      board[row][col] = 'miss';
      socket.emit('move', { room, row, col, result: 'miss' });
      statusDiv.textContent = 'Opponent missed!';
    }
    renderBoard(board, 'myBoard');
    if (allShipsSunk(board)) {
      socket.emit('gameover', { room, winner: 'opponent' });
      statusDiv.textContent = 'All your ships are sunk! You lose.';
    } else {
      isMyTurn = true;
      statusDiv.textContent += ' Your turn.';
    }
  } else {
    // Result of your move
    opponentBoard[data.row][data.col] = data.result;
    renderBoard(opponentBoard, 'opponentBoard', true);
    if (data.result === 'hit') {
      statusDiv.textContent = 'You hit a ship!';
    } else {
      statusDiv.textContent = 'You missed!';
    }
    // Check if opponent has lost
    let hits = 0;
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        if (opponentBoard[r][c] === 'hit') hits++;
      }
    }
    if (hits >= 2) { // 2 ships per player
      socket.emit('gameover', { room, winner: 'me' });
      statusDiv.textContent = 'You win! All opponent ships are sunk!';
    }
  }
});

socket.on('gameover', (data) => {
  if (data.winner === 'me') {
    statusDiv.textContent = 'You win! All opponent ships are sunk!';
  } else {
    statusDiv.textContent = 'All your ships are sunk! You lose.';
  }
  isMyTurn = false;
  // Optionally, disable further clicks
  document.querySelectorAll('#opponentBoard .cell').forEach(cell => {
    cell.onclick = null;
  });
});
