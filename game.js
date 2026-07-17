const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const toggleBtn = document.getElementById('toggleBtn');

const CELL_SIZE = 12;
const EMPTY = 0;
const DIRT = 1;
const WATER = 2;

const COLORS = {
  [EMPTY]: '#87ceeb',
  [DIRT]: '#8b4513',
  [WATER]: '#1e90ff'
};

const GRID_LINE_COLOR = 'rgba(255, 255, 255, 0.08)';

let cols = 0;
let rows = 0;
let grid = [];
let currentType = WATER;
let isMouseDown = false;

function resize() {
  canvas.width = Math.floor(window.innerWidth / CELL_SIZE) * CELL_SIZE;
  canvas.height = Math.floor(window.innerHeight / CELL_SIZE) * CELL_SIZE;

  const newCols = Math.ceil(canvas.width / CELL_SIZE);
  const newRows = Math.ceil(canvas.height / CELL_SIZE);

  const newGrid = createGrid(newCols, newRows);

  for (let y = 0; y < Math.min(rows, newRows); y++) {
    for (let x = 0; x < Math.min(cols, newCols); x++) {
      newGrid[y][x] = grid[y][x];
    }
  }

  cols = newCols;
  rows = newRows;
  grid = newGrid;
}

function createGrid(c, r) {
  const g = [];
  for (let y = 0; y < r; y++) {
    const row = new Int8Array(c);
    g.push(row);
  }
  return g;
}

function getGridPos(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const x = Math.floor((clientX - rect.left) / CELL_SIZE);
  const y = Math.floor((clientY - rect.top) / CELL_SIZE);
  return { x, y };
}

function isInside(x, y) {
  return x >= 0 && x < cols && y >= 0 && y < rows;
}

function placeBlock(x, y) {
  if (!isInside(x, y)) return;
  if (grid[y][x] === EMPTY) {
    grid[y][x] = currentType;
  }
}

function updateWater() {
  const moved = createGrid(cols, rows);

  for (let y = rows - 1; y >= 0; y--) {
    for (let x = 0; x < cols; x++) {
      if (grid[y][x] !== WATER || moved[y][x]) continue;

      let movedThisFrame = false;

      if (isInside(x, y + 1) && grid[y + 1][x] === EMPTY) {
        grid[y + 1][x] = WATER;
        grid[y][x] = EMPTY;
        moved[y + 1][x] = 1;
        movedThisFrame = true;
      } else {
        const dir = Math.random() < 0.5 ? -1 : 1;
        const sides = [dir, -dir];

        for (const dx of sides) {
          if (isInside(x + dx, y + 1) && grid[y + 1][x + dx] === EMPTY) {
            grid[y + 1][x + dx] = WATER;
            grid[y][x] = EMPTY;
            moved[y + 1][x + dx] = 1;
            movedThisFrame = true;
            break;
          }
        }

        if (!movedThisFrame) {
          for (const dx of sides) {
            if (isInside(x + dx, y) && grid[y][x + dx] === EMPTY) {
              grid[y][x + dx] = WATER;
              grid[y][x] = EMPTY;
              moved[y][x + dx] = 1;
              movedThisFrame = true;
              break;
            }
          }
        }
      }

      if (!movedThisFrame) {
        moved[y][x] = 1;
      }
    }
  }
}

function draw() {
  ctx.fillStyle = COLORS[EMPTY];
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const type = grid[y][x];
      if (type !== EMPTY) {
        ctx.fillStyle = COLORS[type];
        ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);

        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
        ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE + CELL_SIZE - 2, CELL_SIZE, 2);
      }
    }
  }

  ctx.strokeStyle = GRID_LINE_COLOR;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x <= cols; x++) {
    ctx.moveTo(x * CELL_SIZE + 0.5, 0);
    ctx.lineTo(x * CELL_SIZE + 0.5, canvas.height);
  }
  for (let y = 0; y <= rows; y++) {
    ctx.moveTo(0, y * CELL_SIZE + 0.5);
    ctx.lineTo(canvas.width, y * CELL_SIZE + 0.5);
  }
  ctx.stroke();
}

function gameLoop() {
  updateWater();
  draw();
  requestAnimationFrame(gameLoop);
}

function updateToggleButton() {
  toggleBtn.classList.remove('water', 'dirt');
  if (currentType === WATER) {
    toggleBtn.classList.add('water');
    toggleBtn.querySelector('.label').textContent = '水';
  } else {
    toggleBtn.classList.add('dirt');
    toggleBtn.querySelector('.label').textContent = '泥土';
  }
}

function handlePointerDown(e) {
  if (e.button !== 0) return;
  const { x, y } = getGridPos(e.clientX, e.clientY);
  placeBlock(x, y);
  isMouseDown = true;
}

function handlePointerMove(e) {
  if (!isMouseDown) return;
  const { x, y } = getGridPos(e.clientX, e.clientY);
  placeBlock(x, y);
}

function handlePointerUp() {
  isMouseDown = false;
}

canvas.addEventListener('mousedown', handlePointerDown);
window.addEventListener('mousemove', handlePointerMove);
window.addEventListener('mouseup', handlePointerUp);

toggleBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  currentType = currentType === DIRT ? WATER : DIRT;
  updateToggleButton();
});

window.addEventListener('resize', resize);

resize();
updateToggleButton();
requestAnimationFrame(gameLoop);
