# 资产管理系统 v1.0.0 发布说明

## 🎉 发布信息

- **版本**: v1.0.0
- **发布日期**: 2026-04-01
- **仓库**: https://github.com/patrick-star/asset-manage

---

## ✨ 核心功能

### 资产管理
- ✅ 资产增删改查（CRUD）
- ✅ 资产分类管理
- ✅ 资产详情页编辑一体化
- ✅ 最低库存设置与预警
- ✅ 表头点击排序（ID/名称/分类/数量）

### 出入库管理
- ✅ 单个入库/出库
- ✅ Excel 批量入库（按 ID 匹配）
- ✅ 入库/出库独立记录页面
- ✅ 日期和物品筛选

### 二维码功能
- ✅ 专属二维码生成
- ✅ 扫码领用（免登录）
- ✅ 领用表单自动填充

### 用户管理
- ✅ JWT Token 认证
- ✅ 管理员/普通用户角色
- ✅ 密码修改/重置
- ✅ 用户列表管理

### 数据统计
- ✅ 仪表盘统计卡片
- ✅ 分类统计进度条
- ✅ 库存预警显示
- ✅ 物品变化趋势图
- ✅ 消耗最快物品排行

### 数据管理
- ✅ Excel 资产列表导出
- ✅ Excel 入库模板导出
- ✅ 定时数据备份（每天）
- ✅ 数据恢复功能
- ✅ 操作日志记录

---

## 🔧 技术特性

### 后端
- Node.js + Express
- SQLite3 数据库
- JWT 认证
- bcryptjs 密码加密
- ExcelJS Excel 处理

### 前端
- 原生 HTML/CSS/JavaScript
- 响应式设计
- SVG 折线图
- 无需构建工具

### 安全
- 密码 bcrypt 加密
- JWT Token 认证（24 小时）
- 操作日志记录
- 权限控制

---

## 📦 安装要求

- Node.js >= 18.0.0
- npm >= 9.0.0
- 磁盘空间：>= 100MB
- 内存：>= 512MB

---

## 🚀 快速开始

### 一键启动
```bash
./start.sh
```

访问：http://localhost:3001

### 默认账号
- 用户名：`admin`
- 密码：`admin123`

⚠️ **首次登录后请立即修改密码！**

---

## 📁 项目结构

```
asset-manage/
├── server.js           # 后端 API
├── database.js         # 数据库
├── logger.js           # 日志模块
├── package.json        # 依赖配置
├── start.sh            # 启动脚本
├── public/             # 前端文件
├── scripts/            # 维护脚本
│   ├── backup.sh       # 备份脚本
│   └── restore.sh      # 恢复脚本
├── backups/            # 备份目录
├── logs/               # 日志目录
└── uploads/            # 上传目录
```

---

## 🔌 API 接口

详见 [README.md](README.md#-api-接口)

---

## 📊 数据库结构

### 主要表
- `assets` - 资产表
- `transactions` - 出入库记录
- `users` - 用户表
- `categories` - 分类表

详见 [README.md](README.md#-数据库结构)

---

## 🛠️ 维护脚本

### 数据备份
```bash
./scripts/backup.sh
```

### 数据恢复
```bash
./scripts/restore.sh <备份文件名>
```

### 定时备份配置
```bash
# 编辑 crontab
crontab -e

# 添加每天凌晨 2 点备份
0 2 * * * /path/to/asset-manage/scripts/backup.sh
```

---

## 📝 更新日志

### v1.0.0 (2026-04-01)
- ✅ 初始版本发布
- ✅ 资产管理核心功能
- ✅ 二维码扫码领用
- ✅ Excel 导入导出
- ✅ 操作日志记录
- ✅ 定时数据备份
- ✅ 数据恢复功能
- ✅ 表头排序功能
- ✅ 详情页编辑一体化
- ✅ 库存预警功能

---

## 🐛 已知问题

暂无

---

## 📞 技术支持

- GitHub Issues: https://github.com/patrick-star/asset-manage/issues
- 文档：README.md, DEPLOYMENT.md

---

## 📄 许可证

MIT License

---

## 🙏 致谢

感谢所有贡献者和用户！
