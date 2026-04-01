# 数据库结构与前后端字段匹配检查报告

## 检查时间
2026-04-01 20:50 CST

## 数据库表结构

### 1. assets 表
| 字段 | 类型 | 必填 | 默认值 | 前端使用 | 后端使用 | 状态 |
|------|------|------|--------|---------|---------|------|
| id | INTEGER | ✅ | AUTOINCREMENT | ✅ | ✅ | ✅ |
| name | TEXT | ✅ | - | ✅ | ✅ | ✅ |
| category | TEXT | ✅ | - | ✅ | ✅ | ✅ |
| quantity | INTEGER | - | 0 | ✅ | ✅ | ✅ |
| min_quantity | INTEGER | - | 5 | ❌ min_stock | ✅ | ⚠️ |
| unit | TEXT | - | '个' | ✅ | ✅ | ✅ |
| location | TEXT | - | - | ✅ | ✅ | ✅ |
| description | TEXT | - | - | ✅ | ✅ | ✅ |
| qr_code | TEXT | - | - | ✅ | ✅ | ✅ |
| created_at | DATETIME | - | CURRENT_TIMESTAMP | ✅ | ✅ | ✅ |
| updated_at | DATETIME | - | CURRENT_TIMESTAMP | ✅ | ✅ | ✅ |

### 2. transactions 表
| 字段 | 类型 | 必填 | 默认值 | 前端使用 | 后端使用 | 状态 |
|------|------|------|--------|---------|---------|------|
| id | INTEGER | ✅ | AUTOINCREMENT | ✅ | ✅ | ✅ |
| asset_id | TEXT | ✅ | - | ✅ | ✅ | ✅ |
| asset_name | TEXT | - | - | ✅ | ✅ | ✅ |
| type | TEXT | ✅ | - | ✅ | ✅ | ✅ |
| quantity | INTEGER | ✅ | - | ✅ | ✅ | ✅ |
| person_name | TEXT | ✅ | - | ❌ operator | ✅ | ⚠️ |
| room_number | TEXT | - | - | ❌ department | ✅ | ⚠️ |
| notes | TEXT | - | - | ❌ remark | ✅ | ⚠️ |
| created_at | DATETIME | - | CURRENT_TIMESTAMP | ✅ | ✅ | ✅ |

### 3. users 表
| 字段 | 类型 | 必填 | 默认值 | 前端使用 | 后端使用 | 状态 |
|------|------|------|--------|---------|---------|------|
| id | INTEGER | ✅ | AUTOINCREMENT | ✅ | ✅ | ✅ |
| username | TEXT | ✅ | - | ✅ | ✅ | ✅ |
| password | TEXT | ✅ | - | ✅ | ✅ | ✅ |
| role | TEXT | - | 'user' | ✅ | ✅ | ✅ |
| department | TEXT | - | '' | ✅ | ✅ | ✅ |
| created_at | DATETIME | - | CURRENT_TIMESTAMP | ✅ | ✅ | ✅ |

### 4. categories 表
| 字段 | 类型 | 必填 | 默认值 | 前端使用 | 后端使用 | 状态 |
|------|------|------|--------|---------|---------|------|
| id | INTEGER | ✅ | AUTOINCREMENT | ✅ | ✅ | ✅ |
| name | TEXT | ✅ | - | ✅ | ✅ | ✅ |
| color | TEXT | - | '#3b82f6' | ✅ | ✅ | ✅ |

## 发现的问题

### 🔴 严重问题

1. **assets.min_quantity 字段名不一致**
   - 数据库：`min_quantity`
   - 前端：`asset.min_stock`
   - 后端：`min_quantity`
   - 影响：前端显示和编辑功能异常

2. **transactions.person_name 字段名不一致**
   - 数据库：`person_name`
   - 前端：`operator`
   - 后端：`person_name`
   - 影响：出入库记录显示异常

3. **transactions.room_number 字段名不一致**
   - 数据库：`room_number`
   - 前端：`department`
   - 后端：`room_number`
   - 影响：房间号显示异常

4. **transactions.notes 字段名不一致**
   - 数据库：`notes`
   - 前端：`remark`
   - 后端：`notes`
   - 影响：备注显示异常

## 数据库设计评估

### ✅ 优点
1. 使用 INTEGER PRIMARY KEY AUTOINCREMENT 作为主键
2. 有合理的默认值
3. 有时间戳记录创建和更新时间
4. 有外键约束（transactions.asset_id）

### ⚠️ 建议改进
1. assets.asset_id 应该是 INTEGER 类型而不是 TEXT
2. transactions 表应该有外键约束
3. 缺少软删除字段（deleted_at）
4. 缺少索引优化查询性能

## 修复建议

### 立即修复
1. 前端统一使用数据库字段名
2. 或后端 API 返回时转换字段名

### 长期优化
1. 添加数据库索引
2. 添加外键约束
3. 考虑添加软删除功能
4. 添加数据验证约束

---
检查完成时间：2026-04-01 20:55 CST
检查人员：司礼监
