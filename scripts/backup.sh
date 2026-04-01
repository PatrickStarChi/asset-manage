#!/bin/bash
# 资产管理系统自动备份脚本

set -e

# 配置
BACKUP_DIR="./backups"
DATABASE_FILE="assets.db"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/backup_$DATE.db"

# 创建备份目录（如果不存在）
mkdir -p "$BACKUP_DIR"

# 执行备份
cp "$DATABASE_FILE" "$BACKUP_FILE"

# 设置文件权限
chmod 644 "$BACKUP_FILE"

echo "✅ 备份成功: $BACKUP_FILE"

# 清理30天前的旧备份
find "$BACKUP_DIR" -name "backup_*.db" -mtime +30 -delete

echo "🧹 已清理30天前的旧备份文件"