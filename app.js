const express = require('express');
const initSqlJs = require('sql.js');
const QRCode = require('qrcode');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3001;

// 目录配置
const baseDir = __dirname;
const dbPath = path.join(baseDir, 'db', 'assets.db');
const logDir = path.join(baseDir, 'logs');
const backupDir = path.join(baseDir, 'backups');
const uploadDir = path.join(baseDir, 'uploads');

// 确保目录存在
[logDir, backupDir, uploadDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// 中间件
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// 全局数据库对象
let db = null;

// ==================== 日志功能 ====================

function logOperation(type, user, details) {
  const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
  const logLine = `[${timestamp}] ${type} - ${user || 'system'} - ${details}\n`;
  const logFile = path.join(logDir, 'operations.log');
  fs.appendFileSync(logFile, logLine);
  console.log(`📝 ${logLine.trim()}`);
}

// ==================== 数据库功能 ====================

function saveDb() {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);
}

async function initDatabase() {
  const SQL = await initSqlJs();
  
  try {
    if (fs.existsSync(dbPath)) {
      const fileBuffer = fs.readFileSync(dbPath);
      db = new SQL.Database(fileBuffer);
      console.log('📍 已加载现有数据库');
    } else {
      db = new SQL.Database();
      console.log('📍 创建新数据库');
    }
  } catch (e) {
    db = new SQL.Database();
  }
  
  // 创建资产表
  db.run(`
    CREATE TABLE IF NOT EXISTS assets (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      quantity INTEGER DEFAULT 0,
      min_quantity INTEGER DEFAULT 5,
      unit TEXT DEFAULT '个',
      location TEXT,
      description TEXT,
      qr_code TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // 创建分类表
  db.run(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      color TEXT DEFAULT '#3b82f6'
    )
  `);
  
  // 创建领用记录表
  db.run(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      asset_id TEXT NOT NULL,
      type TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      person_name TEXT NOT NULL,
      room_number TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (asset_id) REFERENCES assets(id)
    )
  `);
  
  // 插入默认分类
  const defaultCategories = [
    { name: '文具用品', color: '#3b82f6' },
    { name: '办公设备', color: '#10b981' },
    { name: '耗材配件', color: '#f59e0b' },
    { name: '办公家具', color: '#8b5cf6' },
    { name: '其他', color: '#6b7280' }
  ];
  
  defaultCategories.forEach(cat => {
    try {
      db.run('INSERT OR IGNORE INTO categories (name, color) VALUES (?, ?)', [cat.name, cat.color]);
    } catch (e) {}
  });
  
  saveDb();
  logOperation('SYSTEM', 'init', '数据库初始化完成');
  console.log('✅ 数据库初始化完成！');
}

// 辅助函数
function queryAll(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

function queryOne(sql, params = []) {
  const results = queryAll(sql, params);
  return results.length > 0 ? results[0] : null;
}

function run(sql, params = []) {
  db.run(sql, params);
  saveDb();
  return { lastInsertRowid: db.exec("SELECT last_insert_rowid()")[0]?.values[0]?.[0] };
}

// ==================== API 路由 ====================

// 获取所有资产
app.get('/api/assets', (req, res) => {
  const { sort = 'created_at', order = 'DESC' } = req.query;
  const validSorts = ['id', 'name', 'category', 'quantity', 'created_at', 'updated_at'];
  const sortField = validSorts.includes(sort) ? sort : 'created_at';
  const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
  
  const assets = queryAll(`SELECT * FROM assets ORDER BY ${sortField} ${sortOrder}`);
  res.json(assets);
  logOperation('READ', 'api', `获取资产列表 (sort=${sort}, order=${order})`);
});

// 获取单个资产
app.get('/api/assets/:id', (req, res) => {
  const asset = queryOne('SELECT * FROM assets WHERE id = ?', [req.params.id]);
  if (!asset) return res.status(404).json({ error: '资产不存在' });
  res.json(asset);
});

// 创建资产
app.post('/api/assets', async (req, res) => {
  try {
    const { name, category, quantity, unit, location, description, min_quantity } = req.body;
    const id = uuidv4();
    
    run(`
      INSERT INTO assets (id, name, category, quantity, unit, location, description, min_quantity)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [id, name, category, quantity, unit, location, description || '', min_quantity || 5]);
    
    const qrData = JSON.stringify({ id, name, type: 'asset' });
    const qrCode = await QRCode.toDataURL(qrData);
    
    run('UPDATE assets SET qr_code = ? WHERE id = ?', [qrCode, id]);
    
    const asset = queryOne('SELECT * FROM assets WHERE id = ?', [id]);
    res.json({ success: true, asset });
    logOperation('CREATE', 'api', `创建资产：${name} (${id})`);
  } catch (error) {
    console.error('创建资产失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// 更新资产
app.put('/api/assets/:id', (req, res) => {
  const { name, category, quantity, unit, location, description, min_quantity } = req.body;
  
  run(`
    UPDATE assets 
    SET name = ?, category = ?, quantity = ?, unit = ?, location = ?, description = ?, min_quantity = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `, [name, category, quantity, unit, location, description, min_quantity, req.params.id]);
  
  const asset = queryOne('SELECT * FROM assets WHERE id = ?', [req.params.id]);
  res.json({ success: true, asset });
  logOperation('UPDATE', 'api', `更新资产：${name} (${req.params.id})`);
});

// 删除资产
app.delete('/api/assets/:id', (req, res) => {
  const asset = queryOne('SELECT name FROM assets WHERE id = ?', [req.params.id]);
  run('DELETE FROM assets WHERE id = ?', [req.params.id]);
  res.json({ success: true });
  logOperation('DELETE', 'api', `删除资产：${asset?.name || req.params.id}`);
});

// 资产领用/归还（兼容旧版字段）
app.post('/api/transactions', (req, res) => {
  // 兼容两种字段名
  const { asset_id, type, quantity, person_name, operator, room_number, location, notes, remark } = req.body;
  
  const finalPersonName = person_name || operator;
  const finalRoomNumber = room_number || location || '';
  const finalNotes = notes || remark || '领用';
  
  if (!asset_id || !quantity || !finalPersonName) {
    return res.status(400).json({ error: '缺少必填字段：资产 ID、数量、领用人' });
  }
  
  const asset = queryOne('SELECT * FROM assets WHERE id = ?', [asset_id]);
  if (!asset) return res.status(404).json({ error: '资产不存在' });
  
  const finalType = type || 'out';
  
  if (finalType === 'out' && asset.quantity < quantity) {
    return res.status(400).json({ error: '库存不足' });
  }
  
  const newQuantity = finalType === 'out' ? asset.quantity - quantity : asset.quantity + quantity;
  
  run(`
    INSERT INTO transactions (asset_id, type, quantity, person_name, room_number, notes)
    VALUES (?, ?, ?, ?, ?, ?)
  `, [asset_id, finalType, quantity, finalPersonName, finalRoomNumber, finalNotes]);
  
  run('UPDATE assets SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [newQuantity, asset_id]);
  
  const action = finalType === 'out' ? '领用' : '归还';
  res.json({ success: true, newQuantity, asset_name: asset.name });
  logOperation('TRANSACTION', 'api', `${action}资产：${asset.name} x${quantity} (领用人：${finalPersonName})`);
});

// 领用 API（简化版）
app.post('/api/transactions/out', (req, res) => {
  req.body.type = 'out';
  // 调用主处理函数
  const originalSend = res.send;
  res.send = function(data) {
    return originalSend.call(this, data);
  };
  // 重新调用
  const { asset_id, quantity, operator, location, remark, asset_name } = req.body;
  req.body.person_name = operator;
  req.body.room_number = location;
  req.body.notes = remark || '领用';
  
  // 直接处理
  const asset = queryOne('SELECT * FROM assets WHERE id = ?', [asset_id]);
  if (!asset) return res.status(404).json({ error: '资产不存在' });
  
  if (asset.quantity < quantity) {
    return res.status(400).json({ error: '库存不足' });
  }
  
  const newQuantity = asset.quantity - quantity;
  
  run(`
    INSERT INTO transactions (asset_id, type, quantity, person_name, room_number, notes)
    VALUES (?, 'out', ?, ?, ?, ?)
  `, [asset_id, quantity, operator, location || '', remark || '领用']);
  
  run('UPDATE assets SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [newQuantity, asset_id]);
  
  res.json({ success: true, newQuantity, asset_name: asset.name || asset_name });
  logOperation('TRANSACTION', 'api', `领用资产：${asset.name} x${quantity} (领用人：${operator})`);
});

// 获取资产二维码
app.get('/api/assets/:id/qrcode', (req, res) => {
  const asset = queryOne('SELECT * FROM assets WHERE id = ?', [req.params.id]);
  if (!asset) return res.status(404).json({ error: '资产不存在' });
  
  let qrCode = asset.qr_code;
  
  // 如果没有二维码，生成一个
  if (!qrCode) {
    const qrData = JSON.stringify({ id: asset.id, name: asset.name, type: 'asset' });
    QRCode.toDataURL(qrData, (err, url) => {
      if (err) return res.status(500).json({ error: '生成二维码失败' });
      
      run('UPDATE assets SET qr_code = ? WHERE id = ?', [url, asset.id]);
      saveDb();
      
      const filename = `${asset.name.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_')}-二维码.png`;
      res.json({ qrCode: url, download: { filename } });
    });
  } else {
    const filename = `${asset.name.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_')}-二维码.png`;
    res.json({ qrCode: qrCode, download: { filename } });
  }
});

// 获取交易记录
app.get('/api/transactions', (req, res) => {
  const { asset_id, limit = 100 } = req.query;
  
  let query = `
    SELECT t.*, a.name as asset_name, a.category 
    FROM transactions t 
    JOIN assets a ON t.asset_id = a.id 
  `;
  
  const params = [];
  if (asset_id) {
    query += ' WHERE t.asset_id = ?';
    params.push(asset_id);
  }
  query += ' ORDER BY t.created_at DESC LIMIT ?';
  params.push(parseInt(limit));
  
  const transactions = queryAll(query, params);
  res.json(transactions);
});

// 获取分类
app.get('/api/categories', (req, res) => {
  const categories = queryAll('SELECT * FROM categories ORDER BY name');
  res.json(categories);
});

// 获取统计数据
app.get('/api/stats', (req, res) => {
  const totalAssets = queryOne('SELECT COUNT(*) as count FROM assets').count;
  const totalItems = queryOne('SELECT SUM(quantity) as total FROM assets').total || 0;
  const lowStock = queryOne('SELECT COUNT(*) as count FROM assets WHERE quantity <= min_quantity').count;
  
  const categoryStats = queryAll(`
    SELECT category, COUNT(*) as count, SUM(quantity) as total 
    FROM assets 
    GROUP BY category
  `);
  
  res.json({ totalAssets, totalItems, lowStock, categoryStats });
});

// 搜索资产
app.get('/api/search', (req, res) => {
  const { q } = req.query;
  const assets = queryAll(`
    SELECT * FROM assets 
    WHERE name LIKE ? OR category LIKE ? OR location LIKE ?
    ORDER BY created_at DESC
  `, [`%${q}%`, `%${q}%`, `%${q}%`]);
  res.json(assets);
});

// ==================== 备份与恢复 API ====================

// 创建备份
app.post('/api/backups', (req, res) => {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    const backupFile = path.join(backupDir, `assets-${timestamp}.db`);
    
    // 导出并保存
    const data = db.export();
    fs.writeFileSync(backupFile, Buffer.from(data));
    
    // 压缩
    const { execSync } = require('child_process');
    execSync(`gzip "${backupFile}"`);
    
    const backupName = `assets-${timestamp}.db.gz`;
    res.json({ success: true, backup: backupName });
    logOperation('BACKUP', 'api', `创建备份：${backupName}`);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取备份列表
app.get('/api/backups', (req, res) => {
  try {
    const files = fs.readdirSync(backupDir)
      .filter(f => f.endsWith('.db.gz'))
      .map(f => {
        const stat = fs.statSync(path.join(backupDir, f));
        return {
          name: f,
          size: stat.size,
          created: stat.mtime
        };
      })
      .sort((a, b) => b.created - a.created);
    
    res.json(files);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 恢复备份
app.post('/api/backups/:name/restore', (req, res) => {
  try {
    const backupName = req.params.name;
    const backupPath = path.join(backupDir, backupName);
    
    if (!fs.existsSync(backupPath)) {
      return res.status(404).json({ error: '备份文件不存在' });
    }
    
    // 先备份当前数据库
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    const preBackup = path.join(backupDir, `pre-restore-${timestamp}.db`);
    fs.writeFileSync(preBackup, Buffer.from(db.export()));
    require('child_process').execSync(`gzip "${preBackup}"`);
    
    // 解压并恢复
    require('child_process').execSync(`gunzip -c "${backupPath}" > "${dbPath}"`);
    
    // 重新加载数据库
    const SQL = require('sql.js');
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
    
    res.json({ success: true, message: '数据恢复成功' });
    logOperation('RESTORE', 'api', `恢复备份：${backupName}`);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取操作日志
app.get('/api/logs', (req, res) => {
  try {
    const { limit = 100 } = req.query;
    const logFile = path.join(logDir, 'operations.log');
    
    if (!fs.existsSync(logFile)) {
      return res.json([]);
    }
    
    const lines = fs.readFileSync(logFile, 'utf-8')
      .trim()
      .split('\n')
      .filter(l => l.trim())
      .slice(-parseInt(limit))
      .reverse();
    
    res.json(lines);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== 用户认证 API ====================

// 用户登录
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  
  // 简单验证（生产环境应使用数据库和加密密码）
  if (username === 'admin' && password === 'admin123') {
    const token = 'asset-manage-token-' + Date.now();
    const user = { username: 'admin', role: 'admin' };
    
    // 保存 token 到内存（简化版，生产环境应使用数据库）
    if (!global.tokens) global.tokens = {};
    global.tokens[token] = { user, expires: Date.now() + 24 * 60 * 60 * 1000 };
    
    logOperation('LOGIN', 'api', `用户 ${username} 登录成功`);
    res.json({ success: true, token, user });
  } else {
    logOperation('LOGIN_FAILED', 'api', `用户 ${username} 登录失败`);
    res.status(401).json({ error: '用户名或密码错误' });
  }
});

// 验证 token
app.get('/api/auth/me', (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.replace('Bearer ', '');
  
  if (!token || !global.tokens || !global.tokens[token]) {
    return res.status(401).json({ error: '未授权' });
  }
  
  const tokenData = global.tokens[token];
  if (Date.now() > tokenData.expires) {
    delete global.tokens[token];
    return res.status(401).json({ error: 'Token 已过期' });
  }
  
  res.json({ success: true, user: tokenData.user });
});

// 用户登出
app.post('/api/auth/logout', (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.replace('Bearer ', '');
  
  if (token && global.tokens && global.tokens[token]) {
    delete global.tokens[token];
  }
  
  res.json({ success: true });
});

// ==================== Excel 导入 API ====================

app.post('/api/import/stock-by-id', (req, res) => {
  const { items } = req.body;
  
  if (!items || !Array.isArray(items)) {
    return res.status(400).json({ error: '无效的数据格式' });
  }
  
  const results = [];
  
  items.forEach(item => {
    try {
      const { id, name, category, quantity, unit, location, remark } = item;
      
      // 如果没有 ID，生成新 ID
      const assetId = id || uuidv4();
      
      // 检查资产是否存在
      let stmt = db.prepare('SELECT * FROM assets WHERE id = ?');
      stmt.bind([assetId]);
      let exists = stmt.step();
      stmt.free();
      
      if (exists) {
        // 更新现有资产
        db.run(`
          UPDATE assets 
          SET quantity = quantity + ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [quantity, assetId]);
        
        stmt = db.prepare('SELECT quantity FROM assets WHERE id = ?');
        stmt.bind([assetId]);
        const newQuantity = stmt.step() ? stmt.get()[0] : quantity;
        stmt.free();
        
        results.push({
          status: 'success',
          type: 'update',
          name,
          oldQuantity: newQuantity - quantity,
          newQuantity,
          quantity
        });
      } else {
        // 创建新资产
        db.run(`
          INSERT INTO assets (id, name, category, quantity, unit, location, description)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [assetId, name, category || '其他', quantity, unit || '个', location || '', remark || '']);
        
        results.push({
          status: 'success',
          type: 'create',
          name,
          newQuantity: quantity,
          quantity,
          category: category || '其他'
        });
      }
      
      saveDb();
    } catch (error) {
      results.push({
        status: 'error',
        name: item.name || '未知',
        error: error.message
      });
    }
  });
  
  res.json({ results });
});

// ==================== 页面路由 ====================

app.get('/', (req, res) => {
  res.sendFile(path.join(baseDir, 'public', 'index.html'));
});

// 启动服务器
async function start() {
  await initDatabase();
  app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════╗
║     📦 资产管理系统已启动              ║
║     访问地址：http://localhost:${PORT}      ║
╚════════════════════════════════════════╝
    `);
    logOperation('SYSTEM', 'startup', `服务启动于端口 ${PORT}`);
  });
}

start();
