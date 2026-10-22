# 识光 Lumina - macOS 编译打包与原生生态指南 (macOS Build & Integration Guide)

**版本适用**: V1.9.1+  
**支持架构**: Apple Silicon (arm64, M1/M2/M3/M4 系列) & Intel (x64)

---

## 一、 macOS 原生定制特性

在 Lumina V1.9.1 中，针对 macOS 桌面生态进行了深度系统级融合：

1. **原生 Apple Vision 离线文字识别 (`resources/mac_ocr`)**：
   - 采用 Swift 编写并通过 `swiftc -O` 原生编译为 arm64 架构二进制工具，内置于 `.app` 资源包中。
   - 调用系统底层 `Vision.framework`，10~20ms 极速响应，无需 API Key 与联网，中文、英文、日文混合高精度分词识别，彻底解决中文乱码。
2. **原生 Dock 菜单支持 (macOS Dock Menu)**：
   - 在主进程中配置了专属 Dock 快捷菜单。右键点击 Dock 栏图标可直接快速选择：
     - `打开生词本中心 (Dashboard)`：展开生词资产管理与图表总览
     - `🔍 查词面板 (Search Word)`：快速唤出无框悬浮查词 Spotlight
     - `🎲 碎片复习 (Shuffle Play)`：触发艾宾浩斯到期生词碎片复习队列
3. **托盘与应用激活交互优化 (Tray & App Activation)**：
   - 适配 macOS 托盘事件，单击与双击均能快速唤起生词本中心。
   - 监听 `app.on('activate')` 事件，点击已在后台驻留的 Dock 图标瞬间唤起管理中心。
4. **原生毛玻璃与无底框透明化 (Vibrancy & Transparency)**：
   - 针对 macOS 优化窗体背景材质与透明渲染，彻底消除收起态悬浮圆圈四周的白色直角瑕疵，呈现与系统壁纸浑然一体的纯净视觉质感。
5. **原生 DMG 拖拽安装体验**：
   - 自动化打包生成的 `.dmg` 镜像预置了高精度坐标布局与 `/Applications` 软链接快捷方式，用户直接拖拽即可完成安装。

---

## 二、 本地编译与构建流水线 (Local Build Pipeline)

由于应用深度依赖包含底层 C/C++ 绑定的 SQLite 驱动 (`better-sqlite3`) 以及预编译的 Swift 原生 OCR 工具，打包需在真实的 macOS 环境下执行编译以生成对应宿主架构（Darwin arm64 / x64）的链接库与产物。

### 1. 环境准备
1. **安装 Xcode 命令行工具**（如果未安装）：
   ```bash
   xcode-select --install
   ```
2. **Node.js 环境**：建议 Node.js LTS (v18 或 v20+)。

### 2. 依赖安装与原生模块重编译
```bash
# 1. 克隆代码仓库
git clone https://github.com/janzlu/dict-app.git
cd dict-app

# 2. 安装依赖并自动触发原生模块编译
npm install

# 3. 编译原生 Vision OCR 工具 (已在 resources/ 目录下预编译可执行文件)
swiftc -O resources/mac_ocr.swift -o resources/mac_ocr
chmod +x resources/mac_ocr
```

### 3. 本地调试与运行
```bash
npm start
```

### 4. 生产打包输出
```bash
# 使用 Ad-hoc 签名避免证书自动发现阻断，直接构建 dmg 与 zip：
CSC_IDENTITY_AUTO_DISCOVERY=false npm run dist:mac
```

执行完成后，`dist/` 目录下将生成以下安装产物：
- `dist/Lumina-Mac-1.9.1-arm64.dmg`（约 115 MB，适用于 M 系列芯片的 DMG 安装镜像）
- `dist/Lumina-Mac-1.9.1-arm64.zip`（约 111 MB，绿色便携压缩包）
- `dist/mac-arm64/Lumina.app`（直接运行的 App 应用程序文件）

---

## 三、 electron-builder 构建配置解析

在 `package.json` 中的 `build` 配置中，已内建针对 macOS 的完整描述：

```json
"mac": {
  "target": [
    "dmg",
    "zip"
  ],
  "icon": "resources/icon.png",
  "category": "public.app-category.utilities",
  "artifactName": "${productName}-Mac-${version}-${arch}.${ext}",
  "hardenedRuntime": true,
  "gatekeeperAssess": false
},
"dmg": {
  "contents": [
    {
      "x": 130,
      "y": 220
    },
    {
      "x": 410,
      "y": 220,
      "type": "link",
      "path": "/Applications"
    }
  ]
}
```

- **`hardenedRuntime: true`**：启用强化运行时，符合 Apple 现代桌面应用安全规范。
- **`contents`**：设置 DMG 打开时的安装窗口视觉布局，左侧为应用本体，右侧为系统 Applications 目录，方便拖拽。

---

## 四、 常见问题与 Gatekeeper 安全放行 (FAQ)

### 1. 打开应用提示“已损坏，无法打开”或“来自无法验证的开发者”
由于未加入 Apple 付费开发者公证签名，macOS Gatekeeper 安全机制可能会拦截自编译的 `.app`。
- **解决方案 A**：在系统访达（Finder）中进入“应用程序”，**右键点击 Lumina.app ➔ 选择“打开”**，在弹出的系统对话框中点击“打开”即可永久信任。
- **解决方案 B**：在终端执行终端放行命令：
  ```bash
  sudo xattr -rd com.apple.quarantine /Applications/Lumina.app
  ```

### 2. 截图权限提示 (Screen Recording Permission)
使用全局选区截图翻译 (`CommandOrControl+Shift+X`) 时，首次运行需在 macOS **系统设置 ➔ 隐私与安全性 ➔ 屏幕录制**中为 Lumina 或终端授予屏幕捕获权限。

### 3. 国内网络下打包 DMG 报错 404 (dmg-builder / dmgbuild-bundle 404)
如果在国内网络下配置了 `.npmrc` 中的 `electron_mirror`，`electron-builder` 在下载 DMG 构建依赖 `dmgbuild-bundle` 时可能会错误拼接路径产生 404 错误。
- **解决方案**：在 `.npmrc` 中配置 `electron-builder` 专用镜像源：
  ```ini
  registry=https://registry.npmmirror.com/
  electron_mirror=https://npmmirror.com/mirrors/electron/
  electron_builder_binaries_mirror=https://npmmirror.com/mirrors/electron-builder-binaries/
  ```
- 或预先将 `dmgbuild-bundle` 解压缓存至 `~/Library/Caches/electron-builder/dmg-builder@1.2.0/` 目录下。
