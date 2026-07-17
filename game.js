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
let movedGrid = null;   // 复用：每帧只 clear，不重建
let stillGrid = null;   // 静止水标记（1=静止，跳过移动计算）
let currentType = WATER;
let isMouseDown = false;
let isDeleteMode = false;
let gameState = 'login'; // login | menu | join | game

const MAX_WATER_PER_FRAME = 2000;

// ===================== 联机状态 =====================
const NICKNAME_KEY = 'psx_nickname';
const PEER_PREFIX = 'psxgame-';
let nickname = '';
let peer = null;
let conn = null;
let isHost = false;
let roomCode = null;
let multiplayerEnabled = false;

// ===================== 网格工具 =====================
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
    else if (currentType === FIRE) fireTimers[y][x] = Date.now();
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

      if (!belowSupported) {
        grid[y + 1][x] = WATER;
        row[x] = EMPTY;
        newX = x; newY = y + 1;
        movedGrid[y + 1][x] = 1;
        movedThisFrame = true;
      } else if (leftSolid && rightSolid) {
        movedThisFrame = false;
      } else if (belowSupported && leftBlocked && rightBlocked && (above === null || above === EMPTY)) {
        movedThisFrame = false;
      } else {
        const dir = Math.random() < 0.5 ? -1 : 1;
        const sides = [dir, -dir];

        for (const dx of sides) {
          if (isInside(x + dx, y + 1) && grid[y + 1][x + dx] === EMPTY) {
            grid[y + 1][x + dx] = WATER;
            row[x] = EMPTY;
            newX = x + dx; newY = y + 1;
            movedGrid[y + 1][x + dx] = 1;
            movedThisFrame = true;
            break;
          }
        }

        if (!movedThisFrame && !(leftBlocked && rightBlocked)) {
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
      activateAround(x, y);
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
        activateAround(x, y);
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
            activateAround(nx, ny);
            activateAround(x, y);
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
  if (gameState === 'game') {
    updateWater();
    updateSeedGrowth();
    updateFire();
    draw();
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
  roomInfo.classList.add('hidden');
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
      else if (msg.blockType === FIRE) fireTimers[msg.y][msg.x] = Date.now();
      ensureAuxGrids();
      activateAround(msg.x, msg.y);
    }
  } else if (msg.type === 'delete') {
    if (isInside(msg.x, msg.y)) {
      grid[msg.y][msg.x] = EMPTY;
      seedTimers[msg.y][msg.x] = 0;
      fireTimers[msg.y][msg.x] = 0;
      ensureAuxGrids();
      activateAround(msg.x, msg.y);
    }
  }
}

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
