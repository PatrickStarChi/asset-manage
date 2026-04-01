# 资产管理系统 - 部署指南

## 📦 生产环境部署

### 前置要求
- Node.js >= 18.0.0
- npm >= 9.0.0
- Linux 服务器（推荐 Ubuntu 20.04+）
- 域名和 SSL 证书（可选，用于 HTTPS）

### 1. 克隆仓库
```bash
git clone https://github.com/patrick-star/asset-manage.git
cd asset-manage
```

### 2. 安装依赖
```bash
npm install --production
```

### 3. 启动服务
```bash
# 使用一键启动脚本
./start.sh

# 或使用 PM2（推荐生产环境）
npm install -g pm2
pm2 start server.js --name asset-manage
pm2 save
pm2 startup
```

### 4. 配置 Nginx 反向代理（可选）
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

### 5. 配置定时备份
```bash
# 编辑 crontab
crontab -e

# 添加每天凌晨 2 点备份
0 2 * * * /path/to/asset-manage/scripts/backup.sh

# 或者使用系统自带的备份 API（需要保持服务运行）
# 系统会自动在每次操作时记录日志
```

---

## 🔧 维护操作

### 查看日志
```bash
# 服务日志
tail -f logs/server.log

# 操作日志
tail -f logs/operations.log

# 备份日志
tail -f backups/backup.log
```

### 数据备份
```bash
# 手动备份
./scripts/backup.sh

# 或通过 API（需要登录）
curl -X POST http://localhost:3001/api/backups \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 数据恢复
```bash
# 查看可用备份
ls backups/

# 恢复指定备份
./scripts/restore.sh assets_backup_20260401_120000.db

# 或通过 API
curl -X POST http://localhost:3001/api/backups/restore \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"filename":"assets_backup_20260401_120000.db"}'
```

### 查看操作日志
```bash
# 通过 API
curl http://localhost:3001/api/logs?limit=100 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 📊 监控与告警

### 服务状态检查
```bash
# 检查服务是否运行
curl http://localhost:3001/api/stats

# 检查数据库
sqlite3 assets.db "SELECT COUNT(*) FROM assets;"
```

### 日志轮转（可选）
创建 `/etc/logrotate.d/asset-manage`:
```
/path/to/asset-manage/logs/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 0644 patrick patrick
}
```

---

## 🔐 安全建议

1. **修改默认密码**：首次登录后立即修改 admin 密码
2. **启用 HTTPS**：生产环境建议使用 SSL 证书
3. **防火墙配置**：只开放必要端口（80/443）
4. **定期备份**：确保每天自动备份数据
5. **日志审计**：定期检查操作日志

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

# 或重新初始化
rm assets.db
npm start
```

### 内存不足
```bash
# 增加 Node.js 内存限制
export NODE_OPTIONS="--max-old-space-size=4096"
npm start
```

---

## 📞 技术支持

如有问题，请提交 GitHub Issue 或联系管理员。
