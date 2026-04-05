# 📚 沉浸式暗黑极客英语词典 (DictApp Pro)

![Version](https://img.shields.io/badge/version-v1.5.0-blue.svg)
![Electron](https://img.shields.io/badge/Electron-Desktop-47848f)
![Platform](https://img.shields.io/badge/platform-Win%20%7C%20Mac-lightgrey)

一款专为桌面生态（Windows & macOS）深度定制的极客级英语生词管理与闪卡记忆法软件。告别传统词典软件笨重的界面与打断思路的弹窗，DictApp 采用原生级全局监听与纯粹的沉浸式极简体验。

## ✨ 核心特性 / Features

- **🔍 幽灵悬浮检索 (Spotlight Search)**: 纯净无边框检索面板，支持全平台快捷键瞬间唤起。
- **🧠 艾宾浩斯复习引擎 (SM-2 Spaced Repetition)**: 依托高度成熟的算法引擎。卡片设有多极熟练度反馈（忘记、困难、良好、简单），全自动为你编排最科学的复习周期。
- **🤖 双轨级联翻译黑科技 (Hybrid Translation Engine)**: 
  - 本地直调高性能脱机 Lite 词库引擎（零延迟）。
  - 连接 Google Translate Neural 引擎实现长段落（高达 3000 字符）智能全句翻译。
  - 内建特制抗 DNS 干扰的回退降级补偿网关 (MyMemory API 容灾架构)，确保持续高可用。
  - 自动识别“中英混杂”段落，**仅翻译外语部分**，原生字串全息填充！
- **📋 沉浸式剪贴板嗅探**: 选中文本即刻被静默翻译，彻底打通阅读心流。
- **💅 像素级 GUI 动效打磨**: 采用全矢量 SVG 图标映射与透明呼吸玻璃态质感，拒绝廉价感。

## 🚀 快速启动 / Quick Start

### 环境依赖
- [Node.js](https://nodejs.org/) (推荐 LTS 版本)
- NPM

### 跑起来
```bash
# 1. 克隆代码仓库
git clone https://github.com/YourUsername/my-dictionary.git
cd dict_app

# 2. 安装所有底层与 C++ 原生库依赖 (better-sqlite3)
npm install

# 3. 运行本地开发终端
npm start
```

## 📦 打包与分发 / Build & Release

针对不同运行系统，本项目预装了自动化打包脚本：

### Windows
将在 `dist/` 文件夹下生成 NSIS `.exe` 单文件安装包：
```bash
npm run dist
```

### macOS
由于项目包含基于平台底层架构编译的原生 Node 模块（`better-sqlite3`），要生成 macOS `.dmg` 或 `.app` 包，请必须在一台**实体的苹果 Mac 电脑**中拉取本库并运行以下指令（或者查阅项目档中的 [云端 GitHub Actions 构筑指引](docs/Mac_Build_Guide.md)）：
```bash
npm run dist:mac
```

## 📂 项目结构 / Structure

```text
├── main.js                  # Electron 主进程与系统级底层控制挂载点
├── preload.js               # IPC 隔离与网关隧道安全层
├── src/
│   ├── app.js               # Spotlight 核心搜索框界面逻辑
│   ├── dashboard.js         # 主菜单管理中控前端
│   └── flashcard.js         # 弹道轨迹引擎与复习闪卡 UI 处理
├── utils/
│   ├── db.js                # SQLite 数据库底层读写操作原子化封装
│   ├── sm2.js               # Spaced Repetition 核心记忆计算范式
│   └── sync.js              # 云端/多端去中心化目录漫游同步引擎
├── docs/                    # 文档矩阵
└── resources/               # 静态持久态资产 (图标/初始化原生字典文件等)
```

## 📜 许可证 / License
[ISC License](LICENSE)
