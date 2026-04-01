const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'db', 'assets.db');

function initDatabase() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
      if (err) {
        reject(err);
        return;
      }

      // Create assets table
      db.run(`
        CREATE TABLE IF NOT EXISTS assets (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          category TEXT NOT NULL,
          quantity INTEGER DEFAULT 0,
          unit TEXT DEFAULT '个',
          location TEXT DEFAULT '',
          description TEXT DEFAULT '',
          qr_code TEXT UNIQUE,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) {
          reject(err);
          return;
        }

        // Create transaction records table
        db.run(`
          CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            asset_id INTEGER NOT NULL,
            asset_name TEXT NOT NULL,
            type TEXT NOT NULL CHECK(type IN ('in', 'out')),
            quantity INTEGER NOT NULL,
            operator TEXT DEFAULT '系统',
            department TEXT DEFAULT '',
            remark TEXT DEFAULT '',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (asset_id) REFERENCES assets(id)
          )
        `, (err) => {
          if (err) {
            reject(err);
            return;
          }

          // Create categories table
          db.run(`
            CREATE TABLE IF NOT EXISTS categories (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              name TEXT UNIQUE NOT NULL,
              color TEXT DEFAULT '#3498db'
            )
          `, (err) => {
            if (err) {
              reject(err);
              return;
            }

            // Insert default categories
            const defaultCategories = [
              { name: '文具用品', color: '#3498db' },
              { name: '办公设备', color: '#2ecc71' },
              { name: '耗材', color: '#e74c3c' },
              { name: '其他', color: '#95a5a6' }
            ];

            const insertCategory = db.prepare(`
              INSERT OR IGNORE INTO categories (name, color) VALUES (?, ?)
            `);

            defaultCategories.forEach(cat => {
              insertCategory.run(cat.name, cat.color);
            });

            insertCategory.finalize();

            // Create users table
            db.run(`
              CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                role TEXT DEFAULT 'user' CHECK(role IN ('admin', 'user')),
                department TEXT DEFAULT '',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
              )
            `, (err) => {
              if (err) {
                reject(err);
                return;
              }

              // Insert default admin user (password: admin123)
              const bcrypt = require('bcryptjs');
              const hashedPassword = bcrypt.hashSync('admin123', 10);
              db.run(`
                INSERT OR IGNORE INTO users (username, password, role, department) 
                VALUES ('admin', ?, 'admin', '管理员')
              `, [hashedPassword]);

              resolve(db);
            });
          });
        });
      });
    });
  });
}

module.exports = { initDatabase, DB_PATH };
