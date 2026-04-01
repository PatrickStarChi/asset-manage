// 资产管理系统前端逻辑

// API 基础路径
const API_BASE = '/api';

// 当前扫描的资产
let currentScanAsset = null;

// 当前排序状态
let currentSort = { field: 'created_at', order: 'DESC' };

// 初始化
document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  loadCategories();
  loadDashboard();
  initAddForm();
  initTransactionForm();
  initSearch();
});

// 导航
function initNavigation() {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      const page = item.dataset.page;
      showPage(page);
      
      // 更新激活状态
      document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');
    });
  });
}

function showPage(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(pageId).classList.add('active');
  
  // 页面特定加载
  if (pageId === 'dashboard') loadDashboard();
  if (pageId === 'assets') loadAssets();
  if (pageId === 'records') loadRecords();
  if (pageId === 'scan') initScanner();
}

// 加载分类
async function loadCategories() {
  try {
    const res = await fetch(`${API_BASE}/categories`);
    const categories = await res.json();
    
    const select = document.getElementById('category-select');
    if (select) {
      select.innerHTML = categories.map(c => 
        `<option value="${c.name}">${c.name}</option>`
      ).join('');
    }
  } catch (error) {
    console.error('加载分类失败:', error);
  }
}

// 加载仪表盘
async function loadDashboard() {
  try {
    const res = await fetch(`${API_BASE}/stats`);
    const stats = await res.json();
    
    document.getElementById('stat-total-assets').textContent = stats.totalAssets || 0;
    document.getElementById('stat-total-items').textContent = stats.totalItems || 0;
    document.getElementById('stat-low-stock').textContent = stats.lowStock || 0;
    
    // 分类统计
    const categoryContainer = document.getElementById('category-stats');
    if (categoryContainer && stats.categoryStats) {
      const maxCount = Math.max(...stats.categoryStats.map(c => c.count), 1);
      categoryContainer.innerHTML = stats.categoryStats.map(c => {
        const percent = (c.count / maxCount) * 100;
        return `
          <div class="category-bar">
            <div class="category-label">${c.category}</div>
            <div class="category-bar-container">
              <div class="category-bar-fill" style="width: ${percent}%; background: #3b82f6;"></div>
            </div>
            <div class="category-count">${c.count} 种 / ${c.total} 件</div>
          </div>
        `;
      }).join('');
    }
    
    // 加载趋势图
    loadTrendChart();
    
    // 加载低库存预警
    loadLowStockWarning();
  } catch (error) {
    console.error('加载统计数据失败:', error);
  }
}

// 加载趋势图
async function loadTrendChart() {
  try {
    const res = await fetch(`${API_BASE}/stats/trends?days=30`);
    const trends = await res.json();
    
    const container = document.getElementById('trend-chart');
    if (!container) return;
    
    if (trends.length === 0) {
      container.innerHTML = '<p style="text-align:center;color:#999;padding:2rem;">暂无趋势数据</p>';
      return;
    }
    
    // 按日期分组，计算出库和入库
    const dataByDate = {};
    trends.forEach(t => {
      if (!dataByDate[t.date]) dataByDate[t.date] = { in: 0, out: 0 };
      if (t.type === 'in') dataByDate[t.date].in = t.total;
      if (t.type === 'out') dataByDate[t.date].out = t.total;
    });
    
    const dates = Object.keys(dataByDate).sort();
    const maxVal = Math.max(...dates.flatMap(d => [dataByDate[d].in, dataByDate[d].out]), 1);
    
    container.innerHTML = `
      <div style="display:flex;align-items:flex-end;height:200px;gap:4px;padding:1rem;overflow-x:auto;">
        ${dates.map(date => {
          const d = dataByDate[date];
          const inHeight = (d.in / maxVal) * 100;
          const outHeight = (d.out / maxVal) * 100;
          return `
            <div style="display:flex;flex-direction:column;align-items:center;min-width:40px;">
              <div style="display:flex;gap:2px;align-items:flex-end;height:150px;">
                <div style="width:12px;height:${inHeight}%;background:#10b981;min-height:2px;" title="入库：${d.in}"></div>
                <div style="width:12px;height:${outHeight}%;background:#f59e0b;min-height:2px;" title="出库：${d.out}"></div>
              </div>
              <div style="font-size:10px;color:#666;margin-top:4px;transform:rotate(-45deg);transform-origin:left;">${date.slice(5)}</div>
            </div>
          `;
        }).join('')}
      </div>
      <div style="display:flex;justify-content:center;gap:1rem;padding:0.5rem;font-size:12px;">
        <span><span style="display:inline-block;width:12px;height:12px;background:#10b981;margin-right:4px;"></span>入库</span>
        <span><span style="display:inline-block;width:12px;height:12px;background:#f59e0b;margin-right:4px;"></span>出库</span>
      </div>
    `;
  } catch (error) {
    console.error('加载趋势图失败:', error);
  }
}

// 加载低库存预警
async function loadLowStockWarning() {
  try {
    const res = await fetch(`${API_BASE}/stats/low-stock-warning`);
    const items = await res.json();
    
    const container = document.getElementById('low-stock-list');
    if (!container) return;
    
    if (items.length === 0) {
      container.innerHTML = '<p style="text-align:center;color:#10b981;padding:1rem;">✅ 库存充足，无预警</p>';
      return;
    }
    
    container.innerHTML = `
      <table class="data-table" style="font-size:0.85rem;">
        <thead>
          <tr>
            <th>名称</th>
            <th>分类</th>
            <th>当前库存</th>
            <th>最低库存</th>
            <th>差额</th>
          </tr>
        </thead>
        <tbody>
          ${items.map(item => `
            <tr>
              <td>${escapeHtml(item.name)}</td>
              <td><span class="badge">${escapeHtml(item.category)}</span></td>
              <td style="color:#ef4444;font-weight:600;">${item.quantity}</td>
              <td>${item.min_quantity}</td>
              <td style="color:#ef4444;">${item.diff}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  } catch (error) {
    console.error('加载低库存预警失败:', error);
  }
}

// 加载资产列表
async function loadAssets() {
  try {
    const res = await fetch(`${API_BASE}/assets?sort=${currentSort.field}&order=${currentSort.order}`);
    const assets = await res.json();
    
    const tbody = document.getElementById('assets-table');
    if (!tbody) return;
    
    if (assets.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#999;">暂无资产数据</td></tr>';
      return;
    }
    
    tbody.innerHTML = assets.map(a => `
      <tr>
        <td>${escapeHtml(a.name)}</td>
        <td><span class="badge">${escapeHtml(a.category)}</span></td>
        <td class="${a.quantity <= a.min_quantity ? 'warning' : ''}">${a.quantity}</td>
        <td>${escapeHtml(a.unit)}</td>
        <td>${escapeHtml(a.location || '-')}</td>
        <td>${a.qr_code ? '✅' : '❌'}</td>
        <td>
          <button class="btn-sm" onclick="viewAsset('${a.id}')">查看</button>
          <button class="btn-sm btn-danger" onclick="deleteAsset('${a.id}')">删除</button>
        </td>
      </tr>
    `).join('');
    
    // 更新排序图标
    updateSortIcons();
  } catch (error) {
    console.error('加载资产列表失败:', error);
    showToast('加载失败：' + error.message);
  }
}

// 更新排序图标
function updateSortIcons() {
  document.querySelectorAll('.sort-icon').forEach(icon => {
    const field = icon.dataset.field;
    if (field === currentSort.field) {
      icon.textContent = currentSort.order === 'ASC' ? ' ▲' : ' ▼';
    } else {
      icon.textContent = '';
    }
  });
}

// 排序资产
function sortAssets(field) {
  if (currentSort.field === field) {
    currentSort.order = currentSort.order === 'ASC' ? 'DESC' : 'ASC';
  } else {
    currentSort.field = field;
    currentSort.order = 'DESC';
  }
  loadAssets();
}

// 查看资产详情
async function viewAsset(id) {
  try {
    const res = await fetch(`${API_BASE}/assets/${id}`);
    const asset = await res.json();
    
    const modalBody = document.getElementById('modal-body');
    modalBody.innerHTML = `
      <div class="asset-detail">
        <p><strong>名称：</strong>${escapeHtml(asset.name)}</p>
        <p><strong>分类：</strong>${escapeHtml(asset.category)}</p>
        <p><strong>数量：</strong>${asset.quantity} ${escapeHtml(asset.unit)}</p>
        <p><strong>最低库存：</strong>${asset.min_quantity}</p>
        <p><strong>位置：</strong>${escapeHtml(asset.location || '未指定')}</p>
        <p><strong>备注：</strong>${escapeHtml(asset.description || '无')}</p>
        ${asset.qr_code ? `<p><strong>二维码：</strong><br><img src="${asset.qr_code}" alt="QR Code" style="max-width:200px;"></p>` : ''}
        <p><strong>创建时间：</strong>${asset.created_at}</p>
        <p><strong>更新时间：</strong>${asset.updated_at}</p>
      </div>
    `;
    
    document.getElementById('asset-modal').style.display = 'flex';
  } catch (error) {
    showToast('加载失败：' + error.message);
  }
}

function closeModal() {
  document.getElementById('asset-modal').style.display = 'none';
}

// 删除资产
async function deleteAsset(id) {
  if (!confirm('确定要删除此资产吗？此操作不可恢复。')) return;
  
  try {
    await fetch(`${API_BASE}/assets/${id}`, { method: 'DELETE' });
    showToast('删除成功');
    loadAssets();
  } catch (error) {
    showToast('删除失败：' + error.message);
  }
}

// 初始化添加表单
function initAddForm() {
  const form = document.getElementById('add-form');
  if (!form) return;
  
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    data.quantity = parseInt(data.quantity);
    data.min_quantity = parseInt(data.min_quantity);
    
    try {
      const res = await fetch(`${API_BASE}/assets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      const result = await res.json();
      if (result.success) {
        showToast('资产入库成功');
        form.reset();
        showPage('assets');
      } else {
        showToast('添加失败：' + result.error);
      }
    } catch (error) {
      showToast('添加失败：' + error.message);
    }
  });
}

// 搜索
function initSearch() {
  const input = document.getElementById('search-input');
  if (!input) return;
  
  let timeout;
  input.addEventListener('input', () => {
    clearTimeout(timeout);
    timeout = setTimeout(() => searchAssets(input.value), 300);
  });
}

async function searchAssets(query) {
  if (!query) {
    loadAssets();
    return;
  }
  
  try {
    const res = await fetch(`${API_BASE}/search?q=${encodeURIComponent(query)}`);
    const assets = await res.json();
    
    const tbody = document.getElementById('assets-table');
    if (!tbody) return;
    
    if (assets.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#999;">暂无搜索结果</td></tr>';
      return;
    }
    
    tbody.innerHTML = assets.map(a => `
      <tr>
        <td>${escapeHtml(a.name)}</td>
        <td><span class="badge">${escapeHtml(a.category)}</span></td>
        <td class="${a.quantity <= a.min_quantity ? 'warning' : ''}">${a.quantity}</td>
        <td>${escapeHtml(a.unit)}</td>
        <td>${escapeHtml(a.location || '-')}</td>
        <td>${a.qr_code ? '✅' : '❌'}</td>
        <td>
          <button class="btn-sm" onclick="viewAsset('${a.id}')">查看</button>
          <button class="btn-sm btn-danger" onclick="deleteAsset('${a.id}')">删除</button>
        </td>
      </tr>
    `).join('');
  } catch (error) {
    showToast('搜索失败：' + error.message);
  }
}

// 初始化扫码
let html5QrcodeScanner = null;

function initScanner() {
  if (typeof Html5QrcodeScanner === 'undefined') {
    console.log('扫码库未加载');
    return;
  }
  
  // 清理之前的实例
  if (html5QrcodeScanner) {
    try {
      html5QrcodeScanner.clear();
    } catch (e) {}
  }
  
  html5QrcodeScanner = new Html5QrcodeScanner(
    "qr-reader",
    { fps: 10, qrbox: { width: 250, height: 250 } },
    /* verbose= */ false
  );
  
  html5QrcodeScanner.render(onScanSuccess, onScanFailure);
}

async function onScanSuccess(decodedText) {
  try {
    const data = JSON.parse(decodedText);
    if (data.type === 'asset') {
      // 停止扫描
      html5QrcodeScanner.pause();
      
      // 加载资产信息
      const res = await fetch(`${API_BASE}/assets/${data.id}`);
      const asset = await res.json();
      
      currentScanAsset = asset;
      
      document.getElementById('scan-asset-name').textContent = asset.name;
      document.getElementById('scan-asset-category').textContent = asset.category;
      document.getElementById('scan-asset-quantity').textContent = asset.quantity;
      document.getElementById('transaction-asset-id').value = asset.id;
      
      // 显示单位
      const unitLabel = document.getElementById('quantity-unit-label');
      if (unitLabel) {
        unitLabel.textContent = asset.unit ? `(${asset.unit})` : '';
      }
      
      document.getElementById('scan-result').style.display = 'block';
      
      showToast('扫描成功');
    }
  } catch (error) {
    console.error('解析二维码失败:', error);
  }
}

function onScanFailure(error) {
  // 忽略扫描错误
}

function resetScan() {
  document.getElementById('scan-result').style.display = 'none';
  document.getElementById('transaction-form').reset();
  currentScanAsset = null;
  // 清空单位显示
  const unitLabel = document.getElementById('quantity-unit-label');
  if (unitLabel) {
    unitLabel.textContent = '';
  }
  html5QrcodeScanner.resume();
}

// 初始化交易表单
function initTransactionForm() {
  const form = document.getElementById('transaction-form');
  if (!form) return;
  
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    data.quantity = parseInt(data.quantity);
    // 将 room_number 字段传给后端
    data.room_number = data.room_number || '';
    
    try {
      const res = await fetch(`${API_BASE}/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      const result = await res.json();
      if (result.success) {
        showToast(`${data.type === 'out' ? '领用' : '归还'}成功，当前库存：${result.newQuantity}`);
        resetScan();
        showPage('records');
      } else {
        showToast('操作失败：' + result.error);
      }
    } catch (error) {
      showToast('操作失败：' + error.message);
    }
  });
}

// 加载领用记录
async function loadRecords() {
  try {
    const res = await fetch(`${API_BASE}/transactions?limit=100`);
    const records = await res.json();
    
    const tbody = document.getElementById('records-table');
    if (!tbody) return;
    
    if (records.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#999;">暂无交易记录</td></tr>';
      return;
    }
    
    tbody.innerHTML = records.map(r => `
      <tr>
        <td>${r.created_at}</td>
        <td>${escapeHtml(r.asset_name)}</td>
        <td><span class="badge ${r.type === 'out' ? 'badge-out' : 'badge-in'}">${r.type === 'out' ? '📤 领用' : '📥 归还'}</span></td>
        <td>${r.quantity}</td>
        <td>${escapeHtml(r.person_name)}</td>
        <td>${escapeHtml(r.room_number || '-')}</td>
        <td>${escapeHtml(r.notes || '-')}</td>
      </tr>
    `).join('');
  } catch (error) {
    console.error('加载记录失败:', error);
  }
}

// 工具函数
function showToast(message) {
  const toast = document.getElementById('toast');
  if (toast) {
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
  }
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// 点击模态框外部关闭
document.addEventListener('click', (e) => {
  const modal = document.getElementById('asset-modal');
  if (e.target === modal) {
    closeModal();
  }
});
