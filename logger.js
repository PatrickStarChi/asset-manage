const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(__dirname, '..', 'logs');
const LOG_FILE = path.join(LOG_DIR, 'operations.log');

// 确保日志目录存在
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// 操作日志级别
const LogLevel = {
  INFO: 'INFO',
  WARNING: 'WARNING',
  ERROR: 'ERROR'
};

/**
 * 记录操作日志
 * @param {string} action - 操作类型 (如：CREATE_ASSET, UPDATE_ASSET, DELETE_ASSET, STOCK_IN, STOCK_OUT)
 * @param {string} details - 操作详情
 * @param {string} user - 操作用户
 * @param {string} level - 日志级别
 */
function logOperation(action, details, user = 'system', level = LogLevel.INFO) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    action,
    details,
    user
  };
  
  const logLine = JSON.stringify(logEntry) + '\n';
  
  try {
    fs.appendFileSync(LOG_FILE, logLine);
    console.log(`📝 [${level}] ${action} - ${user}: ${details}`);
  } catch (err) {
    console.error('❌ 写入日志失败:', err);
  }
}

/**
 * 获取操作日志
 * @param {number} limit - 返回记录数限制
 * @param {string} action - 筛选操作类型
 * @param {string} user - 筛选用户
 * @returns {Array} 日志记录数组
 */
function getOperations(limit = 100, action = null, user = null) {
  if (!fs.existsSync(LOG_FILE)) {
    return [];
  }
  
  try {
    const content = fs.readFileSync(LOG_FILE, 'utf8');
    const lines = content.trim().split('\n').filter(line => line);
    const logs = lines.map(line => JSON.parse(line)).reverse();
    
    let filtered = logs;
    if (action) {
      filtered = filtered.filter(log => log.action === action);
    }
    if (user) {
      filtered = filtered.filter(log => log.user === user);
    }
    
    return filtered.slice(0, limit);
  } catch (err) {
    console.error('❌ 读取日志失败:', err);
    return [];
  }
}

/**
 * 清理旧日志 (保留最近 30 天)
 */
function cleanupOldLogs(days = 30) {
  if (!fs.existsSync(LOG_FILE)) {
    return;
  }
  
  try {
    const content = fs.readFileSync(LOG_FILE, 'utf8');
    const lines = content.trim().split('\n').filter(line => line);
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    const filteredLines = lines.filter(line => {
      try {
        const log = JSON.parse(line);
        const logDate = new Date(log.timestamp);
        return logDate >= cutoffDate;
      } catch {
        return false;
      }
    });
    
    fs.writeFileSync(LOG_FILE, filteredLines.join('\n') + '\n');
    console.log(`🧹 已清理${days}天前的操作日志`);
  } catch (err) {
    console.error('❌ 清理日志失败:', err);
  }
}

module.exports = {
  logOperation,
  getOperations,
  cleanupOldLogs,
  LogLevel
};
