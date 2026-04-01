// 全局变量
let currentScanType = 'out';
let cameraStream = null;
let currentUser = null;
let currentAssetId = null; // 当前操作的资产 ID
let currentSortBy = 'id';

// 获取分类颜色
function getCategoryColor(category) {
  const colors = {
    "文具用品": "#3498db",
    "办公设备": "#2ecc71",
    "耗材": "#e74c3c",
    "其他": "#95a5a6"
  };
  return colors[category] || "#3498db";
}

let currentSortOrder = 'desc';

// 加载控制台

// 加载控制台
async function loadDashboard() {
  try {
    const token = localStorage.getItem('token');
    const headers = token ? { 'Authorization': 'Bearer ' + token } : {};
    // 基础统计数据（无需认证）
    const stats = await fetch("/api/stats").then(r => r.json());
    
    document.getElementById("total-assets").textContent = stats.totalAssets || 0;
    document.getElementById("category-count").textContent = stats.categoryCount || 0;
    document.getElementById("month-in").textContent = stats.monthIn || 0;
    document.getElementById("month-out").textContent = stats.monthOut || 0;
    
    // 分类统计
    const categoryStatsContainer = document.getElementById("category-stats");
    if (categoryStatsContainer && stats.byCategory && stats.byCategory.length > 0) {
      const maxTotal = Math.max(...stats.byCategory.map(c => c.total));
      categoryStatsContainer.innerHTML = stats.byCategory.map(cat => 
        "<div class=\"category-stat-item\">" +
        "<span>" + cat.category + "</span>" +
        "<div class=\"category-stat-bar\">" +
        "<div class=\"category-stat-fill\" style=\"width: " + (cat.total / maxTotal) * 100 + "%; background: #3498db;\"></div>" +
        "</div>" +
        "<span>" + cat.total + " 个</span>" +
        "</div>"
      ).join("");
    } else if (categoryStatsContainer) {
      categoryStatsContainer.innerHTML = '<div class="empty-state"><p>暂无分类数据</p></div>';
    }
    
    // 库存预警（需要认证）
    const lowStockContainer = document.getElementById("low-stock-alert");
    if (lowStockContainer) {
      try {
        const token = localStorage.getItem('token');
        if (token) {
          const warning = await fetch("/api/stats/low-stock-warning", {
            headers: { 'Authorization': `Bearer ${token}` }
          }).then(r => r.json());
          if (warning && warning.length > 0) {
            lowStockContainer.innerHTML = warning.map(item => 
              "<div class=\"low-stock-item\" style=\"background:#fee;color:#e74c3c;\">" +
              "<span class=\"name\">" + item.name + "</span>" +
              "<span class=\"quantity\">库存：" + item.quantity + " (最低：" + (item.min_quantity||5) + ")</span>" +
              "</div>"
            ).join("");
          } else {
            lowStockContainer.innerHTML = "<div class=\"empty-state\"><div class=\"icon\">✅</div><p>库存充足，无预警</p></div>";
          }
        } else {
          lowStockContainer.innerHTML = "<div class=\"empty-state\"><p>请登录查看库存预警</p></div>";
        }
      } catch (e) {
        console.warn('加载库存预警失败:', e);
        lowStockContainer.innerHTML = "<div class=\"empty-state\"><p>库存预警加载失败</p></div>";
      }
    }
    
    // 物品变化趋势图 - 从交易记录计算
    const trendsContainer = document.getElementById("trends-chart");
    if (trendsContainer) {
      try {
        const token = localStorage.getItem('token');
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
        const transRes = await fetch("/api/transactions?limit=500", { headers });
        const allTrans = await transRes.json();
        if (allTrans && allTrans.length > 0) {
          // 按日期和类型聚合
          const trendsMap = {};
          const now = new Date();
          const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          
          allTrans.forEach(t => {
            const tDate = new Date(t.created_at);
            if (tDate >= thirtyDaysAgo) {
              const dateStr = t.created_at.split(' ')[0];
              const key = dateStr + '_' + t.type;
              if (!trendsMap[key]) {
                trendsMap[key] = { date: dateStr, type: t.type, total: 0 };
              }
              trendsMap[key].total += t.quantity;
            }
          });
          
          const trends = Object.values(trendsMap).sort((a, b) => a.date.localeCompare(b.date));
          
          if (trends.length > 0) {
            // 按日期分组，合并入库和出库
            const dateMap = {};
            trends.forEach(t => {
              if (!dateMap[t.date]) {
                dateMap[t.date] = { date: t.date, in: 0, out: 0 };
              }
              if (t.type === 'in') dateMap[t.date].in = t.total;
              else dateMap[t.date].out = t.total;
            });
            const dates = Object.values(dateMap).sort((a, b) => a.date.localeCompare(b.date));
            
            const maxIn = Math.max(...dates.map(d => d.in || 0), 1);
            const maxOut = Math.max(...dates.map(d => d.out || 0), 1);
            const maxVal = Math.max(maxIn, maxOut);
            const chartHeight = Math.min(350, Math.max(200, dates.length * 25));
            
            trendsContainer.innerHTML = `
              <div style="padding:15px;">
                <!-- 标题和图例 -->
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:15px;">
                  <h4 style="margin:0;font-size:14px;color:#2c3e50;">📈 近 30 天出入库趋势</h4>
                  <div style="display:flex;gap:15px;font-size:12px;">
                    <span><span style="display:inline-block;width:12px;height:12px;background:#2ecc71;margin-right:5px;border-radius:2px;"></span>入库</span>
                    <span><span style="display:inline-block;width:12px;height:12px;background:#e74c3c;margin-right:5px;border-radius:2px;"></span>出库</span>
                  </div>
                </div>
                <!-- 图表容器 -->
                <div style="display:flex;gap:8px;overflow-x:auto;padding:10px 5px;min-height:${chartHeight + 60}px;">
                  <!-- Y 轴 -->
                  <div style="display:flex;flex-direction:column;justify-content:space-between;font-size:11px;color:#7f8c8d;margin-right:10px;min-width:40px;text-align:right;">
                    <span>${maxVal}</span>
                    <span>${Math.round(maxVal / 2)}</span>
                    <span>0</span>
                  </div>
                  <!-- 柱状图 -->
                  <div style="display:flex;align-items:flex-end;gap:8px;height:${chartHeight}px;flex:1;position:relative;">
                    <!-- 网格线 -->
                    <div style="position:absolute;left:0;right:0;top:0;border-top:1px dashed #ecf0f1;"></div>
                    <div style="position:absolute;left:0;right:0;top:50%;border-top:1px dashed #ecf0f1;"></div>
                    <div style="position:absolute;left:0;right:0;bottom:0;border-top:1px solid #bdc3c7;"></div>
                    <!-- 数据柱 -->
                    ${dates.map(d => `
                      <div style="flex:1;min-width:50px;display:flex;gap:4px;align-items:flex-end;height:100%;position:relative;">
                        <div style="width:100%;display:flex;gap:2px;align-items:flex-end;height:100%;">
                          <div style="flex:1;background:linear-gradient(180deg,#2ecc71,#27ae60);border-radius:4px 4px 0 0;min-height:2px;max-height:${(d.in / maxVal) * 100}%;transition:all 0.3s;" title="入库：${d.in || 0}"></div>
                          <div style="flex:1;background:linear-gradient(180deg,#e74c3c,#c0392b);border-radius:4px 4px 0 0;min-height:2px;max-height:${(d.out / maxVal) * 100}%;transition:all 0.3s;" title="出库：${d.out || 0}"></div>
                        </div>
                        <div style="position:absolute;bottom:-25px;left:0;right:0;text-align:center;font-size:10px;color:#7f8c8d;transform:rotate(-45deg);transform-origin:left;white-space:nowrap;">${d.date.slice(5)}</div>
                      </div>
                    `).join('')}
                  </div>
                </div>
              </div>
            `;
          } else {
            trendsContainer.innerHTML = '<div class="empty-state"><p>暂无变化数据</p></div>';
          }
        } else {
          trendsContainer.innerHTML = '<div class="empty-state"><p>暂无交易记录</p></div>';
        }
      } catch (e) {
        console.error('加载趋势图失败:', e);
        trendsContainer.innerHTML = '<div class="empty-state"><p>加载失败</p></div>';
      }
    }
    
    // 消耗最快物品 - 从交易记录计算
    const fastContainer = document.getElementById("fast-consumption");
    if (fastContainer) {
      try {
        const token = localStorage.getItem('token');
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
        const transRes = await fetch("/api/transactions?limit=500", { headers });
        const allTrans = await transRes.json();
        const outTrans = allTrans.filter(t => t.type === 'out');
        
        if (outTrans.length > 0) {
          const consumedMap = {};
          outTrans.forEach(t => {
            if (!consumedMap[t.asset_name]) {
              consumedMap[t.asset_name] = { name: t.asset_name, consumed: 0, unit: t.unit || '个' };
            }
            consumedMap[t.asset_name].consumed += t.quantity;
          });
          
          const fastData = Object.values(consumedMap).sort((a, b) => b.consumed - a.consumed).slice(0, 5);
          
          if (fastData.length > 0) {
            fastContainer.innerHTML = fastData.map(item => 
              `<div class="fast-consumption-item" style="padding:10px;border-bottom:1px solid #ecf0f1;display:flex;justify-content:space-between;align-items:center;">
                <span style="font-weight:500;">${item.name}</span>
                <span style="color:#e74c3c;font-weight:600;">-${item.consumed} ${item.unit}</span>
              </div>`
            ).join('');
          } else {
            fastContainer.innerHTML = '<div class="empty-state"><p>暂无消耗数据</p></div>';
          }
        } else {
          fastContainer.innerHTML = '<div class="empty-state"><p>暂无出库记录</p></div>';
        }
      } catch (e) {
        console.error('加载消耗数据失败:', e);
        fastContainer.innerHTML = '<div class="empty-state"><p>加载失败</p></div>';
      }
    }
  } catch (err) {
    console.error("加载统计数据失败:", err);
  }
}

// 前置函数声明（解决 navigateTo 调用未定义函数的问题 - 仅保留空函数体，实际实现会在后面覆盖）
// 注意：这些空声明会在后面被实际实现覆盖

// 页面导航
function navigateTo(pageId) {
  // 隐藏所有页面
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  
  // 显示目标页面
  const targetPage = document.getElementById(pageId.startsWith('page-') ? pageId : pageId);
  if (targetPage) {
    targetPage.classList.add('active');
  }
  
  // 更新侧边栏激活状态（仅主页面）
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.remove('active');
    if (item.dataset.page === pageId) {
      item.classList.add('active');
    }
  });
  
  // 加载页面数据
  if (pageId === 'dashboard') loadDashboard();
  else if (pageId === 'assets') loadAssets();
  else if (pageId === 'transactions-in') loadInTransactions();
  else if (pageId === 'transactions-out') loadOutTransactions();
  else if (pageId === 'scan') initScanPage();
  else if (pageId === 'users') loadUsers();
}

// 页面加载完成
document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
  initNavigation();
  loadDashboard();
  loadCategories();
  setupEventListeners();
});

// 检查登录状态
async function checkAuth() {
  const token = localStorage.getItem("token");
  const userStr = localStorage.getItem("user");
  
  if (token && userStr) {
    try {
      currentUser = JSON.parse(userStr);
      showUserInfo(currentUser);
      console.log("✅ 已登录");
      return;
    } catch (err) {
      console.error("解析用户数据失败:", err);
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    }
  }
  
  // 未登录，跳转到登录页
  if (window.location.pathname !== "/login.html") {
    window.location.href = "/login.html";
  }
}

// 显示登录模态框
function showLoginModal() {
  const loginModal = document.getElementById('login-modal');
  if (loginModal) {
    loginModal.style.display = 'flex';
  } else {
    // 如果没有登录模态框，跳转到登录页面
    window.location.href = '/login.html';
  }
}

// 显示用户信息
function showUserInfo(user) {
  const userInfo = document.getElementById('user-info');
  const userName = document.getElementById('user-name');
  const userDept = document.getElementById('user-dept');
  const navUsers = document.getElementById('nav-users');
  
  if (userInfo && userName && userDept) {
    userInfo.style.display = 'flex';
    userName.textContent = user.username;
    userDept.textContent = user.room_number || user.role;
  }
  
  // 仅管理员显示账号管理菜单
  if (navUsers && user.role === 'admin') {
    navUsers.style.display = 'flex';
  }
}

// 退出登录
function logout() {
  // 简化版 - 返回首页
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/';
}

// 加载用户列表
async function loadUsers() {
  const token = localStorage.getItem('token');
  
  try {
    const res = await fetch('/api/users', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!res.ok) {
      throw new Error('加载失败');
    }
    
    const users = await res.json();
    
    const tbody = document.getElementById('users-table-body');
    if (tbody) {
      if (users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="empty-state">暂无用户</td></tr>';
        return;
      }
      
      tbody.innerHTML = users.map(user => `
        <tr>
          <td>${user.id}</td>
          <td>${user.username}</td>
          <td><span class="badge badge-${user.role === 'admin' ? 'danger' : 'primary'}">${user.role === 'admin' ? '管理员' : '用户'}</span></td>
          <td>${new Date(user.created_at).toLocaleString('zh-CN')}</td>
          <td>
            ${user.username !== 'admin' ? `
              <button class="btn btn-small btn-warning" onclick="resetUserPassword(${user.id}, '${user.username}')">重置密码</button>
              <button class="btn btn-small btn-danger" onclick="deleteUser(${user.id}, '${user.username}')">删除</button>
            ` : '<span style="color:#7f8c8d;font-size:12px;">默认账号</span>'}
          </td>
        </tr>
      `).join('');
    }
  } catch (err) {
    console.error('加载用户列表失败:', err);
    alert('加载失败');
  }
}

// 显示新增用户模态框
function showAddUserModal() {
  document.getElementById('add-user-form').reset();
  showModal('addUserModal');
}

// 新增用户
async function handleAddUser(e) {
  e.preventDefault();
  
  const token = localStorage.getItem('token');
  const data = {
    username: e.target.username.value,
    password: e.target.password.value,
    role: e.target.role.value,
    department: e.target.department.value || ""
  };
  
  try {
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });
    
    if (res.ok) {
      closeModal('addUserModal');
      loadUsers();
      alert('用户已创建');
    } else {
      const error = await res.json();
      throw new Error(error.error || '创建失败');
    }
  } catch (err) {
    console.error('创建用户失败:', err);
    alert(err.message);
  }
}

// 删除用户
async function deleteUser(id, username) {
  if (!confirm(`确定要删除用户 "${username}" 吗？`)) {
    return;
  }
  
  const token = localStorage.getItem('token');
  
  try {
    const res = await fetch(`/api/users/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (res.ok) {
      loadUsers();
      alert('用户已删除');
    } else {
      const error = await res.json();
      throw new Error(error.error || '删除失败');
    }
  } catch (err) {
    console.error('删除用户失败:', err);
    alert(err.message);
  }
}

// 初始化导航
function initNavigation() {
  const navItems = document.querySelectorAll(".nav-item");
  navItems.forEach(item => {
    item.addEventListener("click", (e) => {
      e.preventDefault();
      const page = item.dataset.page;
      
      if (page === "backups") {
        showBackupsPage();
        return;
      }
      if (page === "logs") {
        showLogsPage();
        return;
      }
      
      navigateTo(page);
    });
  });
  
  // 检查管理员权限，显示管理菜单
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  if (user && user.role === "admin") {
    document.getElementById("nav-backups").style.display = "flex";
    document.getElementById("nav-logs").style.display = "flex";
    document.getElementById("nav-users").style.display = "flex";
  }
  
  navigateTo("dashboard");
}

// 全局排序状态

// 设置事件监听
function setupEventListeners() {
  // 搜索功能
  document.getElementById('search-input')?.addEventListener('input', debounce(() => loadAssets(), 300));
  document.getElementById('category-filter')?.addEventListener('change', () => loadAssets());
  
  // 新增资产表单
  document.getElementById('add-asset-form')?.addEventListener('submit', handleAddAsset);
  
  // 出入库表单
  document.getElementById('transaction-form')?.addEventListener('submit', handleTransaction);
  
  // 扫码类型切换
  document.querySelectorAll('.scan-type-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.scan-type-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentScanType = btn.dataset.type;
      document.getElementById('transaction-modal-title').textContent = currentScanType === 'in' ? '入库' : '出库';
    });
  });
}

// 防抖函数
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// 加载分类
async function loadCategories() {
  try {
    const res = await fetch('/api/categories');
    const categories = await res.json();
    
    // 填充分类筛选器
    const categoryFilter = document.getElementById('category-filter');
    if (categoryFilter) {
      categoryFilter.innerHTML = '<option value="">全部分类</option>';
      categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.name;
        option.textContent = cat.name;
        categoryFilter.appendChild(option);
      });
    }
    
    // 填充新增资产表单的分类选择
    const addAssetCategory = document.querySelector('#addAssetModal select[name="category"]');
    if (addAssetCategory) {
      addAssetCategory.innerHTML = '';
      categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.name;
        option.textContent = cat.name;
        addAssetCategory.appendChild(option);
      });
    }
    
    // 填充编辑资产表单的分类选择
    const editAssetCategory = document.getElementById('edit-asset-category');
    if (editAssetCategory) {
      editAssetCategory.innerHTML = '';
      categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.name;
        option.textContent = cat.name;
        editAssetCategory.appendChild(option);
      });
    }
    
    // 填充交易页面的资产筛选器
    await loadAssetsForFilter();
  } catch (err) {
    console.error('加载分类失败:', err);
  }
}

// 加载资产用于筛选
async function loadAssetsForFilter() {
  const token = localStorage.getItem("token");
  const headers = token ? { "Authorization": "Bearer " + token } : {};
  try {
    const res = await fetch('/api/assets', { headers });
    const assets = await res.json();
    
    const assetFilter = document.getElementById('transaction-asset-filter');
    if (assetFilter) {
      assetFilter.innerHTML = '<option value="">全部资产</option>';
      assets.forEach(asset => {
        const option = document.createElement('option');
        option.value = asset.id;
        option.textContent = `${asset.name} (${asset.quantity})`;
        assetFilter.appendChild(option);
      });
    }
  } catch (err) {
    console.error('加载资产列表失败:', err);
  }
}

// 显示资产详情
async function showAssetDetail(id) {
  try {
    const res = await fetch(`/api/assets/${id}`);
    const asset = await res.json();
    
    const qrRes = await fetch(`/api/assets/${id}/qrcode`);
    const qrData = await qrRes.json();
    
    const content = document.getElementById('asset-detail-content');
    content.innerHTML = `
      <div class="asset-detail-info">
        <div class="asset-detail-item">
          <label>ID</label>
          <div class="value">${asset.id}</div>
        </div>
        <div class="asset-detail-item">
          <label>名称</label>
          <div class="value">${asset.name}</div>
        </div>
        <div class="asset-detail-item">
          <label>分类</label>
          <div class="value">${asset.category}</div>
        </div>
        <div class="asset-detail-item">
          <label>数量</label>
          <div class="value">${asset.quantity} ${asset.unit}</div>
        </div>
        <div class="asset-detail-item">
          <label>位置</label>
          <div class="value">${asset.location || '未指定'}</div>
        </div>
        <div class="asset-detail-item">
          <label>更新时间</label>
          <div class="value">${new Date(asset.updated_at).toLocaleString('zh-CN')}</div>
        </div>
      </div>
      <div class="qr-code-container">
        <h4>二维码</h4>
        <img src="${qrData.qrCode}" alt="QR Code">
        <p style="margin-top: 10px; font-size: 12px; color: #7f8c8d;">扫描此二维码可快速登记出库</p>
      </div>
    `;
    
    showModal('assetDetailModal');
  } catch (err) {
    console.error('加载资产详情失败:', err);
    alert('加载失败');
  }
}

// 显示二维码
async function showQRCode(id) {
  try {
    const [assetRes, qrRes] = await Promise.all([
      fetch(`/api/assets/${id}`),
      fetch(`/api/assets/${id}/qrcode`)
    ]);
    
    const asset = await assetRes.json();
    const qrData = await qrRes.json();
    
    const baseUrl = window.location.origin;
    const assetUrl = `${baseUrl}/asset/${id}`;
    const downloadName = qrData.download?.filename || `${asset.name}-二维码.png`;
    
    const content = document.getElementById('asset-detail-content');
    content.innerHTML = `
      <div style="text-align: center; padding: 20px;">
        <h3 style="margin-bottom: 20px;">${asset.name} - 二维码</h3>
        <div style="background: white; padding: 20px; border-radius: 10px; display: inline-block; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <img src="${qrData.qrCode}" alt="QR Code" style="max-width: 250px;">
          <div style="margin-top: 15px; font-size: 16px; font-weight: bold; color: #2c3e50;">${asset.name}</div>
        </div>
        <p style="margin-top: 20px; font-size: 14px; color: #7f8c8d; word-break: break-all;">${assetUrl}</p>
        <p style="margin-top: 10px; font-size: 13px; color: #667eea;">📱 扫码进入领用表单页面</p>
        <div style="margin-top: 20px; display: flex; gap: 10px; justify-content: center;">
          <a href="/asset/${id}" target="_blank" class="btn btn-primary" style="display: inline-block; text-decoration: none;">🔗 打开领用页面</a>
          <button class="btn btn-success" onclick="downloadQRCode('${qrData.qrCode}', '${downloadName}')">💾 下载二维码</button>
          <button class="btn btn-secondary" onclick="closeModal('assetDetailModal')">关闭</button>
        </div>
      </div>
    `;
    
    showModal('assetDetailModal');
  } catch (err) {
    console.error('加载二维码失败:', err);
    alert('加载失败');
  }
}

// 下载二维码
function downloadQRCode(dataURL, filename) {
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataURL;
  link.click();
}

// 显示资产出入库记录

// 显示资产出入库记录
async function showAssetTransactions(assetId) {
  try {
    const res = await fetch(`/api/transactions?asset_id=${assetId}`);
    const transactions = await res.json();
    
    const content = document.getElementById('asset-detail-content');
    content.innerHTML = `
      <div style="padding: 20px;">
        <h3 style="margin-bottom: 20px; color: #2c3e50;">📋 出入库记录</h3>
        ${transactions.length === 0 ? '<p style="text-align:center;color:#7f8c8d;padding:40px;">暂无记录</p>' : `
          <div class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>类型</th>
                  <th>数量</th>
                  <th>操作人</th>
                  <th>备注</th>
                  <th>时间</th>
                </tr>
              </thead>
              <tbody>
                ${transactions.map(t => `
                  <tr>
                    <td>${t.id}</td>
                    <td><span class="badge badge-${t.type}">${t.type === 'in' ? '📥 入库' : '📤 出库'}</span></td>
                    <td style="font-weight:600;">${t.quantity}</td>
                    <td>${t.person_name || '-'}</td>
                    <td>${t.notes || '-'}</td>
                    <td>${new Date(t.created_at).toLocaleString('zh-CN')}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `}
        <div style="margin-top:20px;text-align:right;">
          <button class="btn btn-secondary" onclick="closeModal('assetDetailModal')">关闭</button>
        </div>
      </div>
    `;
    
    showModal('assetDetailModal');
  } catch (err) {
    console.error('加载记录失败:', err);
    alert('加载失败');
  }
}

// ============ 子页面导航函数 ============

// 打开资产详情
async function openAssetDetail(id) {
  if (!id) {
    console.error("openAssetDetail: ID 为 null 或 undefined");
    alert("错误：资产 ID 无效");
    return;
  }
  currentAssetId = id;
  try {
    const res = await fetch(`/api/assets/${id}`);
    const asset = await res.json();
    
    const minStock = asset.min_quantity || 5;
    const available = Math.max(0, asset.quantity - minStock);
    
    // 填充详情数据
    document.getElementById('detail-id').textContent = asset.id;
    document.getElementById('detail-name').textContent = asset.name;
    document.getElementById('detail-category').textContent = asset.category;
    document.getElementById('detail-quantity').textContent = `${asset.quantity} ${asset.unit}`;
    document.getElementById('detail-unit').textContent = asset.unit;
    document.getElementById('detail-location').textContent = asset.location || '-';
    document.getElementById('detail-min-stock').textContent = `${minStock} ${asset.unit}`;
    document.getElementById('detail-available').textContent = `${available} ${asset.unit}`;
    document.getElementById('detail-description').textContent = asset.description || '-';
    
    // 填充编辑表单
    document.getElementById('edit-asset-id-inline').value = id;
    document.getElementById('edit-asset-name-inline').value = asset.name;
    document.getElementById('edit-asset-category-inline').value = asset.category;
    document.getElementById('edit-asset-quantity-inline').value = asset.quantity;
    document.getElementById('edit-asset-unit-inline').value = asset.unit;
    document.getElementById('edit-asset-location-inline').value = asset.location || '';
    document.getElementById('edit-asset-description-inline').value = asset.description || '';
    document.getElementById('edit-asset-min-stock-inline').value = minStock;
    
    // 填充分类选择
    const categories = await fetch('/api/categories').then(r => r.json());
    const categorySelect = document.getElementById('edit-asset-category-inline');
    categorySelect.innerHTML = categories.map(cat => 
      `<option value="${cat.name}">${cat.name}</option>`
    ).join('');
    
    // 加载变化趋势
    loadAssetTrend(id);
    
    // 默认显示查看模式
    document.getElementById('asset-view-mode').style.display = 'block';
    document.getElementById('asset-edit-mode').style.display = 'none';
    document.getElementById('edit-toggle-btn').textContent = '✏️ 编辑';
    
    navigateTo('page-asset-detail');
  } catch (err) {
    console.error('加载资产详情失败:', err);
    alert('加载失败');
  }
}

// 加载物品变化趋势
async function loadAssetTrend(assetId) {
  try {
    const token = localStorage.getItem('token');
    const res = await fetch(`/api/stats/asset/${assetId}/trend`, {
      headers: token ? { 'Authorization': 'Bearer ' + token } : {}
    });
    
    if (!res.ok) {
      throw new Error('HTTP ' + res.status);
    }
    
    const data = await res.json();
    const chartContainer = document.getElementById('asset-trend-chart');
    
    console.log('趋势数据:', data);
    
    if (!data || data.length === 0) {
      chartContainer.innerHTML = '<p style="text-align:center;color:#95a5a6;padding:40px;">暂无变化记录</p>';
      return;
    }
    
    const stocks = data.map(d => d.stock);
    const maxStock = Math.max(...stocks);
    const minStock = Math.min(...stocks);
    const range = maxStock - minStock || 1;
    const padding = 40;
    const chartHeight = 200;
    const chartWidth = Math.max(350, data.length * 50);
    
    // 生成折线路径
    const points = data.map((d, i) => {
      const x = 40 + (i / Math.max(data.length - 1, 1)) * (chartWidth - 60);
      const y = padding + ((maxStock - d.stock) / range) * (chartHeight - padding * 2);
      return [x, y, d];
    });
    
    const polylinePoints = points.map(p => p[0] + ',' + p[1]).join(' ');
    
    // 生成填充区域
    const fillPoints = '40,' + (chartHeight - padding) + ' ' + polylinePoints + ' ' + (chartWidth - 20) + ',' + (chartHeight - padding);
    
    chartContainer.innerHTML = `
      <div style="overflow-x:auto;">
        <svg width="${chartWidth}" height="${chartHeight + 30}">
          <!-- 网格线 -->
          <line x1="40" y1="${padding}" x2="${chartWidth - 20}" y2="${padding}" stroke="#ecf0f1" stroke-width="1"/>
          <line x1="40" y1="${padding + (chartHeight - padding * 2) / 2}" x2="${chartWidth - 20}" y2="${padding + (chartHeight - padding * 2) / 2}" stroke="#ecf0f1" stroke-width="1"/>
          <line x1="40" y1="${chartHeight - padding}" x2="${chartWidth - 20}" y2="${chartHeight - padding}" stroke="#ecf0f1" stroke-width="1"/>
          
          <!-- 填充区域 -->
          <polygon points="${fillPoints}" fill="rgba(52, 152, 219, 0.1)"/>
          
          <!-- 折线 -->
          <polyline points="${polylinePoints}" fill="none" stroke="#3498db" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
          
          <!-- 数据点 -->
          ${points.map(p => `<circle cx="${p[0]}" cy="${p[1]}" r="4" fill="#3498db" stroke="white" stroke-width="2"><title>${p[2].date}: ${p[2].stock}个</title></circle>`).join('')}
        </svg>
        
        <!-- Y 轴标签 -->
        <div style="position:relative;height:0;">
          <div style="position:absolute;left:5px;top:${padding - 8}px;font-size:11px;color:#95a5a6;">${maxStock}</div>
          <div style="position:absolute;left:5px;top:${padding + (chartHeight - padding * 2) / 2 - 6}px;font-size:11px;color:#95a5a6;">${Math.round((maxStock + minStock) / 2)}</div>
          <div style="position:absolute;left:5px;top:${chartHeight - padding - 6}px;font-size:11px;color:#95a5a6;">${minStock}</div>
        </div>
        
        <!-- X 轴标签 -->
        <div style="display:flex;justify-content:space-between;padding:5px 40px 0;font-size:10px;color:#95a5a6;overflow-x:auto;">
          ${data.filter((_, i) => i % Math.ceil(data.length / 5) === 0).map(d => `<span>${d.date.slice(5)}</span>`).join('')}
        </div>
      </div>
      <div style="margin-top:10px;text-align:center;font-size:12px;color:#7f8c8d;">
        <span style="display:inline-flex;align-items:center;gap:5px;">
          <span style="width:15px;height:3px;background:#3498db;border-radius:2px;"></span>
          库存数量
        </span>
      </div>
    `;
  } catch (err) {
    console.error('加载趋势失败:', err);
    document.getElementById('asset-trend-chart').innerHTML = '<p style="text-align:center;color:#e74c3c;padding:20px;">加载失败：' + err.message + '</p>';
  }
}

// 切换编辑模式
function toggleAssetEdit() {
  const viewMode = document.getElementById('asset-view-mode');
  const editMode = document.getElementById('asset-edit-mode');
  const editBtn = document.getElementById('edit-toggle-btn');
  
  if (viewMode.style.display !== 'none') {
    viewMode.style.display = 'none';
    editMode.style.display = 'block';
    editBtn.textContent = '👁️ 查看';
  } else {
    viewMode.style.display = 'block';
    editMode.style.display = 'none';
    editBtn.textContent = '✏️ 编辑';
  }
}

// 内联编辑资产提交
async function handleEditAssetInline(e) {
  e.preventDefault();
  
  const id = document.getElementById('edit-asset-id-inline').value;
  const data = {
    name: document.getElementById('edit-asset-name-inline').value,
    category: document.getElementById('edit-asset-category-inline').value,
    quantity: parseInt(document.getElementById('edit-asset-quantity-inline').value),
    unit: document.getElementById('edit-asset-unit-inline').value,
    location: document.getElementById('edit-asset-location-inline').value,
    description: document.getElementById('edit-asset-description-inline').value,
    min_quantity: parseInt(document.getElementById('edit-asset-min-stock-inline').value) || 5
  };
  
  const token = localStorage.getItem('token');
  
  try {
    const res = await fetch(`/api/assets/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });
    
    if (res.ok) {
      alert('✅ 资产已更新');
      toggleAssetEdit();
      openAssetDetail(id); // 重新加载详情
      loadAssets(); // 刷新列表
    } else {
      const error = await res.json();
      throw new Error(error.error || '更新失败');
    }
  } catch (err) {
    console.error('更新资产失败:', err);
    alert(err.message);
  }
}

// 打开入库页面
async function openStockIn(id) {
  currentAssetId = id;
  try {
    const res = await fetch(`/api/assets/${id}`);
    const asset = await res.json();
    
    document.getElementById('stock-in-asset-id').value = id;
    document.getElementById('stock-in-name').value = asset.name;
    document.getElementById('stock-in-current').value = `${asset.quantity} ${asset.unit}`;
    
    navigateTo('page-stock-in');
  } catch (err) {
    console.error('加载资产信息失败:', err);
    alert('加载失败');
  }
}

// 入库提交
async function handleStockIn(e) {
  e.preventDefault();
  
  const assetId = document.getElementById('stock-in-asset-id').value;
  const formData = new FormData(e.target);
  const data = {
    asset_id: parseInt(assetId),
    quantity: parseInt(formData.get('quantity')),
    person_name: currentUser?.username || '管理员',
    notes: formData.get('notes') || '入库'
  };
  
  const token = localStorage.getItem('token');
  
  try {
    const res = await fetch('/api/transactions/in', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });
    
    if (res.ok) {
      alert('✅ 入库成功');
      navigateTo('assets');
      loadAssets();
    } else {
      const error = await res.json();
      throw new Error(error.error || '入库失败');
    }
  } catch (err) {
    console.error('入库失败:', err);
    alert(err.message);
  }
}

// 打开出库页面
async function openStockOut(id) {
  currentAssetId = id;
  try {
    const res = await fetch(`/api/assets/${id}`);
    const asset = await res.json();
    
    const minStock = asset.min_quantity || 5;
    const available = Math.max(0, asset.quantity - minStock);
    
    document.getElementById('stock-out-asset-id').value = id;
    document.getElementById('stock-out-name').value = asset.name;
    document.getElementById('stock-out-current').value = `${asset.quantity} ${asset.unit}`;
    document.getElementById('stock-out-available').value = `${available} ${asset.unit}`;
    document.getElementById('stock-out-quantity').max = available;
    
    navigateTo('page-stock-out');
  } catch (err) {
    console.error('加载资产信息失败:', err);
    alert('加载失败');
  }
}

// 出库提交
async function handleStockOut(e) {
  e.preventDefault();
  
  const assetId = document.getElementById('stock-out-asset-id').value;
  const formData = new FormData(e.target);
  const data = {
    asset_id: parseInt(assetId),
    quantity: parseInt(formData.get('quantity')),
    person_name: currentUser?.username || '管理员',
    room_number: formData.get('room_number') || '',
    notes: formData.get('notes') || '领用'
  };
  
  const token = localStorage.getItem('token');
  
  try {
    const res = await fetch('/api/transactions/out', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });
    
    if (res.ok) {
      alert('✅ 出库成功');
      navigateTo('assets');
      loadAssets();
    } else {
      const error = await res.json();
      throw new Error(error.error || '出库失败');
    }
  } catch (err) {
    console.error('出库失败:', err);
    alert(err.message);
  }
}

// 打开二维码页面
async function openQRCode(id) {
  currentAssetId = id;
  try {
    const [assetRes, qrRes] = await Promise.all([
      fetch(`/api/assets/${id}`),
      fetch(`/api/assets/${id}/qrcode`)
    ]);
    
    const asset = await assetRes.json();
    const qrData = await qrRes.json();
    
    const baseUrl = window.location.origin;
    const assetUrl = `${baseUrl}/asset/${id}`;
    
    const downloadName = qrData.download?.filename || `${asset.name}-二维码.png`;
    
    const content = document.getElementById('qrcode-content');
    content.innerHTML = `
      <div style="padding:30px;text-align:center;">
        <div style="background:white;padding:20px;border-radius:10px;display:inline-block;box-shadow:0 2px 10px rgba(0,0,0,0.1);">
          <img src="${qrData.qrCode}" alt="QR Code" style="max-width:250px;">
          <div style="margin-top:15px;font-size:18px;font-weight:bold;color:#2c3e50;">${asset.name}</div>
        </div>
        <p style="margin-top:20px;font-size:14px;color:#7f8c8d;word-break:break-all;">${assetUrl}</p>
        <p style="margin-top:10px;font-size:13px;color:#667eea;">📱 扫码进入领用表单页面</p>
        <div style="margin-top:20px;display:flex;gap:10px;justify-content:center;">
          <a href="/asset/${id}" target="_blank" class="btn btn-primary">🔗 打开领用页面</a>
          <button class="btn btn-success" onclick="downloadQRCode('${qrData.qrCode}', '${downloadName}')">💾 下载二维码</button>
        </div>
      </div>
    `;
    
    navigateTo('page-qrcode');
  } catch (err) {
    console.error('加载二维码失败:', err);
    alert('加载失败');
  }
}

// 打开出入库记录页面
async function openTransactions(id) {
  currentAssetId = id;
  try {
    const res = await fetch(`/api/transactions?asset_id=${id}`);
    const transactions = await res.json();
    
    const content = document.getElementById('transactions-content');
    content.innerHTML = `
      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>类型</th>
              <th>数量</th>
              <th>操作人</th>
              <th>房间号</th>
              <th>备注</th>
              <th>时间</th>
            </tr>
          </thead>
          <tbody>
            ${transactions.length === 0 ? '<tr><td colspan="7" class="empty-state">暂无记录</td></tr>' : 
              transactions.map(t => `
                <tr>
                  <td>${t.id}</td>
                  <td><span class="badge badge-${t.type}">${t.type === 'in' ? '📥 入库' : '📤 出库'}</span></td>
                  <td style="font-weight:600;">${t.quantity}</td>
                  <td>${t.person_name || '-'}</td>
                  <td>${t.room_number || '-'}</td>
                  <td>${t.notes || '-'}</td>
                  <td>${new Date(t.created_at).toLocaleString('zh-CN')}</td>
                </tr>
              `).join('')}
          </tbody>
        </table>
      </div>
    `;
    
    navigateTo('page-transactions');
  } catch (err) {
    console.error('加载记录失败:', err);
    alert('加载失败');
  }
}

// 编辑资产（保留旧函数兼容）
async function editAsset(id) {
  openEditAsset(id);
}

// 保存编辑的资产
async function handleEditAsset(e) {
  e.preventDefault();
  
  const id = document.getElementById('edit-asset-id').value;
  const data = {
    name: document.getElementById('edit-asset-name').value,
    category: document.getElementById('edit-asset-category').value,
    quantity: parseInt(document.getElementById('edit-asset-quantity').value),
    unit: document.getElementById('edit-asset-unit').value,
    location: document.getElementById('edit-asset-location').value,
    description: document.getElementById('edit-asset-description').value,
    min_quantity: parseInt(document.getElementById('edit-asset-min-stock').value) || 5
  };
  
  const token = localStorage.getItem('token');
  
  try {
    const res = await fetch(`/api/assets/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });
    
    if (res.ok) {
      closeModal('editAssetModal');
      loadAssets();
      alert('资产已更新');
    } else {
      const error = await res.json();
      throw new Error(error.error || '更新失败');
    }
  } catch (err) {
    console.error('更新资产失败:', err);
    alert(err.message);
  }
}

// 显示出入库模态框
async function showTransactionModal(assetId, type) {
  try {
    const res = await fetch(`/api/assets/${assetId}`);
    const asset = await res.json();
    
    document.getElementById('trans-asset-id').value = assetId;
    document.getElementById('trans-asset-name').value = asset.name;
    document.getElementById('trans-current-stock').value = `${asset.quantity} ${asset.unit}`;
    document.getElementById('transaction-modal-title').textContent = type === 'in' ? '入库' : '出库';
    
    // 设置表单 action
    const form = document.getElementById('transaction-form');
    form.dataset.type = type;
    
    showModal('transactionModal');
  } catch (err) {
    console.error('加载资产信息失败:', err);
    alert('加载失败');
  }
}

// 处理新增资产
async function handleAddAsset(e) {
  e.preventDefault();
  
  const form = e.target;
  const data = {
    name: form.name.value,
    category: form.category.value,
    quantity: parseInt(form.quantity.value) || 0,
    unit: form.unit.value,
    location: form.location.value
  };
  
  try {
    const res = await fetch('/api/assets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    if (res.ok) {
      closeModal('addAssetModal');
      form.reset();
      loadAssets();
      alert('资产添加成功！');
    } else {
      const error = await res.json();
      alert(error.error || '添加失败');
    }
  } catch (err) {
    console.error('添加资产失败:', err);
    alert('添加失败');
  }
}

// 处理出入库
async function handleTransaction(e) {
  e.preventDefault();
  
  const form = e.target;
  const type = form.dataset.type;
  const data = {
    asset_id: parseInt(form.asset_id.value),
    quantity: parseInt(form.quantity.value),
    person_name: form.person_name.value,
    notes: form.notes.value
  };
  
  try {
    const res = await fetch(`/api/transactions/${type}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    if (res.ok) {
      closeModal('transactionModal');
      form.reset();
      loadAssets();
      loadTransactions();
      alert(`${type === 'in' ? '入库' : '出库'}成功！`);
    } else {
      const error = await res.json();
      alert(error.error || '操作失败');
    }
  } catch (err) {
    console.error('出入库操作失败:', err);
    alert('操作失败');
  }
}

// 加载入库记录
async function loadInTransactions() {
  await loadTransactionsByType('in', 'transactions-in-body', 'in');
}

// 加载出库记录
async function loadOutTransactions() {
  await loadTransactionsByType('out', 'transactions-out-body', 'out');
}

// 通用加载交易记录函数
async function loadTransactionsByType(type, tbodyId, prefix) {
  try {
    const searchInput = document.getElementById(`${prefix}-search-input`)?.value || '';
    const assetId = document.getElementById(`${prefix}-asset-filter`)?.value || '';
    const dateStart = document.getElementById(`${prefix}-date-start`)?.value || '';
    const dateEnd = document.getElementById(`${prefix}-date-end`)?.value || '';
    
    let url = `/api/transactions?type=${type}&`;
    if (assetId) url += `asset_id=${assetId}&`;
    if (dateStart) url += `date_start=${dateStart}&`;
    if (dateEnd) url += `date_end=${dateEnd}&`;
    
    const res = await fetch(url, { headers });
    const transactions = await res.json();
    
    // 前端搜索过滤（按名称或 ID）
    const filtered = searchInput 
      ? transactions.filter(t => 
          t.asset_name.toLowerCase().includes(searchInput.toLowerCase()) ||
          t.asset_id.toString().includes(searchInput)
        )
      : transactions;
    
    const tbody = document.getElementById(tbodyId);
    if (tbody) {
      if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-state">暂无记录</td></tr>';
        return;
      }
      
      const isOut = type === 'out';
      tbody.innerHTML = filtered.map(trans => `
        <tr>
          <td>${trans.id}</td>
          <td>${trans.asset_name} <small style="color:#7f8c8d;">(#${trans.asset_id})</small></td>
          <td><span class="badge badge-${type}">${trans.quantity}</span></td>
          <td>${trans.person_name || '-'}</td>
          <td>${trans.room_number || '-'}</td>
          <td>${trans.notes || '-'}</td>
          <td>${new Date(trans.created_at).toLocaleString('zh-CN')}</td>
        </tr>
      `).join('');
    }
  } catch (err) {
    console.error('加载交易记录失败:', err);
  }
}

// 初始化扫码页面
function initScanPage() {
  // 重置扫码结果
  const scanResult = document.getElementById('scan-result');
  if (scanResult) scanResult.classList.remove('show', 'success', 'error');
  const scanInput = document.getElementById('scan-input');
  if (scanInput) scanInput.value = '';
  
  // 关闭摄像头
  if (cameraStream) {
    stopCamera();
  }
}

// 处理扫码
async function handleScan() {
  const input = document.getElementById('scan-input');
  const resultDiv = document.getElementById('scan-result');
  const qrCode = input.value.trim();
  
  if (!qrCode) {
    showScanResult('请输入或扫描二维码', 'error');
    return;
  }
  
  try {
    // 尝试通过二维码或 ID 查找资产
    let asset;
    
    // 如果是数字，当作 ID
    if (/^\d+$/.test(qrCode)) {
      const res = await fetch(`/api/assets/${qrCode}`);
      if (res.ok) {
        asset = await res.json();
      }
    } else {
      // 否则尝试通过二维码查找
      const assetsRes = await fetch('/api/assets');
      const assets = await assetsRes.json();
      asset = assets.find(a => a.qr_code === qrCode);
    }
    
    if (!asset) {
      showScanResult('未找到该资产', 'error');
      return;
    }
    
    // 显示资产信息
    showScanResult(`
      <strong>${asset.name}</strong><br>
      分类：${asset.category}<br>
      当前库存：${asset.quantity} ${asset.unit}<br>
      <div style="margin-top: 15px;">
        <input type="number" id="scan-quantity" placeholder="数量" min="1" value="1" 
               style="padding: 8px; width: 100px; margin-right: 10px;" 
               ${currentScanType === 'out' && asset.quantity === 0 ? 'disabled' : ''}>
        <button class="btn btn-primary btn-small" onclick="confirmScanOut(${asset.id})">
          确认${currentScanType === 'in' ? '入库' : '出库'}
        </button>
      </div>
    `, 'success');
    
  } catch (err) {
    console.error('扫码失败:', err);
    showScanResult('查询失败', 'error');
  }
}

// 确认扫码出入库
async function confirmScanOut(assetId) {
  const quantityInput = document.getElementById('scan-quantity');
  const quantity = parseInt(quantityInput.value);
  
  if (!quantity || quantity <= 0) {
    alert('请输入有效数量');
    return;
  }
  
  try {
    const res = await fetch(`/api/transactions/${currentScanType}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        asset_id: assetId,
        quantity: quantity,
        person_name: '扫码登记',
        notes: `${currentScanType === 'in' ? '扫码入库' : '扫码出库'}`
      })
    });
    
    if (res.ok) {
      showScanResult(`✅ ${currentScanType === 'in' ? '入库' : '出库'}成功！`, 'success');
      setTimeout(() => {
        document.getElementById('scan-input').value = '';
        document.getElementById('scan-result').classList.remove('show');
      }, 2000);
    } else {
      const error = await res.json();
      showScanResult(error.error || '操作失败', 'error');
    }
  } catch (err) {
    console.error('操作失败:', err);
    showScanResult('操作失败', 'error');
  }
}

// 显示扫码结果
function showScanResult(html, type) {
  const resultDiv = document.getElementById('scan-result');
  resultDiv.innerHTML = html;
  resultDiv.className = `scan-result show ${type}`;
}

// 切换摄像头
async function toggleCamera() {
  const video = document.getElementById('qr-video');
  const canvas = document.getElementById('qr-canvas');
  
  if (cameraStream) {
    stopCamera();
  } else {
    try {
      cameraStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      video.srcObject = cameraStream;
      video.classList.add('active');
      canvas.classList.add('active');
      
      // 使用 jsQR 库识别二维码
      startQrScanner();
    } catch (err) {
      console.error('无法访问摄像头:', err);
      alert('无法访问摄像头，请手动输入资产 ID');
    }
  }
}

// 停止摄像头
function stopCamera() {
  if (cameraStream) {
    cameraStream.getTracks().forEach(track => track.stop());
    cameraStream = null;
  }
  document.getElementById('qr-video').classList.remove('active');
  document.getElementById('qr-canvas').classList.remove('active');
}

// 启动二维码扫描
let qrScannerInterval = null;

async function startQrScanner() {
  // 动态加载 jsQR 库
  if (typeof jsQR === 'undefined') {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js';
    script.onload = () => startScanning();
    document.head.appendChild(script);
  } else {
    startScanning();
  }
}

function startScanning() {
  const video = document.getElementById('qr-video');
  const canvas = document.getElementById('qr-canvas');
  const canvasCtx = canvas.getContext('2d');
  
  qrScannerInterval = setInterval(() => {
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.height = video.videoHeight;
      canvas.width = video.videoWidth;
      canvasCtx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      const imageData = canvasCtx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height);
      
      if (code) {
        document.getElementById('scan-input').value = code.data;
        handleScan();
      }
    }
  }, 100);
}

// 模态框控制
function showModal(modalId) {
  document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
  document.getElementById(modalId).classList.remove('active');
}

// 点击模态框外部关闭
window.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal')) {
    e.target.classList.remove('active');
  }
});

// 显示修改密码模态框
function showChangePasswordModal() {
  document.getElementById('change-password-form').reset();
  showModal('changePasswordModal');
}

// 修改密码
async function handleChangePassword(e) {
  e.preventDefault();
  
  const oldPassword = document.getElementById('old-password').value;
  const newPassword = document.getElementById('new-password').value;
  const confirmPassword = document.getElementById('confirm-password').value;
  
  if (newPassword !== confirmPassword) {
    alert('两次输入的新密码不一致');
    return;
  }
  
  const token = localStorage.getItem('token');
  
  try {
    const res = await fetch('/api/auth/password', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ oldPassword, newPassword })
    });
    
    if (res.ok) {
      closeModal('changePasswordModal');
      alert('密码已修改，请重新登录');
      logout();
    } else {
      const error = await res.json();
      throw new Error(error.error || '修改失败');
    }
  } catch (err) {
    console.error('修改密码失败:', err);
    alert(err.message);
  }
}

// 重置用户密码
function resetUserPassword(userId, username) {
  document.getElementById('reset-user-id').value = userId;
  document.getElementById('reset-username').value = username;
  document.getElementById('reset-new-password').value = '';
  showModal('resetPasswordModal');
}

// 处理重置密码
async function handleResetPassword(e) {
  e.preventDefault();
  
  const userId = document.getElementById('reset-user-id').value;
  const newPassword = document.getElementById('reset-new-password').value;
  const token = localStorage.getItem('token');
  
  try {
    const res = await fetch(`/api/users/${userId}/password`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ newPassword })
    });
    
    if (res.ok) {
      closeModal('resetPasswordModal');
      alert('密码已重置');
    } else {
      const error = await res.json();
      throw new Error(error.error || '重置失败');
    }
  } catch (err) {
    console.error('重置密码失败:', err);
    alert(err.message);
  }
}

// 导出资产 Excel
async function exportAssets() {
  const token = localStorage.getItem('token');
  const url = new URL('/api/export/assets', window.location.origin);
  url.searchParams.append('token', token);
  window.open(url.toString(), '_blank');
}

// 显示导入模态框
function showImportModal() {
  document.getElementById('import-file').value = '';
  document.getElementById('import-result').innerHTML = '';
  showModal('importStockModal');
}

// 下载导入模板
function downloadImportTemplate() {
  const token = localStorage.getItem('token');
  const url = new URL('/api/export/import-template', window.location.origin);
  url.searchParams.append('token', token);
  window.open(url.toString(), '_blank');
}

// 处理 Excel 导入
async function processImport() {
  const fileInput = document.getElementById('import-file');
  const file = fileInput.files[0];
  
  if (!file) {
    alert('请选择文件');
    return;
  }
  
  const resultDiv = document.getElementById('import-result');
  resultDiv.innerHTML = '<p style="text-align:center;color:#667eea;">🔄 处理中...</p>';
  
  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(file);
    
    const worksheet = workbook.getWorksheet(1);
    const items = [];
    
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1 || rowNumber > worksheet.rowCount - 1) return; // 跳过表头和说明行
      
      const quantity = row.getCell(4).value; // 第 4 列：入库数量
      if (quantity && quantity > 0) {
        items.push({
          id: row.getCell(1).value || null,
          name: row.getCell(2).value,
          category: row.getCell(3).value || '其他',
          quantity: quantity,
          unit: row.getCell(5).value || '个',
          location: row.getCell(6).value || '',
          notes: row.getCell(7).value || ''
        });
      }
    });
    
    if (items.length === 0) {
      resultDiv.innerHTML = '<p style="color:#e74c3c;text-align:center;padding:20px;">❌ 未找到有效的入库数据，请在"入库数量"列填写数量</p>';
      return;
    }
    
    const token = localStorage.getItem('token');
    const res = await fetch('/api/import/stock-by-id', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ items })
    });
    
    const data = await res.json();
    
    const successCount = data.results.filter(r => r.status === 'success').length;
    const errorCount = data.results.filter(r => r.status === 'error').length;
    const createCount = data.results.filter(r => r.type === 'create').length;
    const updateCount = data.results.filter(r => r.type === 'update').length;
    
    let html = `
      <div style="margin-top:10px;">
        <p style="color:#27ae60;font-weight:600;">✅ 成功：${successCount} 项</p>
        ${createCount > 0 ? `<p style="color:#3498db;font-weight:600;">🆕 新品：${createCount} 项</p>` : ''}
        ${updateCount > 0 ? `<p style="color:#2ecc71;font-weight:600;">📈 更新：${updateCount} 项</p>` : ''}
        ${errorCount > 0 ? `<p style="color:#e74c3c;font-weight:600;">❌ 失败：${errorCount} 项</p>` : ''}
      </div>
      <div style="margin-top:10px;max-height:300px;overflow-y:auto;">
    `;
    
    data.results.forEach(r => {
      if (r.status === 'success') {
        if (r.type === 'create') {
          html += `<div style="color:#3498db;font-size:13px;padding:5px 0;">🆕 ${r.name}: 创建新品，入库 ${r.newQuantity} ${r.unit||'个'} (分类：${r.category||'其他'})</div>`;
        } else {
          html += `<div style="color:#27ae60;font-size:13px;padding:5px 0;">✅ ${r.name}: ${r.oldQuantity} → ${r.newQuantity} (+${r.quantity})</div>`;
        }
      } else {
        html += `<div style="color:#e74c3c;font-size:13px;padding:5px 0;">❌ ${r.name || r.id}: ${r.message}</div>`;
      }
    });
    
    html += '</div>';
    resultDiv.innerHTML = html;
    
    if (successCount > 0) {
      setTimeout(() => {
        closeModal('importStockModal');
        loadAssets();
      }, 2000);
    }
  } catch (err) {
    console.error('导入失败:', err);
    resultDiv.innerHTML = `<p style="color:#e74c3c;text-align:center;padding:20px;">❌ 导入失败：${err.message}</p>`;
  }
}


// 排序功能 - ID列点击
const idHeader = document.querySelector('.data-table thead th:nth-child(1)');
if (idHeader) {
  idHeader.style.cursor = 'pointer';
  idHeader.addEventListener('click', () => {
    currentSortOrder = currentSortBy === 'id' && currentSortOrder === 'desc' ? 'asc' : 'desc';
    currentSortBy = 'id';
    updateSortIndicators();
    loadAssets('id', currentSortOrder);
  });
}

// 排序功能 - 数量列点击  
const quantityHeader = document.querySelector('.data-table thead th:nth-child(4)');
if (quantityHeader) {
  quantityHeader.style.cursor = 'pointer';
  quantityHeader.addEventListener('click', () => {
    currentSortOrder = currentSortBy === 'quantity' && currentSortOrder === 'desc' ? 'asc' : 'desc';
    currentSortBy = 'quantity';
    updateSortIndicators();
    loadAssets('quantity', currentSortOrder);
  });
}
// 更新排序指示器
function updateSortIndicators() {
  const idIndicator = document.getElementById('sort-id-indicator');
  const quantityIndicator = document.getElementById('sort-quantity-indicator');
  
  if (idIndicator) {
    idIndicator.textContent = currentSortBy === 'id' ? (currentSortOrder === 'desc' ? '▼' : '▲') : '';
  }
  if (quantityIndicator) {
    quantityIndicator.textContent = currentSortBy === 'quantity' ? (currentSortOrder === 'desc' ? '▼' : '▲') : '';
  }
}


// 排序状态
let currentSort = { field: 'id', order: 'DESC' };

// 切换排序
function toggleSort(field) {
  if (currentSort.field === field) {
    currentSort.order = currentSort.order === 'ASC' ? 'DESC' : 'ASC';
  } else {
    currentSort.field = field;
    currentSort.order = 'DESC';
  }
  
  document.querySelectorAll('.sortable').forEach(th => {
    th.classList.remove('active', 'asc', 'desc');
    const indicator = th.querySelector('.sort-icon');
    if (indicator) indicator.textContent = '';
  });
  
  const activeTh = document.querySelector('.sortable[data-sort="' + field + '"]');
  if (activeTh) {
    activeTh.classList.add('active', currentSort.order.toLowerCase());
    const indicator = activeTh.querySelector('.sort-icon');
    if (indicator) indicator.textContent = currentSort.order === 'ASC' ? '↑' : '↓';
  }
  
  loadAssets();
}

// 加载资产列表
async function loadAssets() {
  const token = localStorage.getItem("token");
  const headers = token ? { "Authorization": "Bearer " + token } : {};
  try {
    const search = document.getElementById('search-input')?.value || '';
    const category = document.getElementById('category-filter')?.value || '';
    
    let url = '/api/assets?search=' + encodeURIComponent(search) + '&category=' + encodeURIComponent(category);
    url += '&sort=' + encodeURIComponent(currentSort.field) + '&order=' + encodeURIComponent(currentSort.order);
    
    const res = await fetch(url, { headers });
    const assets = await res.json();
    
    const tbody = document.getElementById('assets-table-body');
    if (tbody) {
      if (!Array.isArray(assets)) { console.error("API 返回错误:", assets); tbody.innerHTML = '<tr><td colspan="7" class="empty-state">加载失败，请重新登录</td></tr>'; return; }
    if (assets.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-state">暂无资产数据</td></tr>';
        return;
      }
      
      tbody.innerHTML = assets.map(asset => 
        '<tr>' +
        '<td>' + asset.id + '</td>' +
        '<td>' + asset.name + '</td>' +
        '<td><span class="badge" style="background: ' + getCategoryColor(asset.category) + '20; color: ' + getCategoryColor(asset.category) + '">' + asset.category + '</span></td>' +
        '<td>' + asset.quantity + '</td>' +
        '<td>' + asset.unit + '</td>' +
        '<td>' + (asset.location || '-') + '</td>' +
        '<td class="actions">' +
        '<button class="btn btn-small btn-primary" onclick="openAssetDetail(' + asset.id + ')">详情</button>' +
        '<button class="btn btn-small btn-success" onclick="openStockIn(' + asset.id + ')">入库</button>' +
        '<button class="btn btn-small btn-danger" onclick="openStockOut(' + asset.id + ')">出库</button>' +
        '<button class="btn btn-small btn-secondary" onclick="openQRCode(' + asset.id + ')">二维码</button>' +
        '<button class="btn btn-small btn-info" onclick="openTransactions(' + asset.id + ')">记录</button>' +
        '</td></tr>'
      ).join('');
    }
  } catch (err) {
    console.error('加载资产列表失败:', err);
  }
}

// 加载入库记录
async function loadInTransactions() {
  const token = localStorage.getItem('token');
  const search = document.getElementById('in-search-input')?.value || '';
  const dateStart = document.getElementById('in-date-start')?.value || '';
  const dateEnd = document.getElementById('in-date-end')?.value || '';
  
  let url = '/api/transactions?type=in';
  if (dateStart) url += '&date_start=' + dateStart;
  if (dateEnd) url += '&date_end=' + dateEnd;
  
  const res = await fetch(url, {
    headers: token ? { 'Authorization': 'Bearer ' + token } : {}
  });
  let transactions = await res.json();
  
  // 前端搜索（按物品名称或 ID）
  if (search) {
    transactions = transactions.filter(t => 
      t.asset_name.includes(search) || t.asset_id.toString().includes(search)
    );
  }
  
  const tbody = document.getElementById('transactions-in-body');
  if (tbody) {
    tbody.innerHTML = transactions.length === 0 ? '<tr><td colspan="7" class="empty-state">暂无记录</td></tr>' :
      transactions.map(t => '<tr><td>' + t.id + '</td><td>' + t.asset_name + '</td><td>' + t.quantity + '</td><td>' + (t.person_name||'-') + '</td><td>' + (t.room_number||'-') + '</td><td>' + (t.notes||'-') + '</td><td>' + new Date(t.created_at).toLocaleString('zh-CN') + '</td></tr>').join('');
  }
}

// 加载出库记录
async function loadOutTransactions() {
  const token = localStorage.getItem('token');
  const search = document.getElementById('out-search-input')?.value || '';
  const dateStart = document.getElementById('out-date-start')?.value || '';
  const dateEnd = document.getElementById('out-date-end')?.value || '';
  
  let url = '/api/transactions?type=out';
  if (dateStart) url += '&date_start=' + dateStart;
  if (dateEnd) url += '&date_end=' + dateEnd;
  
  const res = await fetch(url, {
    headers: token ? { 'Authorization': 'Bearer ' + token } : {}
  });
  let transactions = await res.json();
  
  // 前端搜索（按物品名称或 ID）
  if (search) {
    transactions = transactions.filter(t => 
      t.asset_name.includes(search) || t.asset_id.toString().includes(search)
    );
  }
  
  const tbody = document.getElementById('transactions-out-body');
  if (tbody) {
    tbody.innerHTML = transactions.length === 0 ? '<tr><td colspan="7" class="empty-state">暂无记录</td></tr>' :
      transactions.map(t => '<tr><td>' + t.id + '</td><td>' + t.asset_name + '</td><td>' + t.quantity + '</td><td>' + (t.person_name||'-') + '</td><td>' + (t.room_number||'-') + '</td><td>' + (t.notes||'-') + '</td><td>' + new Date(t.created_at).toLocaleString('zh-CN') + '</td></tr>').join('');
  }
}

// 初始化扫码页面
function initScanPage() {
  const scanResult = document.getElementById('scan-result');
  if (scanResult) scanResult.classList.remove('show', 'success', 'error');
  const scanInput = document.getElementById('scan-input');
  if (scanInput) scanInput.value = '';
  if (cameraStream) stopCamera();
}

// 加载用户列表
async function loadUsers() {
  const token = localStorage.getItem('token');
  const res = await fetch('/api/users', {
    headers: token ? { 'Authorization': 'Bearer ' + token } : {}
  });
  const users = await res.json();
  const tbody = document.getElementById('users-table-body');
  if (tbody) {
    tbody.innerHTML = users.length === 0 ? '<tr><td colspan="5" class="empty-state">暂无用户</td></tr>' :
      users.map(u => '<tr><td>' + u.id + '</td><td>' + u.username + '</td><td><span class="badge badge-' + (u.role==='admin'?'danger':'primary') + '">' + (u.role==='admin'?'管理员':'用户') + '</span></td><td>' + new Date(u.created_at).toLocaleString('zh-CN') + '</td><td>' + (u.username!=='admin' ? '<button class="btn btn-small btn-warning" onclick="resetUserPassword('+u.id+',\''+u.username+'\')">重置密码</button> <button class="btn btn-small btn-danger" onclick="deleteUser('+u.id+',\''+u.username+'\')">删除</button>' : '<span style="color:#7f8c8d;font-size:12px;">默认账号</span>') + '</td></tr>').join('');
  }
}

// 获取分类颜色
function getCategoryColor(category) {
  const colors = {
    '文具用品': '#3498db',
    '办公设备': '#2ecc71',
    '耗材': '#e74c3c',
    '其他': '#95a5a6'
  };
  return colors[category] || '#3498db';
}

// 备份管理页面导航
function showBackupsPage() {
  document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
  document.getElementById('nav-backups').classList.add('active');
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('backups').classList.add('active');
  loadBackups();
}

// 加载备份列表
async function loadBackups() {
  const token = localStorage.getItem('token');
  try {
    const res = await fetch('/api/backups', {
      headers: token ? { 'Authorization': 'Bearer ' + token } : {}
    });
    const backups = await res.json();
    
    const tbody = document.getElementById('backups-table-body');
    if (backups.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" class="empty-state">暂无备份</td></tr>';
      return;
    }
    
    tbody.innerHTML = backups.map(b => {
      const size = (b.size / 1024).toFixed(1) + ' KB';
      const date = new Date(b.createdAt).toLocaleString('zh-CN');
      return '<tr>' +
        '<td>' + b.filename + '</td>' +
        '<td>' + size + '</td>' +
        '<td>' + date + '</td>' +
        '<td>' +
        '<button class="btn btn-small btn-primary" onclick="restoreBackup(\'' + b.filename + '\')">恢复</button> ' +
        '<button class="btn btn-small btn-danger" onclick="deleteBackup(\'' + b.filename + '\')">删除</button>' +
        '</td></tr>';
    }).join('');
  } catch (err) {
    console.error('加载备份列表失败:', err);
  }
}

// 创建备份
async function createBackup() {
  const token = localStorage.getItem('token');
  try {
    const res = await fetch('/api/backups', {
      method: 'POST',
      headers: token ? { 'Authorization': 'Bearer ' + token } : {}
    });
    const result = await res.json();
    if (result.success) {
      alert('✅ 备份创建成功：' + result.filename);
      loadBackups();
    } else {
      alert('❌ 备份失败：' + (result.error || '未知错误'));
    }
  } catch (err) {
    console.error('创建备份失败:', err);
    alert('❌ 创建备份失败：' + err.message);
  }
}

// 恢复备份
async function restoreBackup(filename) {
  if (!confirm('确定要恢复到备份 "' + filename + '" 吗？\n当前数据将被覆盖！')) {
    return;
  }
  
  const token = localStorage.getItem('token');
  try {
    const res = await fetch('/api/backups/restore', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify({ filename: filename })
    });
    const result = await res.json();
    if (result.success) {
      alert('✅ 数据已恢复！请刷新页面。');
      location.reload();
    } else {
      alert('❌ 恢复失败：' + (result.error || '未知错误'));
    }
  } catch (err) {
    console.error('恢复备份失败:', err);
    alert('❌ 恢复失败：' + err.message);
  }
}

// 删除备份
async function deleteBackup(filename) {
  if (!confirm('确定要删除备份 "' + filename + '" 吗？')) {
    return;
  }
  
  const token = localStorage.getItem('token');
  try {
    const res = await fetch('/api/backups/' + encodeURIComponent(filename), {
      method: 'DELETE',
      headers: token ? { 'Authorization': 'Bearer ' + token } : {}
    });
    const result = await res.json();
    if (result.success) {
      alert('✅ 备份已删除');
      loadBackups();
    } else {
      alert('❌ 删除失败：' + (result.error || '未知错误'));
    }
  } catch (err) {
    console.error('删除备份失败:', err);
    alert('❌ 删除失败：' + err.message);
  }
}

// 操作日志页面导航
function showLogsPage() {
  document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
  document.getElementById('nav-logs').classList.add('active');
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('logs').classList.add('active');
  loadLogs();
}

// 加载操作日志
async function loadLogs() {
  const token = localStorage.getItem('token');
  try {
    const res = await fetch('/api/logs?limit=100', {
      headers: token ? { 'Authorization': 'Bearer ' + token } : {}
    });
    const logs = await res.json();
    
    const tbody = document.getElementById('logs-table-body');
    if (logs.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="empty-state">暂无日志</td></tr>';
      return;
    }
    
    tbody.innerHTML = logs.map(log => {
      const time = new Date(log.timestamp).toLocaleString('zh-CN');
      const levelClass = log.level === 'ERROR' ? 'badge-danger' : (log.level === 'WARN' ? 'badge-warning' : 'badge-info');
      return '<tr>' +
        '<td>' + time + '</td>' +
        '<td><span class="badge ' + levelClass + '">' + log.level + '</span></td>' +
        '<td>' + (log.action || '-') + '</td>' +
        '<td style="max-width:400px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + (log.details || '-') + '</td>' +
        '<td>' + (log.user || '-') + '</td>' +
        '</tr>';
    }).join('');
  } catch (err) {
    console.error('加载日志失败:', err);
  }
}
