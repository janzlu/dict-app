# 产品需求文档 (PRD) & 架构蓝图

**项目名称**: 识光 Lumina 英语生词本桌面应用 (Lumina Vocabulary Desktop App)  
**文档版本**: v1.9.1 (2026 代码库全景对齐版)  
**支持平台**: Windows 10+ / macOS (Intel & Apple Silicon)  
**核心受众**: 需要在日常办公间隙、全英语语境工作中快速查词、潜移默化积累词汇的职场人士与极客研究员。

---

## 一、 产品定义与核心价值理念

本产品的核心目标是**「消除学习阻力，融入工作流」**。
传统背单词软件需要占用整段专注时间（如打开手机 App 强迫自己背 50 个词），这对职场人极不友好。本应用主打**无感介入**：通过全键盘操作即用即走、屏幕边缘被动式微交互闪卡、全域截图查词与免打扰屏保，将碎片化时间转化为极高的记忆投资回报。

### 核心亮点
1. **零打扰拦截 (Zero Distraction)**：系统级快捷键秒级呼出，查完即刻失焦隐身；关闭闹钟式弹窗，支持防打扰纯净拦截。
2. **永远在线响应 (Always-on)**：内置 ECDICT Lite 离线词库，无网络环境秒级响应；线上引入 Youdao 与 Baidu Suggest 1.5s 极速竞速链路，兼备免 Key 多路由（Edge / DeepLX / Google）与自定义大模型（DeepSeek / OpenAI）。
3. **精准代码与术语保护 (Preservation & Glossary)**：截图与长难句翻译时，自动将代码、注释、变量、HTML 标签及中文隔离为非重叠占位符 `[__CODE_N__]`，结合 `glossary.json` 术语映射表确保专业译名不走样。
4. **基于资产的数据主权 (Data Sovereignty)**：完全采用 Local-First 方案，利用用户本机的本地网盘目录（如 OneDrive）基于 `updated_at` 时间戳执行 LWW-CRDT 冲突消解，保障多端无感同步，无服务端停服风险。
5. **原生生态深度适配 (macOS & Windows)**：macOS 深度集成 Dock 菜单、原生毛玻璃无底框自适应与 DMG 打包；Windows 深度优化 DWM 阴影与穿透。

---

## 二、 核心业务流控与功能定义 (Features Specification)

### P0 (基础架构与绝对核心)
- **全局快捷录入框 (Spotlight UI)**
  - 监听事件：全平台支持自定义全局快捷键（默认 `Alt+Space` 或 `CommandOrControl+Shift+D`），设置面板带激活/冲突检测徽章 (`● 激活` / `● 冲突`)。
  - 容错机制：检测到热键已被系统占用或权限不足时，主进程拦截并保持旧快捷键可用，并反馈冲突提示。
  - 查询行为：采用**多级级联解析流水线**：
    1. 命中用户本地 SQLite 词库（`words` 表，`COLLATE NOCASE` 忽略大小写）。
    2. 若配置了自定义大模型且开启，优先执行大模型翻译。
    3. 命中离线本地词库（`ecdict_lite.sqlite`）。
    4. 单词查询：触发 Youdao Suggest 与 Baidu Suggest 极速竞速（`Promise.any`，1.5s 熔断），并发异步协程拉取完整音标热推至渲染层。
    5. 短语长句：根据设置调用偏好免 Key 优化线路（Edge / DeepLX / Google GTX），支持 4s 熔断级联降级。
    6. 兜底回退：Youdao JSONAPI / Google GTX / Bing Translator。
- **本地词库引擎集成 (解决体积膨胀点)**
  - 预装 `ecdict_lite.sqlite` 离线数据库，安装包控制在合理体积，断网状态毫秒级直出释义。
- **应用单例保护与互斥 (Single Instance Lock)**
  - 基于 `app.requestSingleInstanceLock()` 实施单实例约束。检测到多开时阻断重复进程并呼醒已有窗口。在 Playwright E2E 测试环境通过环境变量 `PLAYWRIGHT_TEST` 安全旁路。
- **生词收藏与状态流转**
  - Spotlight 面板明确展示“加入生词本”交互按键，避免静默滥收词汇。已入库词汇自动提示避免重复。

### P1 (无损化业务增强与学习管理)
- **双轨发音引擎 (Dual Audio Engine)**
  - 优先通过有道高清发音接口（`dictvoice`）拉取英音 (UK) 与美音 (US) 双轨发音，排版于音标后侧。
  - 断网或请求失败时无缝自动降级为 Chromium 内置的 `Web Speech API (SpeechSynthesis)` 本地发音。
- **间隔重复引擎调度 (Spaced Repetition System - SM-2)**
  - 掌握度阶梯：收敛为 0~5 六个掌握度等级。
  - 复习间隔映射：
    - Level 0: 5 分钟
    - Level 1: 60 分钟 (1 小时)
    - Level 2: 720 分钟 (12 小时)
    - Level 3: 1440 分钟 (1 天)
    - Level 4: 4320 分钟 (3 天)
    - Level 5: 10080 分钟 (7 天)
  - 极客打分评价：
    - 评价 1 (Forgot / 忘记)：重置掌握度为 0。
    - 评价 2 (Hard / 困难)：掌握度 -1 (最低 0)。
    - 评价 3 (Good / 良好)：掌握度 +1 (最高 5)。
    - 评价 4 (Easy / 轻松)：掌握度 +2 (最高 5)。
- **双轨复习窗体 (Passive Flashcard Float & Slideshow)**
  - 独立渲染进程：置顶无边框浮窗。
  - **沉浸屏保模式 (Auto Slideshow)**：按组自动播放待复习词汇，单词呈现 2s ➔ 自动翻转释义呈现 3s ➔ 自动轮播下一词，纯白噪音被动吸收。
  - **碎片时间复习 (Shuffle Play)**：随时调取到期生词队列，支持鼠标打分或左手键盘流快捷键（`Space/Enter` 翻面，`4/3/2/1` 打分）。
  - **边缘停靠与鼠标穿透 (Docking & Passthrough)**：支持拖拽至屏幕边缘收起为半透明圆形微缩泡泡；展开态非按钮区域鼠标事件自动穿透至底层桌面。
- **全域截图翻译、文字提取、本地保存与图文资产沉淀 (Global Screenshot, OCR & Visual Asset)**
  - 快捷唤起与权限守卫：支持 `CommandOrControl+Shift+X` 系统级快捷键，自动隐藏主窗体并截取当前屏幕，唤起全屏裁剪遮罩；在 macOS 下主动检测屏幕录制授权，未授权时弹出引导弹窗一键直达系统设置。
  - 8 向微调手柄与拖拽平移：选区划定后自适应呈现 8 个控制把手（四角与四边中点），支持自由缩放调整大小；选区内部可整体按住拖拽平移。
  - 赛博毛玻璃浮动工具条：划选完毕自动出现操作条，集成 **立即翻译** (`Enter`)、**提取文字** (`T`)、**复制图片到剪贴板** (`Cmd/Ctrl+C`)、**另存为图片** (`Cmd/Ctrl+S`)、**取消** (`Esc`)，并具备边界自动避让与防越界钳制。
  - 文字提取双栏对照弹窗：点击“提取文字”秒级调出对照弹窗，左栏高清原图，右栏实时高亮可编辑文本与字数统计；提供一键复制文字（高亮成功动效）、查词翻译与保存图片。
  - 离线原生 Apple Vision OCR (macOS 专属)：内置 Swift 原生编译的 `resources/mac_ocr`，毫秒级离线运行，免配置 API Key，彻底消灭中英文混合识别乱码。
  - 真实落盘保存：点击“保存图片”调起系统原生 `dialog.showSaveDialog` 窗口，支持选择目录并实打实将 PNG 写入磁盘。
  - 原图高保真预览与生词资产沉淀：支持划选裁剪，查词面板自动嵌入截选缩略图，点击呼出全屏毛玻璃 Lightbox 原图大图浏览器；保存生词时截图自动异步落盘至 `userData/screenshots/` 并记录在 SQLite 中，Dashboard 生词表展示 `📷` 徽章与语境复盘弹窗。
  - 高可用快速熔断 OCR 路由：首选 macOS Vision 离线引擎；线上降级首选 `ocr.space` 官方高可用节点，配合 4 秒快速熔断与级联容灾；支持配置商业级有道 OCR（SHA-256 签名鉴权）。
  - 词法与中文保护引擎 (`utils/preservation.js`)：翻译前自动将代码语法、变量、注释、HTML标签及已存中文编码为 `[__CODE_N__]`，结合 `resources/glossary.json` 前置映射术语，保障翻译结果纯正。
- **去中心化持久同步系统 (Serverless LWW-CRDT Sync)**
  - 配置文件 `sync_config.json` 放置于用户 `userData` 目录。
  - 同步介质：在用户指定的本地网盘同步目录（OneDrive/Dropbox/iCloud）导出并读取 `dict_sync_data.json`（以单词为 Key 的全量字典映射）。
  - 冲突消解：采用基于 `updated_at` 时间戳的 Last-Write-Wins (LWW) 事务级合并；支持设置目录时即刻同步、手动强制同步以及退出时自动备份。

### P2 (管理面板、更新与原生体验)
- **生词管理总览 (Dashboard Window)**
  - 表格式呈现生词本全量资产，支持按生词检索、实时删除、查看下次复习时隙与当前掌握度。
- **全息数据驾驶舱 (Analytics Cockpit)**
  - 集成离线 `ECharts`：365 天记忆热力追踪图、7 日记忆压力负荷塔、掌握度五阶玫瑰图。
- **系统设置与偏好管理**
  - 界面主题：深色模式 (Dark)、浅色模式 (Light)、跟随系统 (System)。
  - 剪贴板自动嗅探开关 (`clipboardWatch`) 与字符阈值约束 (≤ 3000 字符)。
  - 开机静默启动设置 (`openAtLogin`)。
  - 自动更新检测开关与手动检查更新。
  - 自定义 AI 翻译引擎配置 (Base URL, API Key, Model, Provider) 与连通性即时测试。
  - 免 Key 翻译线路选择 (Edge / DeepLX / Google) 与 DeepLX 自建端点配置。
  - 截图 OCR 引擎选择与秘钥配置。
- **全局自动更新系统 (Global Auto-Updater)**
  - 基于 `electron-updater` 监控 GitHub Releases。
  - 主视图顶部滑入全局毛玻璃通知横幅，点击下载直接在横幅上显示百分比动态进度条。
  - 下载完成后一键触发安全热重启（Quit and Install）。
- **macOS 原生生态深化**
  - macOS 原生 Dock 菜单：右键图标提供「打开生词本中心 (Dashboard)」、「🔍 查词面板 (Search Word)」和「🎲 碎片复习 (Shuffle Play)」。
  - 托盘图标单击与双击交互统一。
  - 原生无框毛玻璃材质与防白角透明度处理。
  - `package.json` 预设 `dist:mac` 打包，生成标准 DMG 与 ZIP 安装包。

---

## 三、 研发架构与技术治理 (Technical Governance)

### 1. 进程模型与隔离规范
- **Main Process (Node.js 环境)**：
  - 负责窗口生命周期、系统托盘、macOS Dock 菜单、全局快捷键注册。
  - 挂载 `better-sqlite3`（WAL 模式 + 外键级联支持），执行数据库事务。
  - 执行网络请求中枢：OCR.space / 有道 OCR 路由、Edge / DeepLX / Google / LLM 翻译分发。
  - 挂载 `electron-updater` 执行静默与交互式版本检测。
- **Preload 隧道网关 (`preload.js`)**：
  - 基于 Electron `contextBridge`，严格遵循白名单原则在 `window.api` 命名空间下向渲染层注入安全 API。
  - 隔离 Node.js 底层与 DOM 环境，禁止在渲染进程中开启 `nodeIntegration`。
- **Renderer Process (4 大独立视图)**：
  - **Spotlight 查词** (`src/index.html` + `src/app.js`)：超轻量无边框悬浮窗，高度随内容动态自适应。
  - **控制台与生词中心** (`src/dashboard.html` + `src/dashboard.js`)：SPA 单页应用，包含生词列表、ECharts 图表、系统设置与全局更新横幅。
  - **记忆闪卡** (`src/flashcard.html` + `src/flashcard.js`)：微交互打分卡片，支持边缘收起 Dock 泡泡与鼠标事件透明穿透。
  - **截图捕获遮罩** (`src/screenshot.html` + `src/screenshot.js`)：全屏高 DPI Canvas 画布，支持鼠标框选、尺寸提示与双击确认。

### 2. 数据库设计 (Database Schema)
工作目录位于 `app.getPath('userData')/main.sqlite`。
强制执行 `PRAGMA journal_mode = WAL;` 与 `PRAGMA foreign_keys = ON;`。

```sql
CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    color TEXT,
    icon TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS words (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    word TEXT UNIQUE NOT NULL,
    translation TEXT,
    phonetic TEXT,
    mastery_level INTEGER DEFAULT 0,
    review_count INTEGER DEFAULT 0,
    next_review_time DATETIME,
    is_sync BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    category_id INTEGER,
    FOREIGN KEY(category_id) REFERENCES categories(id)
);

CREATE TABLE IF NOT EXISTS review_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    word_id INTEGER,
    score INTEGER,
    mastery_before INTEGER,
    mastery_after INTEGER,
    review_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(word_id) REFERENCES words(id) ON DELETE CASCADE
);
```

### 3. 测试架构与持续验证 (Testing Architecture)
- **单元测试 (`Jest`)**：
  - `tests/sm2.test.js`：SM-2 算法阶梯打分测试、极值上下限与复习时间偏移量推算断言。
  - `tests/preservation.test.js`：代码语法、变量、注释、HTML标签、中文字符占位隔离与 glossary 术语还原断言。
- **端到端测试 (`Playwright for Electron`)**：
  - `tests/e2e/app.spec.js`：应用启动、主窗体加载、DOM 元素完整性冒烟测试。
  - `tests/e2e/translation.spec.js`：查词流水线、Suggest 竞速、免 Key 降级、截图快捷键与设置保存端到端链路验证。
  - 测试桩：通过 `process.env.PLAYWRIGHT_TEST` 劫持全局快捷键与单实例锁，避免操作系统环境副作用。
