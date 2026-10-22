# 🌌 识光 Lumina
![Version](https://img.shields.io/badge/version-v1.9.1-blue.svg)
![Electron](https://img.shields.io/badge/Electron-Desktop-47848f)
![Platform](https://img.shields.io/badge/platform-Win%20%7C%20Mac-lightgrey)

一款专为桌面生态（Windows & macOS）深度定制的极客级英语生词管理与闪卡记忆法软件。告别传统词典软件笨重的界面与打断思路的弹窗，**识光 Lumina** 采用原生级全局监听与纯粹的沉浸式极简体验。

软件核心思想：用户可以随时方便的沉浸式查词、翻译、记录生词，可以即时查询调出已有词，如果是生词自动新入库。突出解决的核心痛点：工作中经常遇到的英文单词看着熟悉却想不起来什么意思，同时在**毫无硬性背单词打卡压力**的环境下，边工作边提升英语词汇量。

## ✨ 核心特性 / Features

- **🔍 幽灵悬浮检索 (Spotlight Search)**: 纯净无边框的沉浸检索面板，支持全平台快捷键瞬时唤起（默认 `Alt+Space` 或 `Ctrl/Cmd+Shift+D`，支持实时修改热键并带热键冲突检测徽章）。失焦或 `Esc` 极速隐身。
- **🌓 变色龙光影引擎 (OS-Linked Themes)**: Apple 式沉浸无底框设计。支持纯净浅色模式（Light Mode）与极客深色模式（Dark Mode），可一键锁定或跟随操作系统日出日落无缝自适应切换。
- **🧠 双轨艾宾浩斯复习引擎 (Dual-Track Ebbinghaus)**:
  - **📺 沉浸屏保模式 (Auto Slideshow)**：全自动轮播屏保。隐去交互按键，像白噪音一般悬浮于屏幕边缘自动按组播放单词与释义。
  - **🎲 碎片时间复习 (Shuffle Play)**：在喝咖啡间隙，点按开启智能缓冲链，提取到期的陌生卡片流供极速斩断。
  - **⌨️ 极客键盘流**：支持左手区反向映射（`4/3/2/1` 四指打分斩击评价与 `Space/Enter` 翻面翻转）。
  - **🛡️ 纯净拦截模式**：彻底关闭后台“闹钟式”随机弹窗，100% 捍卫你的专注流。
- **🤖 阶梯式混合翻译引擎 (Hybrid Cascading Translation)**: 
  - **本地离线首选**：本地 SQLite 单词库 + 内置 ECDICT Lite 离线词库引擎（毫秒级零延迟响应）。
  - **极速 Suggest 竞速**：单词优先并发竞速（Youdao Suggest + Baidu Suggest，1.5s 快速熔断），后台异步静默补齐音标数据并热推更新。
  - **⚡ 免 Key 优化翻译线路 (No-Key Free Engine)**：控制台提供 **微软 Edge 翻译**（国内直连优化机房）、**DeepLX 翻译**（高品质社区镜像并支持本地 Docker 自建 URL）及 **谷歌翻译** (GTX 引擎)，具备自动超时降级与级联容灾。
  - **🧠 自定义 AI 大模型翻译 (LLM Engine)**：深度接入 DeepSeek、OpenAI 等标准兼容的大语言模型 API，支持自定义 Base URL、API Key 与 Model 名称，实现高精准语境级长段落翻译。
  - **中英混杂智能隔离**：自动识别“中英混杂”段落，**仅翻译外语部分**，原生字串全息填充！
- **📸 全域截图翻译、文字提取与视觉资产沉淀 (Screenshot, OCR & Visual Asset)**:
  - **快捷唤起与权限守卫**：支持 `CommandOrControl+Shift+X` 系统快捷键；macOS 下主动检测屏幕录制授权并提供一键直达系统设置，零静默失败。
  - **8 向微调手柄与整体平移**：生成截图选区后自动呈现 8 个控制把手（四角与四边中点），支持任意方向拖拽缩放；框内按住即可整体拖拽平移选区。
  - **赛博毛玻璃浮动工具条**：划选完成即刻浮出动作条，支持 **✔ 立即翻译** (`Enter`)、**📝 提取文字** (`T`)、**📋 复制图片到剪贴板** (`Cmd/Ctrl+C`)、**💾 另存为图片** (`Cmd/Ctrl+S`) 与 **✖ 取消** (`Esc`)。
  - **文字提取双栏对照弹窗**：点击“提取文字”秒级调起对照视图，左侧呈现裁剪原图与尺寸信息，右侧展示可编辑校对文本与字数统计，配备一键「📋 复制文字」（带高亮成功动效）、「🔍 查词翻译」与「💾 保存图片」。
  - **离线原生 Apple Vision OCR (macOS 专属)**：内置自研 Swift 原生 OCR 引擎（`resources/mac_ocr`），毫秒级极速离线识别，中英文分词与标点极佳，彻底消灭中文乱码问题。
  - **图片实打实落盘保存**：点击“保存图片”调起系统原生保存文件窗口，支持自定义文件名与保存路径，实打实写入磁盘。
  - **图文生词本沉淀与双端 Lightbox**：保存生词时自动将截图快照异步落盘至本地，并在 SQLite 中建立强绑定；Spotlight 查词面板与 Dashboard 控制台生词表均提供 `📷` 照片徽章与全屏毛玻璃 Lightbox 语境复查。
  - **智能代码/中文保护 (Preservation Engine)**：内置非重叠占位符隔离器 (`[__CODE_N__]`)，100% 保护截图中的代码语法、变量、注释、HTML标签及已存中文字符不被破坏。
  - **配置化术语直译映射 (Glossary Engine)**：基于 `resources/glossary.json`（及用户自定义目录）进行词汇表前置预匹配替换（如 `Auto-Pop` 自动弹出、`memory cards` 记忆卡），保证专业术语直译自然得体。
  - **高可用多层级 OCR 路由**：首选 macOS 原生 Vision 离线引擎；备选 OCR.space 神经网络高可用节点与有道智云商业 OCR 引擎。
- **🍏 macOS 原生生态深度融合 (macOS Deep Native Integration)**:
  - **macOS Dock 菜单**：右键 Dock 图标快速调出「打开生词本中心 (Dashboard)」、「🔍 查词面板 (Search Word)」和「🎲 碎片复习 (Shuffle Play)」。
  - **系统级托盘**：单击与双击均可快速呼出生词本中心，无缝融合桌面。
  - **原生毛玻璃与无框透明**：针对 macOS 深度优化窗口材料与透明度，彻底根除直角白色方块瑕疵。
  - **一键打包**：预设 `CSC_IDENTITY_AUTO_DISCOVERY=false npm run dist:mac`，输出原生 `.dmg`（内置 Applications 软链接拖拽安装布局）与 `.zip`。
- **📊 全息数据分析驾驶舱 (Analytics Cockpit)**:
  - 365 天记忆热力图追踪、7 日记忆压力塔、掌握度玫瑰指数分布，集成轻量化离线 ECharts 数据投射。
- **🚀 全局自动更新横幅 (Global Auto-Update Banner)**:
  - 基于 `electron-updater`，开机静默检测 GitHub Releases，顶端滑入全局毛玻璃通知横幅。
  - 一键高速下载更新包，直观显示百分比动态进度条，完成后无缝热重启（Quit & Install）。
- **☁️ 免服务跨端无感同步 (Serverless LWW-CRDT Sync)**: 不依赖任何第三方云端后端服务器。只需指定你的任一本地网盘目录（如 OneDrive），底层将自动通过基于 `updated_at` 时间戳的 Last-Write-Wins 算法比对导出 `dict_sync_data.json` 并消解多端冲突。
- **📋 沉浸式剪贴板嗅探**: 一键开启，选中文本复制即刻唤出极速智能翻译面板。
- **🧪 工业级自动化测试保障 (Automated Test Suite)**:
  - 基于 `Jest` 的纯逻辑单元测试（SM-2 算法间隔阶梯、词法与代码占位符保护）。
  - 基于 `Playwright for Electron` 的端到端 (E2E) 自动化测试，配合测试桩确保主干心流坚固可靠。

## 🚀 快速启动 / Quick Start

### 环境依赖
- [Node.js](https://nodejs.org/) (推荐 LTS 版本, v18+)
- NPM

### 跑起来
```bash
# 1. 克隆代码仓库
git clone https://github.com/janzlu/dict-app.git
cd dict-app

# 2. 安装所有底层与 C++ 原生库依赖 (better-sqlite3)
npm install

# 3. 运行本地开发终端
npm start
```

### 运行测试
```bash
# 运行全套 Jest 单元测试 (涵盖 SM-2 算法、词法保护、解耦模块与同步缓存)
npm test

# 运行 Playwright 端到端 E2E 自动化测试
npm run test:e2e
```

## 📦 打包与分发 / Build & Release

针对不同运行平台，本项目预设了自动化打包脚本：

### Windows
将在 `dist/` 文件夹下生成 NSIS `.exe` 单文件安装包：
```bash
npm run dist
```

### macOS
只需在 macOS 环境下执行以下指令即可打包 `.dmg` 与 `.zip`（针对 Apple Silicon / arm64 架构）：
```bash
CSC_IDENTITY_AUTO_DISCOVERY=false npm run dist:mac
```

## 📂 项目结构 / Structure

```text
├── main.js                  # Electron 主进程：窗口生命周期、系统级托盘/Dock菜单、IPC 挂载与模块编排
├── preload.js               # IPC 隔离与 ContextBridge 白名单安全隧道网关 (含通道监听防泄漏管理)
├── src/
│   ├── index.html/css       # Spotlight 核心搜索悬浮窗 UI 与图生词/Lightbox 交互样式
│   ├── app.js               # Spotlight 输入捕获、竞速查词渲染、本地看图识别与 Lightbox 交互
│   ├── dashboard.html/js    # 基于变色龙引擎的生词本全息图表总览及沉浸式设置/更新中心
│   ├── dashboard.css        # Dashboard 玻璃拟态与全局更新横幅动画样式
│   ├── locales.js           # 中英双语国际化独立字典配置
│   ├── flashcard.html/js    # 交互评分卡片、以及 Slideshow 屏保自动化翻转模块
│   ├── flashcard.css        # 悬浮圆形收起态与展开态拟态样式
│   ├── screenshot.html/js   # 全域选区截屏遮罩、8 向调节把手、文字提取对照弹窗与动作条
│   └── echarts.min.js       # 离线图表渲染库
├── utils/
│   ├── db.js                # SQLite 数据库底层读写操作封装 (WAL 模式、字段热迁移与查询索引)
│   ├── ocr.js               # 独立 OCR 引擎调度 (Apple Vision 离线毫秒级识别 + 云端级联容灾)
│   ├── translator.js        # 7 级查词与多路翻译引擎 (本地词库、Suggest 竞速、免 Key 引擎与 LLM)
│   ├── sm2.js               # 艾宾浩斯 Spaced Repetition 核心记忆演算法式
│   ├── sync.js              # Serverless 无代理本地网盘 LWW-CRDT 冲突消解与防抖缓存引擎
│   └── preservation.js      # 智能词法匹配、中文保护及占位符翻译术语处理引擎
├── tests/
│   ├── modules.test.js      # OCR 映射、翻译瀑布流流转、密钥空值防御及双语词条对齐测试
│   ├── sync.test.js         # 多端同步内存缓存、防抖落盘与增量合并单元测试
│   ├── sm2.test.js          # SM-2 算法阶梯单元测试
│   ├── preservation.test.js # 词法与占位符保护单元测试
│   └── e2e/                 # Playwright Electron 端到端测试套件 (app.spec.js, translation.spec.js)
├── scripts/
│   └── verify-db-screenshot.js # 数据库配图字段迁移校验脚本
├── resources/               # 系统静态资产与离线依赖
│   ├── mac_ocr              # 原生 Apple Vision 离线文字识别可执行工具 (Swift 编译, arm64)
│   ├── mac_ocr.swift        # Swift 离线文字识别源码 (Vision & CoreGraphics)
│   ├── ecdict_lite.sqlite   # 离线本地英汉词典数据库
│   ├── glossary.json        # 专业术语前置映射词典
│   └── icon.png             # 应用高清图标
└── playwright.config.js     # Playwright 端到端测试配置文件
```

## 📜 许可证 / License
[ISC License](LICENSE)
