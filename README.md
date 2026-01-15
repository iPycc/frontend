# ☁️ CloudRaver Frontend

**CloudRaver** 的官方前端项目，一个基于 **React** 和 **Material UI** 构建的现代化私有云存储管理界面。

它设计简洁、响应迅速，旨在为你提供类似主流网盘（百度网盘/Google Drive）的流畅体验，同时完全掌控你的私有数据。

## ✨ 核心特性

*   **💻 现代化 UI**：基于 **Material UI (MUI)** 设计，界面美观、交互流畅，支持亮色/暗色模式（跟随系统）。
*   **⚡ 极速体验**：使用 **Vite** 构建，秒级启动，热更新极快。
*   **📂 强大的文件管理**：
    *   拖拽上传、多文件并发上传。
    *   文件列表视图/网格视图切换。
    *   图片懒加载预览。
*   **🔐 安全会话**：
    *   基于 JWT + HttpOnly Cookie 的安全鉴权。
    *   **多标签页状态同步**：一个页面登录/退出，其他页面毫秒级同步响应。
    *   **自动静默刷新**：Token 过期自动刷新，使用无感。
*   **🌍 国际化支持**：内置 i18n 支持，架构上已为多语言做好准备。
*   **🧩 状态管理**：使用 **Zustand** 进行轻量级、高性能的全局状态管理。

## 🛠️ 技术栈

*   **Core**: [React 18](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
*   **Build Tool**: [Vite 5](https://vitejs.dev/)
*   **UI Framework**: [Material UI v5](https://mui.com/)
*   **State Management**: [Zustand](https://github.com/pmndrs/zustand)
*   **Routing**: [React Router v6](https://reactrouter.com/)
*   **HTTP Client**: [Axios](https://axios-http.com/)
*   **File Upload**: [React Dropzone](https://react-dropzone.js.org/)

## 🚀 快速开始

### 1. 环境准备

确保你已经安装了 [Node.js](https://nodejs.org/) (推荐 v18+)。

### 2. 安装依赖

```bash
cd frontend
npm install
# 或者使用 yarn / pnpm
yarn install
pnpm install
```

### 3. 运行开发服务器

```bash
npm run dev
```

默认运行在 `http://localhost:5173`。
你需要确保后端服务（CloudRaver Backend）已在 `http://localhost:1309` 启动，否则 API 请求会失败。

> **注意**: 如果修改了后端的默认端口，请修改 `vite.config.ts` 中的 proxy 配置。

### 4. 生产构建

```bash
npm run build
```

构建产物将输出到 `dist` 目录，可以直接部署到 Nginx、Caddy 或 Docker 容器中。

## 📁 目录结构

```
src/
├── api/            # API 客户端封装 (Axios + Interceptors)
├── assets/         # 静态资源 (Logo, Images)
├── components/     # 公共组件 (Layout, Header, UploadZone...)
├── pages/          # 路由页面 (Login, Files, Settings...)
├── stores/         # Zustand 状态管理 (AuthStore...)
├── theme/          # MUI 主题配置
├── utils/          # 工具函数
├── App.tsx         # 根组件
└── main.tsx        # 入口文件
```

## 🤝 贡献

欢迎提交 Issue 和 PR！

## 📄 License

MIT License © 2026 CloudRaver
