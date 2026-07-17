# Tasks

- [x] Task 1: 修复水方块抽搐与穿缝隙
  - [x] SubTask 1.1: 水平流动方向改为确定性选择（基于位置哈希，非 Math.random）
  - [x] SubTask 1.2: 水平流动前检查左右各 3 格内是否有空位，无则静止
  - [x] SubTask 1.3: 对角线移动仅限下方为空且两侧固体时，避免穿缝
  - [x] SubTask 1.4: 测试水在平坦表面静止、被夹时不穿缝

- [x] Task 2: 修复火方块放置与燃烧
  - [x] SubTask 2.1: 确保火方块可放在任何空位（检查 placeBlock 逻辑）
  - [x] SubTask 2.2: 火周围无可燃物时约 2 秒后自灭
  - [x] SubTask 2.3: 火点燃相邻木头/树叶并蔓延
  - [x] SubTask 2.4: 木头烧成木炭、树叶消失
  - [x] SubTask 2.5: 测试火放置、蔓延、自灭

- [x] Task 3: 修复树结构（顶部加树叶）
  - [x] SubTask 3.1: 修改 updateSeedGrowth，最上方木头正上方加树叶
  - [x] SubTask 3.2: 测试种子生长出完整树（含顶部树叶）

- [x] Task 4: 实现聊天系统
  - [x] SubTask 4.1: 在 index.html 添加聊天面板和左上角按钮
  - [x] SubTask 4.2: 在 style.css 添加聊天样式（面板、消息、红点）
  - [x] SubTask 4.3: 按 T 键或点击按钮打开/关闭聊天
  - [x] SubTask 4.4: 输入消息回车发送，通过 DataChannel 同步
  - [x] SubTask 4.5: 收到消息时若面板关闭则显示红点
  - [x] SubTask 4.6: 单人模式下隐藏聊天按钮

- [x] Task 5: 实现房间初始世界同步
  - [x] SubTask 5.1: 定义 world 同步消息协议
  - [x] SubTask 5.2: 房主在对方加入时发送完整世界数据
  - [x] SubTask 5.3: 客户端接收后重建本地世界
  - [x] SubTask 5.4: 测试加入房间后世界一致

- [x] Task 6: 实现定时重同步
  - [x] SubTask 6.1: 房主每 5 秒广播完整世界快照
  - [x] SubTask 6.2: 客户端接收后更新本地世界
  - [x] SubTask 6.3: 测试网络异常后状态恢复

- [x] Task 7: 集成测试与推送
  - [x] SubTask 7.1: 本地测试所有功能正常
  - [x] SubTask 7.2: 更新 README
  - [x] SubTask 7.3: 提交并推送到 GitHub test 分支

# Task Dependencies
- Task 2 依赖 None
- Task 3 依赖 None
- Task 4 依赖 None
- Task 5 依赖 None
- Task 6 依赖 Task 5
- Task 7 依赖 Task 1-6
