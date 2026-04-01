#!/bin/bash
# 资产管理系统数据恢复脚本

set -e

if [ $# -eq 0 ]; then
    echo "用法: ./scripts/restore.sh <备份文件路径>"
    echo "示例: ./scripts/restore.sh backups/backup_20260401_112345.db"
    exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ 错误: 备份文件不存在: $BACKUP_FILE"
    exit 1
fi

echo "⚠️  警告: 此操作将覆盖当前数据库!"
echo "当前数据库: assets.db"
echo "恢复自备份: $BACKUP_FILE"
read -p "是否继续? (y/N): " -n 1 -r
echo

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ 操作已取消"
    exit 1
fi

# 创建当前数据库的备份
DATE=$(date +%Y%m%d_%H%M%S)
cp assets.db "assets.db.before_restore_$DATE"

echo "💾 已创建恢复前备份: assets.db.before_restore_$DATE"

# 执行恢复
cp "$BACKUP_FILE" assets.db

echo "✅ 数据恢复成功!"
echo "新数据库: assets.db"
echo "恢复前备份: assets.db.before_restore_$DATE"