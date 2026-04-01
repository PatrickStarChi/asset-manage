const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const baseDir = path.join(__dirname, '..');
const dbPath = path.join(baseDir, 'db', 'assets.db');

// 确保目录存在
const dbDir = path.join(baseDir, 'db');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

async function initDatabase() {
  const SQL = await initSqlJs();
  
  let db;
  if (fs.existsSync(dbPath)) {
    console.log('⚠️  数据库已存在，将重新初始化');
    fs.unlinkSync(dbPath);
  }
  
  db = new SQL.Database();
  
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
    db.run('INSERT INTO categories (name, color) VALUES (?, ?)', [cat.name, cat.color]);
  });
  
  // 保存数据库
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);
  
  console.log('✅ 数据库初始化完成！');
  console.log(`📍 数据库位置：${dbPath}`);
  
  db.close();
}

initDatabase().catch(console.error);
