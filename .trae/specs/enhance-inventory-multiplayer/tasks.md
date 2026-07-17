# Tasks

- [ ] Task 1: 修复水方块卡顿问题
  - [ ] SubTask 1.1: 复用 moved 网格，避免每帧 `createGrid` 重建大数组
  - [ ] SubTask 1.2: 优化静止判定，稳定的水方块直接跳过扫描
  - [ ] SubTask 1.3: 限制每帧处理的水方块数量，避免单帧过载
  - [ ] SubTask 1.4: 本地测试放置大量水时帧率保持流畅

- [ ] Task 2: 实现背包栏（替换切换按钮）
  - [ ] SubTask 2.1: 在 `index.html` 添加背包栏面板结构
  - [ ] SubTask 2.2: 在 `style.css` 添加背包栏样式（网格布局、像素风格）
  - [ ] SubTask 2.3: 修改 `game.js`，点击按钮打开/关闭背包栏
  - [ ] SubTask 2.4: 背包栏中选择方块后更新 currentType 并关闭面板
  - [ ] SubTask 2.5: 点击背包栏外部区域关闭面板

- [ ] Task 3: 实现登录界面
  - [ ] SubTask 3.1: 在 `index.html` 添加登录界面（覆盖层）
  - [ ] SubTask 3.2: 添加昵称输入框和确认按钮
  - [ ] SubTask 3.3: 创建临时账号（仅本地保存昵称），进入主菜单

- [ ] Task 4: 实现主菜单
  - [ ] SubTask 4.1: 在 `index.html` 添加主菜单界面
  - [ ] SubTask 4.2: 「开始游戏」按钮进入单人沙盒模式
  - [ ] SubTask 4.3: 「进入房间」按钮弹出房间码输入框

- [ ] Task 5: 实现创建房间功能
  - [ ] SubTask 5.1: 引入 PeerJS 库（CDN）
  - [ ] SubTask 5.2: 在 `game.js` 右上角添加「创建房间」按钮
  - [ ] SubTask 5.3: 生成 `XXXXX-XX` 格式房间码（大写英文+数字）
  - [ ] SubTask 5.4: 创建 PeerJS 连接，房间码映射到 PeerID
  - [ ] SubTask 5.5: 显示房间码给房主，等待加入

- [ ] Task 6: 实现加入房间功能
  - [ ] SubTask 6.1: 房间码输入框和校验逻辑
  - [ ] SubTask 6.2: 通过房间码解析 PeerID 并建立连接
  - [ ] SubTask 6.3: 连接成功后进入联机游戏模式
  - [ ] SubTask 6.4: 连接失败时提示错误

- [ ] Task 7: 实现世界同步
  - [ ] SubTask 7.1: 定义消息协议（place/delete/seed 等操作）
  - [ ] SubTask 7.2: 放置/删除方块时广播操作给对方
  - [ ] SubTask 7.3: 接收对方操作并应用到本地世界
  - [ ] SubTask 7.4: 处理冲突（后到操作覆盖先到）

- [ ] Task 8: 集成测试与推送
  - [ ] SubTask 8.1: 本地测试单人模式正常
  - [ ] SubTask 8.2: 本地测试联机模式（两个浏览器窗口）
  - [ ] SubTask 8.3: 更新 README 说明联机玩法
  - [ ] SubTask 8.4: 提交并推送到 GitHub test 分支

# Task Dependencies
- Task 2 依赖 Task 1
- Task 3 依赖 None
- Task 4 依赖 Task 3
- Task 5 依赖 Task 4
- Task 6 依赖 Task 5
- Task 7 依赖 Task 6
- Task 8 依赖 Task 1-7
