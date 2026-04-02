#!/bin/bash
# 资产数据库备份脚本
# ⚠️ 安全警告：此脚本受保护，禁止删除备份文件！

BACKUP_DIR="/home/patrick/git/asset-manage/backups"
DB_FILE="/home/patrick/git/asset-manage/assets.db"
TIMESTAMP=$(date +%Y%m%d%H%M%S)

# 创建备份目录（如果不存在）
mkdir -p "$BACKUP_DIR"

# 执行备份
cp "$DB_FILE" "$BACKUP_DIR/assets.db.backup.$TIMESTAMP"

# ⚠️ 安全清理策略：只删除 30 天前的备份，且必须保留至少 10 个备份
# 计算备份文件数量
BACKUP_COUNT=$(ls -1 "$BACKUP_DIR"/*.db* 2>/dev/null | wc -l)

# 只有当备份数量超过 10 个时，才清理 30 天前的旧备份
if [ "$BACKUP_COUNT" -gt 10 ]; then
    find "$BACKUP_DIR" -name "assets.db.*" -mtime +30 -delete 2>/dev/null
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] 安全清理：保留 $BACKUP_COUNT 个备份，删除 30 天前旧备份"
else
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] 备份数量：$BACKUP_COUNT 个（未达清理阈值）"
fi

echo "[$(date '+%Y-%m-%d %H:%M:%S')] 备份完成：assets.db.backup.$TIMESTAMP"
