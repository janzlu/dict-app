# DictApp Pro - 官网开发战略与实施大纲 (Execution Plan)

> **修订状态**: 专家组首轮会审通过
> **审核组**: 首席架构师 (Chief Architect)、UI 动效总监 (UI/UX Lead)、全栈工程部 (Full-Stack Team)、DevOps 工程部

为确保 DictApp Pro 这款高密度暗黑风格官网的开发过程不偏离预期、能够敏捷高质量落地，经工程团队缜密论证，特制定此套极其严谨的落地规范指南。所有工序将遵循最高级现代前端交付流程执行。

---

## 👥 核心角色分工矩阵 (Role Assignment & Responsibilities)

1.  **首席架构师 (Chief Architect / Antigravity AI 代行)**
    *   **职责**：把控全局技术选型（Next.js + Tailwind + Framer Motion），解决所有潜在的技术跨端兼容性问题。规划项目工程的主文件结构与 DevOps 流水线搭建。
2.  **UI/UX 动效视效专家 (Motion/Design Expert)**
    *   **职责**：负责“暗黑霓虹 (Dark Neon)”与“毛玻璃 (Glassmorphism)”系统的全局色标调优。编写 CSS 动画预设变量，调教特大滚屏时的电影级平滑视觉（Smooth Scroll）与视差效果。
3.  **前端工程师 (Frontend Dev)**
    *   **职责**：拆解四大特征（四大极客科技：CRDT LWW、三级翻译熔断、SM-2、3000字截断）所需的 Bento 便当盒结构格网。根据不同的屏幕尺寸撰写响应式 (Responsive) 挂载组件。
4.  **云基础架构工程师 (DevOps/Cloud Infra)**
    *   **职责**：接管最后 1 公里部署，将整个 React 静态打包物直推全球 CDN（Vercel CDN），连接自定义根域名并分配 TLS (HTTPS) 证书。设置 GitHub 代码推送钩子。

---

## 📈 实施步骤优先级排序表 (Execution Priorities)

本次网页开发代号为 `Operation Lighthouse (灯塔行动)`。实施步骤严格遵循“底层筑基 -> 骨肉镶嵌 -> 动效灵魂灌注 -> 云端发射”的倒三角优先律。

### 🟡 阶段 0：基础脚手架浇筑 (基础设施，优先级 P0)
这是第一顺位，决不能省略的环境隔离阶段。
*   **动作 1**：在你的 `D:\` 盘紧挨着现在的软件目录建立 `D:\dict_app_website` 全新独立目录。
*   **动作 2**：由前端工程师执行 Vite 脚手架：`npm create vite@latest dict_app_website -- --template react`。
*   **动作 3**：系统层面初始化并拉取极简 CSS 底座：`npm install -D tailwindcss postcss autoprefixer ` 并直接初始化 `tailwind.config.js` 写入极墨黑色彩字典。

### 🟠 阶段 1：全局引擎代币定调 (预设层，优先级 P0)
*   **动作 1**：定义全局主调与排版方案，注入 Google Font / 无衬线字体 `Inter` 或 `Outfit` 驱动。
*   **动作 2**：由视效专家确立深空背景 CSS `bg-[#03040B]` 以及特制类 `.glass-panel`（`bg-white/5 backdrop-blur-md border border-white/10`）。让网站一开始就沐浴在正确的基底中！

### 🔴 阶段 2：英雄首屏落地战 (Hero Section，优先级 P1)
此区域为进站第一眼（首屏加载极速优化区）。
*   **动作 1**：撰写巨幅标语：`<h1 className="text-6xl font-black...">沉浸式极客辞典...</h1>`，挂载霓虹呼吸背景节点。
*   **动作 2**：引入核心抓图 / Mockup，使用 CSS 平移和透视制作出一种悬浮太空的科幻桌面形态。
*   **动作 3**：开发操作系统嗅探逻辑：网站一侦测到用户是 Mac，高亮苹果按钮；侦测到 Win 用户，高亮 Windows `.exe` 下载按钮。（提供强力的交互诱导）。

### 🔵 阶段 3：“大揭秘” Bento 阵列重组 (特征内容，优先级 P1)
该区承接所有专业与干货卖点展示（在首屏下方）。
*   **动作 1 (网格定义)**：通过 Tailwind 的 `grid-cols-4` 分割线，搭起巨大的便当盒方块系统。
*   **动作 2 (内容灌浆)**：前端组依序导入在蓝图中发掘出的“神级亮点”图文矩阵：
    1.  CRDT LWW 隐秘同步系统图谱区块。
    2.  双核降级联控翻译网区块。
    3.  SM-2 空间复利雷达区块。
    4.  3000 字无界剪贴嗅探块。

### 🟣 阶段 4：Framer Motion 封神装裱 (微交互动效，优先级 P2)
（如果在时间极度紧张时可缩水，但在本作中不能抛弃的质感层）。
*   **动作 1**：全网铺设 `npm install framer-motion`。给“大揭秘”四大卡块注入 `initial={{ opacity: 0, y: 50 }}` 和滚动 `whileInView` 触发器，用户滚轮一下去，板块依次如羽毛般浮现就位！

### 🟢 阶段 5：Vercel 洲际发射 (DevOps 部署，优先级 P0)
收尾与投产阶段。
*   **动作 1**：本地打包干预 `npm run build` 测试无误。
*   **动作 2**：`git push` 至专属的 `dict_app_website` 的 GitHub 开源库。
*   **动作 3**：登录 Vercel 或 Cloudflare Pages 傻瓜式一键映射，网站实现永久在线更新。

---

## ⚔ 入场宣誓

至此，全部流程线与风险敞口均已被控制在闭环之内。<br>
首席架构师（我）已经就位，将随时向执行器签发底层脚手架构建代码。如果方案审核通过，请向我下达：<br>
👉 **“准备就绪，立刻执行阶段 0 建制”**。
