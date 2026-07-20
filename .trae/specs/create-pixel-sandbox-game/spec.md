# 像素沙盒小游戏规格说明

## Why
用户希望做一个可以在浏览器里直接玩、并分享给朋友的像素风格小游戏。核心玩法是：左键放置方块，通过右下角按钮在水（受重力、会流动/堆叠）和泥土（不受重力）之间切换。

## What Changes
- 新建一个纯前端网页游戏项目（HTML + CSS + JS），使用 `<canvas>` 绘制像素风格方块。
- 画布全屏自适应，保持清晰的像素网格外观。
- 实现两种方块：
  - **水方块**：受重力下落，落地后向左右流动并堆叠，表现类似简易“落沙”物理。
  - **泥土方块**：固定方块，放置后静止不动，不受重力影响。
- 右下角放置切换按钮，当前选中类型（水/泥土）一目了然。
- 左键点击画布空白区域或已有方块旁边即可放置当前选中的方块。
- 将代码推送到用户已创建的 GitHub 仓库，并开启 GitHub Pages 静态页面，方便分享。

## Impact
- 新增能力：像素沙盒放置游戏、GitHub Pages 静态部署。
- 涉及文件：项目根目录下的 `index.html`、`style.css`、`game.js`，以及 `README.md`、`.gitignore`。

## ADDED Requirements

### Requirement: 游戏画布与交互
The system SHALL 提供一个全屏自适应的像素风格画布。

#### Scenario: 页面加载
- **WHEN** 用户打开游戏页面
- **THEN** 画布自动填满浏览器可视区域，且无滚动条

#### Scenario: 左键放置方块
- **GIVEN** 用户已选择一种方块类型
- **WHEN** 用户在画布上按下左键
- **THEN** 在鼠标所在网格位置放置当前选中的方块

### Requirement: 方块类型切换
The system SHALL 在画布右下角提供一个切换按钮。

#### Scenario: 切换为水方块
- **WHEN** 用户点击切换按钮且当前为泥土
- **THEN** 当前类型变为水方块，按钮视觉状态同步更新

#### Scenario: 切换为泥土方块
- **WHEN** 用户点击切换按钮且当前为水
- **THEN** 当前类型变为泥土方块，按钮视觉状态同步更新

### Requirement: 水方块物理
The system SHALL 让水方块受重力下落，并在底部向两侧流动、堆叠。

#### Scenario: 水方块下落
- **GIVEN** 用户在半空中放置水方块
- **WHEN** 游戏更新一帧
- **THEN** 水方块向下移动，直到下方有方块或画布底部

#### Scenario: 水方块流动与堆叠
- **GIVEN** 水方块已落到底部
- **WHEN** 其正下方被其他水/泥土方块占据
- **THEN** 水方块尝试向左或向右移动；若下方两侧可落则继续下落，最终形成堆叠/铺展效果

### Requirement: 泥土方块
The system SHALL 让泥土方块放置后保持静止。

#### Scenario: 放置泥土
- **WHEN** 用户放置泥土方块
- **THEN** 泥土方块停留在被放置的网格位置，不受重力影响

### Requirement: GitHub 部署
The system SHALL 将游戏代码推送到 GitHub 并通过 GitHub Pages 提供可访问链接。

#### Scenario: 静态页面可访问
- **WHEN** 用户访问 GitHub Pages 链接
- **THEN** 页面正常加载，游戏可玩

## MODIFIED Requirements
无

## REMOVED Requirements
无
