#!/usr/bin/env node

/**
 * 每日自动备份脚本
 * 用法：node scripts/daily-backup.js
 * 
 * 建议配置 crontab:
 * 0 2 * * * cd /home/patrick/git/asset-manage && /usr/bin/node scripts/daily-backup.js >> logs/daily-backup.log 2>&1
 */

const path = require('path');
const fs = require('fs');

const BACKUP_DIR = path.join(__dirname, '..', 'backups');
const DB_DIR = path.join(__dirname, '..', 'db');
const DB_FILE = path.join(DB_DIR, 'assets.db');
const LOG_FILE = path.join(__dirname, '..', 'logs', 'daily-backup.log');

// 确保目录存在
if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
if (!fs.existsSync(path.join(__dirname, '..', 'logs'))) fs.mkdirSync(path.join(__dirname, '..', 'logs'), { recursive: true });

function log(message) {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${message}\n`;
  console.log(line.trim());
  fs.appendFileSync(LOG_FILE, line);
}

function backup() {
  log('开始每日备份...');
  
  if (!fs.existsSync(DB_FILE)) {
    log('❌ 数据库文件不存在，跳过备份');
    return;
  }
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.join(BACKUP_DIR, `assets_daily_${timestamp}.db`);
  
  try {
    fs.copyFileSync(DB_FILE, backupFile);
    log(`✅ 备份成功：${backupFile}`);
    
    // 清理 30 天前的备份
    cleanup();
    
  } catch (error) {
    log(`❌ 备份失败：${error.message}`);
  }
}

function cleanup() {
  log('清理旧备份...');
  
  const files = fs.readdirSync(BACKUP_DIR)
    .filter(f => f.startsWith('assets_daily_') && f.endsWith('.db'))
    .map(f => ({
      name: f,
      path: path.join(BACKUP_DIR, f),
      time: fs.statSync(path.join(BACKUP_DIR, f)).mtime.getTime()
    }))
    .sort((a, b) => b.time - a.time);
  
  const keepCount = 30;
  const toDelete = files.slice(keepCount);
  
  let deleted = 0;
  for (const file of toDelete) {
    try {
      fs.unlinkSync(file.path);
      log(`  删除：${file.name}`);
      deleted++;
    } catch (error) {
      log(`  删除失败 ${file.name}: ${error.message}`);
    }
  }
  
  if (deleted === 0) {
    log('  无需清理');
  } else {
    log(`✅ 清理完成，删除 ${deleted} 个旧备份`);
  }
}

// 执行备份
backup();
