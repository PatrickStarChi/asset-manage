# 📋 资产管理系统 - 部署文档

## 系统要求

### 硬件要求
- CPU: 1 核以上
- 内存：512MB 以上
- 磁盘：1GB 以上可用空间

### 软件要求
- Node.js >= 16.0.0
- npm >= 8.0.0
- Linux/macOS/Windows

### 检查环境

```bash
# 检查 Node.js 版本
node -v

# 检查 npm 版本
npm -v
```

## 安装步骤

### 1. 克隆仓库

```bash
cd ~/git
git clone <repository-url> asset-manage
cd asset-manage
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置目录

```bash
# 创建必要目录
mkdir -p db backups logs uploads
```

### 4. 启动服务

```bash
# 方式一：使用启动脚本（推荐）
chmod +x start.sh
./start.sh start

# 方式二：直接启动
node app.js

# 方式三：指定端口
PORT=3001 node app.js
```

### 5. 验证安装

访问 http://localhost:3001 查看系统是否正常启动。

## 生产环境部署

### 使用 PM2（推荐）

```bash
# 安装 PM2
npm install -g pm2

# 启动服务
pm2 start app.js --name asset-manage

# 开机自启
pm2 startup
pm2 save

# 查看状态
pm2 status

# 查看日志
pm2 logs asset-manage
```

### 使用 systemd

创建服务文件 `/etc/systemd/system/asset-manage.service`:

```ini
[Unit]
Description=Asset Management System
After=network.target

[Service]
Type=simple
User=patrick
WorkingDirectory=/home/patrick/git/asset-manage
ExecStart=/usr/bin/node app.js
Restart=on-failure
Environment=NODE_ENV=production
Environment=PORT=3001

[Install]
WantedBy=multi-user.target
```

启动服务：

```bash
sudo systemctl daemon-reload
sudo systemctl enable asset-manage
sudo systemctl start asset-manage
sudo systemctl status asset-manage
```

## 配置定时备份

### 方式一：使用 crontab

```bash
# 编辑 crontab
crontab -e

# 添加每日凌晨 2 点备份
0 2 * * * cd /home/patrick/git/asset-manage && /usr/bin/node scripts/daily-backup.js >> logs/daily-backup.log 2>&1
```

### 方式二：使用 systemd timer

创建 timer 文件 `/etc/systemd/system/asset-manage-backup.timer`:

```ini
[Unit]
Description=Daily Asset Database Backup
Requires=asset-manage.service

[Timer]
OnCalendar=*-*-* 02:00:00
Persistent=true

[Install]
WantedBy=timers.target
```

创建 service 文件 `/etc/systemd/system/asset-manage-backup.service`:

```ini
[Unit]
Description=Asset Database Backup
Requires=asset-manage.service

[Service]
Type=oneshot
User=patrick
WorkingDirectory=/home/patrick/git/asset-manage
ExecStart=/usr/bin/node scripts/daily-backup.js
```

启动 timer：

```bash
sudo systemctl daemon-reload
sudo systemctl enable asset-manage-backup.timer
sudo systemctl start asset-manage-backup.timer
sudo systemctl list-timers
```

## 数据迁移

### 从旧系统迁移

```bash
# 1. 停止旧服务
./start.sh stop

# 2. 备份旧数据
cp db/assets.db db/assets.db.backup

# 3. 复制数据文件到新位置
cp /old/path/db/assets.db /home/patrick/git/asset-manage/db/

# 4. 启动新服务
./start.sh start
```

### 数据库备份与恢复

```bash
# 手动备份
./start.sh backup

# 或通过 API
curl -X POST http://localhost:3001/api/backups

# 查看备份列表
curl http://localhost:3001/api/backups

# 恢复备份
curl -X POST http://localhost:3001/api/backups/assets-20260401-120000.db.gz/restore
```

## 日志管理

### 日志位置

- 应用日志：`logs/app.log`
- 操作日志：`logs/operations.log`
- 备份日志：`logs/daily-backup.log`

### 查看日志

```bash
# 实时查看
tail -f logs/app.log

# 查看最近 100 行
tail -n 100 logs/app.log

# 搜索日志
grep "ERROR" logs/app.log
```

### 日志轮转

使用 logrotate 配置日志轮转 `/etc/logrotate.d/asset-manage`:

```
/home/patrick/git/asset-manage/logs/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 0644 patrick patrick
}
```

## 故障排查

### 服务无法启动

```bash
# 检查端口占用
lsof -i :3001

# 检查日志
tail -n 50 logs/app.log

# 检查 Node.js 版本
node -v
```

### 数据库错误

```bash
# 检查数据库文件
ls -la db/

# 恢复备份
./start.sh backup  # 先备份当前状态
# 然后通过 API 恢复
```

### 权限问题

```bash
# 修复目录权限
chown -R patrick:patrick /home/patrick/git/asset-manage
chmod +x start.sh
```

## 性能优化

### 内存优化

对于大数据库，可以增加 sql.js 的内存限制：

```bash
node --max-old-space-size=512 app.js
```

### 数据库优化

定期清理旧数据：

```sql
-- 删除 90 天前的交易记录
DELETE FROM transactions WHERE created_at < datetime('now', '-90 days');
```

## 安全建议

1. **防火墙配置**: 仅允许信任 IP 访问 3001 端口
2. **定期备份**: 配置每日自动备份
3. **日志监控**: 定期检查操作日志
4. **系统更新**: 及时更新 Node.js 和依赖包

## 技术支持

如有问题，请查看日志文件或联系维护团队。
