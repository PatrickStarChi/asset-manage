# 资产管理系统

一套基于 Node.js + SQLite 的 Web 资产管理系统，支持办公用品的入库、出库、库存预警、二维码管理等功能。

**访问地址**: http://localhost:3001  
**GitHub**: https://github.com/PatrickStarChi/asset-manage

---

## 🚀 快速开始

### 一键启动
```bash
./start.sh
```

访问：http://localhost:3001

### 默认管理员账号
- 用户名：`admin`
- 密码：`admin123`

---

## 📋 功能特性

### 核心功能
- ✅ 资产增删改查（CRUD）
- ✅ 入库/出库管理
- ✅ 二维码生成与扫码领用
- ✅ 库存预警（最低库存设置）
- ✅ 数据统计与报表
- ✅ Excel 导入导出
- ✅ 用户权限管理

### 高级功能
- ✅ 操作日志记录
- ✅ 定时数据备份
- ✅ 数据恢复功能
- ✅ 资产详情页编辑一体化
- ✅ 表头排序功能

---

## 📚 文档

| 文档 | 说明 |
|------|------|
| [README.md](README.md) | 项目说明（本文档） |
| [CHANGELOG.md](CHANGELOG.md) | 版本更新日志 |
| [FEATURES_AND_SCHEMA.md](FEATURES_AND_SCHEMA.md) | 功能与数据库结构 |
| [DATABASE_DICTIONARY.md](DATABASE_DICTIONARY.md) | 数据库字典 |
| [DEPLOYMENT.md](DEPLOYMENT.md) | 部署指南 |
| [RELEASE_NOTES.md](RELEASE_NOTES.md) | 发布说明 |

---

## 🛠️ 环境要求

- Node.js >= 18.0.0
- npm >= 9.0.0
- Linux / macOS / Windows

---

## 📦 安装部署

### 1. 克隆仓库
```bash
git clone https://github.com/PatrickStarChi/asset-manage.git
cd asset-manage
```

### 2. 安装依赖
```bash
npm install
```

### 3. 启动服务
```bash
./start.sh
# 或
npm start
```

### 4. 配置定时备份（可选）
```bash
# 编辑 crontab
crontab -e

# 添加每天凌晨 2 点备份
0 2 * * * /path/to/asset-manage/scripts/backup.sh
```

---

## 📁 项目结构

```
asset-manage/
├── server.js              # 后端 API
├── database.js            # 数据库初始化
├── logger.js              # 日志模块
├── package.json           # 项目配置
├── start.sh               # 一键启动脚本
├── public/                # 前端文件
│   ├── index.html         # 主页面
│   ├── asset-detail.html  # 资产详情页
│   ├── login.html         # 登录页
│   ├── style.css          # 样式文件
│   └── app.js             # 前端逻辑
├── scripts/               # 脚本文件
│   ├── backup.sh          # 备份脚本
│   └── restore.sh         # 恢复脚本
├── backups/               # 数据备份目录
├── logs/                  # 日志目录
└── db/                    # 数据库目录
    └── assets.db          # SQLite 数据库
```

---

## 🔌 API 接口

### 认证接口
- POST `/api/auth/login` - 用户登录
- GET `/api/auth/me` - 获取当前用户信息
- PUT `/api/auth/password` - 修改密码

### 资产接口
- GET `/api/assets` - 获取资产列表
- POST `/api/assets` - 新增资产
- PUT `/api/assets/:id` - 更新资产
- GET `/api/assets/:id` - 获取资产详情
- GET `/api/assets/:id/qrcode` - 获取二维码

### 出入库接口
- GET `/api/transactions` - 获取出入库记录
- POST `/api/transactions/in` - 入库
- POST `/api/transactions/out` - 出库

### 统计接口
- GET `/api/stats` - 获取统计数据
- GET `/api/stats/low-stock-warning` - 低库存预警
- GET `/api/stats/trends` - 变化趋势
- GET `/api/stats/fastest-consumption` - 消耗排行

### 用户管理接口
- GET `/api/users` - 获取用户列表
- POST `/api/users` - 新增用户
- PUT `/api/users/:id/password` - 重置密码
- DELETE `/api/users/:id` - 删除用户

### 数据导出接口
- GET `/api/export/assets` - 导出资产列表
- GET `/api/export/import-template` - 下载入库模板

### 数据导入接口
- POST `/api/import/stock-by-id` - 批量入库

### 备份接口
- GET `/api/backups` - 获取备份列表
- POST `/api/backups` - 创建备份
- POST `/api/backups/restore` - 恢复备份
- DELETE `/api/backups/:filename` - 删除备份

### 日志接口
- GET `/api/logs` - 获取操作日志

---

## 📊 数据库结构

### 4 个核心数据表

| 表名 | 字段数 | 说明 |
|------|--------|------|
| assets | 11 | 资产表 |
| transactions | 9 | 出入库记录表 |
| users | 6 | 用户表 |
| categories | 3 | 分类表 |

**详细信息**: 请查看 [FEATURES_AND_SCHEMA.md](FEATURES_AND_SCHEMA.md)

---

## 🔧 维护操作

### 数据备份
```bash
./scripts/backup.sh
```

### 数据恢复
```bash
./scripts/restore.sh <备份文件名>
```

### 查看日志
```bash
# 服务日志
tail -f logs/server.log

# 操作日志
tail -f logs/operations.log
```

---

## 📝 更新日志

查看完整的版本更新记录：[CHANGELOG.md](CHANGELOG.md)

### v1.0.2 (2026-04-01)
- 修复统计逻辑（totalAssets 改为统计资产种类数）
- 修复用户报告问题（标签改名、警告文字加大、字段名修复）

### v1.0.1 (2026-04-01)
- 修复资产 ID 为 null 问题
- 修复字段名不匹配问题
- 修复 401 错误
- 修复资产列表不显示问题
- 修复语法错误

### v1.0.0 (2026-04-01)
- 初始版本发布

---

## 📄 许可证

MIT License

---

## 🙏 致谢

感谢使用本系统！如有问题请提交 Issue。

**最后更新**: 2026-04-01 23:00 CST
