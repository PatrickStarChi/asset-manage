# 资产管理系统数据库字典

## 数据库信息
- **数据库类型**: SQLite3
- **数据库文件**: db/assets.db
- **字符集**: UTF-8
- **版本**: v1.0.0

---

## 数据表概览

| 表名 | 说明 | 字段数 | 主键 |
|------|------|--------|------|
| assets | 资产表 | 11 | id |
| transactions | 出入库记录表 | 9 | id |
| users | 用户表 | 6 | id |
| categories | 分类表 | 3 | id |

---

## 表结构详情

### 1. assets - 资产表

存储所有资产物品的基本信息。

| 字段 | 类型 | 必填 | 默认值 | 说明 | 示例 |
|------|------|------|--------|------|------|
| id | INTEGER | ✅ | AUTOINCREMENT | 资产 ID（自增主键） | 1 |
| name | TEXT | ✅ | - | 资产名称 | A4 打印纸 |
| category | TEXT | ✅ | - | 分类名称 | 耗材 |
| quantity | INTEGER | - | 0 | 当前库存数量 | 50 |
| min_quantity | INTEGER | - | 5 | 最低库存预警值 | 5 |
| unit | TEXT | - | '个' | 计量单位 | 包 |
| location | TEXT | - | - | 存放位置 | B 柜 |
| description | TEXT | - | - | 资产描述 | 办公用打印纸 |
| qr_code | TEXT | - | - | 二维码 UUID | 08bf9a6b-2c3c-4304-8358-5b0742b54cbf |
| created_at | DATETIME | - | CURRENT_TIMESTAMP | 创建时间 | 2026-04-01 12:18:40 |
| updated_at | DATETIME | - | CURRENT_TIMESTAMP | 更新时间 | 2026-04-01 12:36:08 |

**索引**:
- PRIMARY KEY (id)

**关联表**:
- transactions (asset_id → assets.id)

---

### 2. transactions - 出入库记录表

记录所有资产的入库和出库操作。

| 字段 | 类型 | 必填 | 默认值 | 说明 | 示例 |
|------|------|------|--------|------|------|
| id | INTEGER | ✅ | AUTOINCREMENT | 记录 ID（自增主键） | 1 |
| asset_id | TEXT | ✅ | - | 资产 ID（外键） | 1 |
| asset_name | TEXT | - | - | 资产名称（冗余字段） | A4 打印纸 |
| type | TEXT | ✅ | - | 类型：in=入库，out=出库 | in |
| quantity | INTEGER | ✅ | - | 出入库数量 | 10 |
| person_name | TEXT | ✅ | - | 操作人姓名 | 管理员 |
| room_number | TEXT | - | - | 房间号/领用部门 | 301 |
| notes | TEXT | - | - | 备注信息 | 补充库存 |
| created_at | DATETIME | - | CURRENT_TIMESTAMP | 记录时间 | 2026-04-01 12:36:08 |

**索引**:
- PRIMARY KEY (id)

**外键约束**:
- FOREIGN KEY (asset_id) REFERENCES assets(id)

---

### 3. users - 用户表

存储系统用户信息和权限。

| 字段 | 类型 | 必填 | 默认值 | 说明 | 示例 |
|------|------|------|--------|------|------|
| id | INTEGER | ✅ | AUTOINCREMENT | 用户 ID（自增主键） | 1 |
| username | TEXT | ✅ | - | 用户名（唯一） | admin |
| password | TEXT | ✅ | - | 密码（bcrypt 加密） | $2a$10$... |
| role | TEXT | - | 'user' | 角色：admin=管理员，user=普通用户 | admin |
| department | TEXT | - | '' | 所属部门 | 管理员 |
| created_at | DATETIME | - | CURRENT_TIMESTAMP | 创建时间 | 2026-04-01 10:00:00 |

**索引**:
- PRIMARY KEY (id)
- UNIQUE (username)

---

### 4. categories - 分类表

存储资产分类信息。

| 字段 | 类型 | 必填 | 默认值 | 说明 | 示例 |
|------|------|------|--------|------|------|
| id | INTEGER | ✅ | AUTOINCREMENT | 分类 ID（自增主键） | 1 |
| name | TEXT | ✅ | - | 分类名称 | 耗材 |
| color | TEXT | - | '#3b82f6' | 分类颜色（十六进制） | #e74c3c |

**索引**:
- PRIMARY KEY (id)
- UNIQUE (name)

---

## 数据字典关系图

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

## 字段命名规范

### 命名规则
- 使用小写字母和下划线（snake_case）
- 主键统一命名为 `id`
- 外键命名为 `表名_id`
- 时间字段统一后缀 `_at`

### 字段名对照表

| 数据库字段 | 前端变量 | 说明 |
|-----------|---------|------|
| min_quantity | asset.min_quantity | 最低库存 |
| person_name | person_name | 操作人姓名 |
| room_number | room_number | 房间号 |
| notes | notes | 备注 |

---

## 数据约束

### assets 表
- quantity >= 0
- min_quantity >= 0
- category 必须存在于 categories.name

### transactions 表
- type IN ('in', 'out')
- quantity > 0
- asset_id 必须存在于 assets.id

### users 表
- username 唯一
- role IN ('admin', 'user')

---

## 示例数据

### assets 表示例
```sql
INSERT INTO assets (name, category, quantity, min_quantity, unit, location, description, qr_code) 
VALUES ('A4 打印纸', '耗材', 50, 5, '包', 'B 柜', '办公用打印纸', '08bf9a6b-2c3c-4304-8358-5b0742b54cbf');
```

### transactions 表示例
```sql
INSERT INTO transactions (asset_id, asset_name, type, quantity, person_name, room_number, notes) 
VALUES (1, 'A4 打印纸', 'in', 10, '管理员', '', '补充库存');
```

### users 表示例
```sql
INSERT INTO users (username, password, role, department) 
VALUES ('admin', '$2a$10$...', 'admin', '管理员');
```

### categories 表示例
```sql
INSERT INTO categories (name, color) VALUES ('耗材', '#e74c3c');
```

---

## 版本历史

| 版本 | 日期 | 变更说明 |
|------|------|---------|
| v1.0 | 2026-04-01 | 初始版本，包含 4 个基础表 |

---

**文档生成时间**: 2026-04-01 20:55 CST  
**维护人员**: 司礼监
