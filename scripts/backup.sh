#!/bin/bash
# 资产管理系统数据库备份脚本

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
DB_FILE="$PROJECT_DIR/assets.db"
BACKUP_DIR="$PROJECT_DIR/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/assets_backup_$DATE.db"

# 创建备份目录
mkdir -p "$BACKUP_DIR"

# 检查数据库文件是否存在
if [ ! -f "$DB_FILE" ]; then
    echo "❌ 数据库文件不存在：$DB_FILE"
    exit 1
fi

# 执行备份
cp "$DB_FILE" "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    echo "✅ 备份成功：$BACKUP_FILE"
    
    # 清理 30 天前的备份
    find "$BACKUP_DIR" -name "assets_backup_*.db" -mtime +30 -delete
    echo "🧹 已清理 30 天前的旧备份"
else
    echo "❌ 备份失败"
    exit 1
fi
