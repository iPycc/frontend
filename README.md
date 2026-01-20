# CloudRaver Frontend

基于React和Material UI的私有云存储前端。

## 更新日志

### v1.0.2 Beta
- 重构设置页面，模块化结构
- 新增会话管理，支持查看登录设备
- 修复iOS Chrome识别问题
- 优化多标签页刷新逻辑

### v1.0.1 Beta
- 支持回收站功能
- 文件恢复和批量操作

### v1.0.0 Beta
- 文件管理界面
- 拖拽上传和预览功能
- JWT认证系统

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