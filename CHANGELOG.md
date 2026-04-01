# 资产管理系统 - 版本更新日志

## v1.0.0 (2026-04-01)

### 新增功能
- ✅ 资产管理系统核心功能
- ✅ 用户认证（JWT Token）
- ✅ 资产 CRUD（增删改查）
- ✅ 出入库管理（单个/批量）
- ✅ Excel 导入导出
- ✅ 二维码生成与扫码领用
- ✅ 最低库存预警
- ✅ 数据统计与仪表盘
- ✅ 用户权限管理
- ✅ 操作日志记录
- ✅ 定时数据备份
- ✅ 数据恢复功能
- ✅ 表头排序功能
- ✅ 详情页编辑一体化

### 数据库结构
- **assets** (11 字段): 资产表
- **transactions** (9 字段): 出入库记录表
- **users** (6 字段): 用户表
- **categories** (3 字段): 分类表

---

## v1.0.1 (2026-04-01)

### Bug 修复

#### 1. 资产 ID 为 null
**问题**: 数据库表结构错误，id 定义为 TEXT 不是 AUTOINCREMENT
**修复**: 重建 assets 表，id 改为 INTEGER PRIMARY KEY AUTOINCREMENT
**提交**: 51ab32d

#### 2. 出入库记录字段名不匹配
**问题**: 前后端字段名不一致（operator/person_name, department/room_number, remark/notes）
**修复**: 统一为 person_name, room_number, notes
**提交**: 2489409

#### 3. 401 Unauthorized 错误
**问题**: 硬编码生产域名导致本地访问跨域
**修复**: 使用 window.location.origin
**提交**: 31257af

#### 4. 资产列表不显示
**问题**: assets.map 时 assets 不是数组
**修复**: 添加 Array.isArray 验证
**提交**: 31257af

#### 5. app.js 语法错误
**问题**: sed 替换导致引号嵌套错误
**修复**: 使用单引号包裹 HTML 字符串
**提交**: dd27b05

---

## v1.0.2 (2026-04-01)

### 功能优化

#### 1. 统计逻辑修复
**问题**: totalAssets 显示的是所有物品总数量
**修复**: 改为统计有多少种不同的资产（COUNT(*) WHERE quantity > 0）
**提交**: a09d478

**修复前**: totalAssets = 137 (所有物品加起来)
**修复后**: totalAssets = 3 (有 3 种不同的资产)

#### 2. 用户报告问题修复
- 仪表盘标签改名（总资产数量→资产种类数量，资产种类→资产类别数量）
- 资产领用警告文字加大（18px 粗体）
- 统一最低库存检查逻辑
- 创建用户字段名修复（room_number→department）
**提交**: 504e8b6

---

## 文档更新

### 新增文档
- DATABASE_DICTIONARY.md - 数据库字典
- CHANGELOG.md - 版本更新日志

### 删除文档
- DB_FIELD_CHECK.md (内容已整合)
- FINAL_TEST_REPORT.md (内容已整合)
- COMPREHENSIVE_TEST_REPORT.md (内容已整合)
- TEST_REPORT.md (内容已整合)
- FINAL_FIX_REPORT.md (内容已整合)
- USER_REPORT_FIXES.md (内容已整合)

### 保留文档
- README.md - 项目说明
- RELEASE_NOTES.md - 发布说明
- DEPLOYMENT.md - 部署指南
- DATABASE_DICTIONARY.md - 数据库字典
- CHANGELOG.md - 版本更新日志

---

## 技术栈

- **后端**: Node.js + Express
- **数据库**: SQLite3
- **前端**: 原生 HTML/CSS/JavaScript
- **认证**: JWT Token
- **Excel**: ExcelJS

---

**最后更新**: 2026-04-01 22:55 CST
