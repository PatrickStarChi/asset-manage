# 用户报告问题修复报告

## 修复时间
2026-04-01 22:39 CST

## 修复的问题

### 1. 仪表盘标签改名 ✅

**修改前**:
- 总资产数量
- 资产种类

**修改后**:
- 资产种类数量
- 资产类别数量

**验证**:
```json
{
  "totalAssets": 3,      // 资产种类数量
  "categoryCount": 1     // 资产类别数量
}
```

---

### 2. 资产领用警告文字加大 ✅

**修改**:
```html
<div class="stock-warning" style="font-size: 18px; font-weight: bold;">
  ⚠️ 当前库存已达最低库存 (5)，不可领用
</div>
```

**效果**: 字体更大更醒目

---

### 3. 统一最低库存检查逻辑 ✅

**问题**: 出入库允许小于最低库存，但二维码申领不允许

**修复**: 统一使用相同逻辑
- 可领用数量 = 当前库存 - 最低库存
- 出库数量 ≤ 可领用数量

**前端验证**:
```javascript
const minStock = asset.min_quantity || 5;
const available = Math.max(0, asset.quantity - minStock);
document.getElementById('stock-out-quantity').max = available;
```

**后端验证**:
```javascript
const minStock = asset.min_quantity || 5;
const remainingAfterOut = asset.quantity - quantity;
if (remainingAfterOut < minStock) {
  res.status(400).json({ error: '出库后库存将低于最低库存' });
}
```

---

### 4. Tracking Prevention 错误 ℹ️

**现象**:
```
Tracking Prevention blocked access to storage for https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js
```

**原因**: 浏览器隐私保护功能（Edge/IE）

**影响**: 无实际影响，二维码功能正常

**解决**: 无需修复，这是浏览器正常行为

---

### 5. 创建用户失败 ✅

**错误**:
```
Uncaught TypeError: Cannot read properties of undefined (reading 'value')
at handleAddUser (app.js:337:39)
```

**原因**: 字段名不匹配
- 前端表单：`department`
- 后端代码：`room_number`

**修复**:
```javascript
// 修复前
room_number: e.target.room_number.value

// 修复后
department: e.target.department.value || ""
```

**验证**:
```bash
curl -X POST /api/users \
  -d '{"username":"testuser","password":"test123","role":"user","department":"测试部门"}'
# 返回：{"success":true,"id":2}
```

---

## 版本信息

**新版本**: `app.js?v=202604012239`

**提交**: 504e8b6

**推送状态**: ⏳ 网络问题，本地已提交

---

## 测试验证

| 测试项 | 状态 | 结果 |
|--------|------|------|
| 统计 API | ✅ | totalAssets=3, categoryCount=1 |
| 创建用户 | ✅ | 成功创建 testuser |
| 标签显示 | ✅ | 资产种类数量/资产类别数量 |
| 警告样式 | ✅ | 18px 粗体 |
| 库存检查 | ✅ | 统一逻辑 |

---

**修复完成时间**: 2026-04-01 22:40 CST  
**修复人员**: 司礼监
