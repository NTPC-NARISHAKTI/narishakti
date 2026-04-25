/**
 * ================================================================
 *  Captain Dashboard - captain-app.js
 *  Role: CAPTAIN only
 *  Architecture: Centralized API layer with auto projectId injection
 * ================================================================
 */

const API_URL = 'http://localhost:8080/api';
const BASE_URL = 'http://localhost:8080';

// ──────────────────────────────────────────────────────────────
//  STATE
// ──────────────────────────────────────────────────────────────
let authToken    = localStorage.getItem('authToken') || '';
let currentUser  = JSON.parse(localStorage.getItem('currentUser') || '{}');
let projectId    = null;          // Captain's project — injected everywhere
let allPosts     = [];
let allOrders    = [];
let allUsers     = [];
let allProducts  = [];            // Products for captain's project
let editingOrder = null;           // for order status modal
let lastPendingApprovalCount = null;

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

    if (res.status === 403) {
        const data = await res.json();
        throw new Error((data && (data.error || data.message)) || 'Permission denied');
    }

    const data = await res.json();
    console.log(`[API] Response:`, data);

    if (!res.ok) {
        throw new Error((data && (data.error || data.message)) || `HTTP ${res.status}`);
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
            projectName:    me.projectName,
            approvalStatus:  me.approvalStatus,
        };

        projectId = me.projectId || stored.ProjectID || stored.projectId || null;

        if (currentUser.role === 'ADMIN') {
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            window.location.href = 'index.html';
            return;
        }
        if (currentUser.role === 'DIRECTOR') {
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            window.location.href = 'director.html';
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
        if (normalizedUser.role === 'DIRECTOR') {
            localStorage.setItem('authToken', token);
            localStorage.setItem('currentUser', JSON.stringify(normalizedUser));
            window.location.href = 'director.html';
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

        // Fetch full user data including projectName
        try {
            const meData = await fetch(`${API_URL}/me`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json'
                }
            }).then(r => r.json());
            
            if (meData.success && meData.data) {
                currentUser = {
                    ...currentUser,
                    projectName: meData.data.projectName,
                };
                localStorage.setItem('currentUser', JSON.stringify(currentUser));
            }
        } catch (e) {
            console.error('[Login] Failed to fetch user details:', e);
        }

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
    window.location.href = '/';
}

function forceLogout() {
    logout();
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
    
    if (currentUser.projectName) {
        document.getElementById('projectBadge').textContent = currentUser.projectName;
    } else if (pid) {
        loadProjectName(pid);
    } else {
        document.getElementById('projectBadge').textContent = 'No Project';
    }
}

async function loadProjectName(projectId) {
    try {
        const data = await apiRequest(`/projects/${projectId}`);
        if (data.success && data.data) {
            document.getElementById('projectBadge').textContent = data.data.Name || `Project #${projectId}`;
            currentUser.projectName = data.data.Name;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
        }
    } catch (err) {
        console.error('[LoadProject] Failed:', err);
        document.getElementById('projectBadge').textContent = `Project #${projectId}`;
    }
}

function navigateTo(section, event) {
    if (event) event.preventDefault();

    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
    document.getElementById(`section-${section}`).classList.add('active');

    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    event && event.target.closest('.nav-item').classList.add('active');

    if (section === 'members') {
        const pid = Number(projectId);
        const projectMembers = allUsers.filter(u => 
            Number(u.ProjectID) === pid
        );
        console.log('[Members] Loading members for projectId:', pid, 'Found:', projectMembers.length);
        if (projectMembers.length === 0) {
            showMessage('membersMessage', 'No members found. Debug: pid=' + pid + ', allUsers count=' + allUsers.length, 'warning');
        }
        renderMembers(projectMembers);
    }
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

function getLatestTimestamp(item) {
    const rawDate = item?.CreatedAt || item?.createdAt || item?.OrderDate || item?.orderDate || item?.Date || item?.date;
    const timestamp = rawDate ? new Date(rawDate).getTime() : 0;
    return Number.isNaN(timestamp) ? 0 : timestamp;
}

function sortByLatest(data) {
    return [...(data || [])].sort((a, b) => getLatestTimestamp(b) - getLatestTimestamp(a));
}

function formatCurrency(amount) {
    return `₹${(Number(amount) || 0).toFixed(2)}`;
}

function getProjectOrders() {
    const pid = Number(projectId);
    return allOrders.filter(o => {
        const post = allPosts.find(p => p.ID === o.PostID);
        const orderProjectId = o.Post?.Product?.ProjectID || post?.Product?.ProjectID || o.Product?.ProjectID || o.ProjectID || o.Project?.ID;
        return Number(orderProjectId) === pid;
    });
}

function updateApprovalNotifications(pending) {
    const badge = document.getElementById('navBadge');
    const pendingCountBadge = document.getElementById('pendingCountBadge');
    const count = pending.length;

    if (count > 0) {
        badge.style.display = 'inline-flex';
        badge.textContent = count;
        pendingCountBadge.style.display = 'inline';
        pendingCountBadge.textContent = `${count} pending`;
    } else {
        badge.style.display = 'none';
        pendingCountBadge.style.display = 'none';
    }

    if (lastPendingApprovalCount !== null && count > lastPendingApprovalCount) {
        const diff = count - lastPendingApprovalCount;
        showToast(`${diff} new approval request${diff > 1 ? 's' : ''} pending`, 'warning');
    }

    lastPendingApprovalCount = count;
}

// ──────────────────────────────────────────────────────────────
//  DATA LOADING
// ──────────────────────────────────────────────────────────────
const PAGE_SIZE = 10;
let currentOffset = 0;
let isLoadingPosts = false;
let hasMorePosts = true;
let activePosts = [];

async function loadAllData() {
    try {
        const [ordersRes, usersRes, productsRes, postsRes] = await Promise.all([
            apiRequest('/orders'),
            apiRequest('/users'),
            apiRequest('/products'),
            apiRequest('/posts')
        ]);

        // Reset pagination state
        currentOffset = 0;
        hasMorePosts = true;
        activePosts = [];
        
        // Load initial posts with pagination
        await loadMorePosts();

        allPosts = postsRes.data || [];
        
        allOrders   = ordersRes.data  || [];
        allUsers    = usersRes.data   || [];
        const pid = Number(projectId);
        allProducts = (productsRes.data || []).filter(p => Number(p.ProjectID) === pid);

        console.log('[LoadData] Loaded. Users:', allUsers.length, 'Posts:', allPosts.length, 'Products:', allProducts.length);
        console.log('[LoadData] All users:', allUsers.map(u => ({ id: u.ID, name: u.Name, pid: u.ProjectID, status: u.ApprovalStatus })));

        updateStats();
        renderApprovals();
        renderOrders();

    } catch (err) {
        console.error('[LoadData] Failed:', err);
        showToast('Failed to load data: ' + err.message, 'danger');
    }
}

async function loadMorePosts() {
    if (isLoadingPosts || !hasMorePosts) return;
    
    isLoadingPosts = true;
    
    // Show loading indicator
    const feed = document.getElementById('instaFeed');
    const loadingIndicator = document.getElementById('lazyLoadSpinner');
    
    try {
        const response = await apiRequest(`/posts?limit=${PAGE_SIZE}&offset=${currentOffset}`);
        
        // Handle paginated response
        let posts = response.data?.data || response.data || [];
        let total = response.data?.total || 0;
        let hasMore = response.data?.has_more !== undefined ? response.data.has_more : posts.length >= PAGE_SIZE;
        
        // Filter active posts
        posts = posts.filter(p => p.Active !== false);
        
        activePosts = [...activePosts, ...posts];
        hasMorePosts = activePosts.length < total || posts.length > 0;
        currentOffset += posts.length;
        
        renderMarketplace(activePosts, !hasMorePosts);
        
    } catch (err) {
        console.error('[LoadMorePosts] Failed:', err);
    } finally {
        isLoadingPosts = false;
    }
}

// Lazy loading scroll detection
function setupLazyLoading() {
    const mainContent = document.querySelector('.main-content');
    
    if (!mainContent) return;
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && hasMorePosts && !isLoadingPosts) {
                loadMorePosts();
            }
        });
    }, {
        rootMargin: '100px'
    });
    
    // Observe the sentinel element at the bottom
    const sentinel = document.getElementById('lazyLoadSentinel');
    if (sentinel) {
        observer.observe(sentinel);
    }
}

function updateStats() {
    const pid = Number(projectId);
    
    // Fixed: Products now shows actual product count, Posts shows post count
    document.getElementById('totalProducts').textContent = allProducts.length;
    document.getElementById('totalPosts').textContent = allPosts.length;

    document.getElementById('totalOrders').textContent = getProjectOrders().length;

    const approvedUsers = allUsers.filter(u =>
        Number(u.ProjectID) === pid && u.ApprovalStatus === 'APPROVED'
    );
    document.getElementById('totalMembers').textContent = approvedUsers.length;

    const pending = allUsers.filter(u =>
        Number(u.ProjectID) === pid && u.ApprovalStatus === 'PENDING'
    );

    updateApprovalNotifications(pending);
}

// ──────────────────────────────────────────────────────────────
//  MARKETPLACE (Posts) - Instagram Style
// ──────────────────────────────────────────────────────────────
function renderMarketplace(posts, isLastPage = false) {
    const feed  = document.getElementById('instaFeed');

    if (!posts || posts.length === 0) {
        feed.innerHTML = '';
        feed.appendChild(buildEmptyState('bi bi-shop', 'No posts yet', 'Create your first post to start selling in the marketplace', () => showAddPostModal()));
        feed.innerHTML += '<div id="lazyLoadSentinel"></div>';
        return;
    }

    const postsHTML = posts.map(post => {
        const remainingQty = post.RemainingQty !== undefined ? post.RemainingQty : (post.TotalQty || 0);
        const createdDate = new Date(post.CreatedAt).toLocaleDateString('en-IN', {
            day: '2-digit', month: 'short', year: 'numeric'
        });
        const postOrders = getPostRecentOrders(post.ID);
        const initialText = postOrders.length > 0 
            ? `<span class="ticker-text"><strong>${postOrders[0].User?.Name || 'Someone'}</strong> just ordered ${postOrders[0].OrderQuantity}x</span>`
            : `<span class="ticker-text" style="color: var(--text-muted);">No recent orders</span>`;

        return `
            <div class="insta-card">
                <div class="insta-card-header">
                    <img src="${avatarUrl(post.Product?.Name || 'P', '4f46e5')}" class="insta-card-avatar" alt="">
                    <div class="insta-card-user">
                        <div class="insta-card-user-name">${post.Product?.Name || 'Unknown Product'}</div>
                        <div class="insta-card-user-sub">Project: ${post.Product?.Project?.Name || post.Product?.Project?.name || `Project #${post.Product?.ProjectID}` || '—'} · ${createdDate}</div>
                    </div>
                </div>
                ${post.ProductImg
                    ? `<img src="${BASE_URL}/${post.ProductImg}" class="insta-card-image" alt="${post.Product?.Name || 'Product'}" onclick="viewProductDetails(${post.ID})">`
                    : `<div class="insta-card-image-placeholder" onclick="viewProductDetails(${post.ID})"><i class="bi bi-image"></i></div>`
                }
                <div class="product-activity-ticker" id="ticker-${post.ID}">
                    <div class="ticker-content active">
                        <i class="bi bi-lightning-fill ticker-icon"></i>
                        ${initialText}
                    </div>
                </div>
                <div class="insta-card-actions">
                    <i class="bi bi-heart" onclick="this.classList.toggle('active')"></i>
                    <i class="bi bi-chat" onclick="viewProductDetails(${post.ID})"></i>
                    <i class="bi bi-share" onclick="sharePost(${post.ID})"></i>
                </div>
                <div class="insta-card-body">
                    <div class="insta-card-price">
                        ${formatCurrency(post.Price)}
                    </div>
                    <div class="insta-card-desc">
                        ${post.Product?.Description || 'No description available for this product'}
                    </div>
                    <div class="insta-card-meta">
                        <span><i class="bi bi-box"></i> ${remainingQty} left</span>
                        <span><i class="bi bi-cart3"></i> ${post.TotalOrders || 0} orders</span>
                    </div>
                </div>
                <div class="insta-card-footer">
                    <button class="btn btn-outline-primary" onclick="viewProductDetails(${post.ID})">
                        <i class="bi bi-info-circle"></i> View Details
                    </button>
                </div>
            </div>
        `;
    }).join('');

    // Add posts HTML
    feed.innerHTML = postsHTML;

    // Add lazy load indicator or end message
    const lazyLoadIndicator = `
        <div id="lazyLoadSentinel" class="lazy-load-sentinel">
            ${isLastPage ? '<span class="end-message">You\'re all caught up!</span>' : '<div class="loading-spinner"><div class="spinner"></div><span>Loading more...</span></div>'}
        </div>
    `;
    feed.innerHTML += lazyLoadIndicator;

    // Re-start sliding activities
    setTimeout(() => {
        startSlidingActivities();
    }, 100);
}

function getPostRecentOrders(postId) {
    if (!allOrders || allOrders.length === 0) return [];
    
    const postOrders = allOrders.filter(order => order.PostID === postId)
        .sort((a, b) => new Date(b.CreatedAt) - new Date(a.CreatedAt));
    
    return postOrders.slice(0, 5);
}

function startSlidingActivities() {
    const tickers = document.querySelectorAll('.product-activity-ticker');
    
    tickers.forEach(ticker => {
        const postId = parseInt(ticker.id.replace('ticker-', ''));
        const postOrders = getPostRecentOrders(postId);
        
        if (postOrders.length <= 1) return;
        
        let currentIndex = 0;
        
        setInterval(() => {
            const contents = ticker.querySelectorAll('.ticker-content');
            const nextIndex = (currentIndex + 1) % postOrders.length;
            
            const currentEl = contents[0];
            const nextEl = document.createElement('div');
            nextEl.className = 'ticker-content';
            nextEl.innerHTML = `
                <i class="bi bi-lightning-fill ticker-icon"></i>
                <span class="ticker-text"><strong>${postOrders[nextIndex].User?.Name || 'Someone'}</strong> just ordered ${postOrders[nextIndex].OrderQuantity}x</span>
            `;
            ticker.appendChild(nextEl);
            
            setTimeout(() => {
                currentEl.classList.remove('active');
                currentEl.classList.add('slide-out');
                nextEl.classList.add('active');
            }, 50);
            
            setTimeout(() => {
                currentEl.remove();
                currentIndex = nextIndex;
            }, 500);
        }, 4000);
    });
}

function filterMarketplace() {
    const term  = document.getElementById('searchProducts').value.toLowerCase().trim();
    if (!term) { renderMarketplace(activePosts); return; }
    const filtered = activePosts.filter(p =>
        (p.Product?.Name || '').toLowerCase().includes(term) ||
        (p.Product?.Description || '').toLowerCase().includes(term) ||
        String(p.Price).includes(term)
    );
    renderMarketplace(filtered);
}

function sharePost(postId) {
    const post = allPosts.find(p => p.ID === postId);
    if (!post) return;
    
    if (navigator.share) {
        navigator.share({
            title: post.Product?.Name || 'Product',
            text: `Check out this product: ${post.Product?.Name} for ₹${(post.Price || 0).toFixed(2)}`,
            url: window.location.href
        });
    } else {
        showToast('Share link copied!', 'success');
    }
}

// ──────────────────────────────────────────────────────────────
//  MY POSTS SECTION
// ──────────────────────────────────────────────────────────────
let myPostsFilter = 'all';

function renderMyPosts(posts) {
    const grid = document.getElementById('myPostsGrid');
    const empty = document.getElementById('myPostsEmpty');
    
    if (!posts || posts.length === 0) {
        grid.innerHTML = '';
        empty.style.display = 'flex';
        return;
    }
    
    empty.style.display = 'none';
    
    grid.innerHTML = posts.map(post => {
        const remainingQty = post.RemainingQty !== undefined ? post.RemainingQty : (post.TotalQty || 0);
        const isActive = post.Active !== false;
        const statusClass = isActive ? 'status-active' : 'status-inactive';
        const statusText = isActive ? 'Active' : 'Inactive';
        const statusIcon = isActive ? 'bi-check-circle-fill' : 'bi-x-circle-fill';
        const toggleText = isActive ? 'Deactivate' : 'Activate';
        const toggleClass = isActive ? 'btn-outline-warning' : 'btn-outline-success';
        const postTotalOrdered = post.TotalOrders || 0;
        
        return `
            <div class="insta-card">
                <div class="insta-card-header">
                    <img src="${avatarUrl(post.Product?.Name || 'P', '4f46e5')}" class="insta-card-avatar" alt="">
                    <div class="insta-card-user">
                        <div class="insta-card-user-name">${post.Product?.Name || 'Unknown Product'}</div>
                        <div class="insta-card-user-sub">
                            <span class="post-status ${statusClass}">
                                <i class="bi ${statusIcon}"></i> ${statusText}
                            </span>
                        </div>
                    </div>
                </div>
                ${post.ProductImg
                    ? `<img src="${BASE_URL}/${post.ProductImg}" class="insta-card-image" alt="${post.Product?.Name || 'Product'}">`
                    : `<div class="insta-card-image-placeholder"><i class="bi bi-image"></i></div>`
                }
                <div class="insta-card-body">
                    <div class="insta-card-price">
                        ${formatCurrency(post.Price)}
                    </div>
                    <div class="insta-card-desc">
                        ${post.Product?.Description || 'No description available'}
                    </div>
                    <div class="insta-card-meta">
                        <span><i class="bi bi-box"></i> ${remainingQty} left</span>
                        <span><i class="bi bi-cart3"></i> ${postTotalOrdered} orders</span>
                    </div>
                </div>
                <div class="insta-card-footer">
                    <button class="btn ${toggleClass} btn-sm w-100" onclick="togglePostActive(${post.ID})">
                        <i class="bi ${isActive ? 'bi-pause-circle' : 'bi-play-circle'}"></i> ${toggleText}
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function filterMyPosts(filter) {
    myPostsFilter = filter;
    
    // Update button states
    document.getElementById('filterAll').classList.remove('active');
    document.getElementById('filterActive').classList.remove('active');
    document.getElementById('filterInactive').classList.remove('active');
    document.getElementById(`filter${filter.charAt(0).toUpperCase() + filter.slice(1)}`).classList.add('active');
    
    let filteredPosts = allPosts;
    
    if (filter === 'active') {
        filteredPosts = allPosts.filter(p => p.Active !== false);
    } else if (filter === 'inactive') {
        filteredPosts = allPosts.filter(p => p.Active === false);
    }
    
    renderMyPosts(filteredPosts);
}

async function togglePostActive(postId) {
    try {
        const data = await apiRequest(`/posts/${postId}/toggle-active`, 'PATCH');
        if (data.success) {
            // Update local state
            const postIndex = allPosts.findIndex(p => p.ID === postId);
            if (postIndex !== -1) {
                allPosts[postIndex].Active = data.data.Active;
            }
            
            // Re-render with current filter
            filterMyPosts(myPostsFilter);
            
            // Also update marketplace if the post is active/inactive
            activePosts = allPosts.filter(p => p.Active !== false);
            renderMarketplace(activePosts);
            
            showToast(`Post ${data.data.Active ? 'activated' : 'deactivated'} successfully`, 'success');
        }
    } catch (err) {
        console.error('[ToggleActive] Failed:', err);
        showToast('Failed to update post status: ' + err.message, 'danger');
    }
}

// Override navigateTo to load My Posts when navigating
const originalNavigateTo = navigateTo;
navigateTo = function(section, event) {
    originalNavigateTo(section, event);
    
    if (section === 'my-posts') {
        renderMyPosts(allPosts);
    }
};

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
    const pid = Number(projectId);

    // Filter users by project ID and pending status
    const pending = allUsers.filter(u => {
        return Number(u.ProjectID) === pid && u.ApprovalStatus === 'PENDING';
    });

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
        await apiRequest(`/captain/users/${userId}/approve`, 'PATCH');
        showToast('User approved', 'success');
        await loadAllData();
    } catch (err) {
        showToast('Approve failed: ' + (err.message || 'Permission denied'), 'danger');
    }
}

async function doReject(userId) {
    try {
        await apiRequest(`/captain/users/${userId}/reject`, 'PATCH');
        showToast('User rejected', 'success');
        await loadAllData();
    } catch (err) {
        showToast('Reject failed: ' + (err.message || 'Permission denied'), 'danger');
    }
}

// ──────────────────────────────────────────────────────────────
//  MEMBERS SECTION
// ──────────────────────────────────────────────────────────────
function renderMembers(members) {
    const list = document.getElementById('membersList');
    const empty = document.getElementById('membersEmpty');
    const countBadge = document.getElementById('membersCountBadge');
    
    if (!members || members.length === 0) {
        list.innerHTML = '';
        empty.style.display = 'flex';
        countBadge.style.display = 'none';
        return;
    }
    
    empty.style.display = 'none';
    countBadge.style.display = 'inline';
    countBadge.textContent = members.length;
    
    list.style.display = 'flex';
    
    list.innerHTML = members.map(member => {
        const statusClass = member.ApprovalStatus === 'APPROVED' ? 'approved' : 
                           member.ApprovalStatus === 'PENDING' ? 'pending' : 'rejected';
        const roleBadgeClass = getRoleBadgeClass(member.Role);
        
        return `
            <div class="member-card" onclick="showMemberDetail(${member.ID})">
                <img src="${avatarUrl(member.Name, '4f46e5')}" class="member-avatar" alt="${member.Name}">
                <div class="member-info">
                    <div class="member-name">${member.Name || 'Unknown'}</div>
                    <div class="member-meta">
                        <span><i class="bi bi-envelope"></i> ${member.Email || 'N/A'}</span>
                        <span><i class="bi bi-hash"></i> ${member.EmpNo || 'N/A'}</span>
                    </div>
                </div>
                <div class="d-flex flex-column align-items-end gap-1">
                    <span class="member-status ${statusClass}" title="${member.ApprovalStatus || 'UNKNOWN'}"></span>
                    <span class="badge ${roleBadgeClass}" style="font-size: 9px;">${member.Role || 'USER'}</span>
                </div>
            </div>
        `;
    }).join('');
}

function getRoleBadgeClass(role) {
    switch(role) {
        case 'ADMIN': return 'bg-danger';
        case 'CAPTAIN': return 'bg-warning text-dark';
        case 'DIRECTOR': return 'bg-primary';
        default: return 'bg-secondary';
    }
}

function filterMembers() {
    const roleFilter = document.getElementById('memberRoleFilter').value;
    const pid = Number(projectId);
    
    const projectMembers = allUsers.filter(u => 
        Number(u.ProjectID) === pid
    );
    
    if (roleFilter === 'ALL') {
        renderMembers(projectMembers);
    } else {
        const filtered = projectMembers.filter(u => u.Role === roleFilter);
        renderMembers(filtered);
    }
}

function showMemberDetail(userId) {
    const member = allUsers.find(u => u.ID === userId);
    if (!member) return;
    
    const statusClass = member.ApprovalStatus === 'APPROVED' ? 'text-success' : 
                       member.ApprovalStatus === 'PENDING' ? 'text-warning' : 'text-danger';
    const roleBadgeClass = getRoleBadgeClass(member.Role);
    const joinedDate = member.CreatedAt ? new Date(member.CreatedAt).toLocaleDateString('en-IN', {
        day: '2-digit', month: 'long', year: 'numeric'
    }) : 'N/A';
    
    const modalBody = `
        <div class="text-center mb-3">
            <img src="${avatarUrl(member.Name, '4f46e5')}" class="rounded-circle" style="width: 80px; height: 80px; object-fit: cover;">
            <h5 class="mt-2 mb-1">${member.Name || 'Unknown'}</h5>
            <span class="badge ${roleBadgeClass}">${member.Role || 'USER'}</span>
        </div>
        <div class="member-card" style="cursor: default;">
            <div class="member-info w-100">
                <div class="member-meta flex-column align-items-start gap-2">
                    <span><i class="bi bi-envelope"></i> <strong>Email:</strong> ${member.Email || 'N/A'}</span>
                    <span><i class="bi bi-hash"></i> <strong>Employee ID:</strong> ${member.EmpNo || 'N/A'}</span>
                    <span><i class="bi bi-building"></i> <strong>Project:</strong> ${member.Project?.Name || `Project #${member.ProjectID}` || 'N/A'}</span>
                    <span class="${statusClass}"><i class="bi bi-circle-fill" style="font-size: 8px;"></i> <strong>Status:</strong> ${member.ApprovalStatus || 'UNKNOWN'}</span>
                    <span><i class="bi bi-calendar3"></i> <strong>Joined:</strong> ${joinedDate}</span>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('userDetailBody').innerHTML = modalBody;
    
    const modal = new bootstrap.Modal(document.getElementById('userDetailModal'));
    modal.show();
}

// ──────────────────────────────────────────────────────────────
 //  ORDERS
 // ──────────────────────────────────────────────────────────────
function renderOrders() {
    const list  = document.getElementById('ordersList');
    const empty = document.getElementById('ordersEmpty');

    console.log('[renderOrders] projectId:', projectId, 'allPosts:', allPosts.length, 'allOrders:', allOrders.length);

    const finalOrders = getProjectOrders();

    console.log('[renderOrders] visibleOrders:', finalOrders.length, 'post details:', allPosts.slice(0, 3).map(p => ({ ID: p.ID, ProductProjectID: p.Product?.ProjectID })));

     if (!finalOrders.length) {
        list.style.display = 'none';
        empty.style.display = 'block';
        return;
    }

    empty.style.display = 'none';
    list.style.display  = 'flex';

    list.innerHTML = sortByLatest(finalOrders).map(order => {
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
                        <div class="order-product-meta">Qty: ${order.OrderQuantity || 0} · ${formatCurrency(order.TotalPrice)}</div>
                    </div>
                </div>
                ${order.Address ? `
                <div class="order-address">
                    <i class="bi bi-geo-alt"></i> ${order.Address}
                </div>
                ` : ''}
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

    let filtered = getProjectOrders();

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

    list.innerHTML = sortByLatest(filtered).map(order => {
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
                        <div class="order-product-meta">Qty: ${order.OrderQuantity || 0} · ${formatCurrency(order.TotalPrice)}</div>
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
    editingOrder = getProjectOrders().find(o => o.ID === orderId);
    if (!editingOrder) {
        showToast('You can only update orders in your project', 'danger');
        return;
    }

    document.getElementById('orderModalInfo').innerHTML =
        `Order #${editingOrder.ID} · ${editingOrder.User?.Name || '—'} · ${editingOrder.Post?.Product?.Name || '—'}`;
    document.getElementById('newOrderStatus').value = editingOrder.OrderStatus || 'PENDING';

    const modal = new bootstrap.Modal(document.getElementById('orderStatusModal'));
    modal.show();
}

async function submitOrderStatus() {
    if (!editingOrder) return;

    const newStatus = document.getElementById('newOrderStatus').value;
    const pid = getProjectId();

    try {
        await apiRequest(`/orders/${editingOrder.ID}`, 'PUT', {
            OrderID:     editingOrder.ID,
            OrderStatus: newStatus,
            ProjectID:   pid
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

// ──────────────────────────────────────────────────────────────
//  ADD POST MODAL - Load products for captain's project
// ──────────────────────────────────────────────────────────────
async function loadProjectProducts() {
    const user = getUser();
    const pid = user.ProjectID || user.projectId;
    
    console.log('[Products] Loading products for project:', pid);
    
    if (!pid) {
        console.error('[Products] No project ID found for captain');
        return [];
    }

    try {
        const data = await apiRequest('/products');
        const allProducts = data.data || [];
        const pidNum = Number(pid);
        
        const filteredProducts = allProducts.filter(p => {
            return Number(p.ProjectID) === pidNum;
        });
        
        console.log('[Products] Found', filteredProducts.length, 'products for project', pidNum);
        return filteredProducts;
    } catch (err) {
        console.error('[Products] Failed to load:', err);
        showToast('Failed to load products', 'danger');
        return [];
    }
}

async function showAddPostModal() {
    const modal = new bootstrap.Modal(document.getElementById('addPostModal'));
    const productSelect = document.getElementById('postProductSelect');
    const productInfo = document.getElementById('productSelectedInfo');

    clearMessage('addPostMessage');
    document.getElementById('postPrice').value = '';
    document.getElementById('postQuantity').value = '';
    document.getElementById('postImage').value = '';
    productInfo.style.display = 'none';

    productSelect.innerHTML = '<option value="">Loading products...</option>';

    modal.show();

    const products = await loadProjectProducts();

    if (products.length === 0) {
        productSelect.innerHTML = '<option value="">No products found for your project</option>';
        showMessage('addPostMessage', 'No products available. Please ask admin to add products for your project.', 'warning');
        return;
    }

    productSelect.innerHTML = '<option value="">Select a product...</option>' +
        products.map(p => `<option value="${p.ID}" data-desc="${p.Description || ''}">${p.Name}</option>`).join('');
}

// ──────────────────────────────────────────────────────────────
//  ADD OPTIONS MODAL
// ──────────────────────────────────────────────────────────────
function showAddOptionsModal() {
    const modal = new bootstrap.Modal(document.getElementById('addOptionsModal'));
    modal.show();
}

// ──────────────────────────────────────────────────────────────
//  ADD PRODUCT MODAL
// ──────────────────────────────────────────────────────────────
function openAddProductModal() {
    bootstrap.Modal.getInstance(document.getElementById('addOptionsModal'))?.hide();
    
    const modal = new bootstrap.Modal(document.getElementById('addProductModal'));
    clearMessage('addProductMessage');
    document.getElementById('productName').value = '';
    document.getElementById('productDescription').value = '';
    document.getElementById('productImageFile').value = '';
    modal.show();
}

async function submitAddProduct() {
    const name = document.getElementById('productName').value.trim();
    const description = document.getElementById('productDescription').value.trim();
    const imageFile = document.getElementById('productImageFile').files[0];

    if (!name) {
        showMessage('addProductMessage', 'Please enter a product name', 'danger');
        return;
    }

    const submitBtn = document.getElementById('submitProductBtn');
    const spinner = document.getElementById('submitProductSpinner');

    submitBtn.disabled = true;
    spinner.style.display = 'inline-block';

    try {
        const payload = {
            Name: name,
            Description: description || '',
            ProjectID: projectId
        };

        console.log('[Product] Creating with payload:', payload);

        const result = await apiRequest('/products', 'POST', payload);

        if (result.success) {
            bootstrap.Modal.getInstance(document.getElementById('addProductModal')).hide();
            showToast('Product created successfully!', 'success');
            await loadAllData();
        } else {
            throw new Error(result.error || 'Failed to create product');
        }
    } catch (err) {
        showMessage('addProductMessage', err.message, 'danger');
    } finally {
        submitBtn.disabled = false;
        spinner.style.display = 'none';
    }
}

document.getElementById('postProductSelect').addEventListener('change', function() {
    const productInfo = document.getElementById('productSelectedInfo');
    const selectedOption = this.options[this.selectedIndex];
    
    if (this.value) {
        document.getElementById('selectedProductDesc').textContent = selectedOption.dataset.desc || 'No description available';
        productInfo.style.display = 'block';
    } else {
        productInfo.style.display = 'none';
    }
});

async function submitAddPost() {
    const productId = document.getElementById('postProductSelect').value;
    const price = parseFloat(document.getElementById('postPrice').value);
    const quantity = parseInt(document.getElementById('postQuantity').value, 10);
    const imageFile = document.getElementById('postImage').files[0];

    if (!productId) {
        showMessage('addPostMessage', 'Please select a product', 'danger');
        return;
    }

    if (!price || price <= 0) {
        showMessage('addPostMessage', 'Please enter a valid price', 'danger');
        return;
    }

    if (!quantity || quantity <= 0) {
        showMessage('addPostMessage', 'Please enter a valid quantity', 'danger');
        return;
    }

    const submitBtn = document.getElementById('submitPostBtn');
    const spinner = document.getElementById('submitPostSpinner');

    submitBtn.disabled = true;
    spinner.style.display = 'inline-block';

    try {
        const formData = new FormData();
        formData.append('ProductID', parseInt(productId));
        formData.append('Price', price);
        formData.append('TotalQty', quantity);
        if (imageFile) {
            formData.append('ProductImg', imageFile);
        }

        const result = await apiUpload('/posts', formData);

        if (result.success) {
            bootstrap.Modal.getInstance(document.getElementById('addPostModal')).hide();
            showToast('Post created successfully!', 'success');
            await loadAllData();
        } else {
            throw new Error(result.error || 'Failed to create post');
        }
    } catch (err) {
        showMessage('addPostMessage', err.message, 'danger');
    } finally {
        submitBtn.disabled = false;
        spinner.style.display = 'none';
    }
}

function viewProductDetails(postId) {
    const post = allPosts.find(p => p.ID === postId);
    if (!post) return;

    document.getElementById('productDetailTitle').textContent = post.Product?.Name || 'Product Details';
    
    if (post.ProductImg) {
        document.getElementById('productDetailImage').innerHTML = 
            `<img src="${BASE_URL}/${post.ProductImg}" class="rounded" style="max-width: 100%; max-height: 200px;">`;
    } else {
        document.getElementById('productDetailImage').innerHTML = 
            `<div class="bg-light rounded d-flex align-items-center justify-content-center" style="height: 150px;">
                <i class="bi bi-box" style="font-size: 48px; color: #ccc;"></i>
            </div>`;
    }

    const remainingQty = post.RemainingQty !== undefined ? post.RemainingQty : (post.TotalQty || 0);
    document.getElementById('productDetailPrice').textContent = formatCurrency(post.Price);
    document.getElementById('productDetailQty').textContent = `${remainingQty} left`;
    document.getElementById('productDetailDesc').textContent = post.Product?.Description || 'No description available';

    const modal = new bootstrap.Modal(document.getElementById('productDetailModal'));
    modal.show();
}

