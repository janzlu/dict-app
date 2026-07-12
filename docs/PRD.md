# 产品需求文档 (PRD) & 架构蓝图

**项目名称**: 英语生词本桌面应用 (English Vocabulary Desktop App)
**文档版本**: v1.0 (最终审计修订版)
**核心受众**: 需要在日常办公间隙、全英语语境工作中快速查词、潜移默化积累词汇的职场人士。

---

## 一、 产品定义与核心价值理念

本产品的核心目标是**「消除学习阻力，融入工作流」**。
传统背单词软件需要占用整段专注时间（如打开手机 App 强迫自己背 50 个词），这对职场人极不友好。本应用主打**无感介入**：通过全键盘操作即用即走、屏幕边缘被动式微交互闪卡，将碎片化时间转化为极高的记忆投资回报。

### 核心亮点
1. **零打扰拦截 (Zero Distraction)**：系统级快捷键秒级呼出，查完即刻失焦隐身。
2. **永远在线响应 (Always-on)**：集成开源全量级 ECDICT 离线词库，无需网络、无 API 延迟限制，即使弱网断网均秒级响应。
3. **基于资产的数据主权 (Data Sovereignty)**：完全采用 Local-First 方案，利用用户本机的本地云盘目录（如 OneDrive）异步落盘，保障跨端同步，无破产/倒闭停服的服务端风险。

---

## 二、 核心业务流控与功能定义 (Features Specification)

### P0 (基础架构与绝对核心)
- **全局快捷录入框 (Spotlight UI)**
  - 监听事件：`Ctrl+Shift+D` 全局呼出。
  - 容错机制：检测到热键冲突给出 Toast 或托盘报警提示，允许用户在设置表单中重置修改热键。
  - 查询行为：优先命中原生 SQLite，否则尝试解析 ECDICT 离线库。命中历史保留状态展示。
- **本地词库引擎集成 (解决体积膨胀点)**
  - 安装自带**轻量级/精简版** ECDICT 离线数据库（剔除低频词缀和冗余语料字段，确保安装包控制在 100MB 以内）。
- **应用单例保护与互斥 (Single Instance Lock)**
  - 强制启动单实例约束。检测到应用多开试图唤醒时，阻断进程创建并调出原有系统托盘应用。防止多个实例竞态写入 SQLite。
- **单词属性标记与分类卡片录入**
  - 支持单标签/多标签挂载（Tagging/Category），供未来自定义抽片或范围学习。

### P1 (无损化业务增强与学习管理)
- **原生语音合成读音 (Local TTS)**
  - 调取 Electron/Chromium 底层内置的 `Web Speech API (SpeechSynthesis)`，实现发音朗读，完全本地化，无需调用任何第三方收费/限流的在线朗读接口。
- **间隔重复引擎调度 (Spaced Repetition System - SM-2)**
  - 内蕴状态机定义词汇熟练度：New (生词) -> Learning (阶段复习) -> Mastered (肌肉记忆，延长复审)。
- **被动渲染式闪卡窗 (Passive Flashcard Float)**
  - 独立渲染进程：一个极小的无边框窗口置顶（永远处于所有应用之上），显示今日重点或随机复习队列。
  - 事件穿透 (Mouse Forwarding)：对于非按钮区域的浮窗可以直接点击穿过，绝不遮挡 IDE 代码编写或文档阅读。
- **去中心化持久同步系统**
  - 主进程静默监测本地应用主库变更。
  - 使用流式 JSONL (JSON Lines) 增量导出逻辑映射到给定的云盘目录。并监测该目录异动合并差异记录。

### P2 (管理面板与辅助)
- **仪表盘/词库全览 (Dashboard window)**
  - 表格式展示所有被收录的生词资产（列表页渲染分页限制在 100 以避免性能陡降）。
  - 可批量操作、转移类别、强行重置熟练度等。
- **自动开机挂载安装**
  - 系统托盘持久化挂载，注册表静默唤醒。
- **全域截图翻译 (Global Screenshot Translation)**
  - 支持 `Ctrl+Shift+X` 全局快捷键或查词面板点击截图按钮进行选区截图捕捉。
  - 内置 OCR.space 及有道 OCR 双引擎；对 OCR.space 提供亚洲就近节点 `api3` 自适应路由与故障转移重试逻辑。
  - 包含前端毛玻璃 Lightbox 遮罩预览、缩略图展示以及在查询时提供“代码/中文字符保护”（Preservation）翻译能力。

---

## 三、 研发架构与风险控制 (Technical Governance)

### 1. 宿主与进程分离基建
- **Electron Main (Node环境)**：
  - 加载和挂载 `better-sqlite3`（包含 C++ 扩展，需把持编译架构与主机统一，防范打包不兼容风险）。
  - 控制所有原生 API（GlobalShortcut, Tray, BrowserWindow 生命周期）。
  - 处理文件系统读写（用于云目录 JSONL 合并侦测）。
- **Electron Renderer (渲染进程)**：
  - 原生 HTML5 + CSS + Native JS 方案（无虚拟 DOM 负担等过载框架）。
  - 通过 `ContextBridge` 开启基于白名单的安全沙盒 (IPC 映射防范脚本注入攻击)。

### 2. 数据库层级审计 (Database Strategy)
- 鉴于查询效率和写入并发：主工作目录固定放置于 `%APPDATA%\字典应用\main.sqlite`。
- 采用 **WAL 日志模式 (Write-Ahead Logging)** ，保障查取和记录学习事件时的读写并发安全性，规避普通锁定。

### 3. 同步一致性设计安全垫 (Sync Resolution Policy)
为了确保不引入专门的中心化后端服务器，使用如下 "Last Writer Wins" (LWW) 修改版策略执行 Local-First 文件系统的妥协方案：
- 本机只在开启与关闭时执行 **Snapshot Export (向云盘转储)**，导出文件附带 Mac 地址/UUID 标记。
- 在 Main process 后台设定 `chokidar` (或 fs 级 watch) 监管目标云文件夹，如有新的他机 UUID Json文件生成，载入差异（根据 `updated_at` 时间戳覆写较旧条目，对单纯的新增条目则插入）。

---

## 四、 开发路线演进图 (Milestones Timeline)

1. **Sprint 1 (Infrastructure & Storage):** 本地应用骨架建立、`better-sqlite3` 与应用目录建立。引入 ECDICT 缩略版完成即时词汇索引能力，确保查词性能达标。
2. **Sprint 2 (The Flow Experience):** 实现所有系统级别集成——包含系统托盘交互、无边框全屏热键捕捉框、核心 CSS 物理玻璃高光质感拟态搭建，保证不丢帧。
3. **Sprint 3 (Knowledge Logic):** 开发后台间隔复习引擎、SM-2 打分流控逻辑、以及悬浮态闪卡的界面生成和交互投射。
4. **Sprint 4 (Persistence & Release):** 完善跨机器平铺式文件云备份同步逻辑实现；使用 `electron-builder` 构建 Windows 系统 NSIS 标准可执行包，实施压测后交付。
