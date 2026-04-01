#!/bin/bash

# 配置定时备份任务（每天凌晨 2 点执行）

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# 创建 crontab 配置
CRON_JOB="0 2 * * * cd $PROJECT_DIR && node scripts/backup.js backup >> $PROJECT_DIR/logs/backup.log 2>&1"

# 检查是否已存在
if crontab -l 2>/dev/null | grep -q "asset-manage.*backup"; then
    echo "⚠️  定时备份任务已存在"
else
    # 添加定时任务
    (crontab -l 2>/dev/null | grep -v "asset-manage.*backup"; echo "$CRON_JOB") | crontab -
    echo "✅ 定时备份任务已添加：每天凌晨 2 点执行"
fi

# 显示当前 crontab
echo ""
echo "当前 crontab 配置："
crontab -l 2>/dev/null | grep -E "(asset-manage|^#)" || echo "无相关配置"
