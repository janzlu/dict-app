# 识光 Lumina V1.8.2 🌌 截图翻译黑科技与多层级稳定性硬核演进

本版本 V1.8.2 标志着 Lumina 的截图查词与翻译流正式达到了**全自动、高精度、低延迟与高容灾**的工业级标准。我们深入优化了 OCR 管道的地理就近路由，新增了免 Key 优化翻译线路选择，并彻底移除了翻译后对中文文本正则修补的硬编码，取而代之的是纯粹前置占位符保护引擎与全局测试桩。

### 🌟 核心突破一：全域截图翻译与智能隔离

- 📸 **全域区域截图翻译 (Global Screenshot Translation)**：
  - **系统级快速截屏**：按下全局快捷键 `CommandOrControl+Shift+X`（可自定义），主窗口快速隐藏并唤起全屏半透明遮罩，允许用户划选任意区域裁剪截图。
  - **高保真缩略图与 Lightbox 大图浏览器**：截图识别成功后，查词面板自动嵌入当前选区缩略图。点击缩略图瞬间唤起全屏毛玻璃 Lightbox，提供原图对照查看。

- 🤖 **智能代码与中文保护引擎 (Preservation Engine)**：
  - 自动隔离截图中的 inline 代码 block、HTML 标签、单行/多行注释、保留字变量（camelCase、snake_case 等）以及句子中已有的中文字串，翻译引擎仅会对纯英文片段进行翻译，避免符号被“翻译成乱码”的惨剧。

- 🧠 **Smart 占位符术语直译映射 (Glossary Engine)**：
  - 彻底终结硬编码替换规则！现在所有的专业术语（如 `Auto-Pop`、`memory cards`）都在翻译前被前置判定为占位符并分配独立 ID，引擎完成主干翻译后直接在原地套用 [resources/glossary.json](file:///d:/Lumina/apps/desktop/resources/glossary.json) 字典的精准译名。

- 🌐 **地理自适应 OCR 路由与容灾 (Geo-Aware Routing)**：
  - 针对国内用户连接海外 `OCR.space` 主服务器极易出现的报错超时，系统可自动智能判定东八区时区，**首选且强制路由至亚洲机房（api3 节点）**。配置了**亚洲 ➔ 美国 ➔ 欧洲**的多节点顺序自动轮巡重试逻辑。

---

### 🌟 核心突破二：免 Key 优化翻译线路与极速体验

- 🚀 **多路线切换与自定义自建 (No-Key Multi-Route)**：
  - 在控制台增设**“免 Key 优化翻译线路”**选择器，支持 **微软 Edge 翻译**（国内直连优化延迟极低）、**DeepLX 翻译**（高品质社区镜像并支持本地 Docker 自建 URL）及 **谷歌翻译** (GTX 引擎)。
  - 引擎引入 **`queryFreeEngine` 级联回退**，在首选的优化翻译线路失败时自动回退备用路由，实现 100% 连通。

- ⚡ **异步音标合并与发音排版微调**：
  - 对于 Youdao/Baidu Suggest 获取的瞬时释义，后台以非阻塞异步协程并发获取音标，并在音标加载完毕后热更新至卡片界面，兼顾查询速度与内容完整性。
  - 将单词卡片的发音喇叭按钮（Speaker SVG）移到音标文本后侧，优化字符级排版效果。
  - **单词卡片收起态背景透明化修复**：彻底解决了卡片收起为圆形悬浮图标时四周出现白色正方形直角背景的瑕疵，确保悬浮窗的无缝圆形纯净美感。

- 🏷️ **热键状态检测徽章 (Global Shortcut Badge)**：
  - 在设置面板中引入 `● 激活` / `● 冲突` 状态徽章，直观展示全局快捷键是否注册成功或被系统占用。

---

### 📦 变更日志 (Changelog)

1. `utils/preservation.js`：重构为纯前置占位符与 glossary 字典直接映射引擎。
2. `main.js`：添加系统截图监听、OCR.space 与有道 OCR 解析管道；实现 `queryFreeEngine` 级联免 Key 回退机制和后台异步音标补充。
3. `src/dashboard.js`：补全 `en` 与 `zh` 语言包下关于 `label_autoreview` 和 `desc_autoreview` 的原生翻译键，支持截图配置加载保存与快捷键状态查询。
4. `src/dashboard.html` & `src/dashboard.css`：新增截图翻译配置卡片与快捷键状态徽章样式。
5. `src/flashcard.js` & `src/flashcard.css`：微调发音喇叭图标跟随在音标后的排版样式；修复卡片收起状态下悬浮圆圈背景不透明（白色方角）的视觉缺陷。
6. `tests/preservation.test.js` & `tests/e2e/translation.spec.js`：重构以适应全新的占位符映射流和 Playwright 快捷键测试桩。
