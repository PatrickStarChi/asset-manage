// 移动端专用 JS
let currentUser = null;
let currentScanType = 'out';
let currentAssetId = null;
let cameraStream = null;
let cameraInterval = null;
let isCameraOpen = false;

// 初始化
document.addEventListener('DOMContentLoaded', async () => {
  await checkAuth();
  if (currentUser) {
    initMobileApp();
  }
});

// 检查登录状态
async function checkAuth() {
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');
  
  if (token && userStr) {
    try {
      currentUser = JSON.parse(userStr);
      showMainPage();
      return;
    } catch (err) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  }
  
  showLoginPage();
}

// 显示登录页
function showLoginPage() {
  document.getElementById('mobile-login').classList.add('active');
  document.getElementById('mobile-main').classList.remove('active');
}

// 显示主页面
function showMainPage() {
  document.getElementById('mobile-login').classList.remove('active');
  document.getElementById('mobile-main').classList.add('active');
  loadDashboard();
}

// 登录表单
document.getElementById('mobile-login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const username = document.getElementById('mobile-login-username').value;
  const password = document.getElementById('mobile-login-password').value;
  
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    
    const data = await res.json();
    
    if (res.ok) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      currentUser = data.user;
      showMainPage();
    } else {
      alert(data.error || '登录失败');
    }
  } catch (err) {
    alert('网络错误，请重试');
  }
});

// 退出登录
function logout() {
  if (confirm('确定要退出登录吗？')) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    currentUser = null;
    showLoginPage();
  }
}

// 初始化主应用
function initMobileApp() {
  // 标签栏切换
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      switchTab(tab);
    });
  });
  
  // 扫码类型切换
  document.querySelectorAll('.scan-type-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.scan-type-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentScanType = btn.dataset.type;
    });
  });
}

// 切换摄像头
async function toggleCamera() {
  const video = document.getElementById('m-qr-video');
  const canvas = document.getElementById('m-qr-canvas');
  const cameraArea = document.querySelector('.camera-area');
  const cameraBtn = document.getElementById('m-camera-btn');
  
  if (isCameraOpen) {
    // 关闭摄像头
    stopCamera();
    cameraArea.classList.remove('active');
    cameraBtn.textContent = '📷 打开摄像头';
  } else {
    // 打开摄像头
    try {
      cameraStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' } // 使用后置摄像头
      });
      video.srcObject = cameraStream;
      video.setAttribute('playsinline', true);
      cameraArea.classList.add('active');
      cameraBtn.textContent = '📷 关闭摄像头';
      isCameraOpen = true;
      
      // 开始扫描
      startScanLoop();
    } catch (err) {
      console.error('摄像头启动失败:', err);
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
  if (cameraInterval) {
    clearInterval(cameraInterval);
    cameraInterval = null;
  }
  isCameraOpen = false;
}

// 循环扫描
function startScanLoop() {
  const video = document.getElementById('m-qr-video');
  const canvas = document.getElementById('m-qr-canvas');
  const ctx = canvas.getContext('2d');
  
  cameraInterval = setInterval(() => {
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.height = video.videoHeight;
      canvas.width = video.videoWidth;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height);
      
      if (code) {
        console.log('识别到二维码:', code.data);
        document.getElementById('m-scan-input').value = code.data;
        mobileHandleScan();
        stopCamera();
        document.querySelector('.camera-area').classList.remove('active');
        document.getElementById('m-camera-btn').textContent = '📷 打开摄像头';
      }
    }
  }, 500); // 每 500ms 扫描一次
}

// 切换标签
function switchTab(tab) {
  // 离开扫码页时关闭摄像头
  if (tab !== 'scan' && isCameraOpen) {
    stopCamera();
    document.querySelector('.camera-area')?.classList.remove('active');
    document.getElementById('m-camera-btn').textContent = '📷 打开摄像头';
  }
  
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });
  
  document.querySelectorAll('.mobile-tab-content').forEach(content => {
    content.classList.remove('active');
  });
  
  const target = document.getElementById(`mobile-${tab}`);
  if (target) {
    target.classList.add('active');
    
    // 加载数据
    if (tab === 'dashboard') loadDashboard();
    else if (tab === 'assets') loadAssets();
    else if (tab === 'in') loadInTransactions();
    else if (tab === 'out') loadOutTransactions();
  }
}

// 加载仪表盘
async function loadDashboard() {
  try {
    const token = localStorage.getItem('token');
    const res = await fetch('/api/stats', {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    });
    const stats = await res.json();
    
    document.getElementById('m-total-assets').textContent = stats.totalAssets || 0;
    document.getElementById('m-category-count').textContent = stats.categoryCount || 0;
    document.getElementById('m-month-in').textContent = stats.monthIn || 0;
    document.getElementById('m-month-out').textContent = stats.monthOut || 0;
    
    // 分类统计
    const container = document.getElementById('m-category-stats');
    if (stats.byCategory && stats.byCategory.length > 0) {
      const maxTotal = Math.max(...stats.byCategory.map(c => c.total));
      container.innerHTML = stats.byCategory.map(cat => `
        <div class="category-stat-item">
          <span class="category-stat-name">${cat.category}</span>
          <div class="category-stat-bar">
            <div class="category-stat-fill" style="width: ${(cat.total / maxTotal) * 100}%"></div>
          </div>
          <span class="category-stat-count">${cat.total}</span>
        </div>
      `).join('');
    } else {
      container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📊</div><div class="empty-state-text">暂无数据</div></div>';
    }
  } catch (err) {
    console.error('加载统计数据失败:', err);
  }
}

// 加载资产列表
async function loadAssets() {
  try {
    const token = localStorage.getItem('token');
    const res = await fetch('/api/assets', {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    });
    const assets = await res.json();
    
    const container = document.getElementById('m-assets-list');
    if (assets.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📦</div><div class="empty-state-text">暂无资产</div></div>';
      return;
    }
    
    container.innerHTML = assets.map(asset => `
      <div class="asset-card" onclick="showAssetModal(${asset.id})">
        <div class="asset-info">
          <div class="asset-name">${asset.name}</div>
          <div class="asset-meta">${asset.category} · ${asset.location || '无位置'}</div>
        </div>
        <div class="asset-quantity">
          <div class="quantity-value">${asset.quantity}</div>
          <div class="quantity-label">${asset.unit || '个'}</div>
        </div>
      </div>
    `).join('');
  } catch (err) {
    console.error('加载资产列表失败:', err);
  }
}

// 显示资产详情弹窗
async function showAssetModal(id) {
  currentAssetId = id;
  
  try {
    const token = localStorage.getItem('token');
    const res = await fetch(`/api/assets/${id}`, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    });
    const asset = await res.json();
    
    document.getElementById('m-detail-name').textContent = asset.name;
    document.getElementById('m-detail-category').textContent = asset.category;
    document.getElementById('m-detail-quantity').textContent = `${asset.quantity} ${asset.unit || '个'}`;
    document.getElementById('m-detail-location').textContent = asset.location || '无';
    
    document.getElementById('m-asset-modal').classList.add('active');
  } catch (err) {
    alert('加载资产详情失败');
  }
}

// 关闭资产弹窗
function closeAssetModal() {
  document.getElementById('m-asset-modal').classList.remove('active');
  currentAssetId = null;
}

// 入库
function mobileStockIn() {
  closeAssetModal();
  switchTab('scan');
  document.querySelectorAll('.scan-type-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.type === 'in');
  });
  currentScanType = 'in';
  if (currentAssetId) {
    document.getElementById('m-scan-input').value = currentAssetId;
  }
}

// 出库
function mobileStockOut() {
  closeAssetModal();
  switchTab('scan');
  document.querySelectorAll('.scan-type-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.type === 'out');
  });
  currentScanType = 'out';
  if (currentAssetId) {
    document.getElementById('m-scan-input').value = currentAssetId;
  }
}

// 加载入库记录
async function loadInTransactions() {
  try {
    const token = localStorage.getItem('token');
    const res = await fetch('/api/transactions?type=in', {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    });
    const transactions = await res.json();
    
    const container = document.getElementById('m-in-list');
    renderTransactions(container, transactions, 'in');
  } catch (err) {
    console.error('加载入库记录失败:', err);
  }
}

// 加载出库记录
async function loadOutTransactions() {
  try {
    const token = localStorage.getItem('token');
    const res = await fetch('/api/transactions?type=out', {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    });
    const transactions = await res.json();
    
    const container = document.getElementById('m-out-list');
    renderTransactions(container, transactions, 'out');
  } catch (err) {
    console.error('加载出库记录失败:', err);
  }
}

// 渲染交易列表
function renderTransactions(container, transactions, type) {
  if (transactions.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">${type === 'in' ? '📥' : '📤'}</div><div class="empty-state-text">暂无记录</div></div>`;
    return;
  }
  
  container.innerHTML = transactions.map(t => `
    <div class="transaction-item">
      <div class="transaction-header">
        <span class="transaction-asset">${t.asset_name}</span>
        <span class="transaction-type ${t.type}">${t.type === 'in' ? '入库' : '出库'}</span>
      </div>
      <div class="transaction-meta">
        <span>数量：${t.quantity}</span>
        <span>${new Date(t.created_at).toLocaleString('zh-CN')}</span>
      </div>
    </div>
  `).join('');
}

// 扫码处理
async function mobileHandleScan() {
  const input = document.getElementById('m-scan-input');
  const resultDiv = document.getElementById('m-scan-result');
  const qrCode = input.value.trim();
  
  if (!qrCode) {
    showScanResult('请输入或扫描二维码', 'error');
    return;
  }
  
  try {
    let asset;
    let assetId = null;
    
    // 1. 纯数字
    if (/^\d+$/.test(qrCode)) {
      assetId = qrCode;
    }
    // 2. URL 格式
    else if (qrCode.includes('/asset/')) {
      const match = qrCode.match(/\/asset\/(\d+)/);
      if (match && match[1]) {
        assetId = match[1];
      }
    }
    
    // 3. 通过 ID 获取
    if (assetId) {
      const res = await fetch(`/api/assets/${assetId}`);
      if (res.ok) {
        asset = await res.json();
      }
    }
    
    // 4. 通过 qr_code 匹配
    if (!asset) {
      const token = localStorage.getItem('token');
      const assetsRes = await fetch('/api/assets', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      const assets = await assetsRes.json();
      asset = assets.find(a => a.qr_code === qrCode);
    }
    
    if (!asset) {
      showScanResult('未找到该资产', 'error');
      return;
    }
    
    showScanResult(`
      <strong>${asset.name}</strong><br>
      分类：${asset.category}<br>
      当前库存：${asset.quantity} ${asset.unit || '个'}<br>
      <div class="scan-action-area">
        <input type="number" id="m-scan-quantity" placeholder="数量" min="1" value="1" 
               inputmode="numeric" pattern="[0-9]*">
        <button class="mobile-btn ${currentScanType === 'in' ? 'success' : 'danger'}" 
                onclick="mobileConfirmScan(${asset.id})">
          确认${currentScanType === 'in' ? '入库' : '出库'}
        </button>
      </div>
    `, 'success');
    
  } catch (err) {
    console.error('扫码失败:', err);
    showScanResult('查询失败', 'error');
  }
}

// 显示扫码结果
function showScanResult(html, type) {
  const resultDiv = document.getElementById('m-scan-result');
  resultDiv.innerHTML = html;
  resultDiv.className = `scan-result ${type}`;
}

// 确认扫码出入库
async function mobileConfirmScan(assetId) {
  const quantityInput = document.getElementById('m-scan-quantity');
  const quantity = parseInt(quantityInput.value);
  
  if (!quantity || quantity <= 0) {
    alert('请输入有效数量');
    return;
  }
  
  const token = localStorage.getItem('token');
  
  try {
    const res = await fetch('/api/transactions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        asset_id: assetId,
        type: currentScanType,
        quantity: quantity
      })
    });
    
    const result = await res.json();
    
    if (res.ok) {
      alert(`${currentScanType === 'in' ? '入库' : '出库'}成功！`);
      document.getElementById('m-scan-input').value = '';
      document.getElementById('m-scan-result').innerHTML = '';
      loadDashboard();
    } else {
      alert(result.error || '操作失败');
    }
  } catch (err) {
    alert('网络错误，请重试');
  }
}

// 搜索功能
document.getElementById('m-search-input').addEventListener('input', async (e) => {
  const query = e.target.value.trim().toLowerCase();
  
  if (!query) {
    loadAssets();
    return;
  }
  
  try {
    const token = localStorage.getItem('token');
    const res = await fetch('/api/assets', {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    });
    const assets = await res.json();
    
    const filtered = assets.filter(a => 
      a.name.toLowerCase().includes(query) ||
      a.category.toLowerCase().includes(query)
    );
    
    const container = document.getElementById('m-assets-list');
    if (filtered.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🔍</div><div class="empty-state-text">未找到匹配的资产</div></div>';
      return;
    }
    
    container.innerHTML = filtered.map(asset => `
      <div class="asset-card" onclick="showAssetModal(${asset.id})">
        <div class="asset-info">
          <div class="asset-name">${asset.name}</div>
          <div class="asset-meta">${asset.category} · ${asset.location || '无位置'}</div>
        </div>
        <div class="asset-quantity">
          <div class="quantity-value">${asset.quantity}</div>
          <div class="quantity-label">${asset.unit || '个'}</div>
        </div>
      </div>
    `).join('');
  } catch (err) {
    console.error('搜索失败:', err);
  }
});
