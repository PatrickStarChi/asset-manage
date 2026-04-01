#!/bin/bash

# 资产管理系统一键启动脚本
# 用法：./start.sh [start|stop|restart|status|backup]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

PORT=${PORT:-3001}
PID_FILE="$SCRIPT_DIR/app.pid"
LOG_FILE="$SCRIPT_DIR/logs/app.log"

# 确保目录存在
mkdir -p "$SCRIPT_DIR/logs"
mkdir -p "$SCRIPT_DIR/db"
mkdir -p "$SCRIPT_DIR/backups"
mkdir -p "$SCRIPT_DIR/uploads"

# 安装依赖
install_deps() {
    echo "📦 检查并安装依赖..."
    if [ ! -d "node_modules" ]; then
        npm install
    fi
}

# 启动服务
start() {
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if ps -p $PID > /dev/null 2>&1; then
            echo "⚠️  服务已在运行 (PID: $PID)"
            return 1
        fi
    fi
    
    install_deps
    
    echo "🚀 启动资产管理系统 (端口：$PORT)..."
    nohup node app.js > "$LOG_FILE" 2>&1 &
    echo $! > "$PID_FILE"
    
    sleep 2
    
    if ps -p $(cat "$PID_FILE") > /dev/null 2>&1; then
        echo "✅ 服务已启动 (PID: $(cat $PID_FILE))"
        echo "📍 访问地址：http://localhost:$PORT"
    else
        echo "❌ 服务启动失败，请查看日志：$LOG_FILE"
        return 1
    fi
}

# 停止服务
stop() {
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if ps -p $PID > /dev/null 2>&1; then
            echo "🛑 停止服务 (PID: $PID)..."
            kill $PID
            sleep 2
            if ps -p $PID > /dev/null 2>&1; then
                kill -9 $PID
            fi
            rm -f "$PID_FILE"
            echo "✅ 服务已停止"
        else
            echo "⚠️  服务未运行"
            rm -f "$PID_FILE"
        fi
    else
        PID=$(lsof -t -i:$PORT 2>/dev/null)
        if [ -n "$PID" ]; then
            echo "🛑 停止服务 (PID: $PID)..."
            kill -9 $PID 2>/dev/null
            echo "✅ 服务已停止"
        else
            echo "⚠️  服务未运行"
        fi
    fi
}

# 重启服务
restart() {
    stop
    sleep 1
    start
}

# 查看状态
status() {
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if ps -p $PID > /dev/null 2>&1; then
            echo "✅ 服务运行中 (PID: $PID, 端口：$PORT)"
            return 0
        fi
    fi
    
    PID=$(lsof -t -i:$PORT 2>/dev/null)
    if [ -n "$PID" ]; then
        echo "✅ 服务运行中 (PID: $PID, 端口：$PORT)"
        return 0
    fi
    
    echo "❌ 服务未运行"
    return 1
}

# 备份数据库
backup() {
    BACKUP_DIR="$SCRIPT_DIR/backups"
    mkdir -p "$BACKUP_DIR"
    
    if [ -f "$SCRIPT_DIR/db/assets.db" ]; then
        TIMESTAMP=$(date +%Y%m%d_%H%M%S)
        cp "$SCRIPT_DIR/db/assets.db" "$BACKUP_DIR/assets_$TIMESTAMP.db"
        echo "✅ 数据库已备份：$BACKUP_DIR/assets_$TIMESTAMP.db"
    else
        echo "⚠️  数据库文件不存在"
    fi
}

case "$1" in
    start)
        start
        ;;
    stop)
        stop
        ;;
    restart)
        restart
        ;;
    status)
        status
        ;;
    backup)
        backup
        ;;
    *)
        echo "用法：$0 {start|stop|restart|status|backup}"
        echo ""
        echo "命令说明:"
        echo "  start   - 启动服务"
        echo "  stop    - 停止服务"
        echo "  restart - 重启服务"
        echo "  status  - 查看服务状态"
        echo "  backup  - 备份数据库"
        exit 1
        ;;
esac
