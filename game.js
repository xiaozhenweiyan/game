// ===================== DOM 引用 =====================
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const toggleBtn = document.getElementById('toggleBtn');
const modeBtn = document.getElementById('modeBtn');
const tooltip = document.getElementById('tooltip');
const tooltipName = document.querySelector('.tooltip-name');
const tooltipDesc = document.querySelector('.tooltip-desc');

const inventoryPanel = document.getElementById('inventoryPanel');
const inventoryGrid = document.getElementById('inventoryGrid');
const createRoomBtn = document.getElementById('createRoomBtn');
const roomInfo = document.getElementById('roomInfo');
const roomCodeText = document.getElementById('roomCodeText');
const roomStatusText = document.getElementById('roomStatusText');

const loginOverlay = document.getElementById('loginOverlay');
const menuOverlay = document.getElementById('menuOverlay');
const joinRoomOverlay = document.getElementById('joinRoomOverlay');
const nicknameInput = document.getElementById('nicknameInput');
const loginConfirmBtn = document.getElementById('loginConfirmBtn');
const menuNickname = document.getElementById('menuNickname');
const startGameBtn = document.getElementById('startGameBtn');
const joinRoomMenuBtn = document.getElementById('joinRoomMenuBtn');
const roomCodeInput = document.getElementById('roomCodeInput');
const joinConfirmBtn = document.getElementById('joinConfirmBtn');
const joinCancelBtn = document.getElementById('joinCancelBtn');
const joinError = document.getElementById('joinError');

// 聊天 UI
const chatBtn = document.getElementById('chatBtn');
const chatDot = document.getElementById('chatDot');
const chatPanel = document.getElementById('chatPanel');
const chatInput = document.getElementById('chatInput');
const chatMessages = document.getElementById('chatMessages');
const chatSendBtn = document.getElementById('chatSendBtn');

// ===================== 方块定义 =====================
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

// ===================== 状态 =====================
let cols = 0;
let rows = 0;
let grid = [];
let seedTimers = [];
let fireTimers = [];
let fireOriginGrid = null; // 记录火方块的原方块类型（EMPTY/WOOD/LEAVES），用于决定烧完结果
let movedGrid = null;   // 复用：每帧只 clear，不重建
let stillGrid = null;   // 静止水标记（1=静止，跳过移动计算）
let currentType = WATER;
let isMouseDown = false;
let isDeleteMode = false;
let gameState = 'login'; // login | menu | join | game

const MAX_WATER_PER_FRAME = 2000;

// 聊天状态
let chatOpen = false;
let unreadCount = 0;

// ===================== 联机状态 =====================
const NICKNAME_KEY = 'psx_nickname';
const PEER_PREFIX = 'psxgame-';
let nickname = '';
let peer = null;
let conn = null;
let isHost = false;
let roomCode = null;
let multiplayerEnabled = false;
let lastWorldSync = 0; // 房主上次广播完整世界的时间戳

// ===================== 网格工具 =====================
function resize() {
  canvas.width = Math.floor(window.innerWidth / CELL_SIZE) * CELL_SIZE;
  canvas.height = Math.floor(window.innerHeight / CELL_SIZE) * CELL_SIZE;

  const newCols = Math.ceil(canvas.width / CELL_SIZE);
  const newRows = Math.ceil(canvas.height / CELL_SIZE);

  const newGrid = createGrid(newCols, newRows);
  const newSeedTimers = createSeedTimers(newCols, newRows);
  const newFireTimers = createFireTimers(newCols, newRows);
  const newFireOrigin = createFireTimers(newCols, newRows);

  for (let y = 0; y < Math.min(rows, newRows); y++) {
    for (let x = 0; x < Math.min(cols, newCols); x++) {
      newGrid[y][x] = grid[y][x];
      newSeedTimers[y][x] = seedTimers[y]?.[x] || 0;
      newFireTimers[y][x] = fireTimers[y]?.[x] || 0;
      newFireOrigin[y][x] = fireOriginGrid ? (fireOriginGrid[y]?.[x] || 0) : 0;
    }
  }

  cols = newCols;
  rows = newRows;
  grid = newGrid;
  seedTimers = newSeedTimers;
  fireTimers = newFireTimers;
  fireOriginGrid = newFireOrigin;
  // 尺寸变化时让辅助网格按需重建（静止标记失效，水会重新稳定）
  movedGrid = null;
  stillGrid = null;
}

function createGrid(c, r) {
  const g = [];
  for (let y = 0; y < r; y++) g.push(new Int8Array(c));
  return g;
}

function createSeedTimers(c, r) {
  const g = [];
  for (let y = 0; y < r; y++) g.push(new Uint32Array(c));
  return g;
}

function createFireTimers(c, r) {
  const g = [];
  for (let y = 0; y < r; y++) g.push(new Uint32Array(c));
  return g;
}

function createUint8Grid(c, r) {
  const g = [];
  for (let y = 0; y < r; y++) g.push(new Uint8Array(c));
  return g;
}

function ensureAuxGrids() {
  if (!movedGrid || movedGrid.length !== rows || !movedGrid[0] || movedGrid[0].length !== cols) {
    movedGrid = createUint8Grid(cols, rows);
  }
  if (!stillGrid || stillGrid.length !== rows || !stillGrid[0] || stillGrid[0].length !== cols) {
    stillGrid = createUint8Grid(cols, rows);
  }
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

// 激活 (x,y) 周围（含自身、四邻）的静止水，使其重新参与物理更新
function activateAround(x, y) {
  if (!stillGrid) return;
  if (isInside(x, y) && stillGrid[y][x]) stillGrid[y][x] = 0;
  if (isInside(x - 1, y) && stillGrid[y][x - 1]) stillGrid[y][x - 1] = 0;
  if (isInside(x + 1, y) && stillGrid[y][x + 1]) stillGrid[y][x + 1] = 0;
  if (isInside(x, y - 1) && stillGrid[y - 1][x]) stillGrid[y - 1][x] = 0;
  if (isInside(x, y + 1) && stillGrid[y + 1][x]) stillGrid[y + 1][x] = 0;
}

// 静止判定：下方有支撑（固体/水/画布底）+ 左右被阻挡（水/固体）+ 上方为空
function checkStill(x, y) {
  const below = isInside(x, y + 1) ? grid[y + 1][x] : DIRT;
  if (!isWaterOrSolid(below)) return false;
  const left = isInside(x - 1, y) ? grid[y][x - 1] : DIRT;
  if (!isWaterOrSolid(left)) return false;
  const right = isInside(x + 1, y) ? grid[y][x + 1] : DIRT;
  if (!isWaterOrSolid(right)) return false;
  const above = isInside(x, y - 1) ? grid[y - 1][x] : EMPTY;
  if (above !== EMPTY) return false;
  return true;
}

function placeBlock(x, y) {
  if (!isInside(x, y)) return;
  if (grid[y][x] === EMPTY) {
    grid[y][x] = currentType;
    if (currentType === SEED) seedTimers[y][x] = Date.now();
    else if (currentType === FIRE) {
      fireTimers[y][x] = Date.now();
      if (fireOriginGrid) fireOriginGrid[y][x] = EMPTY; // 用户放置的火，原方块为空
    }
    ensureAuxGrids();
    activateAround(x, y);
    if (multiplayerEnabled) sendNet({ type: 'place', x, y, blockType: currentType });
  }
}

function deleteBlock(x, y) {
  if (!isInside(x, y)) return;
  grid[y][x] = EMPTY;
  seedTimers[y][x] = 0;
  fireTimers[y][x] = 0;
  if (fireOriginGrid) fireOriginGrid[y][x] = 0;
  ensureAuxGrids();
  activateAround(x, y);
  if (multiplayerEnabled) sendNet({ type: 'delete', x, y });
}

// ===================== 水方块更新（性能优化版）=====================
function updateWater() {
  ensureAuxGrids();
  // 复用 moved 网格：每帧只清空，不重建大数组
  for (let y = 0; y < rows; y++) movedGrid[y].fill(0);

  let processed = 0;

  for (let y = rows - 1; y >= 0; y--) {
    const row = grid[y];
    const movedRow = movedGrid[y];
    const stillRow = stillGrid[y];
    for (let x = 0; x < cols; x++) {
      if (row[x] !== WATER || movedRow[x]) continue;

      // 静止水跳过；若下方支撑消失则重新激活
      if (stillRow[x]) {
        const belowType = (y + 1 < rows) ? grid[y + 1][x] : DIRT;
        if (belowType === EMPTY) {
          stillRow[x] = 0;
        } else {
          continue;
        }
      }

      // 限制每帧处理量，避免单帧过载
      if (processed >= MAX_WATER_PER_FRAME) {
        movedRow[x] = 1;
        continue;
      }
      processed++;

      let movedThisFrame = false;
      let newX = x;
      let newY = y;

      const below = (y + 1 < rows) ? grid[y + 1][x] : null;
      const left = (x - 1 >= 0) ? row[x - 1] : null;
      const right = (x + 1 < cols) ? row[x + 1] : null;
      const above = (y - 1 >= 0) ? grid[y - 1][x] : null;

      const leftSolid = left !== null && isSolid(left);
      const rightSolid = right !== null && isSolid(right);
      const leftBlocked = left !== null && isWaterOrSolid(left);
      const rightBlocked = right !== null && isWaterOrSolid(right);
      const belowBlocked = below !== null && isWaterOrSolid(below);
      const belowSupported = belowBlocked || below === null; // 画布底部视为有支撑

      // 检查左右各 3 格内是否有空位（用于判定是否可水平流动 / 是否可标记静止）
      let leftHasSpace = false;
      let rightHasSpace = false;
      for (let r = 1; r <= 3; r++) {
        if (isInside(x - r, y) && row[x - r] === EMPTY) leftHasSpace = true;
        if (isInside(x + r, y) && row[x + r] === EMPTY) rightHasSpace = true;
      }

      if (!belowSupported) {
        // 下方为空：向下掉落
        grid[y + 1][x] = WATER;
        row[x] = EMPTY;
        newX = x; newY = y + 1;
        movedGrid[y + 1][x] = 1;
        movedThisFrame = true;
      } else if (leftSolid && rightSolid) {
        // 两侧均为固体：完全无法移动
        movedThisFrame = false;
      } else if (leftBlocked && rightBlocked && (above === null || above === EMPTY)) {
        // 两侧被阻挡且上方为空：无法移动
        movedThisFrame = false;
      } else if (!leftHasSpace && !rightHasSpace) {
        // 左右各 3 格内均无空位：无水平流动空间，趋于静止
        movedThisFrame = false;
      } else {
        // 确定性方向选择：优先空位多的一侧；两侧都有空位则用位置哈希
        // 哈希基于位置 + 500ms 时间桶，保证同一位置短时间内方向一致，不每帧切换
        let dir;
        if (leftHasSpace && !rightHasSpace) dir = -1;
        else if (!leftHasSpace && rightHasSpace) dir = 1;
        else dir = (((x * 31 + y * 17 + Math.floor(Date.now() / 500)) % 2) === 0) ? -1 : 1;

        const sides = [dir, -dir];

        // 1. 先尝试对角线向下移动
        //    关键防穿缝：仅当侧方 (x+dx, y) 为空或水时才允许，避免穿过固体方块间的缝隙
        for (const dx of sides) {
          if (isInside(x + dx, y + 1) && grid[y + 1][x + dx] === EMPTY) {
            const sideType = isInside(x + dx, y) ? row[x + dx] : EMPTY;
            if (sideType === EMPTY || sideType === WATER) {
              grid[y + 1][x + dx] = WATER;
              row[x] = EMPTY;
              newX = x + dx; newY = y + 1;
              movedGrid[y + 1][x + dx] = 1;
              movedThisFrame = true;
              break;
            }
          }
        }

        // 2. 再尝试纯水平移动
        if (!movedThisFrame) {
          for (const dx of sides) {
            if (isInside(x + dx, y) && row[x + dx] === EMPTY) {
              row[x + dx] = WATER;
              row[x] = EMPTY;
              newX = x + dx; newY = y;
              movedRow[x + dx] = 1;
              movedThisFrame = true;
              break;
            }
          }
        }
      }

      if (movedThisFrame) {
        // 激活旧位置与新位置周围，确保邻近静止水重新评估（被推动/被流入）
        activateAround(x, y);
        activateAround(newX, newY);
      } else {
        movedRow[x] = 1;
        if (checkStill(x, y)) stillRow[x] = 1;
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
          // 顶部树叶：最上方木头（y-2）的正上方（y-3）放一块树叶
          if (isInside(x, y - 3) && grid[y - 3][x] === EMPTY) {
            grid[y - 3][x] = LEAVES;
          }

          seedTimers[y][x] = 0;
        }
      }
    }
  }
}

function updateFire() {
  if (!fireOriginGrid) return;
  const now = Date.now();
  const FIRE_LIFETIME = 2000; // 约 2 秒
  const directions = [[0, 1], [0, -1], [1, 0], [-1, 0]];

  // 收集本帧所有火方块（避免在迭代中修改 grid 影响判断）
  const toUpdate = [];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (grid[y][x] === FIRE) toUpdate.push({ x, y });
    }
  }

  for (const { x, y } of toUpdate) {
    if (grid[y][x] !== FIRE) continue; // 可能在本轮已被处理掉
    const origin = fireOriginGrid[y][x];

    // 1) 检查相邻是否有水 → 火被扑灭
    let adjacentWater = false;
    for (const [dx, dy] of directions) {
      const nx = x + dx, ny = y + dy;
      if (isInside(nx, ny) && grid[ny][nx] === WATER) {
        adjacentWater = true;
        break;
      }
    }
    if (adjacentWater) {
      // 火灭：原方块为木头则变木炭，否则变空
      grid[y][x] = (origin === WOOD) ? CHARCOAL : EMPTY;
      fireTimers[y][x] = 0;
      fireOriginGrid[y][x] = 0;
      ensureAuxGrids();
      activateAround(x, y);
      continue;
    }

    // 2) 计时未到 2 秒：保持燃烧，等待
    if (now - fireTimers[y][x] < FIRE_LIFETIME) continue;

    // 3) 计时超过 2 秒：检查相邻可燃物
    let fuelTarget = null;
    for (const [dx, dy] of directions) {
      const nx = x + dx, ny = y + dy;
      if (!isInside(nx, ny)) continue;
      const t = grid[ny][nx];
      if (t === WOOD || t === LEAVES) {
        fuelTarget = { x: nx, y: ny, type: t };
        break;
      }
    }

    if (fuelTarget) {
      // 点燃一个相邻可燃物（变为 FIRE，记录其原方块类型）
      grid[fuelTarget.y][fuelTarget.x] = FIRE;
      fireTimers[fuelTarget.y][fuelTarget.x] = now;
      fireOriginGrid[fuelTarget.y][fuelTarget.x] = fuelTarget.type;
      ensureAuxGrids();
      activateAround(fuelTarget.x, fuelTarget.y);
    }

    // 自身根据原方块类型决定结果：木头位变木炭，其他变空
    grid[y][x] = (origin === WOOD) ? CHARCOAL : EMPTY;
    fireTimers[y][x] = 0;
    fireOriginGrid[y][x] = 0;
    ensureAuxGrids();
    activateAround(x, y);
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
  if (gameState === 'game') {
    updateWater();
    updateSeedGrowth();
    updateFire();
    draw();
    // 房主定时重同步：每 5 秒广播完整世界快照
    if (isHost && multiplayerEnabled && conn && conn.open) {
      const now = Date.now();
      if (now - lastWorldSync >= 5000) {
        sendNet({ type: 'world', blocks: serializeWorld() });
        lastWorldSync = now;
      }
    }
  }
  requestAnimationFrame(gameLoop);
}

// ===================== UI 更新 =====================
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

// ===================== 背包栏 =====================
function buildInventory() {
  inventoryGrid.innerHTML = '';
  BLOCK_TYPES.forEach((type, i) => {
    const cls = BLOCK_CLASSES[i];
    const info = BLOCK_INFO[type];
    const cell = document.createElement('div');
    cell.className = 'inv-cell ' + cls;
    cell.title = info.name + '：' + info.desc;
    cell.innerHTML = '<span class="inv-icon"></span><span class="inv-label">' + info.name + '</span>';
    cell.addEventListener('click', (e) => {
      e.stopPropagation();
      currentType = type;
      updateToggleButton();
      closeInventory();
    });
    inventoryGrid.appendChild(cell);
  });
}

function openInventory() { inventoryPanel.classList.remove('hidden'); }
function closeInventory() { inventoryPanel.classList.add('hidden'); }

// ===================== 指针事件 =====================
function handlePointerDown(e) {
  if (e.button !== 0) return;
  if (!inventoryPanel.classList.contains('hidden')) return; // 背包栏打开时不放置
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
  if (!inventoryPanel.classList.contains('hidden')) return;
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

// 背包栏：点击按钮打开/关闭
toggleBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  if (inventoryPanel.classList.contains('hidden')) {
    openInventory();
  } else {
    closeInventory();
  }
});

// 点击外部区域关闭背包栏
document.addEventListener('click', (e) => {
  if (inventoryPanel.classList.contains('hidden')) return;
  if (inventoryPanel.contains(e.target) || toggleBtn.contains(e.target)) return;
  closeInventory();
});

modeBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  isDeleteMode = !isDeleteMode;
  updateModeButton();
});

window.addEventListener('resize', resize);

// ===================== 界面切换 =====================
function showScreen(state) {
  gameState = state;
  loginOverlay.classList.toggle('hidden', state !== 'login');
  menuOverlay.classList.toggle('hidden', state !== 'menu');
  joinRoomOverlay.classList.toggle('hidden', state !== 'join');
  const inGame = state === 'game';
  modeBtn.classList.toggle('hidden', !inGame);
  toggleBtn.classList.toggle('hidden', !inGame);
  // 游戏内显示「创建房间」按钮（已创建/已加入房间则隐藏）
  createRoomBtn.classList.toggle('hidden', !inGame || peer !== null);
  // 聊天按钮可见性：仅游戏内 + 联机模式
  updateChatVisibility();
  if (!inGame) {
    closeInventory();
    tooltip.style.display = 'none';
    isMouseDown = false;
  }
}

function enterGame() {
  showScreen('game');
}

// ===================== 登录 =====================
function doLogin() {
  const name = nicknameInput.value.trim();
  if (!name) {
    nicknameInput.focus();
    return;
  }
  nickname = name;
  localStorage.setItem(NICKNAME_KEY, name);
  menuNickname.textContent = name;
  showScreen('menu');
}

loginConfirmBtn.addEventListener('click', doLogin);
nicknameInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') doLogin();
});

// ===================== 主菜单 =====================
startGameBtn.addEventListener('click', () => {
  enterGame();
});

joinRoomMenuBtn.addEventListener('click', () => {
  roomCodeInput.value = '';
  hideJoinError();
  showScreen('join');
  setTimeout(() => roomCodeInput.focus(), 0);
});

// ===================== 加入房间 =====================
function showJoinError(msg) {
  joinError.textContent = msg;
  joinError.classList.remove('hidden');
}
function hideJoinError() {
  joinError.classList.add('hidden');
  joinError.textContent = '';
}

joinConfirmBtn.addEventListener('click', () => {
  const code = roomCodeInput.value.trim().toUpperCase();
  if (!validateRoomCode(code)) {
    showJoinError('房间码格式不正确（应为 XXXXX-XX）');
    return;
  }
  joinRoom(code);
});

joinCancelBtn.addEventListener('click', () => {
  hideJoinError();
  showScreen('menu');
});

roomCodeInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') joinConfirmBtn.click();
});

function validateRoomCode(code) {
  return /^[A-Z0-9]{5}-[A-Z0-9]{2}$/.test(code);
}

function generateRoomCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let part1 = '';
  for (let i = 0; i < 5; i++) part1 += chars[Math.floor(Math.random() * chars.length)];
  let part2 = '';
  for (let i = 0; i < 2; i++) part2 += chars[Math.floor(Math.random() * chars.length)];
  return part1 + '-' + part2;
}

// ===================== 房间信息显示 =====================
function showRoomInfo(code, status) {
  roomCodeText.textContent = code;
  roomStatusText.textContent = status;
  roomInfo.classList.remove('hidden');
}

// ===================== 联机（PeerJS）=====================
function ensurePeerAvailable() {
  if (typeof Peer === 'undefined') {
    alert('联机服务加载失败，请检查网络后刷新页面重试。');
    return false;
  }
  return true;
}

function setupConn(c) {
  c.on('data', handleRemoteMessage);
  c.on('close', () => {
    multiplayerEnabled = false;
    conn = null;
    updateChatVisibility();
    if (gameState === 'game' && roomCode) showRoomInfo(roomCode, '对方已断开');
  });
  c.on('error', () => {
    if (gameState === 'game' && roomCode) showRoomInfo(roomCode, '连接错误');
  });
}

// 房主创建房间
function createRoom() {
  if (!ensurePeerAvailable()) return;
  if (peer) return; // 已在房间中
  roomCode = generateRoomCode();
  isHost = true;
  createRoomBtn.disabled = true;
  createRoomBtn.textContent = '创建中...';

  peer = new Peer(PEER_PREFIX + roomCode);

  peer.on('open', () => {
    multiplayerEnabled = true;
    updateChatVisibility();
    createRoomBtn.disabled = false;
    createRoomBtn.textContent = '创建房间';
    createRoomBtn.classList.add('hidden');
    showRoomInfo(roomCode, '等待玩家加入...');
  });

  peer.on('connection', (c) => {
    if (conn && conn.open) { c.close(); return; } // 仅支持 1v1
    conn = c;
    setupConn(c);
    c.on('open', () => {
      showRoomInfo(roomCode, '已连接');
      // 房主向新加入的客户端发送完整世界数据
      sendNet({ type: 'world', blocks: serializeWorld() });
      lastWorldSync = Date.now();
    });
  });

  peer.on('error', (err) => {
    createRoomBtn.disabled = false;
    createRoomBtn.textContent = '创建房间';
    const etype = err && err.type ? err.type : '';
    if (etype === 'unavailable-id') {
      alert('房间码冲突，请重试');
    } else {
      alert('创建房间失败：' + (etype || '未知错误'));
    }
    cleanupPeer();
  });
}

createRoomBtn.addEventListener('click', () => {
  createRoom();
});

// 客户端加入房间
function joinRoom(code) {
  if (!ensurePeerAvailable()) return;
  roomCode = code;
  isHost = false;
  showJoinError('正在连接...');
  joinConfirmBtn.disabled = true;
  joinCancelBtn.disabled = true;

  peer = new Peer(); // 随机 PeerID

  peer.on('open', () => {
    const targetId = PEER_PREFIX + code;
    const c = peer.connect(targetId, { reliable: true });
    conn = c;
    setupConn(c);

    c.on('open', () => {
      multiplayerEnabled = true;
      updateChatVisibility();
      joinConfirmBtn.disabled = false;
      joinCancelBtn.disabled = false;
      hideJoinError();
      enterGame();
      showRoomInfo(code, '已连接');
    });

    c.on('error', () => {
      joinConfirmBtn.disabled = false;
      joinCancelBtn.disabled = false;
      showJoinError('连接失败，请检查房间码');
      cleanupPeer();
    });
  });

  peer.on('error', (err) => {
    joinConfirmBtn.disabled = false;
    joinCancelBtn.disabled = false;
    const etype = err && err.type ? err.type : '';
    if (etype === 'peer-unavailable') {
      showJoinError('房间不存在或已关闭');
    } else {
      showJoinError('连接失败：' + (etype || '未知错误'));
    }
    cleanupPeer();
  });
}

function cleanupPeer() {
  if (conn) { try { conn.close(); } catch (e) {} conn = null; }
  if (peer) { try { peer.destroy(); } catch (e) {} peer = null; }
  multiplayerEnabled = false;
  isHost = false;
  roomCode = null;
  lastWorldSync = 0;
  roomInfo.classList.add('hidden');
  updateChatVisibility();
  // 重新显示创建房间按钮（若在游戏中）
  if (gameState === 'game') createRoomBtn.classList.remove('hidden');
}

function sendNet(msg) {
  if (conn && conn.open) {
    try { conn.send(msg); } catch (e) {}
  }
}

function handleRemoteMessage(msg) {
  if (!msg || !msg.type) return;
  if (msg.type === 'place') {
    if (isInside(msg.x, msg.y) && grid[msg.y][msg.x] === EMPTY) {
      grid[msg.y][msg.x] = msg.blockType;
      if (msg.blockType === SEED) seedTimers[msg.y][msg.x] = Date.now();
      else if (msg.blockType === FIRE) {
        fireTimers[msg.y][msg.x] = Date.now();
        if (fireOriginGrid) fireOriginGrid[msg.y][msg.x] = EMPTY;
      }
      ensureAuxGrids();
      activateAround(msg.x, msg.y);
    }
  } else if (msg.type === 'delete') {
    if (isInside(msg.x, msg.y)) {
      grid[msg.y][msg.x] = EMPTY;
      seedTimers[msg.y][msg.x] = 0;
      fireTimers[msg.y][msg.x] = 0;
      if (fireOriginGrid) fireOriginGrid[msg.y][msg.x] = 0;
      ensureAuxGrids();
      activateAround(msg.x, msg.y);
    }
  } else if (msg.type === 'world') {
    // 完整世界同步：用房主数据重建本地世界
    applyWorldSnapshot(msg.blocks);
  } else if (msg.type === 'chat') {
    onChatReceived(msg.from, msg.text);
  }
}

// ===================== 世界同步 =====================
// 序列化当前世界为非空方块列表 [[x, y, type], ...]
function serializeWorld() {
  const blocks = [];
  for (let y = 0; y < rows; y++) {
    const row = grid[y];
    for (let x = 0; x < cols; x++) {
      if (row[x] !== EMPTY) blocks.push([x, y, row[x]]);
    }
  }
  return blocks;
}

// 用房主发来的快照重建本地世界
function applyWorldSnapshot(blocks) {
  // 清空本地所有状态
  for (let y = 0; y < rows; y++) {
    grid[y].fill(EMPTY);
    if (seedTimers[y]) seedTimers[y].fill(0);
    if (fireTimers[y]) fireTimers[y].fill(0);
    if (fireOriginGrid && fireOriginGrid[y]) fireOriginGrid[y].fill(0);
  }
  // 重建方块
  if (Array.isArray(blocks)) {
    for (const b of blocks) {
      const x = b[0], y = b[1], t = b[2];
      if (!isInside(x, y)) continue;
      grid[y][x] = t;
      if (t === FIRE) {
        fireTimers[y][x] = Date.now();
        // 远端同步的火不知原方块类型，默认 EMPTY（烧完变空，由下次同步纠正）
        if (fireOriginGrid) fireOriginGrid[y][x] = EMPTY;
      }
    }
  }
  // 重置静止标记，让水重新稳定
  movedGrid = null;
  stillGrid = null;
  ensureAuxGrids();
}

// ===================== 聊天系统 =====================
function updateChatVisibility() {
  // 仅在游戏内且联机模式开启时显示聊天按钮
  const showChat = gameState === 'game' && multiplayerEnabled;
  chatBtn.classList.toggle('hidden', !showChat);
  if (!showChat) {
    // 退出联机时关闭面板并清空红点
    chatPanel.classList.add('hidden');
    chatOpen = false;
    unreadCount = 0;
    chatDot.classList.add('hidden');
  }
}

function openChat() {
  if (!multiplayerEnabled) return;
  chatPanel.classList.remove('hidden');
  chatOpen = true;
  unreadCount = 0;
  chatDot.classList.add('hidden');
  setTimeout(() => chatInput.focus(), 0);
}

function closeChat() {
  chatPanel.classList.add('hidden');
  chatOpen = false;
  chatInput.blur();
}

function toggleChat() {
  if (!multiplayerEnabled) return;
  if (chatOpen) closeChat();
  else openChat();
}

function sendChat() {
  const text = chatInput.value.trim();
  if (!text) return;
  if (!multiplayerEnabled || !conn || !conn.open) return;
  sendNet({ type: 'chat', text, from: nickname });
  displayChatMessage(nickname, text, true);
  chatInput.value = '';
}

function displayChatMessage(from, text, isSelf) {
  const msg = document.createElement('div');
  msg.className = 'chat-msg ' + (isSelf ? 'self' : 'other');
  const nameDiv = document.createElement('div');
  nameDiv.className = 'chat-name';
  nameDiv.textContent = isSelf ? '我' : (from || '对方');
  const textDiv = document.createElement('div');
  textDiv.className = 'chat-text';
  textDiv.textContent = text;
  msg.appendChild(nameDiv);
  msg.appendChild(textDiv);
  chatMessages.appendChild(msg);
  // 自动滚动到最新消息
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function onChatReceived(from, text) {
  displayChatMessage(from, text, false);
  if (!chatOpen) {
    unreadCount++;
    chatDot.classList.remove('hidden');
  }
}

// 聊天按钮：点击切换面板
chatBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  toggleChat();
});

// 发送按钮
chatSendBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  sendChat();
});

// 输入框：回车发送
chatInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    sendChat();
  } else if (e.key === 'Escape') {
    e.preventDefault();
    closeChat();
  }
  // 阻止输入框内的按键冒泡到全局（避免触发 T 切换等）
  e.stopPropagation();
});

// 阻止输入框点击冒泡关闭面板
chatPanel.addEventListener('click', (e) => {
  e.stopPropagation();
});

// 全局按键：T 切换聊天，Esc 关闭
window.addEventListener('keydown', (e) => {
  // 输入框聚焦时不触发全局快捷键（避免输入 T 字符时切换面板）
  const active = document.activeElement;
  if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) return;

  if (e.key === 't' || e.key === 'T') {
    if (gameState === 'game' && multiplayerEnabled) {
      e.preventDefault();
      toggleChat();
    }
  } else if (e.key === 'Escape') {
    if (chatOpen) {
      e.preventDefault();
      closeChat();
    }
  }
});

// ===================== 初始化 =====================
function init() {
  resize();
  buildInventory();
  updateToggleButton();
  updateModeButton();
  const saved = localStorage.getItem(NICKNAME_KEY);
  if (saved) nicknameInput.value = saved;
  showScreen('login');
  setTimeout(() => nicknameInput.focus(), 0);
  requestAnimationFrame(gameLoop);
}

init();
