const canvas = document.getElementById("game-of-life");
const ctx = canvas.getContext("2d");

const cellSize = 10;
const reducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)"
).matches;
const tickMs = reducedMotion ? 450 : 100;

let rows = 0;
let cols = 0;
let grid = []; // 0 = dead, n >= 1 = alive for n generations
let heat = []; // afterglow left behind by dead cells, 0..1
let generation = 0;
let aliveCount = 0;

// Brightness multiplier: subtle as a background, full in worm mode
let intensity = 0.5;

const statGen = document.getElementById("stat-gen");
const statAlive = document.getElementById("stat-alive");

function sizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const newRows = Math.floor(window.innerHeight / cellSize);
  const newCols = Math.floor(window.innerWidth / cellSize);

  // Preserve the existing population where the grids overlap
  const newGrid = new Array(newRows)
    .fill(null)
    .map(() => new Array(newCols).fill(0));
  const newHeat = new Array(newRows)
    .fill(null)
    .map(() => new Array(newCols).fill(0));

  for (let y = 0; y < Math.min(rows, newRows); y++) {
    for (let x = 0; x < Math.min(cols, newCols); x++) {
      newGrid[y][x] = grid[y][x];
      newHeat[y][x] = heat[y][x];
    }
  }

  // Seed any newly exposed area
  for (let y = 0; y < newRows; y++) {
    for (let x = 0; x < newCols; x++) {
      if (y >= rows || x >= cols) {
        newGrid[y][x] = Math.random() > 0.85 ? 1 : 0;
      }
    }
  }

  rows = newRows;
  cols = newCols;
  grid = newGrid;
  heat = newHeat;
}

sizeCanvas();

let resizeTimer;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(sizeCanvas, 150);
});

// Worm properties
let worm = {
  direction: { x: 1, y: 0 },
  body: [],
  size: 3,
  moveCounter: 0,
  moveSpeed: 1,
};

let isPlayerControlled = false;

for (let i = 0; i < worm.size; i++) {
  worm.body.push({
    x: Math.floor(cols / 2) - i,
    y: Math.floor(rows / 2),
  });
}

gameLoop();

function gameLoop() {
  drawGrid();
  updateGrid();
  updateWorm();
  updateReadout();
  setTimeout(() => {
    requestAnimationFrame(gameLoop);
  }, tickMs);
}

/* ── Rendering ── */

// Cells cool down as they age: newborn phosphor-bright, elders dim teal
function cellColor(age, alpha) {
  if (age <= 1) return `rgba(160, 255, 208, ${alpha})`;
  if (age <= 4) return `rgba(94, 240, 170, ${alpha * 0.85})`;
  if (age <= 12) return `rgba(70, 190, 140, ${alpha * 0.7})`;
  return `rgba(58, 140, 110, ${alpha * 0.55})`;
}

function drawGrid() {
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

  aliveCount = 0;
  const baseAlpha = 0.65 * intensity;

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const age = grid[y][x];
      if (age > 0) {
        aliveCount++;
        ctx.fillStyle = cellColor(age, baseAlpha);
        ctx.fillRect(
          x * cellSize + 1,
          y * cellSize + 1,
          cellSize - 2,
          cellSize - 2
        );
      } else if (heat[y][x] > 0.04) {
        // Afterglow where a cell recently died
        ctx.fillStyle = `rgba(94, 240, 170, ${heat[y][x] * 0.16 * intensity})`;
        ctx.fillRect(
          x * cellSize + 2,
          y * cellSize + 2,
          cellSize - 4,
          cellSize - 4
        );
      }
    }
  }

  drawWorm();
}

function drawWorm() {
  worm.body.forEach((segment, index) => {
    if (
      segment.x >= 0 &&
      segment.x < cols &&
      segment.y >= 0 &&
      segment.y < rows
    ) {
      const alpha = index === 0 ? 1.0 : 0.8 - index * 0.1;
      ctx.fillStyle = `rgba(255, 74, 56, ${Math.max(alpha, 0.3)})`;
      ctx.fillRect(
        segment.x * cellSize,
        segment.y * cellSize,
        cellSize,
        cellSize
      );
      ctx.strokeStyle = "rgba(255, 120, 100, 0.9)";
      ctx.lineWidth = 1;
      ctx.strokeRect(
        segment.x * cellSize + 0.5,
        segment.y * cellSize + 0.5,
        cellSize - 1,
        cellSize - 1
      );
    }
  });
}

/* ── Simulation ── */

function updateGrid() {
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
        return acc + (grid[newY][newX] > 0 ? 1 : 0);
      }, 0);

      if (grid[y][x] > 0) {
        if (neighbors === 2 || neighbors === 3) {
          newGrid[y][x] = grid[y][x] + 1; // survives, grows older
        } else {
          heat[y][x] = 1; // dies, leaves afterglow
        }
      } else if (neighbors === 3) {
        newGrid[y][x] = 1; // born
      }

      heat[y][x] *= 0.86;
    }
  }

  grid = newGrid;
  generation++;
}

function updateReadout() {
  if (statGen) statGen.textContent = String(generation).padStart(6, "0");
  if (statAlive) statAlive.textContent = String(aliveCount).padStart(4, "0");
}

/* ── Cursor seeding: the pointer breathes life into the grid ── */

let lastSeed = 0;
window.addEventListener("pointermove", (e) => {
  if (isPlayerControlled || reducedMotion) return;
  const now = performance.now();
  if (now - lastSeed < 50) return;
  lastSeed = now;

  const cx = Math.floor(e.clientX / cellSize);
  const cy = Math.floor(e.clientY / cellSize);
  seedSplat(cx, cy, 2, 0.4);
});

function seedSplat(cx, cy, radius, probability) {
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      if (Math.random() > probability) continue;
      const x = (cx + dx + cols) % cols;
      const y = (cy + dy + rows) % rows;
      if (grid[y] && grid[y][x] === 0) grid[y][x] = 1;
    }
  }
}

// Hovering a UI module stirs the cells around its edges
function stirAround(el) {
  if (isPlayerControlled || reducedMotion) return;
  const rect = el.getBoundingClientRect();
  const pad = cellSize;
  const points = 14;
  for (let i = 0; i < points; i++) {
    // Random point along the perimeter, just outside the panel
    const t = Math.random();
    let px, py;
    if (Math.random() < 0.5) {
      px = rect.left + t * rect.width;
      py = Math.random() < 0.5 ? rect.top - pad : rect.bottom + pad;
    } else {
      px = Math.random() < 0.5 ? rect.left - pad : rect.right + pad;
      py = rect.top + t * rect.height;
    }
    seedSplat(Math.floor(px / cellSize), Math.floor(py / cellSize), 1, 0.5);
  }
}

document.querySelectorAll(".links a").forEach((a) => {
  a.addEventListener("mouseenter", () => stirAround(a));
});

/* ── Worm behavior ── */

function updateWorm() {
  worm.moveCounter++;
  if (worm.moveCounter < worm.moveSpeed) {
    return;
  }
  worm.moveCounter = 0;

  if (!isPlayerControlled) {
    const nearestLife = findNearestLife();
    if (nearestLife) {
      moveToward(nearestLife);
    } else {
      if (Math.random() < 0.3) {
        changeDirection();
      }
    }
  }

  const newHead = {
    x: (worm.body[0].x + worm.direction.x + cols) % cols,
    y: (worm.body[0].y + worm.direction.y + rows) % rows,
  };

  const ateLife = grid[newHead.y] && grid[newHead.y][newHead.x] > 0;

  if (ateLife) {
    // Clear a plus pattern (+) around the eaten cell to break patterns
    const clearPositions = [
      [0, 0],
      [0, -1],
      [0, 1],
      [-1, 0],
      [1, 0],
    ];

    for (let [dx, dy] of clearPositions) {
      const clearX = (newHead.x + dx + cols) % cols;
      const clearY = (newHead.y + dy + rows) % rows;
      if (grid[clearY] && grid[clearY][clearX] > 0) {
        grid[clearY][clearX] = 0;
        heat[clearY][clearX] = 1;
      }
    }

    worm.body.unshift(newHead);

    const growthAmount = Math.floor(Math.random() * 3) + 2;
    for (let i = 0; i < growthAmount && worm.body.length < 250; i++) {
      const tail = worm.body[worm.body.length - 1];
      worm.body.push({ ...tail });
    }

    if (worm.body.length > 250) {
      worm.body = worm.body.slice(0, 250);
    }
  } else {
    worm.body.unshift(newHead);
    worm.body.pop();
  }
}

function findNearestLife() {
  const head = worm.body[0];
  let nearest = null;
  let minDistance = Infinity;

  const searchRadius = 8;
  for (let dy = -searchRadius; dy <= searchRadius; dy++) {
    for (let dx = -searchRadius; dx <= searchRadius; dx++) {
      const x = (head.x + dx + cols) % cols;
      const y = (head.y + dy + rows) % rows;

      if (grid[y] && grid[y][x] > 0) {
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

  const wrappedDx = dx > cols / 2 ? dx - cols : dx < -cols / 2 ? dx + cols : dx;
  const wrappedDy = dy > rows / 2 ? dy - rows : dy < -rows / 2 ? dy + rows : dy;

  if (Math.abs(wrappedDx) > Math.abs(wrappedDy)) {
    worm.direction = { x: Math.sign(wrappedDx), y: 0 };
  } else {
    worm.direction = { x: 0, y: Math.sign(wrappedDy) };
  }
}

function changeDirection() {
  const directions = [
    { x: 0, y: -1 },
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: -1, y: 0 },
  ];
  worm.direction = directions[Math.floor(Math.random() * directions.length)];
}

/* ── Player control (Ride the Worm) ── */

let touchStartX = 0;
let touchStartY = 0;
let touchEndX = 0;
let touchEndY = 0;
const minSwipeDistance = 30;

function enablePlayerControl() {
  isPlayerControlled = true;
  document.addEventListener("keydown", handleKeyPress);
  document.addEventListener("touchstart", handleTouchStart, { passive: false });
  document.addEventListener("touchend", handleTouchEnd, { passive: false });
  intensity = 1;
}

function disablePlayerControl() {
  isPlayerControlled = false;
  document.removeEventListener("keydown", handleKeyPress);
  document.removeEventListener("touchstart", handleTouchStart);
  document.removeEventListener("touchend", handleTouchEnd);
  intensity = 0.5;
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

function handleTouchStart(event) {
  if (!isPlayerControlled) return;
  event.preventDefault();
  const touch = event.touches[0];
  touchStartX = touch.clientX;
  touchStartY = touch.clientY;
}

function handleTouchEnd(event) {
  if (!isPlayerControlled) return;
  event.preventDefault();
  const touch = event.changedTouches[0];
  touchEndX = touch.clientX;
  touchEndY = touch.clientY;
  handleSwipe();
}

function handleSwipe() {
  const deltaX = touchEndX - touchStartX;
  const deltaY = touchEndY - touchStartY;

  if (
    Math.abs(deltaX) < minSwipeDistance &&
    Math.abs(deltaY) < minSwipeDistance
  ) {
    return;
  }

  if (Math.abs(deltaX) > Math.abs(deltaY)) {
    worm.direction = deltaX > 0 ? { x: 1, y: 0 } : { x: -1, y: 0 };
  } else {
    worm.direction = deltaY > 0 ? { x: 0, y: 1 } : { x: 0, y: -1 };
  }
}

window.enableWormControl = enablePlayerControl;
window.disableWormControl = disablePlayerControl;
