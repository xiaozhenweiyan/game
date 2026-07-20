# Tasks

- [ ] Task 1: 初始化前端项目结构
  - [ ] SubTask 1.1: 创建 `index.html` 并引入 `style.css` 和 `game.js`
  - [ ] SubTask 1.2: 创建 `style.css`，实现全屏无滚动条、像素风格基础样式
  - [ ] SubTask 1.3: 创建 `README.md`，说明游戏玩法和 GitHub Pages 链接位置
  - [ ] SubTask 1.4: 创建 `.gitignore`（如需要）

- [ ] Task 2: 实现画布与基础交互
  - [ ] SubTask 2.1: 初始化 `<canvas>` 并使其全屏自适应，监听窗口 resize
  - [ ] SubTask 2.2: 将鼠标坐标映射到网格坐标
  - [ ] SubTask 2.3: 实现左键点击放置当前选中方块

- [ ] Task 3: 实现泥土方块
  - [ ] SubTask 3.1: 定义泥土方块类型与像素颜色
  - [ ] SubTask 3.2: 确保泥土放置后不受重力影响、不参与物理更新

- [ ] Task 4: 实现水方块物理
  - [ ] SubTask 4.1: 定义水方块类型与像素颜色
  - [ ] SubTask 4.2: 实现重力下落逻辑
  - [ ] SubTask 4.3: 实现底部向左右流动与堆叠逻辑
  - [ ] SubTask 4.4: 优化更新顺序，避免单帧内所有水同时移动导致的抖动

- [ ] Task 5: 实现右下角类型切换按钮
  - [ ] SubTask 5.1: 绘制或创建切换按钮 UI（水/泥土两种状态）
  - [ ] SubTask 5.2: 点击按钮切换当前类型并更新按钮视觉
  - [ ] SubTask 5.3: 确保点击按钮不会误放置方块

- [ ] Task 6: 推送到 GitHub
  - [ ] SubTask 6.1: 初始化本地 git 仓库（如尚未初始化）
  - [ ] SubTask 6.2: 添加远程仓库地址
  - [ ] SubTask 6.3: 提交并推送到 main/master 分支

- [ ] Task 7: 配置 GitHub Pages
  - [ ] SubTask 7.1: 在仓库设置中启用 GitHub Pages（分支为 main/root）
  - [ ] SubTask 7.2: 验证 Pages 链接可访问，游戏正常运行

# Task Dependencies
- Task 2 依赖 Task 1
- Task 3 依赖 Task 2
- Task 4 依赖 Task 2
- Task 5 依赖 Task 2
- Task 6 依赖 Task 1、Task 3、Task 4、Task 5
- Task 7 依赖 Task 6
