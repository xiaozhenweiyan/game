# Tasks

- [x] Task 1: 修复水方块卡顿问题
  - [x] SubTask 1.1: 复用 moved 网格，避免每帧 `createGrid` 重建大数组
  - [x] SubTask 1.2: 为水方块增加「静止」标记，稳定的水方块跳过移动计算
  - [x] SubTask 1.3: 实现激活机制：当邻居（上/左/右/下）发生变化时，取消静止标记重新参与更新
  - [x] SubTask 1.4: 确保静止水被其他水流推动时能重新移动，不会永远卡死
  - [x] SubTask 1.5: 限制每帧处理的水方块数量，避免单帧过载
  - [x] SubTask 1.6: 本地测试放置大量水时帧率保持流畅

- [x] Task 2: 实现背包栏（替换切换按钮）
  - [x] SubTask 2.1: 在 `index.html` 添加背包栏面板结构
  - [x] SubTask 2.2: 在 `style.css` 添加背包栏样式（网格布局、像素风格）
  - [x] SubTask 2.3: 修改 `game.js`，点击按钮打开/关闭背包栏
  - [x] SubTask 2.4: 背包栏中选择方块后更新 currentType 并关闭面板
  - [x] SubTask 2.5: 点击背包栏外部区域关闭面板

- [x] Task 3: 实现登录界面
  - [x] SubTask 3.1: 在 `index.html` 添加登录界面（覆盖层）
  - [x] SubTask 3.2: 添加昵称输入框和确认按钮
  - [x] SubTask 3.3: 创建临时账号（仅本地保存昵称），进入主菜单

- [x] Task 4: 实现主菜单
  - [x] SubTask 4.1: 在 `index.html` 添加主菜单界面
  - [x] SubTask 4.2: 「开始游戏」按钮进入单人沙盒模式
  - [x] SubTask 4.3: 「进入房间」按钮弹出房间码输入框

- [x] Task 5: 实现创建房间功能
  - [x] SubTask 5.1: 引入 PeerJS 库（CDN）
  - [x] SubTask 5.2: 在 `game.js` 右上角添加「创建房间」按钮
  - [x] SubTask 5.3: 生成 `XXXXX-XX` 格式房间码（大写英文+数字）
  - [x] SubTask 5.4: 创建 PeerJS 连接，房间码映射到 PeerID
  - [x] SubTask 5.5: 显示房间码给房主，等待加入

- [x] Task 6: 实现加入房间功能
  - [x] SubTask 6.1: 房间码输入框和校验逻辑
  - [x] SubTask 6.2: 通过房间码解析 PeerID 并建立连接
  - [x] SubTask 6.3: 连接成功后进入联机游戏模式
  - [x] SubTask 6.4: 连接失败时提示错误

- [x] Task 7: 实现世界同步
  - [x] SubTask 7.1: 定义消息协议（place/delete/seed 等操作）
  - [x] SubTask 7.2: 放置/删除方块时广播操作给对方
  - [x] SubTask 7.3: 接收对方操作并应用到本地世界
  - [x] SubTask 7.4: 处理冲突（后到操作覆盖先到）

- [x] Task 8: 集成测试与推送
  - [x] SubTask 8.1: 本地测试单人模式正常
  - [x] SubTask 8.2: 本地测试联机模式（两个浏览器窗口）
  - [x] SubTask 8.3: 更新 README 说明联机玩法
  - [x] SubTask 8.4: 提交并推送到 GitHub test 分支

# Task Dependencies
- Task 2 依赖 Task 1
- Task 3 依赖 None
- Task 4 依赖 Task 3
- Task 5 依赖 Task 4
- Task 6 依赖 Task 5
- Task 7 依赖 Task 6
- Task 8 依赖 Task 1-7
