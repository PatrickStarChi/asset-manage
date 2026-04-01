# 资产管理系统部署文档

## 系统要求

- **操作系统**: Linux, macOS, Windows
- **内存**: 最少 512MB RAM
- **磁盘空间**: 最少 100MB 可用空间
- **网络**: 需要开放 3001 端口（可配置）

## 安装步骤

### 1. 安装 Node.js

#### Ubuntu/Debian:
```bash
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs
```

#### CentOS/RHEL:
```bash
curl -fsSL https://rpm.nodesource.com/setup_lts.x | sudo bash -
sudo yum install nodejs
```

#### macOS (使用 Homebrew):
```bash
brew install node
```

#### Windows:
从 [Node.js 官网](https://nodejs.org/) 下载并安装 LTS 版本

### 2. 克隆项目

```bash
git clone https://github.com/your-username/asset-manage.git
cd asset-manage
```

### 3. 安装依赖

```bash
npm install
```

### 4. 配置环境变量（可选）

创建 `.env` 文件来配置自定义设置：

```bash
# .env
PORT=3001
JWT_SECRET=your-custom-secret-key-here
DATABASE_PATH=./assets.db
BACKUP_DIR=./backups
LOG_DIR=./logs
```

默认配置无需创建 `.env` 文件。

### 5. 启动服务

#### 开发模式（自动重启）:
```bash
npm run dev
```

#### 生产模式:
```bash
npm start
```

#### 使用一键启动脚本:
```bash
chmod +x start.sh
./start.sh
```

### 6. 验证安装

访问 `http://localhost:3001`，应该看到登录页面。

使用默认账号登录：
- 用户名: `admin`
- 密码: `admin123`

## 生产环境部署

### 使用 PM2 进程管理器

1. 安装 PM2:
```bash
npm install -g pm2
```

2. 启动应用:
```bash
pm2 start server.js --name "asset-manager"
```

3. 设置开机自启:
```bash
pm2 startup
pm2 save
```

### Nginx 反向代理配置

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
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 数据备份配置

### 自动备份（推荐）

系统已内置每日自动备份功能，备份文件存储在 `backups/` 目录。

手动触发备份：
```bash
./scripts/backup.sh
```

### 备份脚本内容
```bash
#!/bin/bash
# scripts/backup.sh
DATE=$(date +%Y%m%d_%H%M%S)
cp assets.db backups/backup_$DATE.db
echo "Backup created: backups/backup_$DATE.db"
```

## 日志管理

- 应用日志: `logs/app.log`
- 错误日志: `logs/error.log`
- 访问日志: `logs/access.log`

## 安全建议

1. **修改默认密码**: 首次登录后立即修改 admin 账户密码
2. **配置 HTTPS**: 在生产环境中使用 SSL/TLS 加密
3. **防火墙设置**: 仅允许必要的 IP 访问 3001 端口
4. **定期更新**: 定期更新 Node.js 和 npm 依赖包
5. **数据加密**: 敏感数据应考虑额外加密存储

## 故障排除

### 常见问题

**Q: 无法启动服务，端口被占用**
A: 修改 `server.js` 中的 PORT 变量，或使用环境变量 `PORT=3002 npm start`

**Q: 数据库文件损坏**
A: 从 `backups/` 目录恢复最近的备份文件

**Q: 登录失败**
A: 检查用户名和密码是否正确，默认密码为 `admin123`

**Q: 二维码无法生成**
A: 确保网络连接正常，QRCode 依赖 CDN 资源

### 日志查看

```bash
# 查看应用日志
tail -f logs/app.log

# 查看错误日志  
tail -f logs/error.log
```

## 升级指南

1. 停止当前服务: `pm2 stop asset-manager` 或 `Ctrl+C`
2. 拉取最新代码: `git pull origin main`
3. 更新依赖: `npm install`
4. 启动新版本: `npm start` 或 `pm2 start asset-manager`

## 联系支持

如遇技术问题，请提供以下信息：
- 操作系统版本
- Node.js 版本 (`node --version`)
- npm 版本 (`npm --version`)
- 错误日志内容
- 复现步骤