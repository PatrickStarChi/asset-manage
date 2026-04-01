#!/bin/bash
# 资产管理系统一键启动脚本

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "======================================"
echo "   资产管理系统 - 一键启动"
echo "======================================"

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}错误：未找到 Node.js，请先安装 Node.js >= 18.0.0${NC}"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}错误：Node.js 版本过低 (v$NODE_VERSION)，请升级到 >= 18.0.0${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Node.js 版本检查通过 (v$(node -v))${NC}"

# 创建必要目录
mkdir -p backups logs uploads

# 安装依赖
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}正在安装依赖...${NC}"
    npm install
    if [ $? -ne 0 ]; then
        echo -e "${RED}依赖安装失败${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ 依赖安装完成${NC}"
fi

# 初始化数据库
if [ ! -f "assets.db" ]; then
    echo -e "${YELLOW}正在初始化数据库...${NC}"
fi

# 启动服务
echo -e "${GREEN}正在启动服务...${NC}"
echo "访问地址：http://localhost:3001"
echo "默认账号：admin / admin123"
echo ""
echo -e "${YELLOW}按 Ctrl+C 停止服务${NC}"
echo "======================================"

# 启动服务器
exec node server.js
