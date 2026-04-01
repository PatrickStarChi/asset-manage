# 资产管理系统

一个基于Web的办公用品资产管理系统，支持资产录入、出入库管理、二维码扫描、统计报表等功能。

## 功能特性

- 📋 **资产管理**：完整的资产生命周期管理（录入、编辑、状态追踪、报废）
- 📥📤 **出入库管理**：支持入库和出库操作，自动更新库存
- 📱 **二维码扫描**：为每个资产生成唯一二维码，支持扫码快速登记
- 📊 **统计报表**：实时仪表盘显示库存统计、消耗趋势、低库存预警
- 👥 **用户权限**：多用户支持，管理员可管理其他账户
- 💾 **数据备份**：自动每日备份，支持数据恢复
- 📝 **操作日志**：完整记录所有资产操作历史

## 技术栈

- **后端**：Node.js + Express + SQLite3
- **前端**：HTML5 + CSS3 + JavaScript (Vanilla)
- **数据库**：SQLite3 (轻量级，无需额外安装)
- **部署**：单文件部署，一键启动

## 环境要求

- Node.js v14+
- npm (通常随Node.js一起安装)

## 安装部署

### 1. 克隆仓库
```bash
git clone https://github.com/your-username/asset-manage.git
cd asset-manage
```

### 2. 安装依赖
```bash
npm install
```

### 3. 启动服务
```bash
# 开发模式（带自动重启）
npm run dev

# 生产模式
npm start
```

或者使用一键启动脚本：
```bash
./start.sh
```

### 4. 访问应用
打开浏览器访问 `http://localhost:3001`

### 默认登录账号
- **用户名**：admin
- **密码**：admin123

## 目录结构

```
asset-manage/
├── public/          # 静态资源和前端页面
├── assets.db        # SQLite数据库文件
├── server.js        # 主服务器文件
├── database.js      # 数据库初始化
├── start.sh         # 一键启动脚本
├── package.json     # 项目依赖配置
└── README.md        # 项目文档
```

## 数据备份

系统默认每天凌晨2点自动备份数据库到 `backups/` 目录。

手动备份命令：
```bash
./scripts/backup.sh
```

## API 文档

### 资产管理
- `GET /api/assets` - 获取所有资产列表
- `POST /api/assets` - 创建新资产
- `PUT /api/assets/:id` - 更新资产信息
- `DELETE /api/assets/:id` - 删除资产

### 交易管理
- `POST /api/transactions/in` - 入库操作
- `POST /api/transactions/out` - 出库操作
- `GET /api/transactions` - 获取交易记录

### 用户认证
- `POST /api/auth/login` - 用户登录
- `GET /api/auth/me` - 获取当前用户信息

## 贡献指南

1. Fork 本仓库
2. 创建您的功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交您的更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 许可证

本项目采用 MIT 许可证 - 详情请查看 [LICENSE](LICENSE) 文件。

## 联系方式

如有问题或建议，请联系项目维护者。