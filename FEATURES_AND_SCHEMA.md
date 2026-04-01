# 资产管理系统 - 功能与数据库结构

## 系统概述

资产管理系统是一套基于 Node.js + SQLite 的 Web 应用，用于管理办公用品的入库、出库、库存预警等功能。

**访问地址**: http://localhost:3001

---

## 功能模块

### 1. 用户认证模块
- 登录/退出
- JWT Token 认证（24 小时有效期）
- 未登录自动跳转
- 密码修改/重置

### 2. 仪表盘模块
- 资产种类数量（有多少种资产）
- 资产类别数量（有多少个分类）
- 本月入库/出库统计
- 分类统计（进度条展示）
- 库存预警（低库存物品）
- 物品变化趋势图
- 消耗最快物品排行

### 3. 资产管理模块
- 资产列表显示
- 搜索功能（按名称/位置）
- 分类筛选
- 表头排序（ID/名称/数量/分类）
- 新增资产
- 查看详情
- 编辑资产
- 删除资产
- 导出 Excel
- 批量入库（Excel 导入）

### 4. 入库管理模块
- 单个入库
- 批量入库（Excel）
- 入库记录查询
- 日期/物品筛选

### 5. 出库管理模块
- 单个出库
- 扫码出库
- 最低库存保护
- 出库记录查询
- 日期/物品筛选

### 6. 二维码模块
- 专属二维码生成
- 二维码查看
- 扫码领用页面（免登录）
- 领用表单提交

### 7. 备份管理模块
- 备份列表显示
- 创建备份
- 恢复备份
- 删除备份

### 8. 操作日志模块
- 日志列表显示
- 日志刷新
- 日志详情

### 9. 账号管理模块（仅管理员）
- 用户列表显示
- 新增用户
- 删除用户
- 重置密码
- 修改自己的密码

---

## 数据库结构

### assets - 资产表

存储所有资产物品的基本信息。

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| id | INTEGER | ✅ | AUTOINCREMENT | 资产 ID（自增主键） |
| name | TEXT | ✅ | - | 资产名称 |
| category | TEXT | ✅ | - | 分类名称 |
| quantity | INTEGER | - | 0 | 当前库存数量 |
| min_quantity | INTEGER | - | 5 | 最低库存预警值 |
| unit | TEXT | - | '个' | 计量单位 |
| location | TEXT | - | - | 存放位置 |
| description | TEXT | - | - | 资产描述 |
| qr_code | TEXT | - | - | 二维码 UUID |
| created_at | DATETIME | - | CURRENT_TIMESTAMP | 创建时间 |
| updated_at | DATETIME | - | CURRENT_TIMESTAMP | 更新时间 |

**示例数据**:
```sql
INSERT INTO assets (name, category, quantity, min_quantity, unit, location) 
VALUES ('A4 打印纸', '耗材', 50, 5, '包', 'B 柜');
```

---

### transactions - 出入库记录表

记录所有资产的入库和出库操作。

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| id | INTEGER | ✅ | AUTOINCREMENT | 记录 ID（自增主键） |
| asset_id | TEXT | ✅ | - | 资产 ID（外键） |
| asset_name | TEXT | - | - | 资产名称（冗余字段） |
| type | TEXT | ✅ | - | 类型：in=入库，out=出库 |
| quantity | INTEGER | ✅ | - | 出入库数量 |
| person_name | TEXT | ✅ | - | 操作人姓名 |
| room_number | TEXT | - | - | 房间号/领用部门 |
| notes | TEXT | - | - | 备注信息 |
| created_at | DATETIME | - | CURRENT_TIMESTAMP | 记录时间 |

**示例数据**:
```sql
INSERT INTO transactions (asset_id, asset_name, type, quantity, person_name, room_number, notes) 
VALUES (1, 'A4 打印纸', 'in', 10, '管理员', '', '补充库存');
```

---

### users - 用户表

存储系统用户信息和权限。

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| id | INTEGER | ✅ | AUTOINCREMENT | 用户 ID（自增主键） |
| username | TEXT | ✅ | - | 用户名（唯一） |
| password | TEXT | ✅ | - | 密码（bcrypt 加密） |
| role | TEXT | - | 'user' | 角色：admin=管理员，user=普通用户 |
| department | TEXT | - | '' | 所属部门 |
| created_at | DATETIME | - | CURRENT_TIMESTAMP | 创建时间 |

**示例数据**:
```sql
INSERT INTO users (username, password, role, department) 
VALUES ('admin', '$2a$10$...', 'admin', '管理员');
```

---

### categories - 分类表

存储资产分类信息。

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| id | INTEGER | ✅ | AUTOINCREMENT | 分类 ID（自增主键） |
| name | TEXT | ✅ | - | 分类名称 |
| color | TEXT | - | '#3b82f6' | 分类颜色（十六进制） |

**示例数据**:
```sql
INSERT INTO categories (name, color) VALUES ('耗材', '#e74c3c');
```

---

## 数据库关系图

```
┌─────────────┐       ┌──────────────────┐
│   assets    │       │   transactions   │
├─────────────┤       ├──────────────────┤
│ id (PK)     │◄──────│ asset_id (FK)    │
│ name        │       │ asset_name       │
│ category    │       │ type             │
│ quantity    │       │ quantity         │
│ min_quantity│       │ person_name      │
│ unit        │       │ room_number      │
│ location    │       │ notes            │
│ description │       │ created_at       │
│ qr_code     │       └──────────────────┘
│ created_at  │
│ updated_at  │
└─────────────┘

┌─────────────┐       ┌──────────────────┐
│   users     │       │   categories     │
├─────────────┤       ├──────────────────┤
│ id (PK)     │       │ id (PK)          │
│ username    │       │ name             │
│ password    │       │ color            │
│ role        │       └──────────────────┘
│ department  │
│ created_at  │
└─────────────┘
```

---

## API 接口

### 认证接口
- POST `/api/auth/login` - 用户登录
- GET `/api/auth/me` - 获取当前用户信息
- PUT `/api/auth/password` - 修改密码

### 资产接口
- GET `/api/assets` - 获取资产列表
- POST `/api/assets` - 新增资产
- PUT `/api/assets/:id` - 更新资产
- GET `/api/assets/:id` - 获取资产详情
- GET `/api/assets/:id/qrcode` - 获取二维码

### 出入库接口
- GET `/api/transactions` - 获取出入库记录
- POST `/api/transactions/in` - 入库
- POST `/api/transactions/out` - 出库

### 统计接口
- GET `/api/stats` - 获取统计数据
- GET `/api/stats/low-stock-warning` - 低库存预警
- GET `/api/stats/trends` - 变化趋势
- GET `/api/stats/fastest-consumption` - 消耗排行

### 用户管理接口
- GET `/api/users` - 获取用户列表
- POST `/api/users` - 新增用户
- PUT `/api/users/:id/password` - 重置密码
- DELETE `/api/users/:id` - 删除用户

### 数据导出接口
- GET `/api/export/assets` - 导出资产列表
- GET `/api/export/import-template` - 下载入库模板

### 数据导入接口
- POST `/api/import/stock-by-id` - 批量入库

### 备份接口
- GET `/api/backups` - 获取备份列表
- POST `/api/backups` - 创建备份
- POST `/api/backups/restore` - 恢复备份
- DELETE `/api/backups/:filename` - 删除备份

### 日志接口
- GET `/api/logs` - 获取操作日志

---

## 字段命名规范

- 使用小写字母和下划线（snake_case）
- 主键统一命名为 `id`
- 外键命名为 `表名_id`
- 时间字段统一后缀 `_at`

---

**文档生成时间**: 2026-04-01 22:55 CST
