#!/bin/bash

# 资产管理系统一键启动脚本

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "╔════════════════════════════════════════╗"
echo "║     📦 资产管理系统                   ║"
echo "║     一键启动脚本                      ║"
echo "╚════════════════════════════════════════╝"
echo ""

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 错误：未找到 Node.js，请先安装 Node.js v14+"
    exit 1
fi

echo "✅ Node.js 版本：$(node -v)"

# 检查依赖
if [ ! -d "node_modules" ]; then
    echo "📦 首次启动，安装依赖..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ 依赖安装失败"
        exit 1
    fi
fi

# 创建必要目录
mkdir -p logs backups db uploads

echo ""
echo "✅ 服务启动在 http://localhost:3001"
echo "📝 日志目录：$SCRIPT_DIR/logs"
echo "💾 备份目录：$SCRIPT_DIR/backups"
echo ""
echo "按 Ctrl+C 停止服务"
echo "─────────────────────────────────────"

# 启动服务
node server.js
