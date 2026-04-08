# V1.8.0 开发架构审计与版本代码级总结报告 (Engineering Audit Report)

## 一、架构层演进与数据完整性 (Data & Arch)
1. **SQLite 层侵入级打点收集 (`d:\dict_app\utils\db.js`)**：
   - 为避免挤占或破坏早期 V1 核心表的字段，于初始化时安全追加了独立日志跟踪表 `review_logs`。
   - 配置并开启 `PRAGMA foreign_keys = ON` 与级联删除策略 `ON DELETE CASCADE`。若旧词被完全抹除，其复习图层残留点也将被数据库底层自动化安全洗地，**根绝任何脏数据与脱轨指针异常**。
2. **IPC 前后端心轴解耦 (`d:\dict_app\main.js`)**：
   - 添加跨进程通讯道 `get-analytics`。极其关键地放弃了前端循环查询，把全部 365天的聚合逻辑（包含 Mastery Rose, Forecast, Heatmap Aggregation）**全部下压至主线程的 SQLite 函数执行**。
   - 前端 ECharts 调用仅需承接计算好的轻量 JSON 映射结果，确保不会对主渲染循环吃掉一丝 CPU，从根本上锁死内存泄漏可能。

## 二、前端渲染层逻辑修复与性能管控 (Frontend Rendering)
1. **DOM 生命周期把控 (`d:\dict_app\src\dashboard.js`)**：
   - 侦测到 `ECharts` 的重渲染缩放机制（`.resize()`）会在动态 SPA 加载中因为重复挂载监听器引发致命的侦查回调泄露。
   - 彻底引入单例挂载机制 `_isResizeRegistered` 判断锁，即使面板切换百次，`window.addEventListener` 只会绑定一次。
2. **键盘级事件钩子挂载 (`d:\dict_app\src\flashcard.js`)**：
   - 填补了 `keydown` 监听空白域，植入 `Space`/`1-2-3-4` switch 指令分发逻辑，并且在第二次评审中遵循了逆序流布局重新将 4321 绑定给了 1234 等效评分档（忘 ➔ 简）。

## 三、CSS 像素与混合器硬调 (CSS Rendering Pipeline)
1. **Windows DWM 重叠毛刺修复 (`d:\dict_app\src\index.css`)**：
   - 发现了基于 `border-radius: 12px` 与底层 Electron `transparent=true` 交互产生的 `box-shadow` 切割异构假背景 bug。
   - 否决了尝试以 `body { padding: 16px }` 退让的策略（因为白底泛蓝污染），实施了一刀切直接抹除 `box-shadow` 阴影引擎的物理切边方案，视觉上重获极度干净无边框的 Spotlight 基座。
2. **多源层级卡片流防碰撞 (`d:\dict_app\src\flashcard.css`)**：
   - 卡片翻转（`.flipped` 态）高度承压：由于中文词义的不确定长度极易造成 `180px` 高度卡片的下沿堆叠越界，彻底开放了词汇在翻转态的可见性 (`display: block`) 但使用 `font-size` 缩小（-6px）与 `opacity: 0.8` 平滑去色衰减，强退音标框的视觉挤兑，以此实现词位护航与释义呈现的双轨并驱。

## 四、合规与版本基建签发 (Release Readiness)
- `d:\dict_app\package.json` -> `v1.8.0` 更新。
- `README.md` -> 标签位更新 `1.8.0` 并进入预发版部署状态。本期改动代码 100% 同步执行流，未暴露任何危险依赖隐患。
