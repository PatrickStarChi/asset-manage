# 资产管理系统 v1.10

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18.0.0-green.svg)](https://nodejs.org/)
[![SQLite](https://img.shields.io/badge/SQLite-3-blue.svg)](https://www.sqlite.org/)

一套基于 Node.js + SQLite 的 Web 资产管理系统，支持办公用品的入库、出库、库存预警、二维码管理等功能。

**在线演示**: https://assetmanage.patrickstar.top  
**GitHub**: https://github.com/PatrickStarChi/asset-manage

---

## 🚀 快速开始

### 一键启动
```bash
git clone https://github.com/PatrickStarChi/asset-manage.git
cd asset-manage
./start.sh
```

访问：http://localhost:3001

### 默认管理员账号
- 用户名：`admin`
- 密码：`admin123`

⚠️ **首次登录后请立即修改密码！**

---

## 📋 功能特性

### 核心功能
| 模块 | 功能 |
|------|------|
| 资产管理 | ✅ 增删改查 ✅ 分类管理 ✅ 详情编辑一体化 ✅ 表头排序 |
| 出入库管理 | ✅ 单个/批量入库 ✅ 扫码出库 ✅ 日期筛选 ✅ Excel 导入导出 |
| 二维码 | ✅ 专属二维码生成 ✅ 扫码领用（免登录） ✅ 批量领取二维码 |
| 库存预警 | ✅ 最低库存设置 ✅ 低库存提醒 ✅ 预警列表 |
| 数据统计 | ✅ 仪表盘 ✅ 分类统计 ✅ 变化趋势图 ✅ 消耗排行 |
| 用户管理 | ✅ JWT 认证 ✅ 角色权限 ✅ 密码管理 |
| 数据管理 | ✅ 定时备份 ✅ 数据恢复 ✅ 操作日志 |

### 高级功能（v1.10）
- ✅ 每 30 分钟自动备份
- ✅ 批量领取二维码
- ✅ 资产详情页编辑一体化
- ✅ 趋势图自适应显示
- ✅ 出入库记录高级筛选

---

## 📚 文档目录

| 文档 | 说明 |
|------|------|
| [README.md](README.md) | 项目说明（本文档） |
| [CHANGELOG.md](CHANGELOG.md) | 版本更新日志 |
| [DEPLOYMENT.md](DEPLOYMENT.md) | 部署指南 |

---

## 🛠️ 环境要求

| 项目 | 要求 |
|------|------|
| Node.js | >= 18.0.0 |
| npm | >= 9.0.0 |
| 操作系统 | Linux / macOS / Windows |
| 磁盘空间 | >= 100MB |
| 内存 | >= 512MB |

---

## 📦 安装部署

### 本地开发
```bash
# 1. 克隆仓库
git clone https://github.com/PatrickStarChi/asset-manage.git
cd asset-manage

# 2. 安装依赖
npm install

# 3. 启动服务
./start.sh
```

### 生产环境
```bash
# 1. 安装 PM2
npm install -g pm2

# 2. 启动服务
pm2 start server.js --name asset-manage
pm2 save
pm2 startup

# 3. 配置 Nginx 反向代理（可选）
# 详见 DEPLOYMENT.md
```

### 配置定时备份
```bash
# 编辑 crontab
crontab -e

# 添加每 30 分钟备份（推荐）
*/30 * * * * /path/to/asset-manage/scripts/backup.sh

# 或每天凌晨 2 点备份
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
│   ├── batch-request.html # 批量领用页
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
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/login` | 用户登录 |
| GET | `/api/auth/me` | 获取当前用户 |
| PUT | `/api/auth/password` | 修改密码 |

### 资产接口
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/assets` | 获取资产列表 |
| POST | `/api/assets` | 新增资产 |
| PUT | `/api/assets/:id` | 更新资产 |
| GET | `/api/assets/:id` | 获取资产详情 |
| GET | `/api/assets/:id/qrcode` | 获取二维码 |

### 出入库接口
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/transactions` | 获取出入库记录 |
| POST | `/api/transactions/in` | 入库 |
| POST | `/api/transactions/out` | 出库 |

### 统计接口
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/stats` | 获取统计数据 |
| GET | `/api/stats/low-stock-warning` | 低库存预警 |
| GET | `/api/stats/trends` | 变化趋势 |
| GET | `/api/stats/fastest-consumption` | 消耗排行 |

### 用户管理接口
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/users` | 获取用户列表 |
| POST | `/api/users` | 新增用户 |
| PUT | `/api/users/:id/password` | 重置密码 |
| DELETE | `/api/users/:id` | 删除用户 |

### 数据管理接口
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/export/assets` | 导出资产列表 |
| GET | `/api/export/import-template` | 下载入库模板 |
| POST | `/api/import/stock-by-id` | 批量入库 |
| GET | `/api/backups` | 获取备份列表 |
| POST | `/api/backups` | 创建备份 |
| POST | `/api/backups/restore` | 恢复备份 |
| DELETE | `/api/backups/:filename` | 删除备份 |
| GET | `/api/logs` | 获取操作日志 |

---

## 📊 数据库结构

### 核心数据表

| 表名 | 字段数 | 说明 |
|------|--------|------|
| assets | 11 | 资产表 |
| transactions | 9 | 出入库记录表 |
| users | 6 | 用户表 |
| categories | 3 | 分类表 |

### assets - 资产表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 资产 ID（自增主键） |
| name | TEXT | 资产名称 |
| category | TEXT | 分类名称 |
| quantity | INTEGER | 当前库存数量 |
| min_quantity | INTEGER | 最低库存预警值 |
| unit | TEXT | 计量单位 |
| location | TEXT | 存放位置 |
| description | TEXT | 资产描述 |
| qr_code | TEXT | 二维码 UUID |
| created_at | DATETIME | 创建时间 |
| updated_at | DATETIME | 更新时间 |

### transactions - 出入库记录表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 记录 ID（自增主键） |
| asset_id | TEXT | 资产 ID（外键） |
| asset_name | TEXT | 资产名称（冗余字段） |
| type | TEXT | 类型：in=入库，out=出库 |
| quantity | INTEGER | 出入库数量 |
| person_name | TEXT | 操作人姓名 |
| room_number | TEXT | 房间号/领用部门 |
| notes | TEXT | 备注信息 |
| created_at | DATETIME | 记录时间 |

---

## 🔧 维护操作

### 数据备份
```bash
# 手动备份
./scripts/backup.sh

# 或通过 API
curl -X POST http://localhost:3001/api/backups \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 数据恢复
```bash
# 查看可用备份
ls backups/

# 恢复指定备份
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

## 🔐 安全建议

1. **修改默认密码**：首次登录后立即修改 admin 密码
2. **启用 HTTPS**：生产环境建议使用 SSL 证书
3. **防火墙配置**：只开放必要端口（80/443）
4. **定期备份**：确保每 30 分钟自动备份数据
5. **日志审计**：定期检查操作日志

---

## 📝 更新日志

查看完整的版本更新记录：[CHANGELOG.md](CHANGELOG.md)

### v1.11 (2026-04-02)
- ✅ 添加"办公用品"分类

### v1.10 (2026-04-02) - 正式版
- ✅ 批量领取二维码功能
- ✅ 每 30 分钟自动备份
- ✅ 资产 ID 精确控制
- ✅ 仪表盘快捷入口优化

### v1.0.x (2026-04-01)
- ✅ 趋势图优化
- ✅ 出入库筛选功能
- ✅ 二维码下载功能
- ✅ 统计逻辑修复

---

## 🆘 故障排查

### 服务无法启动
```bash
# 检查端口占用
lsof -i:3001

# 检查 Node.js 版本
node -v

# 查看错误日志
tail -100 logs/server.log
```

### 数据库损坏
```bash
# 从备份恢复
./scripts/restore.sh <最新备份文件>
```

---

## 📄 许可证

MIT License

---

## 🙏 致谢

感谢使用本系统！如有问题请提交 [Issue](https://github.com/PatrickStarChi/asset-manage/issues)。

**版本**: v1.11  
**最后更新**: 2026-04-02 18:00 CST  
**维护人员**: 司礼监
