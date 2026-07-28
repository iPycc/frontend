# Cloudrave Frontend

Cloudrave 的 Web 前端，提供文件管理、在线预览、分享和系统设置等功能。

## 技术栈

- React 19 + TypeScript
- Vite 6
- Tailwind CSS 4
- React Router 7
- Base UI / shadcn

## 本地开发

请先安装 Node.js 和 pnpm，并确保 Cloudrave 后端服务已启动。

```bash
pnpm install
pnpm dev
```

前端默认运行在 `http://localhost:9130`，并将 `/api` 请求代理到
`http://127.0.0.1:1309`。

如需修改后端地址，请复制环境变量示例并调整配置：

```bash
cp .env.example .env.local
```

## 构建

```bash
pnpm build
```
