const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(__dirname, 'logs');
const LOG_FILE = path.join(LOG_DIR, 'operations.log');

// 确保日志目录存在
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// 操作日志级别
const LogLevel = {
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR',
  DEBUG: 'DEBUG'
};

// 写入日志
function log(message, level = LogLevel.INFO, details = null) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    message,
    details
  };
  
  const logLine = `[${timestamp}] [${level}] ${message}${details ? ' | ' + JSON.stringify(details) : ''}\n`;
  
  fs.appendFileSync(LOG_FILE, logLine);
  console.log(logLine.trim());
}

// 获取操作日志
function getLogs(options = {}) {
  const { limit = 100, level = null, startDate = null, endDate = null } = options;
  
  if (!fs.existsSync(LOG_FILE)) {
    return [];
  }
  
  const content = fs.readFileSync(LOG_FILE, 'utf8');
  const lines = content.trim().split('\n').filter(line => line.trim());
  const logs = [];
  
  for (const line of lines) {
    try {
      // 解析日志行格式：[timestamp] [level] message | details
      const match = line.match(/^\[([^\]]+)\] \[([^\]]+)\] ([^|]+)(?:\| (.+))?$/);
      if (match) {
        const [, timestamp, level, message, detailsStr] = match;
        
        // 过滤
        if (level && level !== match[2]) continue;
        if (startDate && timestamp < startDate) continue;
        if (endDate && timestamp > endDate) continue;
        
        logs.push({
          timestamp,
          level,
          message: message.trim(),
          details: detailsStr ? JSON.parse(detailsStr) : null
        });
      }
    } catch (e) {
      // 跳过无法解析的行
    }
    
    if (logs.length >= limit) break;
  }
  
  return logs.reverse(); // 最新的在前
}

// 清空日志
function clearLogs() {
  if (fs.existsSync(LOG_FILE)) {
    fs.writeFileSync(LOG_FILE, '');
    log('日志已清空', LogLevel.INFO);
  }
}

module.exports = {
  log,
  getLogs,
  clearLogs,
  LogLevel
};
