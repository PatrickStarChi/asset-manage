#!/bin/bash
# 资产数据库备份脚本

BACKUP_DIR="/home/patrick/git/asset-manage/backups"
DB_FILE="/home/patrick/git/asset-manage/assets.db"
TIMESTAMP=$(date +%Y%m%d%H%M%S)

# 创建备份目录（如果不存在）
mkdir -p "$BACKUP_DIR"

# 执行备份
cp "$DB_FILE" "$BACKUP_DIR/assets.db.backup.$TIMESTAMP"

# 删除 7 天前的旧备份
find "$BACKUP_DIR" -name "assets.db.*" -mtime +7 -delete

echo "[$(date '+%Y-%m-%d %H:%M:%S')] 备份完成：assets.db.$TIMESTAMP"
