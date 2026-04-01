# 资产管理系统

一套基于 Node.js + SQLite 的 Web 资产管理系统，支持办公用品的入库、出库、库存预警、二维码管理等功能。

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

## 🛠️ 环境要求

- Node.js >= 18.0.0
- npm >= 9.0.0
- Linux / macOS / Windows

---

## 📦 安装部署

### 1. 克隆仓库
```bash
git clone <repository-url>
cd asset-manage
```

### 2. 安装依赖
```bash
npm install
```

### 3. 初始化数据库
```bash
# 首次启动会自动初始化
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
├── server.js           # 后端 API 服务
├── database.js         # 数据库初始化
├── logger.js           # 操作日志模块
├── package.json        # 项目配置
├── start.sh            # 一键启动脚本
├── public/
│   ├── index.html      # 主页面
│   ├── asset-detail.html # 领用表单页
│   ├── login.html      # 登录页
│   ├── style.css       # 样式文件
│   └── app.js          # 前端逻辑
├── scripts/
│   ├── backup.sh       # 备份脚本
│   └── restore.sh      # 恢复脚本
├── backups/            # 数据备份目录
├── logs/               # 日志目录
└── uploads/            # 上传文件目录
```

---

## 🔌 API 接口

### 认证接口
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/auth/login | 用户登录 |
| GET | /api/auth/me | 获取当前用户信息 |
| PUT | /api/auth/password | 修改密码 |

### 资产接口
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/assets | 获取资产列表 |
| POST | /api/assets | 新增资产 |
| PUT | /api/assets/:id | 更新资产 |
| GET | /api/assets/:id | 获取资产详情 |
| GET | /api/assets/:id/qrcode | 获取二维码 |

### 出入库接口
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/transactions | 获取出入库记录 |
| POST | /api/transactions/in | 入库 |
| POST | /api/transactions/out | 出库 |

### 统计接口
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/stats | 获取统计数据 |
| GET | /api/stats/low-stock-warning | 低库存预警 |
| GET | /api/stats/trends | 变化趋势 |
| GET | /api/stats/fastest-consumption | 消耗排行 |
| GET | /api/stats/asset/:id/trend | 单品趋势 |

### 用户管理接口
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/users | 获取用户列表 |
| POST | /api/users | 新增用户 |
| PUT | /api/users/:id/password | 重置密码 |
| DELETE | /api/users/:id | 删除用户 |

### 数据导出接口
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/export/assets | 导出资产列表 |
| GET | /api/export/import-template | 下载入库模板 |

### 数据导入接口
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/import/stock | 批量入库 |
| POST | /api/import/stock-by-id | 按 ID 批量入库 |

---

## 📊 数据库结构

### assets (资产表)
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 主键 |
| name | TEXT | 资产名称 |
| category | TEXT | 分类 |
| quantity | INTEGER | 数量 |
| unit | TEXT | 单位 |
| location | TEXT | 存放位置 |
| description | TEXT | 描述 |
| min_stock | INTEGER | 最低库存 |
| qr_code | TEXT | 二维码 ID |
| created_at | DATETIME | 创建时间 |
| updated_at | DATETIME | 更新时间 |

### transactions (出入库记录表)
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 主键 |
| asset_id | INTEGER | 资产 ID |
| asset_name | TEXT | 资产名称 |
| type | TEXT | 类型 (in/out) |
| quantity | INTEGER | 数量 |
| operator | TEXT | 操作人 |
| location | TEXT | 房间号 |
| remark | TEXT | 备注 |
| created_at | DATETIME | 时间 |

### users (用户表)
| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 主键 |
| username | TEXT | 用户名 |
| password | TEXT | 密码 (bcrypt 加密) |
| role | TEXT | 角色 (admin/user) |
| created_at | DATETIME | 创建时间 |

---

## 🔧 维护操作

### 数据备份
```bash
./scripts/backup.sh
```

### 数据恢复
```bash
# 查看可用备份
ls backups/

# 恢复指定备份
./scripts/restore.sh assets_backup_20260401_120000.db
```

### 查看日志
```bash
tail -f logs/server.log
tail -f logs/operations.log
```

### 清除测试数据
```bash
# 删除数据库重新初始化
rm assets.db
npm start
```

---

## 📝 更新日志

### v1.0.0 (2026-04-01)
- ✅ 初始版本发布
- ✅ 资产管理核心功能
- ✅ 二维码扫码领用
- ✅ Excel 导入导出
- ✅ 操作日志记录
- ✅ 定时数据备份
- ✅ 数据恢复功能

---

## 📄 许可证

MIT License

---

## 🙏 致谢

感谢使用本系统！如有问题请提交 Issue。
