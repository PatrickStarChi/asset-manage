#!/bin/bash
# 资产管理系统数据备份脚本

BACKUP_DIR="$(dirname "$(dirname "$0")")/backups"
DB_FILE="$(dirname "$(dirname "$0")")/db/assets.db"
DATE=$(date +%Y%m%d_%H%M%S)

# 创建备份
if [ -f "$DB_FILE" ]; then
    cp "$DB_FILE" "$BACKUP_DIR/assets_backup_$DATE.db"
    echo "[$(date)] 备份完成：assets_backup_$DATE.db" >> "$BACKUP_DIR/backup.log"
    
    # 保留最近 30 天的备份
    find "$BACKUP_DIR" -name "assets_backup_*.db" -mtime +30 -delete
    echo "[$(date)] 已清理 30 天前的备份" >> "$BACKUP_DIR/backup.log"
else
    echo "[$(date)] 错误：数据库文件不存在" >> "$BACKUP_DIR/backup.log"
fi
