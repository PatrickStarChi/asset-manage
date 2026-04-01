# 资产管理系统 - 部署文档

## 系统要求

- **操作系统**: Linux / macOS / Windows
- **Node.js**: v14 或更高版本
- **npm**: v6 或更高版本
- **磁盘空间**: 至少 500MB
- **内存**: 至少 512MB

## 快速开始

### 1. 克隆仓库

```bash
git clone https://github.com/your-username/asset-manage.git
cd asset-manage
```

### 2. 安装依赖

```bash
npm install
```

### 3. 一键启动

```bash
./start.sh
```

或者手动启动：

```bash
# 开发模式（带自动重启）
npm run dev

# 生产模式
npm start
```

### 4. 访问系统

打开浏览器访问：`http://localhost:3001`

**默认登录账号：**
- 用户名：`admin`
- 密码：`admin123`

## 目录结构

```
asset-manage/
├── public/              # 前端静态资源
│   ├── index.html       # 主页面
│   ├── app.js           # 前端逻辑
│   └── style.css        # 样式文件
├── scripts/             # 工具脚本
│   ├── backup.sh        # 备份脚本
│   └── restore.sh       # 恢复脚本
├── logs/                # 操作日志目录（自动创建）
├── backups/             # 数据备份目录（自动创建）
├── db/                  # 数据库文件目录（自动创建）
├── uploads/             # 上传文件目录（自动创建）
├── server.js            # 主服务器文件
├── database.js          # 数据库初始化
├── logger.js            # 日志模块
├── package.json         # 项目配置
├── start.sh             # 一键启动脚本
├── README.md            # 项目说明
└── DEPLOYMENT.md        # 部署文档（本文件）
```

## 配置说明

### 环境变量

可通过环境变量配置系统：

```bash
# 服务端口（默认：3001）
export PORT=3001

# JWT 密钥（生产环境请修改）
export JWT_SECRET="your-secret-key-here"
```

### 数据库

系统使用 SQLite3 数据库，数据文件存储在：
- `assets.db` - 主数据库文件

数据库会自动初始化，包含以下表：
- `assets` - 资产表
- `categories` - 分类表
- `transactions` - 交易记录表
- `users` - 用户表
- `operations_log` - 操作日志表

## 数据备份与恢复

### 自动备份

系统默认每天凌晨 2 点自动备份数据库到 `backups/` 目录，并清理 30 天前的旧备份。

### 手动备份

**方法 1：使用 API**

```bash
TOKEN="your-jwt-token"
curl -X POST http://localhost:3001/api/backups \
  -H "Authorization: Bearer $TOKEN"
```

**方法 2：使用脚本**

```bash
./scripts/backup.sh
```

### 数据恢复

**方法 1：使用 API**

```bash
TOKEN="your-jwt-token"
curl -X POST http://localhost:3001/api/backups/restore \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"filename":"assets_backup_20260401_120000.db"}'
```

**方法 2：使用脚本**

```bash
./scripts/restore.sh
```

### 查看备份列表

```bash
curl http://localhost:3001/api/backups \
  -H "Authorization: Bearer $TOKEN"
```

## 操作日志

### 查看日志

```bash
# 获取最近 100 条日志
curl "http://localhost:3001/api/logs?limit=100" \
  -H "Authorization: Bearer $TOKEN"

# 筛选特定操作类型
curl "http://localhost:3001/api/logs?action=CREATE_ASSET" \
  -H "Authorization: Bearer $TOKEN"

# 筛选特定用户
curl "http://localhost:3001/api/logs?user=admin" \
  -H "Authorization: Bearer $TOKEN"
```

### 清理旧日志

```bash
curl -X POST http://localhost:3001/api/logs/cleanup \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"days":30}'
```

日志文件存储在 `logs/operations.log`，格式为 JSON Lines。

## API 文档

### 认证接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/login` | 用户登录 |
| GET | `/api/auth/me` | 获取当前用户信息 |

### 资产管理

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/assets` | 获取资产列表 |
| POST | `/api/assets` | 创建资产 |
| PUT | `/api/assets/:id` | 更新资产 |
| DELETE | `/api/assets/:id` | 删除资产 |
| GET | `/api/assets/:id/qrcode` | 获取资产二维码 |

### 出入库管理

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/transactions/in` | 入库操作 |
| POST | `/api/transactions/out` | 出库操作 |
| GET | `/api/transactions` | 获取交易记录 |

### 统计接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/stats` | 获取统计数据 |
| GET | `/api/stats/trends` | 获取趋势数据 |
| GET | `/api/stats/fastest-consumption` | 消耗最快物品 |
| GET | `/api/stats/low-stock-warning` | 低库存预警 |

### 日志管理

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/logs` | 获取操作日志 |
| GET | `/api/logs/actions` | 获取操作类型统计 |
| POST | `/api/logs/cleanup` | 清理旧日志 |

### 备份管理

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/backups` | 获取备份列表 |
| POST | `/api/backups` | 创建备份 |
| POST | `/api/backups/restore` | 恢复备份 |
| DELETE | `/api/backups/:filename` | 删除备份 |

## 生产环境部署

### 1. 使用 PM2 管理进程

```bash
# 安装 PM2
npm install -g pm2

# 启动服务
pm2 start server.js --name asset-manage

# 设置开机自启
pm2 startup
pm2 save
```

### 2. 配置 Nginx 反向代理

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 3. 配置 HTTPS（可选）

使用 Let's Encrypt 免费 SSL 证书：

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

### 4. 安全建议

1. **修改默认密码**：首次登录后立即修改 admin 密码
2. **更改 JWT 密钥**：设置强随机字符串作为 JWT_SECRET
3. **配置防火墙**：仅开放必要端口
4. **定期备份**：确保备份文件存储在安全位置
5. **监控日志**：定期检查操作日志和系统日志

## 故障排查

### 服务无法启动

```bash
# 检查端口占用
lsof -i :3001

# 查看日志
tail -f /tmp/asset-server.log

# 检查 Node.js 版本
node -v
```

### 数据库错误

```bash
# 检查数据库文件权限
ls -la assets.db

# 重新初始化数据库（会清空数据！）
rm assets.db
node -e "require('./database').initDatabase()"
```

### 内存不足

```bash
# 限制 Node.js 内存使用
export NODE_OPTIONS="--max-old-space-size=512"
node server.js
```

## 技术支持

如有问题，请提交 Issue 或联系项目维护者。

## 更新日志

### v1.0.0 (2026-04-01)
- ✅ 初始版本发布
- ✅ 资产管理功能
- ✅ 出入库管理
- ✅ 二维码扫描
- ✅ 统计报表
- ✅ 操作日志
- ✅ 数据备份与恢复
- ✅ 定时任务
