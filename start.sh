#!/bin/bash

# 资产管理系统启动脚本

echo "🚀 启动资产管理系统..."

# 检查依赖
if [ ! -d "node_modules" ]; then
    echo "📦 安装依赖..."
    npm install
fi

# 启动服务
echo "✅ 服务启动在 http://localhost:3001"
node server.js
