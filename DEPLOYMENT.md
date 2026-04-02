# 资产管理系统 - 部署指南

## 📦 生产环境部署

### 前置要求
| 项目 | 要求 |
|------|------|
| Node.js | >= 18.0.0 |
| npm | >= 9.0.0 |
| 操作系统 | Linux 服务器（推荐 Ubuntu 20.04+） |
| 域名 | 可选（用于 HTTPS） |
| SSL 证书 | 可选（推荐 Let's Encrypt） |

---

## 🚀 快速部署

### 1. 克隆仓库
```bash
git clone https://github.com/PatrickStarChi/asset-manage.git
cd asset-manage
```

### 2. 安装依赖
```bash
npm install --production
```

### 3. 启动服务

#### 方式一：PM2（推荐生产环境）
```bash
# 安装 PM2
npm install -g pm2

# 启动服务
pm2 start server.js --name asset-manage

# 保存 PM2 配置
pm2 save

# 配置开机自启
pm2 startup
```

#### 方式二：一键启动脚本
```bash
./start.sh
```

#### 方式三：Systemd 服务
创建 `/etc/systemd/system/asset-manage.service`:
```ini
[Unit]
Description=Asset Management System
After=network.target

[Service]
Type=simple
User=patrick
WorkingDirectory=/path/to/asset-manage
ExecStart=/usr/bin/node server.js
Restart=always
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

启动服务：
```bash
sudo systemctl enable asset-manage
sudo systemctl start asset-manage
sudo systemctl status asset-manage
```

---

## 🔧 Nginx 反向代理配置

### 1. 安装 Nginx
```bash
sudo apt update
sudo apt install nginx
```

### 2. 配置 Nginx
创建 `/etc/nginx/sites-available/asset-manage`:
```nginx
server {
    listen 80;
    server_name assetmanage.patrickstar.top;

    # 重定向到 HTTPS（可选）
    # return 301 https://$server_name$request_uri;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # 静态文件缓存
    location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
        proxy_pass http://localhost:3001;
        expires 7d;
        add_header Cache-Control "public, immutable";
    }
}
```

### 3. 启用配置
```bash
# 创建软链接
sudo ln -s /etc/nginx/sites-available/asset-manage /etc/nginx/sites-enabled/

# 测试配置
sudo nginx -t

# 重启 Nginx
sudo systemctl restart nginx
```

### 4. 配置 HTTPS（推荐）
```bash
# 安装 Certbot
sudo apt install certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d assetmanage.patrickstar.top
```

---

## 💾 数据备份配置

### 方式一：Crontab 定时备份（推荐）
```bash
# 编辑 crontab
crontab -e

# 每 30 分钟备份一次（推荐）
*/30 * * * * /path/to/asset-manage/scripts/backup.sh

# 或每天凌晨 2 点备份
0 2 * * * /path/to/asset-manage/scripts/backup.sh
```

### 方式二：Systemd Timer
创建 `/etc/systemd/system/asset-backup.timer`:
```ini
[Unit]
Description=Asset Database Backup Timer

[Timer]
OnCalendar=*-*-* *:00,30:00
Persistent=true

[Install]
WantedBy=timers.target
```

创建 `/etc/systemd/system/asset-backup.service`:
```ini
[Unit]
Description=Asset Database Backup Service

[Service]
Type=oneshot
User=patrick
ExecStart=/path/to/asset-manage/scripts/backup.sh
```

启用定时器：
```bash
sudo systemctl enable asset-backup.timer
sudo systemctl start asset-backup.timer
```

### 备份文件管理
- **备份目录**: `/path/to/asset-manage/backups/`
- **保留策略**: 自动保留 7 天内的备份
- **备份格式**: `assets.db.backup.YYYYMMDDHHMMSS`

---

## 📊 监控与日志

### 查看服务状态
```bash
# PM2 方式
pm2 status
pm2 logs asset-manage

# Systemd 方式
sudo systemctl status asset-manage
sudo journalctl -u asset-manage -f
```

### 查看应用日志
```bash
# 服务日志
tail -f /path/to/asset-manage/logs/server.log

# 操作日志
tail -f /path/to/asset-manage/logs/operations.log

# 备份日志
tail -f /path/to/asset-manage/logs/backup.log
```

### 日志轮转配置
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
    postrotate
        pm2 reload asset-manage > /dev/null 2>&1 || true
    endscript
}
```

---

## 🔐 安全加固

### 1. 修改默认密码
首次登录后立即修改 admin 密码！

### 2. 防火墙配置
```bash
# UFW（Ubuntu）
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable

# Firewalld（CentOS）
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

### 3. 数据库安全
```bash
# 设置数据库文件权限
chmod 640 /path/to/asset-manage/assets.db
chown patrick:patrick /path/to/asset-manage/assets.db
```

### 4. 定期更新
```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 更新 Node.js 依赖
cd /path/to/asset-manage
npm update
```

---

## 🆘 故障排查

### 服务无法启动
```bash
# 检查端口占用
lsof -i:3001
netstat -tlnp | grep 3001

# 检查 Node.js 版本
node -v

# 查看错误日志
tail -100 /path/to/asset-manage/logs/server.log

# 检查依赖
npm install --production
```

### 数据库损坏
```bash
# 从备份恢复
cd /path/to/asset-manage
./scripts/restore.sh <最新备份文件>

# 或重新初始化
rm assets.db
npm start
```

### 内存不足
```bash
# 增加 Node.js 内存限制
export NODE_OPTIONS="--max-old-space-size=4096"
pm2 restart asset-manage
```

### Nginx 502 错误
```bash
# 检查后端服务
pm2 status
curl http://localhost:3001/api/stats

# 重启 Nginx
sudo systemctl restart nginx
```

---

## 📞 技术支持

- **GitHub**: https://github.com/PatrickStarChi/asset-manage
- **Issues**: https://github.com/PatrickStarChi/asset-manage/issues
- **文档**: README.md, CHANGELOG.md

---

**版本**: v1.10  
**最后更新**: 2026-04-02 18:00 CST
