# Cloudrave Frontend

Cloudrave Web 前端（v1.0.0-beta.4），提供文件管理、在线预览、分享、账号安全和系统设置界面。

## 支持功能

- 文件与目录浏览、搜索、创建、移动、复制、重命名、回收站和多文件打包下载。
- 本地文件系统、腾讯云 COS、阿里云 OSS，以及 139 移动云盘、189 天翼云盘和联通云盘挂载配置。
- 并行分片上传与断点续传；运营商上传直连失败时，支持将分片回退到 Cloudrave 后端中转。
- 文件和目录分享，支持密码、过期时间、预览与下载。
- 图片、视频、音频、PDF、Office、文本和压缩包预览；可保存文本/Markdown 编辑和 PDF 注释。
- Passkey、TOTP 双因素验证和已配置的 OAuth 账号关联管理。
- 用户挂载管理、站点设置、安全选项和数据库切换/迁移向导。

在线预览和编辑能力取决于文件类型、用户权限以及后端存储驱动。Office 文件通过浏览器预览服务展示；这不提供 Office 文档协同编辑。

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
