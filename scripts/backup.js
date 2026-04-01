#!/usr/bin/env node

/**
 * 数据库备份脚本
 * 用法：node scripts/backup.js [backup|restore] [backup-file]
 */

const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'db', 'assets.db');
const BACKUP_DIR = path.join(__dirname, '..', 'backups');

// 确保备份目录存在
if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

// 备份数据库
function backup() {
    if (!fs.existsSync(DB_PATH)) {
        console.log('❌ 数据库文件不存在');
        return false;
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(BACKUP_DIR, `assets-${timestamp}.db`);
    
    fs.copyFileSync(DB_PATH, backupFile);
    console.log(`✅ 备份完成：${backupFile}`);
    
    // 清理 30 天前的备份
    const now = Date.now();
    const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 天
    
    fs.readdirSync(BACKUP_DIR).forEach(file => {
        if (file.endsWith('.db')) {
            const filePath = path.join(BACKUP_DIR, file);
            const stat = fs.statSync(filePath);
            if (now - stat.mtimeMs > maxAge) {
                fs.unlinkSync(filePath);
                console.log(`🗑️ 清理旧备份：${file}`);
            }
        }
    });
    
    return true;
}

// 恢复数据库
function restore(backupFile) {
    if (!backupFile) {
        // 列出可用备份
        const backups = fs.readdirSync(BACKUP_DIR)
            .filter(f => f.endsWith('.db'))
            .sort()
            .reverse();
        
        if (backups.length === 0) {
            console.log('❌ 没有可用的备份文件');
            return false;
        }
        
        console.log('可用备份：');
        backups.forEach((f, i) => console.log(`  ${i + 1}. ${f}`));
        return true;
    }
    
    let restorePath = backupFile;
    if (!path.isAbsolute(backupFile)) {
        restorePath = path.join(BACKUP_DIR, backupFile);
    }
    
    if (!fs.existsSync(restorePath)) {
        console.log(`❌ 备份文件不存在：${restorePath}`);
        return false;
    }
    
    // 先备份当前数据库
    if (fs.existsSync(DB_PATH)) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const preRestoreBackup = path.join(BACKUP_DIR, `pre-restore-${timestamp}.db`);
        fs.copyFileSync(DB_PATH, preRestoreBackup);
        console.log(`📦 已保存恢复前备份：${preRestoreBackup}`);
    }
    
    fs.copyFileSync(restorePath, DB_PATH);
    console.log(`✅ 恢复完成：${restorePath}`);
    return true;
}

// 列出备份
function listBackups() {
    const backups = fs.readdirSync(BACKUP_DIR)
        .filter(f => f.endsWith('.db'))
        .sort()
        .reverse();
    
    if (backups.length === 0) {
        console.log('暂无备份');
        return;
    }
    
    console.log('可用备份：');
    backups.forEach(f => {
        const filePath = path.join(BACKUP_DIR, f);
        const stat = fs.statSync(filePath);
        const size = (stat.size / 1024).toFixed(2);
        console.log(`  📦 ${f} (${size} KB) - ${stat.mtime.toLocaleString('zh-CN')}`);
    });
}

// 主程序
const command = process.argv[2];
const arg = process.argv[3];

switch (command) {
    case 'backup':
        backup();
        break;
    case 'restore':
        restore(arg);
        break;
    case 'list':
    default:
        listBackups();
        break;
}
