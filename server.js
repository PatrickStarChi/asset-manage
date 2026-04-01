const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { initDatabase } = require('./database');
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const ExcelJS = require('exceljs');
const { logOperation, getOperations, cleanupOldLogs, LogLevel } = require('./logger');

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'asset-management-secret-key-2026';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 认证中间件
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1] || req.query.token;
  
  if (!token) {
    res.status(401).json({ error: '请先登录' });
    return;
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: '登录已过期' });
  }
};

let db;

// Initialize database
initDatabase()
  .then((database) => {
    db = database;
    console.log('✅ 数据库初始化成功');
  })
  .catch((err) => {
    console.error('❌ 数据库初始化失败:', err);
    process.exit(1);
  });

// ============ 资产 API ============

// 获取所有资产
app.get('/api/assets', (req, res) => {
  const { category, search, sort, order } = req.query;
  let query = 'SELECT * FROM assets WHERE 1=1';
  const params = [];

  if (category) {
    query += ' AND category = ?';
    params.push(category);
  }

  if (search) {
    query += ' AND (name LIKE ? OR location LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  // 排序处理
  let orderBy = 'id DESC';
  if (sort === 'name') {
    orderBy = `name ${order === 'ASC' ? 'ASC' : 'DESC'}`;
  } else if (sort === 'quantity') {
    orderBy = `quantity ${order === 'ASC' ? 'ASC' : 'DESC'}`;
  } else if (sort === 'category') {
    orderBy = `category ${order === 'ASC' ? 'ASC' : 'DESC'}`;
  } else if (sort === 'id') {
    orderBy = `id ${order === 'ASC' ? 'ASC' : 'DESC'}`;
  }
  query += ` ORDER BY ${orderBy}`;

  db.all(query, params, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// 获取单个资产
app.get('/api/assets/:id', (req, res) => {
  db.get('SELECT * FROM assets WHERE id = ?', [req.params.id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!row) {
      res.status(404).json({ error: '资产不存在' });
      return;
    }
    res.json(row);
  });
});

// 创建资产
app.post('/api/assets', async (req, res) => {
  const { name, category, quantity, unit, location } = req.body;
  const qrCode = uuidv4();

  if (!name || !category) {
    res.status(400).json({ error: '名称和类别为必填项' });
    return;
  }

  db.run(
    `INSERT INTO assets (name, category, quantity, unit, location, qr_code) VALUES (?, ?, ?, ?, ?, ?)`,
    [name, category, quantity || 0, unit || '个', location || '', qrCode],
    function (err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }

      // 记录入库交易
      db.run(
        `INSERT INTO transactions (asset_id, asset_name, type, quantity, operator, remark) VALUES (?, ?, 'in', ?, '系统', '初始入库')`,
        [this.lastID, name, quantity || 0],
        (err) => {
          if (err) console.error('交易记录失败:', err);
        }
      );

      res.json({ id: this.lastID, qr_code: qrCode });
    }
  );
});

// 更新资产
app.put('/api/assets/:id', (req, res) => {
  const { name, category, quantity, unit, location } = req.body;
  const { id } = req.params;

  db.run(
    `UPDATE assets SET name = ?, category = ?, quantity = ?, unit = ?, location = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [name, category, quantity, unit, location, id],
    function (err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      if (this.changes === 0) {
        res.status(404).json({ error: '资产不存在' });
        return;
      }
      res.json({ success: true });
    }
  );
});

// 删除资产
app.delete('/api/assets/:id', (req, res) => {
  db.run('DELETE FROM assets WHERE id = ?', [req.params.id], function (err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (this.changes === 0) {
      res.status(404).json({ error: '资产不存在' });
      return;
    }
    res.json({ success: true });
  });
});

// 生成资产二维码
app.get('/api/assets/:id/qrcode', async (req, res) => {
  db.get('SELECT * FROM assets WHERE id = ?', [req.params.id], async (err, row) => {
    if (err || !row) {
      res.status(404).json({ error: '资产不存在' });
      return;
    }

    // 使用生产环境域名
    const baseUrl = 'https://assetmanage.patrickstar.top';
    const assetUrl = `${baseUrl}/asset/${row.id}`;
    try {
      const qrCodeImage = await QRCode.toDataURL(assetUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      });
      res.json({ qrCode: qrCodeImage, asset: row, url: assetUrl });
    } catch (err) {
      res.status(500).json({ error: '二维码生成失败' });
    }
  });
});

// ============ 交易 API ============

// 获取交易记录
app.get('/api/transactions', (req, res) => {
  const { asset_id, type, date_start, date_end } = req.query;
  let query = 'SELECT * FROM transactions WHERE 1=1';
  const params = [];

  if (asset_id) {
    query += ' AND asset_id = ?';
    params.push(asset_id);
  }

  if (type) {
    query += ' AND type = ?';
    params.push(type);
  }

  if (date_start) {
    query += ' AND date(created_at) >= ?';
    params.push(date_start);
  }

  if (date_end) {
    query += ' AND date(created_at) <= ?';
    params.push(date_end);
  }

  query += ' ORDER BY created_at DESC';

  db.all(query, params, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// 入库
app.post('/api/transactions/in', (req, res) => {
  const { asset_id, quantity, operator, location, remark } = req.body;

  if (!asset_id || !quantity || quantity <= 0) {
    res.status(400).json({ error: '请输入有效的数量' });
    return;
  }

  db.get('SELECT * FROM assets WHERE id = ?', [asset_id], (err, asset) => {
    if (err || !asset) {
      res.status(404).json({ error: '资产不存在' });
      return;
    }

    const newQuantity = asset.quantity + quantity;

    db.run('BEGIN TRANSACTION');

    db.run(
      `UPDATE assets SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [newQuantity, asset_id],
      function (err) {
        if (err) {
          db.run('ROLLBACK');
          res.status(500).json({ error: err.message });
          return;
        }

        db.run(
          `INSERT INTO transactions (asset_id, asset_name, type, quantity, operator, location, remark) VALUES (?, ?, 'in', ?, ?, ?, ?)`,
          [asset_id, asset.name, quantity, operator || '管理员', location || '', remark || ''],
          function (err) {
            if (err) {
              db.run('ROLLBACK');
              res.status(500).json({ error: err.message });
              return;
            }

            db.run('COMMIT');
            res.json({ success: true, newQuantity });
          }
        );
      }
    );
  });
});

// 出库
app.post('/api/transactions/out', (req, res) => {
  const { asset_id, quantity, operator, location, remark } = req.body;

  if (!asset_id || !quantity || quantity <= 0) {
    res.status(400).json({ error: '请输入有效的数量' });
    return;
  }

  db.get('SELECT * FROM assets WHERE id = ?', [asset_id], (err, asset) => {
    if (err || !asset) {
      res.status(404).json({ error: '资产不存在' });
      return;
    }

    if (asset.quantity < quantity) {
      res.status(400).json({ error: '库存不足' });
      return;
    }
    
    // 检查最低库存限制
    const minStock = asset.min_stock || 5;
    const remainingAfterOut = asset.quantity - quantity;
    if (remainingAfterOut < minStock) {
      res.status(400).json({ 
        error: `出库后库存 (${remainingAfterOut}) 将低于最低库存 (${minStock})`,
        available: asset.quantity - minStock,
        min_stock: minStock
      });
      return;
    }
    
    const newQuantity = asset.quantity - quantity;

    db.run('BEGIN TRANSACTION');

    db.run(
      `UPDATE assets SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [newQuantity, asset_id],
      function (err) {
        if (err) {
          db.run('ROLLBACK');
          res.status(500).json({ error: err.message });
          return;
        }

        db.run(
          `INSERT INTO transactions (asset_id, asset_name, type, quantity, operator, location, remark) VALUES (?, ?, 'out', ?, ?, ?, ?)`,
          [asset_id, asset.name, quantity, operator || '管理员', location || '', remark || ''],
          function (err) {
            if (err) {
              db.run('ROLLBACK');
              res.status(500).json({ error: err.message });
              return;
            }

            db.run('COMMIT');
            res.json({ success: true, newQuantity });
          }
        );
      }
    );
  });
});

// 扫码出库（通过二维码）
app.post('/api/scan-out', (req, res) => {
  const { qr_code, quantity, operator, remark } = req.body;

  if (!qr_code) {
    res.status(400).json({ error: '请扫描二维码' });
    return;
  }

  db.get('SELECT * FROM assets WHERE qr_code = ?', [qr_code], (err, asset) => {
    if (err || !asset) {
      res.status(404).json({ error: '资产不存在' });
      return;
    }

    req.body.asset_id = asset.id;
    // 递归调用出库 API
    const mockReq = { body: req.body };
    const mockRes = {
      status: (code) => ({ json: (data) => res.status(code).json(data) }),
      json: (data) => res.json(data)
    };
    module.exports.outHandler(mockReq, mockRes);
  });
});

// 导出出库处理函数供扫码使用
app.outHandler = (req, res) => {
  app.post('/api/transactions/out')(req, res);
};

// ============ 统计 API ============

// 获取统计数据
app.get('/api/stats', (req, res) => {
  const stats = {};

  // 总资产数量
  db.get('SELECT SUM(quantity) as total FROM assets', (err, row) => {
    stats.totalAssets = row?.total || 0;

    // 资产种类数
    db.get('SELECT COUNT(DISTINCT category) as count FROM assets', (err, row) => {
      stats.categoryCount = row?.count || 0;

      // 各类别资产统计
      db.all('SELECT category, SUM(quantity) as total, COUNT(*) as count FROM assets GROUP BY category', (err, rows) => {
        stats.byCategory = rows || [];

        // 本月入库统计
        db.get(
          `SELECT SUM(quantity) as total FROM transactions WHERE type = 'in' AND strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')`,
          (err, row) => {
            stats.monthIn = row?.total || 0;

            // 本月出库统计
            db.get(
              `SELECT SUM(quantity) as total FROM transactions WHERE type = 'out' AND strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')`,
              (err, row) => {
                stats.monthOut = row?.total || 0;

                // 库存预警（数量少于 5 的资产）
                db.all('SELECT id, name, quantity, category FROM assets WHERE quantity < 5', (err, rows) => {
                  stats.lowStock = rows || [];
                  res.json(stats);
                });
              }
            );
          }
        );
      });
    });
  });
});

// 获取分类列表
app.get('/api/categories', (req, res) => {
  db.all('SELECT * FROM categories ORDER BY name', (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// ============ 资产详情页面 ============
app.get('/asset/:id', (req, res) => {
  db.get('SELECT * FROM assets WHERE id = ?', [req.params.id], (err, row) => {
    if (err || !row) {
      res.status(404).send('资产不存在');
      return;
    }
    res.sendFile(path.join(__dirname, 'public', 'asset-detail.html'));
  });
});

app.get('/api/asset/:id', (req, res) => {
  db.get('SELECT * FROM assets WHERE id = ?', [req.params.id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!row) {
      res.status(404).json({ error: '资产不存在' });
      return;
    }
    res.json(row);
  });
});

// ============ 用户认证 API ============

// 用户登录
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    res.status(400).json({ error: '请输入用户名和密码' });
    return;
  }
  
  db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
    if (err || !user) {
      res.status(401).json({ error: '用户名或密码错误' });
      return;
    }
    
    const validPassword = bcrypt.compareSync(password, user.password);
    if (!validPassword) {
      res.status(401).json({ error: '用户名或密码错误' });
      return;
    }
    
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        department: user.department
      }
    });
  });
});

// 获取当前用户信息
app.get('/api/auth/me', authMiddleware, (req, res) => {
  db.get('SELECT id, username, role, department, created_at FROM users WHERE id = ?', [req.user.id], (err, user) => {
    if (err || !user) {
      res.status(404).json({ error: '用户不存在' });
      return;
    }
    res.json(user);
  });
});

// 获取用户列表（仅管理员）
app.get('/api/users', authMiddleware, (req, res) => {
  if (req.user.role !== 'admin') {
    res.status(403).json({ error: '权限不足' });
    return;
  }
  
  db.all('SELECT id, username, role, department, created_at FROM users ORDER BY id', (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// 创建用户（仅管理员）
app.post('/api/users', authMiddleware, (req, res) => {
  if (req.user.role !== 'admin') {
    res.status(403).json({ error: '权限不足' });
    return;
  }
  
  const { username, password, role, department } = req.body;
  
  if (!username || !password) {
    res.status(400).json({ error: '用户名和密码不能为空' });
    return;
  }
  
  const hashedPassword = bcrypt.hashSync(password, 10);
  
  db.run(
    'INSERT INTO users (username, password, role, department) VALUES (?, ?, ?, ?)',
    [username, hashedPassword, role || 'user', department || ''],
    function(err) {
      if (err) {
        res.status(500).json({ error: '用户名已存在' });
        return;
      }
      res.json({ success: true, id: this.lastID });
    }
  );
});

// 删除用户（仅管理员）
app.delete('/api/users/:id', authMiddleware, (req, res) => {
  if (req.user.role !== 'admin') {
    res.status(403).json({ error: '权限不足' });
    return;
  }
  
  const userId = req.params.id;
  
  // 不能删除 admin 账号
  if (userId === '1') {
    res.status(400).json({ error: '不能删除默认管理员账号' });
    return;
  }
  
  db.run('DELETE FROM users WHERE id = ?', [userId], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (this.changes === 0) {
      res.status(404).json({ error: '用户不存在' });
      return;
    }
    res.json({ success: true });
  });
});

// ============ 资产编辑 API ============

// 更新资产
app.put('/api/assets/:id', authMiddleware, (req, res) => {
  const { name, category, quantity, unit, location, description, min_stock } = req.body;
  const assetId = req.params.id;
  
  if (!name || !category) {
    res.status(400).json({ error: '名称和分类不能为空' });
    return;
  }
  
  db.run(
    `UPDATE assets SET name = ?, category = ?, quantity = ?, unit = ?, location = ?, description = ?, min_stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [name, category, quantity, unit, location, description, min_stock || 5, assetId],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ success: true });
    }
  );
});

// ============ 用户管理 API ============

// 修改自己的密码
app.put('/api/auth/password', authMiddleware, (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const userId = req.user.id;
  
  if (!oldPassword || !newPassword) {
    res.status(400).json({ error: '请输入旧密码和新密码' });
    return;
  }
  
  db.get('SELECT * FROM users WHERE id = ?', [userId], (err, user) => {
    if (err || !user) {
      res.status(404).json({ error: '用户不存在' });
      return;
    }
    
    const validPassword = bcrypt.compareSync(oldPassword, user.password);
    if (!validPassword) {
      res.status(401).json({ error: '旧密码错误' });
      return;
    }
    
    const hashedPassword = bcrypt.hashSync(newPassword, 10);
    db.run('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, userId], function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ success: true });
    });
  });
});

// 管理员重置用户密码
app.put('/api/users/:id/password', authMiddleware, (req, res) => {
  if (req.user.role !== 'admin') {
    res.status(403).json({ error: '权限不足' });
    return;
  }
  
  const userId = req.params.id;
  const { newPassword } = req.body;
  
  if (!newPassword) {
    res.status(400).json({ error: '请输入新密码' });
    return;
  }
  
  const hashedPassword = bcrypt.hashSync(newPassword, 10);
  db.run('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, userId], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ success: true });
  });
});

// ============ Excel 导入导出 API ============

// 导出资产表
app.get('/api/export/assets', authMiddleware, async (req, res) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('资产列表');
    
    // 设置列
    worksheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: '名称', key: 'name', width: 25 },
      { header: '分类', key: 'category', width: 15 },
      { header: '数量', key: 'quantity', width: 10 },
      { header: '单位', key: 'unit', width: 10 },
      { header: '位置', key: 'location', width: 20 },
      { header: '描述', key: 'description', width: 30 },
      { header: '最低库存', key: 'min_stock', width: 12 },
      { header: '更新时间', key: 'updated_at', width: 20 }
    ];
    
    // 设置表头样式
    worksheet.getRow(1).font = { bold: true, size: 11 };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF3498DB' }
    };
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    
    // 获取数据
    const assets = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM assets ORDER BY category, name', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    assets.forEach(asset => {
      worksheet.addRow(asset);
    });
    
    // 自动调整行高
    worksheet.eachRow((row) => {
      row.height = 20;
    });
    
    // 设置响应头
    const filename = '资产列表_' + new Date().toISOString().split('T')[0] + '.xls';
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"; filename*=UTF-8''${encodeURIComponent(filename)}`);
    
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('导出失败:', err);
    res.status(500).json({ error: '导出失败：' + err.message });
  }
});

// 导出入库模板
app.get('/api/export/import-template', authMiddleware, async (req, res) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('入库模板');
    
    // 获取所有资产
    const assets = await new Promise((resolve, reject) => {
      db.all('SELECT id, name, category, quantity, unit, location FROM assets ORDER BY category, name', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    worksheet.columns = [
      { header: '资产 ID', key: 'id', width: 12 },
      { header: '物品名称', key: 'name', width: 25 },
      { header: '分类', key: 'category', width: 15 },
      { header: '当前库存', key: 'current_stock', width: 12 },
      { header: '单位', key: 'unit', width: 8 },
      { header: '位置', key: 'location', width: 20 },
      { header: '入库数量', key: 'quantity', width: 15, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF4CC' } } },
      { header: '备注', key: 'remark', width: 30 }
    ];
    
    // 设置表头样式
    worksheet.getRow(1).font = { bold: true, size: 11 };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF27AE60' }
    };
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    
    // 填充现有资产数据
    assets.forEach(asset => {
      worksheet.addRow({
        id: asset.id,
        name: asset.name,
        category: asset.category,
        current_stock: asset.quantity,
        unit: asset.unit,
        location: asset.location || '',
        quantity: '', // 空白待填
        remark: ''
      });
    });
    
    // 冻结首行
    worksheet.views = [{ state: 'frozen', ySplit: 1 }];
    
    // 添加说明
    worksheet.addRow([]);
    const noteRow = worksheet.addRow(['说明：请在"入库数量"列填写要入库的数量，其他列无需修改']);
    noteRow.font = { italic: true, color: { argb: 'FF7F8C8D' } };
    noteRow.height = 20;
    
    // 设置响应头
    const filename = '入库模板_' + new Date().toISOString().split('T')[0] + '.xls';
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"; filename*=UTF-8''${encodeURIComponent(filename)}`);
    
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('导出模板失败:', err);
    res.status(500).json({ error: '导出模板失败：' + err.message });
  }
});

// Excel 批量入库（按名称，支持自动创建新资产）
app.post('/api/import/stock', authMiddleware, async (req, res) => {
  const { items, autoCreate = true } = req.body; // [{name, quantity, category, unit, location, remark}]
  
  if (!items || !Array.isArray(items)) {
    res.status(400).json({ error: '数据格式错误' });
    return;
  }
  
  const results = [];
  
  for (const item of items) {
    try {
      let asset = await new Promise((resolve, reject) => {
        db.get('SELECT * FROM assets WHERE name = ?', [item.name], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });
      
      // 如果资产不存在且允许自动创建
      if (!asset && autoCreate) {
        const qrCode = require('uuid').v4();
        const category = item.category || '其他';
        const unit = item.unit || '个';
        const location = item.location || '';
        
        await new Promise((resolveCreate, rejectCreate) => {
          db.run(
            'INSERT INTO assets (name, category, quantity, unit, location, qr_code) VALUES (?, ?, ?, ?, ?, ?)',
            [item.name, category, parseInt(item.quantity) || 0, unit, location, qrCode],
            function(err) {
              if (err) rejectCreate(err);
              else {
                const newId = this.lastID;
                db.get('SELECT * FROM assets WHERE id = ?', [newId], (err, row) => {
                  if (err) rejectCreate(err);
                  else resolveCreate(row);
                });
              }
            }
          );
        });
        
        asset = await new Promise((resolve, reject) => {
          db.get('SELECT * FROM assets WHERE name = ?', [item.name], (err, row) => {
            if (err) reject(err);
            else resolve(row);
          });
        });
        
        results.push({ 
          name: item.name, 
          status: 'created', 
          message: '自动创建新资产',
          id: asset.id,
          newQuantity: asset.quantity 
        });
        continue;
      }
      
      if (!asset) {
        results.push({ name: item.name, status: 'error', message: '物品不存在且未开启自动创建' });
        continue;
      }
      
      const newQuantity = asset.quantity + parseInt(item.quantity);
      
      await new Promise((resolve, reject) => {
        db.run('BEGIN TRANSACTION');
        
        db.run(
          'UPDATE assets SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [newQuantity, asset.id],
          function(err) {
            if (err) {
              db.run('ROLLBACK');
              reject(err);
            } else {
              db.run(
                'INSERT INTO transactions (asset_id, asset_name, type, quantity, operator, department, remark) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [asset.id, asset.name, 'in', parseInt(item.quantity), req.user.username, '', item.remark || 'Excel 批量入库'],
                function(err) {
                  if (err) {
                    db.run('ROLLBACK');
                    reject(err);
                  } else {
                    db.run('COMMIT');
                    resolve();
                  }
                }
              );
            }
          }
        );
      });
      
      results.push({ name: item.name, status: 'success', newQuantity });
    } catch (err) {
      results.push({ name: item.name, status: 'error', message: err.message });
    }
  }
  
  res.json({ results });
});

// Excel 批量入库（按 ID）
app.post('/api/import/stock-by-id', authMiddleware, async (req, res) => {
  const { items } = req.body; // [{id, name, quantity, remark}]
  
  if (!items || !Array.isArray(items)) {
    res.status(400).json({ error: '数据格式错误' });
    return;
  }
  
  const results = [];
  
  for (const item of items) {
    try {
      const asset = await new Promise((resolve, reject) => {
        db.get('SELECT * FROM assets WHERE id = ?', [item.id], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });
      
      if (!asset) {
        results.push({ id: item.id, name: item.name, status: 'error', message: '资产不存在' });
        continue;
      }
      
      const oldQuantity = asset.quantity;
      const newQuantity = asset.quantity + parseInt(item.quantity);
      
      await new Promise((resolve, reject) => {
        db.run('BEGIN TRANSACTION');
        
        db.run(
          'UPDATE assets SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [newQuantity, asset.id],
          function(err) {
            if (err) {
              db.run('ROLLBACK');
              reject(err);
            } else {
              db.run(
                'INSERT INTO transactions (asset_id, asset_name, type, quantity, operator, department, remark) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [asset.id, asset.name, 'in', parseInt(item.quantity), req.user.username, '', item.remark || 'Excel 批量入库'],
                function(err) {
                  if (err) {
                    db.run('ROLLBACK');
                    reject(err);
                  } else {
                    db.run('COMMIT');
                    resolve();
                  }
                }
              );
            }
          }
        );
      });
      
      results.push({ 
        id: item.id, 
        name: item.name, 
        status: 'success', 
        oldQuantity, 
        newQuantity, 
        quantity: parseInt(item.quantity) 
      });
    } catch (err) {
      results.push({ id: item.id, name: item.name, status: 'error', message: err.message });
    }
  }
  
  res.json({ results });
});

// 仪表盘统计 API - 单个物品变化趋势
app.get('/api/stats/asset/:id/trend', authMiddleware, (req, res) => {
  const assetId = req.params.id;
  const days = parseInt(req.query.days) || 30;
  
  // 获取该资产的所有出入库记录
  db.all(`
    SELECT date(created_at) as date, type, quantity, id
    FROM transactions
    WHERE asset_id = ?
    ORDER BY date(created_at), id
  `, [assetId], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    if (rows.length === 0) {
      res.json([]);
      return;
    }
    
    // 获取当前库存
    db.get('SELECT quantity FROM assets WHERE id = ?', [assetId], (err, asset) => {
      if (err || !asset) {
        res.json([]);
        return;
      }
      
      // 反向计算每个时间点的库存
      let currentStock = asset.quantity;
      const result = rows.reverse().map(row => {
        // 反向推算：如果是出库，之前库存应该更多；如果是入库，之前库存应该更少
        if (row.type === 'out') {
          currentStock += row.quantity;
        } else {
          currentStock -= row.quantity;
        }
        return {
          date: row.date,
          type: row.type,
          quantity: row.quantity,
          stock: currentStock
        };
      }).reverse();
      
      res.json(result);
    });
  });
});

// 仪表盘统计 API - 物品变化趋势
app.get('/api/stats/trends', authMiddleware, (req, res) => {
  const days = parseInt(req.query.days) || 30;
  
  db.all(`
    SELECT date(created_at) as date, type, SUM(quantity) as total
    FROM transactions
    WHERE date(created_at) >= date('now', ? || ' days ago')
    GROUP BY date(created_at), type
    ORDER BY date
  `, [`-${days}`], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// 仪表盘统计 API - 消耗最快的物品
app.get('/api/stats/fastest-consumption', authMiddleware, (req, res) => {
  const days = parseInt(req.query.days) || 30;
  
  db.all(`
    SELECT asset_id, asset_name, SUM(quantity) as total_out
    FROM transactions
    WHERE type = 'out' AND date(created_at) >= date('now', ? || ' days ago')
    GROUP BY asset_id, asset_name
    ORDER BY total_out DESC
    LIMIT 10
  `, [`-${days}`], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// 仪表盘统计 API - 低库存预警（基于 min_stock）
app.get('/api/stats/low-stock-warning', authMiddleware, (req, res) => {
  db.all(`
    SELECT id, name, category, quantity, min_stock, (quantity - min_stock) as diff
    FROM assets
    WHERE quantity <= min_stock
    ORDER BY diff ASC
  `, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// ============ 操作日志 API ============

// 获取操作日志
app.get('/api/logs', authMiddleware, (req, res) => {
  const { limit = 100, action, user } = req.query;
  const logs = getOperations(parseInt(limit), action || null, user || null);
  res.json(logs);
});

// 获取日志操作类型统计
app.get('/api/logs/actions', authMiddleware, (req, res) => {
  const logs = getOperations(10000);
  const actionCount = {};
  logs.forEach(log => {
    actionCount[log.action] = (actionCount[log.action] || 0) + 1;
  });
  res.json(actionCount);
});

// ============ 数据备份 API ============

// 获取备份列表
app.get('/api/backups', authMiddleware, (req, res) => {
  const backupDir = path.join(__dirname, 'backups');
  if (!fs.existsSync(backupDir)) {
    return res.json([]);
  }
  
  const files = fs.readdirSync(backupDir)
    .filter(f => f.endsWith('.db'))
    .map(f => {
      const filePath = path.join(backupDir, f);
      const stats = fs.statSync(filePath);
      return {
        filename: f,
        size: stats.size,
        createdAt: stats.birthtime.toISOString(),
        modifiedAt: stats.mtime.toISOString()
      };
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  
  res.json(files);
});

// 创建备份
app.post('/api/backups', authMiddleware, (req, res) => {
  const dbPath = path.join(__dirname, 'assets.db');
  const backupDir = path.join(__dirname, 'backups');
  const date = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const backupFile = path.join(backupDir, `assets_backup_${date}.db`);
  
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  
  if (!fs.existsSync(dbPath)) {
    return res.status(404).json({ error: '数据库文件不存在' });
  }
  
  try {
    fs.copyFileSync(dbPath, backupFile);
    logOperation('BACKUP_CREATE', `创建备份：${backupFile}`, req.user.username);
    res.json({ success: true, filename: path.basename(backupFile) });
  } catch (err) {
    res.status(500).json({ error: '备份失败：' + err.message });
  }
});

// 恢复备份
app.post('/api/backups/restore', authMiddleware, (req, res) => {
  const { filename } = req.body;
  if (!filename) {
    return res.status(400).json({ error: '请指定备份文件名' });
  }
  
  const backupDir = path.join(__dirname, 'backups');
  const dbPath = path.join(__dirname, 'assets.db');
  const backupPath = path.join(backupDir, filename);
  
  if (!fs.existsSync(backupPath)) {
    return res.status(404).json({ error: '备份文件不存在' });
  }
  
  try {
    // 备份当前数据库
    if (fs.existsSync(dbPath)) {
      const currentBackup = path.join(backupDir, `current_backup_${new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)}.db`);
      fs.copyFileSync(dbPath, currentBackup);
      logOperation('BACKUP_AUTO', `恢复前自动备份：${path.basename(currentBackup)}`, req.user.username);
    }
    
    // 恢复备份
    fs.copyFileSync(backupPath, dbPath);
    logOperation('BACKUP_RESTORE', `从备份恢复：${filename}`, req.user.username);
    
    res.json({ success: true, message: '数据库恢复成功' });
  } catch (err) {
    res.status(500).json({ error: '恢复失败：' + err.message });
  }
});

// 删除备份
app.delete('/api/backups/:filename', authMiddleware, (req, res) => {
  const { filename } = req.params;
  const backupPath = path.join(__dirname, 'backups', filename);
  
  if (!fs.existsSync(backupPath)) {
    return res.status(404).json({ error: '备份文件不存在' });
  }
  
  try {
    fs.unlinkSync(backupPath);
    logOperation('BACKUP_DELETE', `删除备份：${filename}`, req.user.username);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: '删除失败：' + err.message });
  }
});

// 清理旧日志
app.post('/api/logs/cleanup', authMiddleware, (req, res) => {
  const { days = 30 } = req.body;
  cleanupOldLogs(parseInt(days));
  logOperation('LOG_CLEANUP', `清理${days}天前的日志`, req.user.username);
  res.json({ success: true });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 资产管理系统运行在 http://localhost:${PORT}`);
  console.log(`📝 操作日志目录：${path.join(__dirname, 'logs')}`);
  console.log(`💾 备份目录：${path.join(__dirname, 'backups')}`);
  
  // 定时任务：每天凌晨 2 点备份
  const cron = require('node-cron');
  cron.schedule('0 2 * * *', () => {
    const dbPath = path.join(__dirname, 'assets.db');
    const backupDir = path.join(__dirname, 'backups');
    const date = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const backupFile = path.join(backupDir, `auto_backup_${date}.db`);
    
    if (fs.existsSync(dbPath)) {
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }
      fs.copyFileSync(dbPath, backupFile);
      console.log(`✅ 定时备份完成：${backupFile}`);
      
      // 清理 30 天前的备份
      const oldBackups = fs.readdirSync(backupDir)
        .filter(f => f.endsWith('.db'))
        .map(f => ({ name: f, time: fs.statSync(path.join(backupDir, f)).mtime.getTime() }))
        .filter(f => (Date.now() - f.time) > (30 * 24 * 60 * 60 * 1000));
      
      oldBackups.forEach(f => {
        fs.unlinkSync(path.join(backupDir, f.name));
        console.log(`🧹 清理旧备份：${f.name}`);
      });
      
      // 清理旧日志
      cleanupOldLogs(30);
    }
  });
});

// ============ 操作日志 API ============

// 获取操作日志
app.get('/api/logs', authMiddleware, (req, res) => {
  if (req.user.role !== 'admin') {
    res.status(403).json({ error: '权限不足' });
    return;
  }
  
  const logFile = path.join(__dirname, 'logs', 'operations.log');
  
  if (!fs.existsSync(logFile)) {
    res.json([]);
    return;
  }
  
  const { limit = 100 } = req.query;
  
  fs.readFile(logFile, 'utf8', (err, data) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    const lines = data.trim().split('\n').reverse().slice(0, parseInt(limit));
    const logs = lines.map(line => {
      try {
        return JSON.parse(line);
      } catch (e) {
        return { raw: line };
      }
    });
    
    res.json(logs);
  });
});

// ============ 数据备份恢复 API ============

// 获取备份列表
app.get('/api/backups', authMiddleware, (req, res) => {
  if (req.user.role !== 'admin') {
    res.status(403).json({ error: '权限不足' });
    return;
  }
  
  const backupDir = path.join(__dirname, 'backups');
  
  if (!fs.existsSync(backupDir)) {
    res.json([]);
    return;
  }
  
  fs.readdir(backupDir, (err, files) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    const backups = files
      .filter(f => f.startsWith('assets_backup_') && f.endsWith('.db'))
      .map(f => {
        const stats = fs.statSync(path.join(backupDir, f));
        return {
          filename: f,
          size: stats.size,
          createdAt: stats.birthtime
        };
      })
      .sort((a, b) => b.createdAt - a.createdAt);
    
    res.json(backups);
  });
});

// 创建备份
app.post('/api/backups', authMiddleware, (req, res) => {
  if (req.user.role !== 'admin') {
    res.status(403).json({ error: '权限不足' });
    return;
  }
  
  const backupDir = path.join(__dirname, 'backups');
  const dbFile = path.join(__dirname, 'assets.db');
  const date = new Date().toISOString().replace(/[:.]/g, '').slice(0, 15);
  const backupFile = path.join(backupDir, `assets_backup_${date}.db`);
  
  if (!fs.existsSync(dbFile)) {
    res.status(404).json({ error: '数据库文件不存在' });
    return;
  }
  
  fs.mkdirSync(backupDir, { recursive: true });
  fs.copyFileSync(dbFile, backupFile);
  
  // 记录日志
  logger.info('手动创建备份', { user: req.user.username, file: backupFile });
  
  res.json({ success: true, file: backupFile });
});

// 恢复备份
app.post('/api/backups/restore', authMiddleware, (req, res) => {
  if (req.user.role !== 'admin') {
    res.status(403).json({ error: '权限不足' });
    return;
  }
  
  const { filename } = req.body;
  const backupDir = path.join(__dirname, 'backups');
  const dbFile = path.join(__dirname, 'assets.db');
  const backupFile = path.join(backupDir, filename);
  
  if (!filename || !filename.startsWith('assets_backup_')) {
    res.status(400).json({ error: '无效的备份文件名' });
    return;
  }
  
  if (!fs.existsSync(backupFile)) {
    res.status(404).json({ error: '备份文件不存在' });
    return;
  }
  
  // 备份当前数据库
  if (fs.existsSync(dbFile)) {
    const backupBeforeRestore = path.join(backupDir, `assets_before_restore_${Date.now()}.db`);
    fs.copyFileSync(dbFile, backupBeforeRestore);
  }
  
  // 恢复数据
  fs.copyFileSync(backupFile, dbFile);
  
  // 记录日志
  logger.info('恢复数据备份', { user: req.user.username, file: filename });
  
  res.json({ success: true, message: '数据已恢复' });
});

// 删除备份
app.delete('/api/backups/:filename', authMiddleware, (req, res) => {
  if (req.user.role !== 'admin') {
    res.status(403).json({ error: '权限不足' });
    return;
  }
  
  const { filename } = req.params;
  const backupDir = path.join(__dirname, 'backups');
  const backupFile = path.join(backupDir, filename);
  
  if (!filename.startsWith('assets_backup_')) {
    res.status(400).json({ error: '无效的备份文件名' });
    return;
  }
  
  if (!fs.existsSync(backupFile)) {
    res.status(404).json({ error: '备份文件不存在' });
    return;
  }
  
  fs.unlinkSync(backupFile);
  
  // 记录日志
  logger.info('删除备份', { user: req.user.username, file: filename });
  
  res.json({ success: true });
});
