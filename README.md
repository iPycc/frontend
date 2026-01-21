# CloudRaver Frontend

基于React和Material UI的私有云存储前端。

## 更新日志
### v1.11 Beta - 2026.1.22
- 添加 两步验证2FA

### v1.1 Beta - 2026.1.21
- 添加 通行证密钥Passkeys
- 修复 文件夹在中文路径编码映射错误

### v1.0.2 Beta - 2026.1.20
- 重构 设置页面
- 新增 会话管理、支持查看登录设备
- 添加 会话历史记录
- 优化 多标签页刷新逻辑

### v1.0.1 Beta - 2026.1.17
- 添加 回收站功能
- 文件恢复和批量操作

### v1.0.0 Beta - 2026.1.15
- 首次提交
- 文件管理界面
- 拖拽上传和预览功能
- JWT认证系统
- 下载文件
- 用户操作

## 快速开始

### 安装依赖
```bash
npm install
```

### 开发运行
```bash
npm run dev
```
访问 http://localhost:5173

### 生产构建
```bash
npm run build
```
构建产物在 `dist` 目录

## 技术栈

- React 18 + TypeScript
- Vite 5
- Material UI v5
- Zustand 状态管理
- Axios HTTP客户端

## 目录结构

```
src/
├── api/          # API接口封装
├── components/   # 公共组件
├── pages/        # 页面组件
├── stores/       # 状态管理
├── theme/        # 主题配置
└── utils/        # 工具函数
```

## License

MIT
