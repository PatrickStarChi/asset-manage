#!/bin/bash
# 资产管理系统数据恢复脚本

BACKUP_DIR="$(dirname "$(dirname "$0")")/backups"
DB_FILE="$(dirname "$(dirname "$0")")/assets.db"

echo "可用的备份文件："
ls -lh "$BACKUP_DIR"/assets_backup_*.db 2>/dev/null || echo "未找到备份文件"

if [ -z "$1" ]; then
    echo "用法：$0 <备份文件名>"
    echo "示例：$0 assets_backup_20260401_120000.db"
    exit 1
fi

BACKUP_FILE="$BACKUP_DIR/$1"

if [ ! -f "$BACKUP_FILE" ]; then
    echo "错误：备份文件不存在：$BACKUP_FILE"
    exit 1
fi

# 备份当前数据库
if [ -f "$DB_FILE" ]; then
    cp "$DB_FILE" "$DB_FILE.before_restore"
    echo "已备份当前数据库为：assets.db.before_restore"
fi

# 恢复数据
cp "$BACKUP_FILE" "$DB_FILE"
echo "数据已恢复自：$1"
echo "恢复时间：$(date)"
