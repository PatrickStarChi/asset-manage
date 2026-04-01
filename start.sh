#!/bin/bash
# 资产管理系统一键启动脚本

echo "🚀 启动资产管理系统..."

# 检查 Node.js 是否安装
if ! command -v node &> /dev/null; then
    echo "❌ 错误: Node.js 未安装"
    echo "请先安装 Node.js (https://nodejs.org/)"
    exit 1
fi

# 检查 npm 依赖是否已安装
if [ ! -d "node_modules" ]; then
    echo "📦 安装依赖包..."
    npm install
fi

# 创建必要的目录
mkdir -p backups logs

# 启动服务
echo "📡 启动服务器 (端口 3001)..."
echo "🌐 访问地址: http://localhost:3001"
echo "👤 默认账号: admin / admin123"
echo ""
echo "按 Ctrl+C 停止服务"

# 运行服务器
node server.js