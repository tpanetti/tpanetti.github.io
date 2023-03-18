console.log("game-of-life.js loaded");
const canvas = document.getElementById("game-of-life");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const cellSize = 10;
const rows = Math.floor(canvas.height / cellSize);
const cols = Math.floor(canvas.width / cellSize);

let grid = createGrid();
// Run the game loop every 5000ms
gameLoop()
//setInterval(gameLoop, 5000);

function gameLoop() {
  drawGrid();
  updateGrid();
  setTimeout(() => {
    requestAnimationFrame(gameLoop);
  }, 100);
}


function createGrid() {
  return new Array(rows).fill(null).map(() =>
    new Array(cols).fill(null).map(() => (Math.random() > 0.5 ? 1 : 0))
  );
}

function drawGrid() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (grid[y][x] === 1) {
        ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
        ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
      }
    }
  }
}

function updateGrid() {
  const newGrid = createGrid();

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const neighbors = [
        [-1, -1],
        [-1, 0],
        [-1, 1],
        [0, -1],
        [0, 1],
        [1, -1],
        [1, 0],
        [1, 1],
      ].reduce((acc, [dx, dy]) => {
        const newY = (y + dy + rows) % rows;
        const newX = (x + dx + cols) % cols;
        return acc + grid[newY][newX];
      }, 0);

      if (grid[y][x] === 1) {
        newGrid[y][x] = neighbors === 2 || neighbors === 3 ? 1 : 0;
      } else {
        newGrid[y][x] = neighbors === 3 ? 1 : 0;
      }
    }
  }

  grid = newGrid;
}
