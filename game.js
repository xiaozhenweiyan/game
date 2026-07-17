const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const toggleBtn = document.getElementById('toggleBtn');
const modeBtn = document.getElementById('modeBtn');
const tooltip = document.getElementById('tooltip');
const tooltipName = document.querySelector('.tooltip-name');
const tooltipDesc = document.querySelector('.tooltip-desc');

const CELL_SIZE = 12;
const EMPTY = 0;
const DIRT = 1;
const WATER = 2;
const WOOD = 3;
const LEAVES = 4;
const CHARCOAL = 5;
const SEED = 6;
const FIRE = 7;

const COLORS = {
  [EMPTY]: '#87ceeb',
  [DIRT]: '#8b4513',
  [WATER]: '#1e90ff',
  [WOOD]: '#8b7355',
  [LEAVES]: '#228b22',
  [CHARCOAL]: '#2f4f4f',
  [SEED]: '#90ee90',
  [FIRE]: '#ff4500'
};

const BLOCK_INFO = {
  [EMPTY]: { name: '空地', desc: '可以放置方块的空白区域' },
  [DIRT]: { name: '泥土', desc: '固定方块，不受重力影响' },
  [WATER]: { name: '水', desc: '受重力下落，会流动和堆叠' },
  [WOOD]: { name: '木头', desc: '固定方块，可燃，烧成木炭' },
  [LEAVES]: { name: '树叶', desc: '固定方块，可燃，燃烧后消失' },
  [CHARCOAL]: { name: '木炭', desc: '木头燃烧后的产物' },
  [SEED]: { name: '种子', desc: '放在泥土上方会生长成树' },
  [FIRE]: { name: '火', desc: '会点燃相邻的木头和树叶' }
};

const BLOCK_TYPES = [WATER, DIRT, SEED, WOOD, LEAVES, FIRE, CHARCOAL];
const BLOCK_CLASSES = ['water', 'dirt', 'seed', 'wood', 'leaves', 'fire', 'charcoal'];

const GRID_LINE_COLOR = 'rgba(255, 255, 255, 0.08)';

let cols = 0;
let rows = 0;
let grid = [];
let seedTimers = [];
let fireTimers = [];
let currentType = WATER;
let isMouseDown = false;
let isDeleteMode = false;

function resize() {
  canvas.width = Math.floor(window.innerWidth / CELL_SIZE) * CELL_SIZE;
  canvas.height = Math.floor(window.innerHeight / CELL_SIZE) * CELL_SIZE;

  const newCols = Math.ceil(canvas.width / CELL_SIZE);
  const newRows = Math.ceil(canvas.height / CELL_SIZE);

  const newGrid = createGrid(newCols, newRows);
  const newSeedTimers = createSeedTimers(newCols, newRows);
  const newFireTimers = createFireTimers(newCols, newRows);

  for (let y = 0; y < Math.min(rows, newRows); y++) {
    for (let x = 0; x < Math.min(cols, newCols); x++) {
      newGrid[y][x] = grid[y][x];
      newSeedTimers[y][x] = seedTimers[y]?.[x] || 0;
      newFireTimers[y][x] = fireTimers[y]?.[x] || 0;
    }
  }

  cols = newCols;
  rows = newRows;
  grid = newGrid;
  seedTimers = newSeedTimers;
  fireTimers = newFireTimers;
}

function createGrid(c, r) {
  const g = [];
  for (let y = 0; y < r; y++) {
    const row = new Int8Array(c);
    g.push(row);
  }
  return g;
}

function createSeedTimers(c, r) {
  const g = [];
  for (let y = 0; y < r; y++) {
    const row = new Uint32Array(c);
    g.push(row);
  }
  return g;
}

function createFireTimers(c, r) {
  const g = [];
  for (let y = 0; y < r; y++) {
    const row = new Uint32Array(c);
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

function isSolid(type) {
  return type === DIRT || type === WOOD || type === LEAVES || type === CHARCOAL || type === SEED || type === FIRE;
}

function isWaterOrSolid(type) {
  return type === WATER || isSolid(type);
}

function placeBlock(x, y) {
  if (!isInside(x, y)) return;
  if (grid[y][x] === EMPTY) {
    grid[y][x] = currentType;
    if (currentType === SEED) {
      seedTimers[y][x] = Date.now();
    } else if (currentType === FIRE) {
      fireTimers[y][x] = Date.now();
    }
  }
}

function deleteBlock(x, y) {
  if (!isInside(x, y)) return;
  grid[y][x] = EMPTY;
  seedTimers[y][x] = 0;
  fireTimers[y][x] = 0;
}

function updateWater() {
  const moved = createGrid(cols, rows);

  for (let y = rows - 1; y >= 0; y--) {
    for (let x = 0; x < cols; x++) {
      if (grid[y][x] !== WATER || moved[y][x]) continue;

      let movedThisFrame = false;

      const below = isInside(x, y + 1) ? grid[y + 1][x] : null;
      const left = isInside(x - 1, y) ? grid[y][x - 1] : null;
      const right = isInside(x + 1, y) ? grid[y][x + 1] : null;
      const above = isInside(x, y - 1) ? grid[y - 1][x] : null;

      const leftSolid = left !== null && isSolid(left);
      const rightSolid = right !== null && isSolid(right);

      const leftBlocked = left !== null && isWaterOrSolid(left);
      const rightBlocked = right !== null && isWaterOrSolid(right);
      const belowBlocked = below !== null && isWaterOrSolid(below);

      if (!belowBlocked) {
        grid[y + 1][x] = WATER;
        grid[y][x] = EMPTY;
        moved[y + 1][x] = 1;
        movedThisFrame = true;
      } else if (leftSolid && rightSolid) {
        moved[y][x] = 1;
        movedThisFrame = true;
      } else if (belowBlocked && leftBlocked && rightBlocked && above === EMPTY) {
        moved[y][x] = 1;
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

        if (!movedThisFrame && !(leftBlocked && rightBlocked)) {
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

function updateSeedGrowth() {
  const now = Date.now();
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (grid[y][x] !== SEED) continue;
      if (seedTimers[y][x] === 0) continue;

      const below = isInside(x, y + 1) ? grid[y + 1][x] : null;
      if (below !== DIRT) continue;

      if (now - seedTimers[y][x] >= 3000) {
        if (isInside(x, y - 2) && grid[y - 1][x] === EMPTY && grid[y - 2][x] === EMPTY) {
          grid[y][x] = WOOD;
          grid[y - 1][x] = WOOD;
          grid[y - 2][x] = WOOD;

          if (isInside(x - 1, y - 2) && grid[y - 2][x - 1] === EMPTY) {
            grid[y - 2][x - 1] = LEAVES;
          }
          if (isInside(x + 1, y - 2) && grid[y - 2][x + 1] === EMPTY) {
            grid[y - 2][x + 1] = LEAVES;
          }

          seedTimers[y][x] = 0;
        }
      }
    }
  }
}

function updateFire() {
  const now = Date.now();
  const toUpdate = [];

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (grid[y][x] === FIRE) {
        toUpdate.push({ x, y });
      }
    }
  }

  for (const { x, y } of toUpdate) {
    if (grid[y][x] !== FIRE) continue;

    if (now - fireTimers[y][x] >= 2000) {
      grid[y][x] = EMPTY;
      fireTimers[y][x] = 0;
      continue;
    }

    const directions = [[0, 1], [0, -1], [1, 0], [-1, 0]];

    for (const [dx, dy] of directions) {
      const nx = x + dx;
      const ny = y + dy;

      if (!isInside(nx, ny)) continue;

      const target = grid[ny][nx];

      if (target === WATER) {
        grid[y][x] = EMPTY;
        fireTimers[y][x] = 0;
        if (isInside(x, y + 1) && grid[y + 1][x] === WOOD) {
          grid[y + 1][x] = CHARCOAL;
        }
        break;
      }

      if (target === WOOD || target === LEAVES) {
        grid[ny][nx] = FIRE;
        fireTimers[ny][nx] = Date.now();

        if (target === WOOD) {
          const checkBelow = isInside(nx, ny + 1) ? grid[ny + 1][nx] : null;
          if (checkBelow !== WATER && checkBelow !== FIRE) {
            grid[ny][nx] = CHARCOAL;
            grid[y][x] = EMPTY;
            fireTimers[y][x] = 0;
            break;
          }
        }
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
        if (type === FIRE) {
          const brightness = 0.35 + Math.random() * 0.25;
          ctx.fillStyle = `hsl(15, 100%, ${brightness * 100}%)`;
        } else {
          ctx.fillStyle = COLORS[type];
        }
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
  updateSeedGrowth();
  updateFire();
  draw();
  requestAnimationFrame(gameLoop);
}

function updateToggleButton() {
  BLOCK_CLASSES.forEach(cls => toggleBtn.classList.remove(cls));
  const index = BLOCK_TYPES.indexOf(currentType);
  if (index !== -1) {
    toggleBtn.classList.add(BLOCK_CLASSES[index]);
    toggleBtn.querySelector('.label').textContent = BLOCK_INFO[currentType].name;
  }
}

function updateModeButton() {
  modeBtn.classList.remove('place', 'delete');
  if (isDeleteMode) {
    modeBtn.classList.add('delete');
    modeBtn.querySelector('.icon').textContent = '×';
    modeBtn.querySelector('.label').textContent = '删除模式';
  } else {
    modeBtn.classList.add('place');
    modeBtn.querySelector('.icon').textContent = '+';
    modeBtn.querySelector('.label').textContent = '放置模式';
  }
}

function handlePointerDown(e) {
  if (e.button !== 0) return;
  const { x, y } = getGridPos(e.clientX, e.clientY);
  if (isDeleteMode) {
    deleteBlock(x, y);
  } else {
    placeBlock(x, y);
  }
  isMouseDown = true;
}

function handlePointerMove(e) {
  if (!isMouseDown) return;
  const { x, y } = getGridPos(e.clientX, e.clientY);
  if (isDeleteMode) {
    deleteBlock(x, y);
  } else {
    placeBlock(x, y);
  }
}

function handlePointerUp() {
  isMouseDown = false;
}

function handleCanvasMouseMove(e) {
  const { x, y } = getGridPos(e.clientX, e.clientY);

  if (!isInside(x, y) || grid[y][x] === EMPTY) {
    tooltip.style.display = 'none';
    return;
  }

  const info = BLOCK_INFO[grid[y][x]];
  tooltipName.textContent = info.name;
  tooltipDesc.textContent = info.desc;

  tooltip.style.left = `${e.clientX + 12}px`;
  tooltip.style.top = `${e.clientY - 10}px`;
  tooltip.style.display = 'block';
}

function handleCanvasMouseLeave() {
  tooltip.style.display = 'none';
}

canvas.addEventListener('mousedown', handlePointerDown);
window.addEventListener('mousemove', handlePointerMove);
window.addEventListener('mouseup', handlePointerUp);
canvas.addEventListener('mousemove', handleCanvasMouseMove);
canvas.addEventListener('mouseleave', handleCanvasMouseLeave);

toggleBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  const currentIndex = BLOCK_TYPES.indexOf(currentType);
  currentType = BLOCK_TYPES[(currentIndex + 1) % BLOCK_TYPES.length];
  updateToggleButton();
});

modeBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  isDeleteMode = !isDeleteMode;
  updateModeButton();
});

window.addEventListener('resize', resize);

resize();
updateToggleButton();
updateModeButton();
requestAnimationFrame(gameLoop);
