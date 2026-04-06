# 🌌 识光 Lumina
![Version](https://img.shields.io/badge/version-v1.7.0-blue.svg)
![Electron](https://img.shields.io/badge/Electron-Desktop-47848f)
![Platform](https://img.shields.io/badge/platform-Win%20%7C%20Mac-lightgrey)

一款专为桌面生态（Windows & macOS）深度定制的极客级英语生词管理与闪卡记忆法软件。告别传统词典软件笨重的界面与打断思路的弹窗，**识光 Lumina** 采用原生级全局监听与纯粹的沉浸式极简体验。

软件核心思想：用户可以随时方便的沉浸式查词、翻译、记录生词，可以即时查询调出已有词，如果是生词自动新入库。突出解决的核心痛点：工作中经常遇到的英文单词看着熟悉却想不起来什么意思，同时在**毫无硬性背单词打卡压力**的环境下，边工作边提升英语词汇量。

## ✨ 核心特性 / Features

- **🔍 幽灵悬浮检索 (Spotlight Search)**: 纯净无边框的沉浸检索面板，支持全平台快捷键瞬时唤起。无论你在什么软件里，随时可以调用光流查词体验。
- **🌓 变色龙光影引擎 (OS-Linked Themes)**: Apple 式沉浸无底框设计。彻底重构的纯净浅色模式（Light Mode）与极客深色模式（Dark Mode）。支持一键锁定或跟随操作系统日出日落无缝切换。
- **🧠 双轨艾宾浩斯复习引擎 (Dual-Track Ebbinghaus)**:
  - **📺 沉浸屏保模式 (Auto Slideshow)**：全自动轮播屏保。隐去交互按键，像白噪音一般悬浮于屏幕右下角自动按组播放单词与释义。
  - **🎲 碎片时间复习 (Shuffle Play)**：在喝咖啡间隙，点按开启智能缓冲链，仅提取到期的陌生卡片流供你极速斩断。
  - **🛡️ 纯净拦截模式**：彻底关闭后台“闹钟式”随机弹窗，100% 捍卫你的专注流。
- **🤖 复合翻译黑科技 (Hybrid Translation Engine)**: 
  - 本地直调高性能脱机 Lite 词库引擎（零延迟响应）。
  - 连接 Google Translate Neural 引擎实现长段落（高达 3000 字符）智能全句翻译。
  - 自动识别“中英混杂”段落，**仅翻译外语部分**，原生字串全息填充！
- **☁️ 免服务跨端无感同步 (Serverless CRDT Sync)**: 不依赖任何第三方云端后端服务器。只需指定你的任一本地网盘目录（如 OneDrive），底层将自动进行多端字典的合并比对与冲突消解。
- **📋 沉浸式剪贴板嗅探**: 一键开启，选中文本复制即刻唤出极速智能翻译面板。

## 🚀 快速启动 / Quick Start

### 环境依赖
- [Node.js](https://nodejs.org/) (推荐 LTS 版本)
- NPM

### 跑起来
```bash
# 1. 克隆代码仓库
git clone https://github.com/janzlu/my-dictionary.git
cd dict_app

# 2. 安装所有底层与 C++ 原生库依赖 (better-sqlite3)
npm install

# 3. 运行本地开发终端
npm start
```

## 📦 打包与分发 / Build & Release

针对不同运行平台，本项目预设了自动化打包脚本：

### Windows
将在 `dist/` 文件夹下生成 NSIS `.exe` 单文件安装包：
```bash
npm run dist
```

### macOS
只需在 macOS 环境下执行以下指令即可打包 `.dmg`（依赖原生环境中的 Xcode Command Line Tools 进行 SQLite 重编译）：
```bash
npm run dist:mac
```

## 📂 项目结构 / Structure

```text
├── main.js                  # Electron 主进程与系统级底层控制、IPC 挂载、双轨引擎驻场
├── preload.js               # IPC 隔离与网关隧道安全层
├── src/
│   ├── app.html/js          # Spotlight 核心搜索框与输入捕获逻辑
│   ├── dashboard.html/js    # 基于变色龙引擎的生词本总览及沉浸式设置中心
│   └── flashcard.html/js    # 交互评分卡片、以及 Slideshow 屏保自动化翻转模块
├── src/utils/
│   ├── db.js                # SQLite 数据库底层读写操作封装
│   ├── sm2.js               # 艾宾浩斯 Spaced Repetition 核心记忆演算法式
│   └── sync.js              # Serverless 无代理本地多端云盘 LWW-CRDT 冲突消解引擎
└── resources/               # 图标及 SQLite Lite 版备用冷启动数据库
```

## 📜 许可证 / License
[ISC License](LICENSE)
