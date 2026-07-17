# 像素沙盒游戏：背包栏 + 联机 + 水卡顿修复 Spec

## Why
当前放置水后浏览器会突然卡顿/冻结，影响游玩；同时切换方块只能循环点击效率低；用户希望和朋友实时共同编辑同一个世界，需要联机功能。

## What Changes
- **修复水卡顿**：优化 `updateWater()` 性能，避免每帧重建大数组；优化静止判定逻辑，减少无意义扫描。
- **BREAKING**：右下角单击循环切换 → 改为点击后弹出「背包栏」面板，可在其中选择任意方块类型。
- **新增登录界面**：打开游戏先进入登录界面，可创建临时账号（输入昵称即可）。
- **新增主菜单**：登录后提供「开始游戏（单人）」和「进入房间（联机）」两个选项。
- **新增联机功能**：
  - 游戏内右上角「创建房间」按钮，点击后生成房间码（格式 `XXXXX-XX`，大写英文+数字）。
  - 主菜单「进入房间」按钮，输入房间码后加入房间。
  - 房间内两人可共同编辑同一个世界，对方操作实时同步。

## Impact
- Affected specs: extend-pixel-game-features（背包栏替换切换按钮）
- Affected code: `game.js`、`index.html`、`style.css`，新增 `login.js`、`room.js`、`net.js` 等模块。
- **技术约束**：游戏部署在 GitHub Pages（纯静态托管），联机需要实时通信能力，无法自建后端服务器。

## ADDED Requirements

### Requirement: 水方块性能优化
The system SHALL 优化水方块更新逻辑，避免放置水后浏览器卡顿。

#### Scenario: 大量水放置
- **WHEN** 用户在画布上放置大量水方块
- **THEN** 游戏保持流畅（帧率 ≥ 30 FPS），不会卡顿或冻结

#### Scenario: 水静止判定
- **WHEN** 水方块处于稳定状态（下方有支撑、左右被阻挡）
- **THEN** 不再每帧尝试移动，减少无效计算

### Requirement: 背包栏
The system SHALL 将右下角切换按钮改为点击后打开背包栏。

#### Scenario: 打开背包栏
- **WHEN** 用户点击右下角按钮
- **THEN** 弹出背包栏面板，展示所有可选方块（水、泥土、种子、木头、树叶、火、木炭）

#### Scenario: 选择方块
- **WHEN** 用户在背包栏中点击某个方块
- **THEN** 当前选中类型变为该方块，背包栏关闭，按钮图标更新为所选方块

#### Scenario: 关闭背包栏
- **WHEN** 用户点击背包栏外部区域或再次点击按钮
- **THEN** 背包栏关闭

### Requirement: 登录界面
The system SHALL 在打开游戏时显示登录界面。

#### Scenario: 创建临时账号
- **WHEN** 用户在登录界面输入昵称并确认
- **THEN** 创建临时账号，进入主菜单

### Requirement: 主菜单
The system SHALL 在登录后显示主菜单，提供单人游戏和联机选项。

#### Scenario: 开始单人游戏
- **WHEN** 用户点击「开始游戏」
- **THEN** 进入单人沙盒模式

#### Scenario: 进入房间入口
- **WHEN** 用户点击「进入房间」
- **THEN** 弹出房间码输入框

### Requirement: 创建房间
The system SHALL 在游戏内右上角提供「创建房间」按钮。

#### Scenario: 生成房间码
- **WHEN** 用户点击「创建房间」
- **THEN** 生成格式为 `XXXXX-XX` 的房间码（大写英文+数字随机组成），并显示给用户

#### Scenario: 房主等待
- **WHEN** 房间已创建
- **THEN** 房主进入联机游戏模式，等待其他玩家加入

### Requirement: 加入房间
The system SHALL 允许玩家通过房间码加入房间。

#### Scenario: 输入房间码
- **WHEN** 用户在「进入房间」输入框中输入合法房间码
- **THEN** 加入对应房间，与房主共同编辑世界

#### Scenario: 房间码格式校验
- **WHEN** 用户输入的房间码不符合 `XXXXX-XX` 格式
- **THEN** 提示「房间码格式不正确」

### Requirement: 世界同步
The system SHALL 在联机模式下同步两位玩家的编辑操作。

#### Scenario: 放置方块同步
- **GIVEN** 两位玩家在同一房间
- **WHEN** 其中一方放置方块
- **THEN** 另一方画面上实时出现该方块

#### Scenario: 删除方块同步
- **GIVEN** 两位玩家在同一房间
- **WHEN** 其中一方删除方块
- **THEN** 另一方画面上该方块实时消失

## MODIFIED Requirements

### Requirement: 方块类型切换
原「右下角单击循环切换」改为「点击后打开背包栏选择」。详见「背包栏」要求。

## REMOVED Requirements
无

## 技术方案（联机）
由于游戏部署在 GitHub Pages（纯静态），联机采用 **PeerJS（WebRTC P2P）** 方案：
- 房主创建房间时生成 PeerID（与房间码映射），作为 P2P 主机。
- 加入者通过房间码解析出 PeerID，建立 WebRTC DataChannel。
- 使用 PeerJS 公共信令服务器（`0.peerjs.com`）完成握手。
- 方块操作通过 DataChannel 以 JSON 消息同步。

## Open Questions
- [ ] 联机是否接受使用 PeerJS 公共信令服务器？（若不可用需自建信令服务）
- [ ] 临时账号是否需要密码？（当前设计为仅昵称，无需密码）
- [ ] 房间码是否需要有效期？（当前设计为房主退出即销毁）
