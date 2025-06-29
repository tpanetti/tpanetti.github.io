console.log("game-of-life.js loaded");
const canvas = document.getElementById("game-of-life");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const cellSize = 10;
const rows = Math.floor(canvas.height / cellSize);
const cols = Math.floor(canvas.width / cellSize);

let grid = createGrid();

// Worm properties
let worm = {
  x: Math.floor(cols / 2),
  y: Math.floor(rows / 2),
  direction: { x: 1, y: 0 }, // Moving right initially
  body: [], // For snake-like growth
  size: 3,
  moveCounter: 0,
  moveSpeed: 1, // Moves every frame (3x faster)
};

// Game state
let isPlayerControlled = false;

// Initialize worm body
for (let i = 0; i < worm.size; i++) {
  worm.body.push({
    x: worm.x - i,
    y: worm.y,
  });
}

// Run the game loop every 5000ms
gameLoop();
//setInterval(gameLoop, 5000);

function gameLoop() {
  drawGrid();
  updateGrid();
  updateWorm();
  setTimeout(() => {
    requestAnimationFrame(gameLoop);
  }, 100);
}

function createGrid() {
  return new Array(rows)
    .fill(null)
    .map(() =>
      new Array(cols).fill(null).map(() => (Math.random() > 0.5 ? 1 : 0))
    );
}

function drawGrid() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw life cells
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (grid[y][x] === 1) {
        ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
        ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
      }
    }
  }

  // Draw worm
  drawWorm();
}

function drawWorm() {
  // Draw worm body
  worm.body.forEach((segment, index) => {
    if (
      segment.x >= 0 &&
      segment.x < cols &&
      segment.y >= 0 &&
      segment.y < rows
    ) {
      // Head is brighter, body fades - BRIGHT RED
      const alpha = index === 0 ? 1.0 : 0.8 - index * 0.1;
      ctx.fillStyle = `rgba(255, 0, 0, ${Math.max(alpha, 0.3)})`;
      ctx.fillRect(
        segment.x * cellSize,
        segment.y * cellSize,
        cellSize,
        cellSize
      );

      // Add a small border for better visibility - BRIGHT RED
      ctx.strokeStyle = "rgba(255, 50, 50, 0.9)";
      ctx.lineWidth = 1;
      ctx.strokeRect(
        segment.x * cellSize,
        segment.y * cellSize,
        cellSize,
        cellSize
      );
    }
  });
}

function updateGrid() {
  // Create empty grid, not random - this was the bug!
  const newGrid = new Array(rows).fill(null).map(() => new Array(cols).fill(0));

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

      // Conway's Game of Life rules
      if (grid[y][x] === 1) {
        // Living cell survives with 2 or 3 neighbors
        newGrid[y][x] = neighbors === 2 || neighbors === 3 ? 1 : 0;
      } else {
        // Dead cell becomes alive with exactly 3 neighbors
        newGrid[y][x] = neighbors === 3 ? 1 : 0;
      }
    }
  }

  grid = newGrid;
}

function updateWorm() {
  worm.moveCounter++;

  // Only move every few frames to make it slower than the game
  if (worm.moveCounter < worm.moveSpeed) {
    return;
  }
  worm.moveCounter = 0;

  // If player controlled, don't use AI
  if (!isPlayerControlled) {
    // Simple AI: move toward nearest life cell or random if none nearby
    const nearestLife = findNearestLife();
    if (nearestLife) {
      moveToward(nearestLife);
    } else {
      // Random walk
      if (Math.random() < 0.3) {
        changeDirection();
      }
    }
  }

  // Calculate new head position
  const newHead = {
    x: (worm.body[0].x + worm.direction.x + cols) % cols,
    y: (worm.body[0].y + worm.direction.y + rows) % rows,
  };

  // Check if worm eats a life cell
  const ateLife = grid[newHead.y] && grid[newHead.y][newHead.x] === 1;

  if (ateLife) {
    // Clear a plus pattern (+) around the eaten cell to break patterns
    // This breaks most stable patterns while being less destructive than 3x3
    const clearPositions = [
      [0, 0], // Center (the eaten cell)
      [0, -1], // Up
      [0, 1], // Down
      [-1, 0], // Left
      [1, 0], // Right
    ];

    for (let [dx, dy] of clearPositions) {
      const clearX = (newHead.x + dx + cols) % cols;
      const clearY = (newHead.y + dy + rows) % rows;
      if (grid[clearY] && grid[clearY][clearX] === 1) {
        grid[clearY][clearX] = 0;
      }
    }

    // Move head to new position
    worm.body.unshift(newHead);

    // Grow the worm significantly when eating
    const growthAmount = Math.floor(Math.random() * 3) + 2; // 2-4 segments

    for (let i = 0; i < growthAmount && worm.body.length < 250; i++) {
      // Duplicate the tail segment to grow
      const tail = worm.body[worm.body.length - 1];
      worm.body.push({ ...tail });
    }

    // Limit maximum size
    if (worm.body.length > 250) {
      worm.body = worm.body.slice(0, 250);
    }
  } else {
    // Move without growing (add new head, remove tail)
    worm.body.unshift(newHead);
    worm.body.pop();
  }
}

function findNearestLife() {
  const head = worm.body[0];
  let nearest = null;
  let minDistance = Infinity;

  // Search in a radius around the worm
  const searchRadius = 8;
  for (let dy = -searchRadius; dy <= searchRadius; dy++) {
    for (let dx = -searchRadius; dx <= searchRadius; dx++) {
      const x = (head.x + dx + cols) % cols;
      const y = (head.y + dy + rows) % rows;

      if (grid[y] && grid[y][x] === 1) {
        const distance = Math.abs(dx) + Math.abs(dy);
        if (distance < minDistance) {
          minDistance = distance;
          nearest = { x, y };
        }
      }
    }
  }

  return nearest;
}

function moveToward(target) {
  const head = worm.body[0];
  const dx = target.x - head.x;
  const dy = target.y - head.y;

  // Handle wrapping
  const wrappedDx = dx > cols / 2 ? dx - cols : dx < -cols / 2 ? dx + cols : dx;
  const wrappedDy = dy > rows / 2 ? dy - rows : dy < -rows / 2 ? dy + rows : dy;

  // Choose direction based on largest distance
  if (Math.abs(wrappedDx) > Math.abs(wrappedDy)) {
    worm.direction = { x: Math.sign(wrappedDx), y: 0 };
  } else {
    worm.direction = { x: 0, y: Math.sign(wrappedDy) };
  }
}

function changeDirection() {
  const directions = [
    { x: 0, y: -1 }, // Up
    { x: 1, y: 0 }, // Right
    { x: 0, y: 1 }, // Down
    { x: -1, y: 0 }, // Left
  ];
  worm.direction = directions[Math.floor(Math.random() * directions.length)];
}

// Player control functions
function enablePlayerControl() {
  isPlayerControlled = true;
  document.addEventListener("keydown", handleKeyPress);
  // Make canvas fully visible for better gameplay
  canvas.style.opacity = "1";
  canvas.style.filter = "none";
}

function disablePlayerControl() {
  isPlayerControlled = false;
  document.removeEventListener("keydown", handleKeyPress);
  // Restore background appearance
  canvas.style.opacity = "0.15";
  canvas.style.filter = "hue-rotate(180deg) saturate(0.7)";
}

function handleKeyPress(event) {
  if (!isPlayerControlled) return;

  switch (event.key.toLowerCase()) {
    case "w":
    case "arrowup":
      worm.direction = { x: 0, y: -1 };
      break;
    case "s":
    case "arrowdown":
      worm.direction = { x: 0, y: 1 };
      break;
    case "a":
    case "arrowleft":
      worm.direction = { x: -1, y: 0 };
      break;
    case "d":
    case "arrowright":
      worm.direction = { x: 1, y: 0 };
      break;
  }
}

// Expose functions for external use
window.enableWormControl = enablePlayerControl;
window.disableWormControl = disablePlayerControl;
