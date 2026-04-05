# 英语生词本桌面应用 - 工程实施方案 (Execution Plan)

**文档属性**: 内部执行纲领
**依据准则**: 《产品需求文档 (PRD) & 架构蓝图 v1.0》
**编制团队**: 首席架构师联合工程专家组

---

## 一、 团队角色与职责分工 (Role Assignments)

为了高效推进开发，团队划分为以下虚拟角色，在实际开发中严格按角色标准执行落地：

1. **👨‍💻 首席架构师 (Chief Architect)**
   - 负责：整体技术栈选型定调（Electron + better-sqlite3）、数据库表结构设计、云盘同步 LWW 一致性算法设计、IPC 安全通信沙盒搭建。
   - 产出：系统骨架代码、核心 DB 操作类、同步核心脚本。
2. **🎨 UI/UX 专家 (UI/UX Expert)**
   - 负责：玻璃拟态 (Glassmorphism) CSS 视觉实现、无边框窗口 (Frameless Window) 的拖拽与系统级无缝融合、托盘交互设计、全局动画帧率优化。
   - 产出：`index.css` 全局设计系统、主仪表盘与迷你浮窗页面的 HTML/JS。
3. **⚙️ 业务逻辑研发 (Business Logic Dev)**
   - 负责：整合 ECDICT 离线数据库源、SM-2 间隔复习算法逻辑落地、全局系统热键 (`Ctrl+Shift+D`) 状态管理。
   - 产出：查词引擎 API、复习时间调度器、生词 CRUD 控制器。
4. **🎯 质量与交付工程师 (QA & Release Engineer)**
   - 负责：各阶段里程碑验证、模拟网盘文件读写冲突测试、使用 `electron-builder` 构建 Windows NSIS 安装包及更新配置。
   - 产出：全案测试报告、可分发的 `.exe` 安装程序。

---

## 二、 核心执行优先级分解 (Prioritized Steps)

开发流程严格采用敏捷递增模式（Agile Incremental），坚决杜绝“大爆炸”式合盘。以下是按绝对优先级（P0 -> P1 -> P2）排列的执行阶段：

### 🏁 Phase 1: 系统地基与核心库 (P0 绝对核心) - [1周内]
**目标**: 跑通应用骨架，建立极其稳定的离线数据库读写能力及单例保护。
1. **[Architect]** 初始化 Electron 33+ 项目环境，配置应用单例锁 (`app.requestSingleInstanceLock()`)，搭建 Preload 安全机制。
2. **[Architect]** 解决原生 Node 模块编译：通过 `electron-rebuild` 让 `better-sqlite3` 完美跑在 Electron 环境中。
3. **[Logic Dev]** 初始化 `main.sqlite`（放置于 `%APPDATA%`），应用 schema 创建 words 和 categories 表。
4. **[Logic Dev]** 特殊处理离线库：制作/下载“瘦身版” ECDICT 数据库（剥离例句大字段，仅保留释义和音标），避免 1GB+ 的安装包灾难。

### 🚀 Phase 2: 极速工作流与沉浸式 UI (P0+P1) - [1-2周]
**目标**: 实现快捷查询与悬浮复习的极致体验，构建视觉规范。
1. **[UI/UX]** 构建全局 CSS Tokens (主色调、毛玻璃模糊滤镜参数、暗黑模式设定)。
2. **[UI/UX & Logic]** 实现系统托盘 (Tray) 驻留与右键菜单。
3. **[Logic Dev]** 注册 `Ctrl+Shift+D` 全局系统快捷键 (GlobalShortcut)。
4. **[UI/UX]** 设计并实装 "全局快捷录入框" (Spotlight Input UI)，无边框且自动隐藏。
5. **[Logic Dev]** 串联：按下热键 -> 弹窗输入 -> 触发 `DictionaryService` -> 渲染前端 UI -> 回车写入数据库作为“生词 (New)”。

### 🧠 Phase 3: 记忆引擎与被动视窗 (P1 学习管理) - [1周]
**目标**: 让软件拥有灵魂（间隔重复），并辅以非干扰式的视觉投射。
1. **[Logic Dev]** 编写 SM-2 间隔复习打分算法模块 (`ReviewEngine`)，计算每个生词的 `next_review_time`。
2. **[UI/UX & Architect]** 研发 "被动渲染式闪卡窗 (Passive Flashcard Float)"。开启鼠标点击穿透 (IgnoreMouseEvents) 与系统级始终置顶。
3. **[Logic Dev]** 建立轮播定时器，通过 IPC 从主库抽取今日复习队列推送至闪卡窗。

### ☁️ Phase 4: 同步体系与管理面板 (P1+P2) - [1周]
**目标**: 跨设备免服务同步，管理资产，最终交付。
1. **[UI/UX]** 制作完整的 Dashboard 管理面板（表格展示单词、熟练度过滤、热键修改设置页、云盘路径配置）。
2. **[Architect]** 实现 Local-First 文件监听器：
   - 监听 `%APPDATA%` 数据库关闭事件，序列化导出 JSONL 日志至指定的云盘目录。
   - 监听云盘目录增量文件，执行数据库 UPSERT (以时间戳为准)。
3. **[QA]** 极限并发测试：人为模拟双端同时修改导出带来的 JSON 冲突，修正策略。
4. **[QA]** 执行 `electron-builder` 打包，生成 `DictApp_v1.0.0_setup.exe`。

---

## 三、 第一阶段 (Phase 1) 详细执行拆解 (Action Items)

既然方案已定，我们将立刻进入 **Phase 1**，以下是即将被执行的颗粒度动作：

- [ ] **Task 1.1**: `npm init` 创建标准 Electron 脚手架，安装关键依赖：`electron`, `better-sqlite3`, `electron-builder`。
- [ ] **Task 1.2**: 建立 `main.js`；注册全局单例保护 (`requestSingleInstanceLock`) 防止多开；配置 `webPreferences` 禁用 Node 集成并开启 Context Isolation。
- [ ] **Task 1.3**: 编写 `utils/db.js`。实现在 `%APPDATA%/DictApp` 初始化空 SQLite 数据库，创建主业务表 (words: 包含词性、本地译文、复习节点等字段)。
- [ ] **Task 1.4**: 解决体积雷区：编写脚本清理 ECDICT 原版 CSV/SQLite 冗余列，输出体积 < 50MB 的基础读词版`.db`，将其只读挂载于应用。
- [ ] **Task 1.5**: 向 Renderer 暴露 `window.api.searchWord(text)` 接口并在控制台进行联查测试，同时集成测试 Web Speech API 确认语音播放可用。

---

> 👨‍💻 **架构师提示**: 本实施方案是所有代码落地的最终指导手册。一旦确认，我们的底层环境搭建和核心依赖引入将严格按 Phase 1 立刻展开。
