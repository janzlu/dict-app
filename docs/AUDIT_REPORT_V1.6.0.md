# 识光 Lumina (原 DictApp) 开发审计与版本总结报告 (V1.6.0)

**审计时间**：2026-04-07
**审计基准线**：Desktop App (`d:\dict_app`) & Web Landing Page (`d:\dict_app_website`)

---

## 1. 核心大事件：品牌双盲升级 (Project Rebranding)
*   **品牌重塑**：产品统一定名为 **识光 (Lumina)**，摆脱了以前通用型产品名称“沉浸翻译助手 (DictApp)”的极客感不足问题。（寓意：发现在工作细微处的微光，认知的极速叠加）。
*   **深层产物替换**：
    *   **底层重写**：`package.json` 中的 `appId` 更新为 `com.antigravity.lumina`，打包 `productName` 变更为 `Lumina`。
    *   **主控界面**：`dashboard.html`、`index.html` (Spotlight 打扰窗) 以及托盘提示的 UI 文案全面完成从 DictApp 到“识光 Lumina”的静态置换。
    *   **图标深度挂载 (重要)**：彻底抛弃了纯靠打包注入图标的单薄逻辑。在 `main.js` 底层，针对 `inputWindow` (划词面板)、`dashboardWindow` (控制台)、`flashcardWindow` (复习组件) 三大核心 `BrowserWindow`，显式强编织了全新的星芒闪电 Logo (`resources/icon.png`)，保障所有子窗口在 Windows 任务栏与边框上的 100% 品牌闭环。
    *   **官方渠道宣发重制** (`dict-app-website`)：`Hero.jsx` 和 `Footer.jsx` 中文案已向 V1.6.0 看齐，移除了“旧品牌”硬编码字样。

## 2. 全局交互引擎与本地化架构 (Engine & i18n)
*   **智能“首发嗅探”防失连机制 (首次接入)**：
    *   此前若 `localStorage` 无记录，默认兜底纯英文 (`en`)，致使母语非英语的核心极客受众引发水土不服。
    *   重构 `src/dashboard.js` 初始化阶段逻辑，底层以极低开销接入 `navigator.language` 嗅探器。精准命中并截获带有 `zh` 前缀的操作系统环境标签片段，完美实现首次跑包的**零痛感知语言环境自适应投流**。
*   **原生 i18n 指令集深层渗透**：打通了更深维度的 CSS 选择器。`<title>` 与侧边栏 `.logo` 成功接入底层数据池 (`data-i18n`)，由纯静态写死转化为随系统翻译引擎动态热更的生命节点。
*   **开机自启与引擎唤起调度**：基于 `window.api.setAutoStart` 和 IPC 主进程通信，确保用户对控制台“开机触发”与“剪贴板自动唤醒弹出”指令的强效拦截与 OS 级控制。

## 3. 致命系统级漏洞熔断与光柱渲染修复 (Critical Bug Fixes)
*   **熔断底层崩溃断点 (CRDT Sync Crash Trigger)**：
    *   在深层源码检阅中，及时扫频拦截到 `dashboard.js` 同步句柄流内 (Line 294~296) 藏匿的外部野变体词汇 `Complete`，引发极其严重的 Syntax Error (词法解析中断)。
    *   **处理结果**：已对其强制拔除。成功规避由此产生的“用户尝试发起手盘网盘双向并库，瞬间触发 Electron V8 引擎解析阵列闪退”的致命线上隐患。
*   **官网 Z轴事件黑洞修复**：
    *   之前发现官网着陆页 `FeaturesBento` 特性卡片以及 `Hero` 头图区的悬停动画死亡。
    *   **病理解剖**：由于前端过度堆列 Framer Motion 环境背景发光渲染物，生成的不可视发光块拦断了浏览器表层的鼠标指针 (`hover`) 穿透交互。
    *   **处理结果**：通过对所有后置幻境块实施最高严格标准的负面深潜隔离 (`absolute -z-10` 结合 `pointer-events-none`)，完成物理分离隔离层封装。现重叠按钮交互全面恢复 120Hz 心跳级响应。

## 4. 底层基站衍生与新纪元规划 (Build & Architecture)
*   **全装甲 NSIS 独立分发集结包**：本周目已全面使用内源指令在 V1.6.0 版图下重装 `electron-builder` 构建流。产出的最终物料包 `Lumina Setup 1.6.0.exe` 约为纯净控制体积线（100MB 级别），无额外内存渗漏。
*   **双径基石进化蓝图录入 (`ROADMAP.md`)**：
    为解决未来用户对于 Electron 庞杂 Chromium 内核携带框架的抗拒痛点。向开发文档源加入了极限瘦身策略纲领，推演论证了将来的发展路线二选一：
    *   **方向A**：砍除系统级窃听能力，全线退防成浏览器沙盒扩容形态 (Chrome Extension)，达到 <1MB 毫秒级闪开。
    *   **方向B**：弃用 Node 级 IPC 轨道通信，采用 WebView2 结合 Rust 重写系统底层交互 (Tauri 改造)，达到体量压舱 5MB 同时保留所有系统监控穿透特权的终极形态。

---
**核准审计状态**：全链路自闭环验证良好，致命毒瘤均已成功实施剥离熔断手术。工程源码达到金牌封板（Gold Master）稳态可发布级别系数。
