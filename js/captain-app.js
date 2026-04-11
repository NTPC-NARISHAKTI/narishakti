/**
 * ================================================================
 *  Captain Dashboard - captain-app.js
 *  Role: CAPTAIN only
 *  Architecture: Centralized API layer with auto projectId injection
 * ================================================================
 */

const API_URL = 'http://localhost:8080';

// ──────────────────────────────────────────────────────────────
//  STATE
// ──────────────────────────────────────────────────────────────
let authToken    = localStorage.getItem('authToken') || '';
let currentUser  = JSON.parse(localStorage.getItem('currentUser') || '{}');
let projectId    = null;          // Captain's project — injected everywhere
let allPosts     = [];
let allOrders    = [];
let allUsers     = [];
let editingOrder = null;           // for order status modal

// ──────────────────────────────────────────────────────────────
//  CENTRALIZED API LAYER
//  All requests flow through this. projectId is ALWAYS injected.
//  Field names are PascalCase to match Go struct binding.
// ──────────────────────────────────────────────────────────────
function getToken() {
    return localStorage.getItem('authToken') || '';
}

function getUser() {
    return JSON.parse(localStorage.getItem('currentUser') || '{}');
}

function getProjectId() {
    const user = getUser();
    return user.ProjectID || user.projectId || null;
}

/**
 * Validate required fields before sending to backend.
 * Throws early so bad payloads never reach the server.
 */
function validatePayload(payload, requiredFields, label = 'Payload') {
    for (const field of requiredFields) {
        if (payload[field] === undefined || payload[field] === null || payload[field] === '') {
            throw new Error(`${label}: "${field}" is required`);
        }
    }
}

/**
 * Convert camelCase keys to PascalCase — Go backend uses PascalCase JSON tags.
 */
function toPascalCase(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    const result = {};
    for (const [key, val] of Object.entries(obj)) {
        const pascal = key.charAt(0).toUpperCase() + key.slice(1);
        result[pascal] = val;
    }
    return result;
}

/**
 * Core API request function.
 * - Injects projectId into every body AND as query param for GETs
 * - PascalCase-izes all body keys
 * - Handles 401 → logout + redirect
 * - Returns parsed JSON
 */
async function apiRequest(url, method = 'GET', body = null) {
    const token     = getToken();
    const pid      = getProjectId();

    if (!token) {
        forceLogout();
        throw new Error('No auth token — please login again');
    }

    const headers = { 'Authorization': `Bearer ${token}` };
    const options = { method, headers };

    // ── Build URL with projectId query param for GETs ──
    if (method === 'GET' && pid) {
        const sep = url.includes('?') ? '&' : '?';
        url += `${sep}projectId=${pid}`;
    }

    // ── Build body: PascalCase + projectId injection ──
    if (body) {
        let cleanBody = toPascalCase(body);
        if (pid) {
            cleanBody.ProjectID = pid;
        }
        options.body    = JSON.stringify(cleanBody);
        headers['Content-Type'] = 'application/json';
    }

    console.log(`[API] ${method} ${API_URL}${url}`, body ? `→ ${options.body}` : '');

    const res = await fetch(`${API_URL}${url}`, options);

    if (res.status === 401) {
        forceLogout();
        throw new Error('Session expired — please login again');
    }

    const data = await res.json();
    console.log(`[API] Response:`, data);

    if (!res.ok) {
        throw new Error((data && data.error) || `HTTP ${res.status}`);
    }

    return data;
}

// ──────────────────────────────────────────────────────────────
//  FILE UPLOAD helper (FormData, no JSON body)
//  Still injects projectId as a FormData field
// ──────────────────────────────────────────────────────────────
async function apiUpload(url, formData, method = 'POST') {
    const token = getToken();
    const pid  = getProjectId();

    if (!token) { forceLogout(); throw new Error('No auth token'); }

    if (pid) formData.append('ProjectID', pid);

    const options = {
        method,
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
    };

    console.log(`[API] Upload ${method} ${API_URL}${url}`);

    const res  = await fetch(`${API_URL}${url}`, options);
    const data = await res.json();

    if (res.status === 401) { forceLogout(); throw new Error('Session expired'); }
    if (!res.ok) throw new Error((data && data.error) || `Upload failed: HTTP ${res.status}`);

    return data;
}

// ──────────────────────────────────────────────────────────────
//  AUTH FLOW
// ──────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    const token = getToken();

    if (token) {
        verifyAndRoute();
    } else {
        showAuth();
    }
});

async function verifyAndRoute() {
    try {
        const data = await fetch(`${API_URL}/me`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${getToken()}`,
                'Content-Type': 'application/json'
            }
        }).then(r => r.json());

        if (!data.success || !data.data) throw new Error('Invalid session');

        const me = data.data;

        // Merge: preserve existing user data (from login) but add/update from /me
        const stored = getUser();
        currentUser = {
            ...stored,
            id:             me.id,
            name:           me.name,
            email:          me.email,
            empNo:          me.empNo,
            role:           me.role,
            ProjectID:      me.projectId,  // backend returns lowercase projectId
            projectId:      me.projectId,
            approvalStatus:  me.approvalStatus,
        };

        projectId = me.projectId || stored.ProjectID || stored.projectId || null;

        if (currentUser.role === 'ADMIN') {
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            window.location.href = 'index.html';
            return;
        }
        if (currentUser.role === 'USER') {
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            window.location.href = 'user.html';
            return;
        }
        if (currentUser.role !== 'CAPTAIN') {
            forceLogout();
            return;
        }

        // Valid CAPTAIN — persist merged user data
        localStorage.setItem('currentUser', JSON.stringify(currentUser));

        showDashboard();
        loadAllData();

    } catch (err) {
        console.error('[Auth] Verification failed:', err);
        forceLogout();
    }
}

// Login form
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email    = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const btn      = document.getElementById('loginBtn');
    const btnText  = document.getElementById('loginBtnText');
    const spinner  = document.getElementById('loginSpinner');

    btn.disabled = true;
    btnText.textContent = 'Logging in…';
    spinner.style.display = 'inline-block';
    clearMessage('authMessage');

    try {
        const res  = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();

        if (!res.ok || !data.success || !data.data || !data.data.token) {
            throw new Error((data && data.error) || 'Invalid credentials');
        }

        const { token, user } = data.data;

        // Normalize: backend returns projectId (lowercase), ensure both keys exist
        const normalizedUser = {
            ...user,
            ProjectID: user.projectId,   // ensure PascalCase key exists
        };

        if (normalizedUser.role === 'ADMIN') {
            localStorage.setItem('authToken', token);
            localStorage.setItem('currentUser', JSON.stringify(normalizedUser));
            window.location.href = 'index.html';
            return;
        }
        if (normalizedUser.role === 'USER') {
            localStorage.setItem('authToken', token);
            localStorage.setItem('currentUser', JSON.stringify(normalizedUser));
            window.location.href = 'user.html';
            return;
        }
        if (normalizedUser.role !== 'CAPTAIN') {
            throw new Error('Access denied: this dashboard is for Captains only');
        }

        authToken   = token;
        currentUser = normalizedUser;
        projectId   = normalizedUser.projectId || normalizedUser.ProjectID || null;

        localStorage.setItem('authToken', authToken);
        localStorage.setItem('currentUser', JSON.stringify(currentUser));

        showDashboard();
        loadAllData();

    } catch (err) {
        showMessage('authMessage', err.message, 'danger');
    } finally {
        btn.disabled = false;
        btnText.textContent = 'Login';
        spinner.style.display = 'none';
    }
});

function logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    authToken   = '';
    currentUser = {};
    projectId   = null;
    allPosts    = [];
    allOrders   = [];
    allUsers    = [];
    showAuth();
    document.getElementById('loginForm').reset();
}

function forceLogout() {
    logout();
    showMessage('authMessage', 'Session expired — please login again', 'warning');
}

// ──────────────────────────────────────────────────────────────
//  UI HELPERS
// ──────────────────────────────────────────────────────────────
function showAuth() {
    document.getElementById('authContainer').style.display  = 'flex';
    document.getElementById('captainDashboard').style.display = 'none';
}

function showDashboard() {
    document.getElementById('authContainer').style.display  = 'none';
    document.getElementById('captainDashboard').style.display = 'block';

    const pid = getProjectId();
    document.getElementById('projectBadge').textContent = pid ? `Project #${pid}` : 'No Project';
}

function navigateTo(section, event) {
    if (event) event.preventDefault();

    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
    document.getElementById(`section-${section}`).classList.add('active');

    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    event && event.target.closest('.nav-item').classList.add('active');
}

function showMessage(elId, text, type = 'info') {
    const el = document.getElementById(elId);
    if (!el) return;
    el.innerHTML = `<div class="alert alert-${type} alert-dismissible fade show">${text}<button type="button" class="btn-close" data-bs-dismiss="alert"></button></div>`;
    setTimeout(() => { if (el) el.innerHTML = ''; }, 5000);
}

function showToast(text, type = 'info') {
    const toast     = document.getElementById('liveToast');
    const msgEl     = document.getElementById('toastMessage');
    toast.className = `toast show toast-${type}`;
    msgEl.textContent = text;
    const bsToast = new bootstrap.Toast(toast, { delay: 3000 });
    bsToast.show();
}

function clearMessage(elId) {
    const el = document.getElementById(elId);
    if (el) el.innerHTML = '';
}

function avatarUrl(name, bg = '4f46e5') {
    const n = encodeURIComponent(name || 'U');
    return `https://ui-avatars.com/api/?name=${n}&background=${bg}&color=fff&size=120`;
}

// ──────────────────────────────────────────────────────────────
//  DATA LOADING
// ──────────────────────────────────────────────────────────────
async function loadAllData() {
    try {
        const [postsRes, ordersRes, usersRes] = await Promise.all([
            apiRequest('/posts'),
            apiRequest('/orders'),
            apiRequest('/users')
        ]);

        allPosts  = (postsRes.data  || []).filter(p => p.Product?.ProjectID === projectId);
        allOrders = ordersRes.data  || [];
        allUsers  = usersRes.data   || [];

        updateStats();
        renderMarketplace(allPosts);
        renderApprovals();
        renderOrders();

    } catch (err) {
        console.error('[LoadData] Failed:', err);
        showToast('Failed to load data: ' + err.message, 'danger');
    }
}

function updateStats() {
    document.getElementById('totalProducts').textContent = allPosts.length;

    const projectPostIds = allPosts.map(p => p.ID);
    const projectOrders  = allOrders.filter(o => projectPostIds.includes(o.PostID));
    document.getElementById('totalOrders').textContent = projectOrders.length;

    const approvedUsers = allUsers.filter(u =>
        u.ProjectID === projectId && u.ApprovalStatus === 'APPROVED'
    );
    document.getElementById('totalMembers').textContent = approvedUsers.length;

    const pending = allUsers.filter(u =>
        u.ProjectID === projectId && u.ApprovalStatus === 'PENDING'
    );

    const badge = document.getElementById('navBadge');
    if (pending.length > 0) {
        badge.style.display = 'inline-flex';
        badge.textContent    = pending.length;
        document.getElementById('pendingCountBadge').style.display = 'inline';
        document.getElementById('pendingCountBadge').textContent   = `${pending.length} pending`;
    } else {
        badge.style.display = 'none';
        document.getElementById('pendingCountBadge').style.display = 'none';
    }
}

// ──────────────────────────────────────────────────────────────
//  MARKETPLACE (Posts)
// ──────────────────────────────────────────────────────────────
function renderMarketplace(posts) {
    const grid  = document.getElementById('productsGrid');
    const empty = document.getElementById('section-marketplace').querySelector('.empty-state');

    if (!posts || posts.length === 0) {
        grid.innerHTML  = '';
        grid.appendChild(buildEmptyState('bi bi-box', 'No products yet', 'Add your first product to the marketplace', () => navigateTo('add-product', null)));
        return;
    }

    grid.innerHTML = posts.map(post => `
        <div class="product-card">
            ${post.ProductImg
                ? `<img src="${API_URL}/${post.ProductImg}" class="product-image" alt="${post.Product?.Name || 'Product'}" onerror="this.outerHTML='<div class=\\'product-image placeholder\\'><i class=\\'bi bi-box\\'></i></div>'">`
                : `<div class="product-image placeholder"><i class="bi bi-box"></i></div>`
            }
            <div class="product-body">
                <div class="product-name">${post.Product?.Name || '—'}</div>
                <div class="product-desc">${post.Product?.Description || 'No description'}</div>
                <div class="product-footer">
                    <span class="product-price">₹${(post.Price || 0).toFixed(2)}</span>
                    <span class="product-qty">${post.TotalQty - (post.TotalOrders || 0)} left</span>
                </div>
            </div>
        </div>
    `).join('');
}

function filterProducts() {
    const term  = document.getElementById('searchProducts').value.toLowerCase().trim();
    if (!term) { renderMarketplace(allPosts); return; }
    const filtered = allPosts.filter(p =>
        (p.Product?.Name || '').toLowerCase().includes(term) ||
        (p.Product?.Description || '').toLowerCase().includes(term)
    );
    renderMarketplace(filtered);
}

// ──────────────────────────────────────────────────────────────
//  ADD PRODUCT
// ──────────────────────────────────────────────────────────────
function openAddProductModal() {
    navigateTo('add-product', null);
}

document.getElementById('productForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    clearMessage('productFormMessage');

    const name        = document.getElementById('productName').value.trim();
    const description = document.getElementById('productDescription').value.trim();
    const price       = parseFloat(document.getElementById('productPrice').value);
    const quantity    = parseInt(document.getElementById('productQuantity').value, 10);
    const imageFile   = document.getElementById('productImage').files[0];

    try {
        validatePayload({ name, price, quantity }, ['name', 'price', 'quantity'], 'Product');

        const formData = new FormData();
        formData.append('Name', name);
        formData.append('Description', description);
        formData.append('Price', price);
        formData.append('TotalQty', quantity);
        if (imageFile) formData.append('ProductImg', imageFile);

        // Step 1: Create product
        const prodRes = await apiUpload('/products', formData);
        if (!prodRes.success || !prodRes.data) throw new Error('Product creation failed');

        const productId = prodRes.data.ID;
        showToast('Product created! Loading…', 'success');

        // Step 2: Reload to reflect changes
        document.getElementById('productForm').reset();
        await loadAllData();
        navigateTo('marketplace', null);
        showToast('Product published successfully!', 'success');

    } catch (err) {
        showMessage('productFormMessage', err.message, 'danger');
    }
});

// ──────────────────────────────────────────────────────────────
//  APPROVALS
// ──────────────────────────────────────────────────────────────
function renderApprovals() {
    const list  = document.getElementById('approvalsList');
    const empty = document.getElementById('approvalsEmpty');

    const pending = allUsers.filter(u =>
        u.ProjectID === projectId && u.ApprovalStatus === 'PENDING'
    );

    if (!pending.length) {
        list.style.display = 'none';
        empty.style.display = 'block';
        return;
    }

    empty.style.display = 'none';
    list.style.display  = 'flex';

    list.innerHTML = pending.map(user => `
        <div class="request-card">
            <img src="${avatarUrl(user.Name)}" class="request-avatar" alt="${user.Name}">
            <div class="request-info">
                <div class="request-name">${user.Name || '—'}</div>
                <div class="request-meta">${user.Email || ''} · ${user.EmpNo || ''}</div>
            </div>
            <div class="request-actions">
                <button class="btn btn-success btn-sm" onclick="doApprove(${user.ID})">
                    <i class="bi bi-check-lg"></i>
                </button>
                <button class="btn btn-danger btn-sm" onclick="doReject(${user.ID})">
                    <i class="bi bi-x-lg"></i>
                </button>
            </div>
        </div>
    `).join('');
}

async function doApprove(userId) {
    try {
        await apiRequest(`/admin/users/${userId}/approve`, 'PATCH');
        showToast('User approved', 'success');
        await loadAllData();
    } catch (err) {
        showToast('Approve failed: ' + err.message, 'danger');
    }
}

async function doReject(userId) {
    try {
        await apiRequest(`/admin/users/${userId}/reject`, 'PATCH');
        showToast('User rejected', 'success');
        await loadAllData();
    } catch (err) {
        showToast('Reject failed: ' + err.message, 'danger');
    }
}

// ──────────────────────────────────────────────────────────────
//  ORDERS
// ──────────────────────────────────────────────────────────────
function renderOrders() {
    const list  = document.getElementById('ordersList');
    const empty = document.getElementById('ordersEmpty');

    const projectPostIds = allPosts.map(p => p.ID);
    const projectOrders  = allOrders.filter(o => projectPostIds.includes(o.PostID));

    if (!projectOrders.length) {
        list.style.display = 'none';
        empty.style.display = 'block';
        return;
    }

    empty.style.display = 'none';
    list.style.display  = 'flex';

    list.innerHTML = projectOrders.map(order => {
        const statusClass = `status-${order.OrderStatus || 'PENDING'}`;
        const createdDate = new Date(order.CreatedAt).toLocaleDateString('en-IN', {
            day: '2-digit', month: 'short', year: 'numeric'
        });

        return `
            <div class="order-card">
                <div class="order-header">
                    <div class="order-user">
                        <img src="${avatarUrl(order.User?.Name, '0ea5e9')}" class="order-user-avatar" alt="">
                        <div>
                            <div class="order-user-name">${order.User?.Name || 'Unknown'}</div>
                            <div class="order-user-email">${order.User?.Email || ''}</div>
                        </div>
                    </div>
                    <div class="order-meta">
                        <div class="order-id">#${order.ID}</div>
                        <div class="order-date">${createdDate}</div>
                    </div>
                </div>
                <div class="order-product">
                    ${order.Post?.ProductImg
                        ? `<img src="${API_URL}/${order.Post.ProductImg}" class="order-product-img" onerror="this.outerHTML='<div class=\\'order-product-img-placeholder\\'><i class=\\'bi bi-box\\'></i></div>'">`
                        : `<div class="order-product-img-placeholder"><i class="bi bi-box"></i></div>`
                    }
                    <div>
                        <div class="order-product-name">${order.Post?.Product?.Name || '—'}</div>
                        <div class="order-product-meta">Qty: ${order.OrderQuantity || 0} · ₹${(order.TotalPrice || 0).toFixed(2)}</div>
                    </div>
                </div>
                <div class="order-footer">
                    <span class="status-badge ${statusClass}">${order.OrderStatus || 'PENDING'}</span>
                    <button class="btn btn-outline-primary btn-sm" onclick="openOrderModal(${order.ID})">
                        <i class="bi bi-pencil"></i> Update
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function filterOrders() {
    const filter = document.getElementById('orderFilter').value;

    const projectPostIds = allPosts.map(p => p.ID);
    let filtered = allOrders.filter(o => projectPostIds.includes(o.PostID));

    if (filter !== 'ALL') {
        filtered = filtered.filter(o => o.OrderStatus === filter);
    }

    const list  = document.getElementById('ordersList');
    const empty = document.getElementById('ordersEmpty');

    if (!filtered.length) {
        list.style.display = 'none';
        empty.style.display = 'block';
        return;
    }

    empty.style.display = 'none';
    list.style.display = 'flex';

    list.innerHTML = filtered.map(order => {
        const statusClass = `status-${order.OrderStatus || 'PENDING'}`;
        const createdDate = new Date(order.CreatedAt).toLocaleDateString('en-IN', {
            day: '2-digit', month: 'short', year: 'numeric'
        });

        return `
            <div class="order-card">
                <div class="order-header">
                    <div class="order-user">
                        <img src="${avatarUrl(order.User?.Name, '0ea5e9')}" class="order-user-avatar" alt="">
                        <div>
                            <div class="order-user-name">${order.User?.Name || 'Unknown'}</div>
                            <div class="order-user-email">${order.User?.Email || ''}</div>
                        </div>
                    </div>
                    <div class="order-meta">
                        <div class="order-id">#${order.ID}</div>
                        <div class="order-date">${createdDate}</div>
                    </div>
                </div>
                <div class="order-product">
                    ${order.Post?.ProductImg
                        ? `<img src="${API_URL}/${order.Post.ProductImg}" class="order-product-img" onerror="this.outerHTML='<div class=\\'order-product-img-placeholder\\'><i class=\\'bi bi-box\\'></i></div>'">`
                        : `<div class="order-product-img-placeholder"><i class="bi bi-box"></i></div>`
                    }
                    <div>
                        <div class="order-product-name">${order.Post?.Product?.Name || '—'}</div>
                        <div class="order-product-meta">Qty: ${order.OrderQuantity || 0} · ₹${(order.TotalPrice || 0).toFixed(2)}</div>
                    </div>
                </div>
                <div class="order-footer">
                    <span class="status-badge ${statusClass}">${order.OrderStatus || 'PENDING'}</span>
                    <button class="btn btn-outline-primary btn-sm" onclick="openOrderModal(${order.ID})">
                        <i class="bi bi-pencil"></i> Update
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function openOrderModal(orderId) {
    editingOrder = allOrders.find(o => o.ID === orderId);
    if (!editingOrder) return;

    document.getElementById('orderModalInfo').innerHTML =
        `Order #${editingOrder.ID} · ${editingOrder.User?.Name || '—'} · ${editingOrder.Post?.Product?.Name || '—'}`;
    document.getElementById('newOrderStatus').value = editingOrder.OrderStatus || 'PENDING';

    const modal = new bootstrap.Modal(document.getElementById('orderStatusModal'));
    modal.show();
}

async function submitOrderStatus() {
    if (!editingOrder) return;

    const newStatus = document.getElementById('newOrderStatus').value;

    try {
        await apiRequest(`/orders/${editingOrder.ID}`, 'PUT', {
            OrderID:     editingOrder.ID,
            OrderStatus: newStatus
        });

        bootstrap.Modal.getInstance(document.getElementById('orderStatusModal')).hide();
        showToast(`Order status updated to ${newStatus}`, 'success');
        await loadAllData();

    } catch (err) {
        showToast('Update failed: ' + err.message, 'danger');
    }
}

// ──────────────────────────────────────────────────────────────
//  EMPTY STATE BUILDER (reusable)
// ──────────────────────────────────────────────────────────────
function buildEmptyState(iconClass, title, sub, onAction) {
    const div = document.createElement('div');
    div.className = 'empty-state';
    div.style.gridColumn = '1 / -1';
    div.innerHTML = `
        <i class="bi ${iconClass}"></i>
        <h4>${title}</h4>
        <p>${sub}</p>
        ${onAction ? '<button class="btn btn-primary">' + (typeof onAction === 'string' ? onAction : 'Try Again') + '</button>' : ''}
    `;
    if (typeof onAction === 'function') {
        div.querySelector('button')?.addEventListener('click', onAction);
    }
    return div;
}
