# V1.9.0 开发架构审计与版本代码级总结报告 (Engineering Audit Report)

## 一、架构层演进与词法分析保护 (Lexical Preservation & Glossary)
1. **防翻译失真机制 (`utils/preservation.js`)**：
   - 彻底舍弃了在翻译返回结果上执行模糊字符串替换的旧有“硬编码修正”思路。
   - 重构后的系统将所有专有名词（来自 `resources/glossary.json`，按长度降序保证长词优先匹配）转化为分段正则表达式进行前置占位。
   - 将检测到的术语在翻译前转为 `[__CODE_N__]`，保持翻译主干语法的原子性；翻译返回后在原语序位置直接还原为对应的目标中文。这种**源头级的机制解耦**彻底根治了翻译引擎频繁升级所导致的翻译修正规则失效。
2. **多环境兼容机制**：
   - 考虑到 Jest 单元测试不具备 Electron App 上下文的局限性，在 `loadGlossary` 阶段加入了对 `electron` 包加载的 `try-catch` 保护 and 环境判定。
   - 当检测到宿主非 Electron 运行态（如 Jest）或未打包状态时，自动回退到文件系统相对路径载入 glossary 映射文件，**确保单元测试与线上产品运行的 100% 同构性**。

## 二、前端渲染与交互细节优化 (UI & UX Polish)
1. **发音图标微调 (`src/flashcard.js`)**：
   - 将卡片上的喇叭发音图标（Speaker SVG）移至音标文本后侧（从 `speakerSVG + phonetic` 优化为 `phonetic + speakerSVG`），微调 SVG 的外边距（`margin-left: 6px` 代替 `margin-right: 4px`），使发音按钮更符合现代音标排版规范，避免遮挡音标首字符。
2. **快捷键状态指示勋章 (`src/dashboard.js` & `src/dashboard.css` & `src/dashboard.html`)**：
   - 引入快捷键占用/冲突状态检测徽章。系统在加载设置时会通过 IPC 自动获取当前全局快捷键的注册状态（`searchShortcutRegistered` & `screenshotShortcutRegistered`）。
   - 若成功绑定，则以绿底展示 `● 激活` (Active)；若因系统热键冲突或权限不足导致绑定失败，则以红底展示 `● 冲突` (Conflict)，提示用户及时更换快捷键。
3. **设置面板国际化缺漏修复 (`src/dashboard.js` & `src/dashboard.html`)**：
   - 补全 `zh` 与 `en` 语言环境下关于 “艾宾浩斯自动弹出” (`label_autoreview` 和 `desc_autoreview`) 的翻译资源，彻底避免遗漏英文展示的问题。
4. **收起悬浮图标背景透明化修复 (`src/flashcard.css`)**：
   - 修复了单词卡片在收起（docked）状态下，其圆形悬浮按钮四周存在白色直角边背景的视觉缺陷。
   - 显式为 `html` 和 `body` 元素添加了透明度样式规则 (`background-color: transparent !important`)，使窗口在任何系统渲染底色下都能完美呈现纯粹的圆形无缝视觉效果。

## 三、免 Key 优化翻译线路与级联回退 (No-Key Translation & Failover)
1. **免 Key 优化线路选择**：
   - 新增 **微软 Edge 翻译**（国内直连优化机房）、**DeepLX 翻译**（高品质社区镜像与本地 Docker 自建）以及 **谷歌翻译** (GTX 经典版 API)。
   - 用户可在控制台“设置与同步”中一键切换，对于 DeepLX 额外提供自定义 URL 配置框。
2. **级联灾备机制 (`queryFreeEngine`)**：
   - 系统会自动应用用户偏好的免 Key 线路，一旦首选线路超时（4s 熔断），主进程会自动顺次请求其他免 Key 路由（如 Edge 或 Google），避免单点故障导致翻译崩溃。
3. **异步音标补充机制**：
   - 在触发 Youdao/Baidu 极速 Suggest 查词获取瞬时释义后，后台会并行异步发起 JSONAPI 检索，并在拿到音标数据后通过 `update-phonetics` IPC 通道实时热更新至前端渲染层，兼顾了“极速查词体验”与“音标数据完整性”。

## 四、网络拓扑与就近地理路由 (Geo-Aware OCR Network)
1. **OCR 区域解析加速 (`main.js` :: `performOcrSpace`)**：
   - 针对国内用户连接海外 `OCR.space` 主服务器极易出现的超时问题，系统可自动智能判定东八区时区，**首选且强制路由至亚洲机房（api3 节点）**。
   - 在主请求逻辑上增加自动顺序容灾机制，一旦首个节点发生报错或无返回，会在 12 秒阈值内自动顺次降级至 `api`（美国）和 `api2`（欧洲）节点进行多次重试，提升了国内多链路网络下的响应稳定性。

## 五、测试仿真隔离与合规 (Testing & E2E Validation)
1. **Playwright 全局快捷键测试桩 (`main.js` & `tests/e2e/translation.spec.js`)**：
   - 避免占用宿主操作系统的全局物理快捷键（引发冲突或被安全拦截），主进程在检测到 `PLAYWRIGHT_TEST === 'true'` 时，自动注册并劫持 `globalShortcutMock` 热键桩。
   - 自动化 E2E 脚本利用热键桩仿真全局按键触发，消除了测试执行环境副作用。
