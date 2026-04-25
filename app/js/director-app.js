/**
 * Marketplace Director Dashboard - JavaScript Application
 */

const API_URL = 'http://localhost:8080/api';
const BASE_URL = 'http://localhost:8080';
let authToken = localStorage.getItem('authToken');
let currentUser = JSON.parse(localStorage.getItem('currentUser')) || {};
let allPosts = [];
let allOrders = [];
let allUsers = [];
let currentPost = null;

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

function formatDisplayDate(dateValue) {
    if (!dateValue) return 'Date unavailable';
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return 'Date unavailable';
    return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}

function formatDisplayDateTime(dateValue) {
    if (!dateValue) return 'Date unavailable';
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return 'Date unavailable';
    return date.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function getProjectName(source) {
    return source?.Project?.Name || source?.projectName || source?.ProjectName || 'Project unavailable';
}

function getPostProjectId(post) {
    return post?.ProjectID || post?.Project?.ID || post?.Product?.ProjectID || post?.Product?.Project?.ID || null;
}

function createProductCard(post, role = 'director') {
    const postOrders = getPostRecentOrders(post.ID);
    const initialText = postOrders.length > 0
        ? `<span class="ticker-text"><strong>${postOrders[0].User?.Name || 'Someone'}</strong> just ordered ${postOrders[0].OrderQuantity}x</span>`
        : `<span class="ticker-text" style="color: var(--text-muted);">No recent orders</span>`;
    const projectName = getProjectName(post.Product);
    const postDate = formatDisplayDateTime(post.CreatedAt);
    const remainingQty = post.RemainingQty !== undefined ? post.RemainingQty : post.TotalQty;
    const productName = post.Product?.Name || 'Product';
    const shortDescription = (post.Product?.Description || 'No description available')
        .trim()
        .slice(0, 120);

    return `
        <article class="product-card marketplace-card marketplace-card-${role}">
            <div class="marketplace-card-top">
                <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(productName)}&background=9b59b6&color=fff&size=96" class="marketplace-card-avatar" alt="">
                <div class="marketplace-card-top-text">
                    <h3 class="product-title">${productName}</h3>
                    <div class="marketplace-card-subtitle">
                        <span><i class="bi bi-building"></i> ${projectName}</span>
                        <span><i class="bi bi-calendar3"></i> ${postDate}</span>
                    </div>
                </div>
            </div>
            <div class="marketplace-card-media">
                ${post.ProductImg ?
                    `<img src="${API_URL}/${post.ProductImg}" class="product-image" alt="${productName}">` :
                    `<div class="product-image placeholder">
                        <i class="bi bi-box"></i>
                    </div>`
                }
            </div>
            <div class="product-activity-ticker" id="ticker-${post.ID}">
                <div class="ticker-content active">
                    <i class="bi bi-lightning-fill ticker-icon"></i>
                    ${initialText}
                </div>
            </div>
            <div class="product-info marketplace-card-body">
                <div class="marketplace-card-price-row">
                    <span class="product-price-tag">${formatCurrency(post.Price)}</span>
                    <span class="product-project-tag">${projectName}</span>
                </div>
                <p class="product-short-desc">${shortDescription}${shortDescription.length >= 120 ? '…' : ''}</p>
                <div class="product-stats">
                    <span><i class="bi bi-cart3"></i> ${post.TotalOrders || 0} orders</span>
                    <span><i class="bi bi-box-seam"></i> ${remainingQty} left</span>
                </div>
                <div class="product-extra-info" id="productInfo-${post.ID}" hidden>
                    <p>${post.Product?.Description || 'No description available'}</p>
                    <span><i class="bi bi-building"></i> ${projectName}</span>
                </div>
                <div class="product-actions">
                    <button class="btn btn-primary btn-order" onclick="openOrderModal(${post.ID})">
                        <i class="bi bi-bag-plus"></i> Order Now
                    </button>
                    <button type="button" class="btn btn-outline-secondary btn-card-info" onclick="toggleProductInfo(event, ${post.ID})">
                        <i class="bi bi-info-circle"></i> Info
                    </button>
                </div>
            </div>
        </article>
    `;
}

function toggleProductInfo(event, postId) {
    event?.preventDefault();
    event?.stopPropagation();

    const detail = document.getElementById(`productInfo-${postId}`);
    if (!detail) return;
    detail.hidden = !detail.hidden;
}

// ===================================
// Initialize Application
// ===================================
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Director Dashboard initialized');
    
    if (authToken) {
        try {
            const response = await fetch(`${API_URL}/me`, {
                method: 'GET',
                headers: { 
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error('Unauthorized');
            }
            
            const data = await response.json();
            if (data.success && data.data) {
                const userRole = data.data.role;
                
                currentUser = {
                    ...currentUser,
                    id: data.data.id,
                    name: data.data.name,
                    email: data.data.email,
                    role: userRole,
                    projectName: data.data.projectName,
                    ProjectID: data.data.projectId,
                    projectId: data.data.projectId
                };
                localStorage.setItem('currentUser', JSON.stringify(currentUser));
                
                if (userRole === 'ADMIN') {
                    window.location.href = 'index.html';
                    return;
                }
                
                if (userRole === 'CAPTAIN') {
                    window.location.href = 'captain.html';
                    return;
                }
                
                if (userRole === 'USER') {
                    window.location.href = 'user.html';
                    return;
                }
                
                showDirectorDashboard();
            } else {
                throw new Error('Invalid response');
            }
        } catch (error) {
            console.error('Auth verification failed:', error);
            localStorage.removeItem('authToken');
            localStorage.removeItem('currentUser');
            showAuth();
        }
    } else {
        showAuth();
    }
});

// ===================================
// Authentication Functions
// ===================================
function showAuth() {
    document.getElementById('authContainer').style.display = 'flex';
    document.getElementById('directorDashboard').style.display = 'none';
}

function showDirectorDashboard() {
    document.getElementById('authContainer').style.display = 'none';
    document.getElementById('directorDashboard').style.display = 'block';
    document.getElementById('userInfo').textContent = `Welcome, ${currentUser.name || 'Director'}`;
    loadDirectorData();
}

document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();
        if (response.ok && data.success && data.data && data.data.token) {
            authToken = data.data.token;
            currentUser = data.data.user || { name: 'User', role: 'DIRECTOR' };
            localStorage.setItem('authToken', authToken);
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            
            if (currentUser.role === 'DIRECTOR') {
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
                            id: meData.data.id,
                            name: meData.data.name,
                            email: meData.data.email,
                            projectName: meData.data.projectName,
                            ProjectID: meData.data.projectId,
                            projectId: meData.data.projectId
                        };
                        localStorage.setItem('currentUser', JSON.stringify(currentUser));
                    }
                } catch (e) {
                    console.error('[Login] Failed to fetch user details:', e);
                }
                
                showDirectorDashboard();
            } else {
                window.location.reload();
            }
        } else {
            showMessage('authMessage', 'Login failed: ' + (data.error || data.message || 'Invalid credentials'), 'danger');
        }
    } catch (error) {
        console.error('Login error:', error);
        showMessage('authMessage', 'Error: Failed to connect to server', 'danger');
    }
});

function logout() {
    authToken = null;
    currentUser = {};
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    showAuth();
    document.getElementById('loginForm').reset();
}

function showMessage(elId, text, type = 'info') {
    const el = document.getElementById(elId);
    if (!el) return;
    el.innerHTML = `<div class="alert alert-${type} alert-dismissible fade show">${text}<button type="button" class="btn-close" data-bs-dismiss="alert"></button></div>`;
    setTimeout(() => { if (el) el.innerHTML = ''; }, 5000);
}

// ===================================
// Navigation
// ===================================
function switchSection(sectionName) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.getElementById(sectionName).classList.add('active');

    document.querySelectorAll('.bottom-nav .nav-item').forEach(item => item.classList.remove('active'));
    event.target.closest('.nav-item').classList.add('active');
    
    if (sectionName === 'products') {
        renderAllProducts();
    }
}

// ===================================
// API Helper Functions
// ===================================
async function apiCall(endpoint, method = 'GET', body = null) {
    const options = {
        method,
        headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
        }
    };

    if (body && method !== 'GET') {
        options.body = JSON.stringify(body);
    }

    const response = await fetch(`${API_URL}${endpoint}`, options);
    
    if (!response.ok && response.status === 401) {
        logout();
        throw new Error('Unauthorized');
    }
    
    const data = await response.json();
    return data;
}

// ===================================
// Data Loading
// ===================================
async function loadDirectorData() {
    try {
        const [postsData, ordersData, usersData, productsData] = await Promise.all([
            apiCall('/posts'),
            apiCall('/orders'),
            apiCall('/users'),
            apiCall('/products')
        ]);
        
        allPosts = sortByLatest(postsData.data || []);
        allOrders = sortByLatest(ordersData.data || []);
        allUsers = usersData.data || [];
        window.allProducts = productsData.data || [];
        
        renderMarketplace(allPosts);
        renderMyOrders();
        renderAllProducts();
        renderUsers(allUsers);
        
        setTimeout(() => {
            startSlidingActivities();
        }, 500);
    } catch (error) {
        console.error('Error loading data:', error);
    }
}

// ===================================
// All Products Section
// ===================================
function renderAllProducts() {
    const grid = document.getElementById('directorProductsGrid');
    const empty = document.getElementById('directorProductsEmpty');
    
    const products = window.allProducts || [];
    
    if (!products || products.length === 0) {
        grid.innerHTML = '';
        empty.style.display = 'flex';
        return;
    }
    
    empty.style.display = 'none';
    
    grid.innerHTML = products.map(product => {
        const projectName = getProjectName(product);
        const description = product.Description || '';
        
        return `
            <div class="director-product-card">
                ${product.ImageUrl ? 
                    `<img src="${API_URL}/${product.ImageUrl}" class="director-product-image" alt="${product.Name || 'Product'}">` :
                    `<div class="director-product-image-placeholder"><i class="bi bi-box"></i></div>`
                }
                <div class="director-product-info">
                    <div class="director-product-name">${product.Name || 'Unknown'}</div>
                    <div class="director-product-project">${projectName}</div>
                    ${description ? `<div class="director-product-desc">${description}</div>` : ''}
                </div>
            </div>
        `;
    }).join('');
}

// ===================================
// Marketplace
// ===================================
function renderMarketplace(posts) {
    const productsGrid = document.getElementById('productsGrid');
    const sortedPosts = sortByLatest(posts);
    
    if (!sortedPosts || sortedPosts.length === 0) {
        productsGrid.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
                <i class="bi bi-box-seam"></i>
                <h4>No products available</h4>
                <p>Check back later for new items</p>
            </div>
        `;
        return;
    }

    productsGrid.innerHTML = sortedPosts.map(post => createProductCard(post, 'director')).join('');
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

// Search functionality
document.getElementById('searchInput').addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const filteredPosts = allPosts.filter(post => 
        post.Product?.Name?.toLowerCase().includes(searchTerm) ||
        post.Product?.Description?.toLowerCase().includes(searchTerm)
    );
    renderMarketplace(filteredPosts);
});

// ===================================
// Orders
// ===================================
function renderMyOrders() {
    const ordersList = document.getElementById('ordersList');
    const ordersEmpty = document.getElementById('ordersEmpty');
    
    const myOrders = sortByLatest(allOrders.filter(order => order.UserID === currentUser.id));
    
    if (!myOrders || myOrders.length === 0) {
        ordersList.innerHTML = '';
        ordersEmpty.style.display = 'flex';
        return;
    }
    
    ordersEmpty.style.display = 'none';
    
    const sortedOrders = sortByLatest(myOrders);
    
    ordersList.innerHTML = sortedOrders.map(order => {
        const statusClass = getStatusClass(order.OrderStatus);
        const statusText = order.OrderStatus || 'PENDING';
        const orderDate = formatDisplayDate(order.CreatedAt);
        const projectName = getProjectName(order.Post?.Product);
        
        return `
            <div class="director-order-card">
                <div class="director-order-header">
                    <div>
                        <h4 class="director-order-title">${order.Post?.Product?.Name || 'Product'}</h4>
                        <p class="director-order-meta">Order #${order.ID} • ${orderDate}</p>
                    </div>
                    <span class="badge ${statusClass}">${statusText}</span>
                </div>
                <div class="director-order-details">
                    <div class="director-order-detail">
                        <i class="bi bi-box"></i>
                        <span>Qty: ${order.OrderQuantity}</span>
                    </div>
                    <div class="director-order-detail">
                        <i class="bi bi-currency-rupee"></i>
                        <span>Total: ${formatCurrency(order.TotalPrice || ((order.OrderQuantity || 0) * (order.Post?.Price || 0)))}</span>
                    </div>
                    <div class="director-order-detail">
                        <i class="bi bi-building"></i>
                        <span>${projectName}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function getStatusClass(status) {
    switch(status) {
        case 'COMPLETED': return 'bg-success';
        case 'CONFIRMED': return 'bg-primary';
        case 'REJECTED': return 'bg-danger';
        default: return 'bg-warning text-dark';
    }
}

// ===================================
// Users Management
// ===================================
function renderUsers(users) {
    const usersList = document.getElementById('usersList');
    const usersEmpty = document.getElementById('usersEmpty');
    
    // Filter out ADMIN users
    const filteredUsers = users.filter(user => user.Role !== 'ADMIN');
    
    if (!filteredUsers || filteredUsers.length === 0) {
        usersList.innerHTML = '';
        usersEmpty.style.display = 'flex';
        return;
    }
    
    usersEmpty.style.display = 'none';
    
    const sortedUsers = filteredUsers.sort((a, b) => {
        const roleOrder = { 'DIRECTOR': 0, 'CAPTAIN': 1, 'USER': 2 };
        return (roleOrder[a.Role] || 99) - (roleOrder[b.Role] || 99);
    });
    
    usersList.innerHTML = sortedUsers.map(user => {
        const roleClass = getRoleBadgeClass(user.Role);
        const statusClass = user.ApprovalStatus === 'APPROVED' ? 'text-success' : 
                           user.ApprovalStatus === 'PENDING' ? 'text-warning' : 'text-danger';
        const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.Name || 'U')}&background=random&color=fff&size=120`;
        
        return `
            <div class="user-card" onclick="showUserDetail(${user.ID})">
                <div class="user-card-header">
                    <img src="${avatarUrl}" class="user-card-avatar" alt="${user.Name}">
                    <div class="user-card-info">
                        <h5>${user.Name || 'Unknown'}</h5>
                        <p>${user.Email || 'No email'}</p>
                    </div>
                    <span class="badge ${roleClass}">${user.Role || 'USER'}</span>
                </div>
                <div class="user-card-details">
                    <div class="user-card-detail">
                        <i class="bi bi-hash"></i>
                        <span>${user.EmpNo || 'N/A'}</span>
                    </div>
                    <div class="user-card-detail">
                        <i class="bi bi-building"></i>
                        <span>${getProjectName(user)}</span>
                    </div>
                    <div class="user-card-detail">
                        <i class="bi bi-check-circle ${statusClass}"></i>
                        <span class="${statusClass}">${user.ApprovalStatus || 'UNKNOWN'}</span>
                    </div>
                    <div class="user-card-detail">
                        <i class="bi bi-calendar"></i>
                        <span>${user.CreatedAt ? new Date(user.CreatedAt).toLocaleDateString() : 'N/A'}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function getRoleBadgeClass(role) {
    switch(role) {
        case 'ADMIN': return 'bg-danger';
        case 'DIRECTOR': return 'badge-director';
        case 'CAPTAIN': return 'badge-captain';
        default: return 'badge-user';
    }
}

function filterUsers() {
    const roleFilter = document.getElementById('userRoleFilter').value;
    
    if (roleFilter === 'ALL') {
        renderUsers(allUsers);
    } else {
        const filteredUsers = allUsers.filter(user => user.Role === roleFilter);
        renderUsers(filteredUsers);
    }
}

function showUserDetail(userId) {
    const user = allUsers.find(u => u.ID === userId);
    if (!user) return;
    
    const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.Name || 'U')}&background=random&color=fff&size=200`;
    const statusClass = user.ApprovalStatus === 'APPROVED' ? 'text-success' : 
                       user.ApprovalStatus === 'PENDING' ? 'text-warning' : 'text-danger';
    
    document.getElementById('userDetailBody').innerHTML = `
        <div class="text-center mb-3">
            <img src="${avatarUrl}" class="rounded-circle" style="width: 80px; height: 80px; object-fit: cover;">
            <h5 class="mt-2 mb-0">${user.Name || 'Unknown'}</h5>
            <span class="badge ${getRoleBadgeClass(user.Role)}">${user.Role || 'USER'}</span>
        </div>
        <div class="user-card-details" style="grid-template-columns: 1fr;">
            <div class="user-card-detail">
                <i class="bi bi-envelope"></i>
                <span>${user.Email || 'No email'}</span>
            </div>
            <div class="user-card-detail">
                <i class="bi bi-hash"></i>
                <span>Employee No: ${user.EmpNo || 'N/A'}</span>
            </div>
            <div class="user-card-detail">
                <i class="bi bi-building"></i>
                <span>Project: ${getProjectName(user)}</span>
            </div>
            <div class="user-card-detail">
                <i class="bi bi-check-circle ${statusClass}"></i>
                <span class="${statusClass}">Status: ${user.ApprovalStatus || 'UNKNOWN'}</span>
            </div>
            <div class="user-card-detail">
                <i class="bi bi-calendar-plus"></i>
                <span>Joined: ${user.CreatedAt ? new Date(user.CreatedAt).toLocaleString() : 'N/A'}</span>
            </div>
            ${user.UpdatedAt ? `
            <div class="user-card-detail">
                <i class="bi bi-calendar-check"></i>
                <span>Last Updated: ${new Date(user.UpdatedAt).toLocaleString()}</span>
            </div>
            ` : ''}
        </div>
    `;
    
    const modal = new bootstrap.Modal(document.getElementById('userDetailModal'));
    modal.show();
}

// ===================================
// Order Modal
// ===================================
function openOrderModal(postId) {
    const post = allPosts.find(p => p.ID === postId);
    if (!post) return;
    
    currentPost = post;
    
    document.getElementById('orderPostId').value = postId;
    document.getElementById('orderQuantity').value = 1;
    document.getElementById('availableQty').textContent = `Available: ${post.RemainingQty !== undefined ? post.RemainingQty : post.TotalQty}`;
    
    const total = (post.Price || 0) * 1;
    document.getElementById('orderTotal').textContent = formatCurrency(total);
    
    document.getElementById('orderProductInfo').innerHTML = `
        <div class="d-flex align-items-center gap-3 mb-3">
            ${post.ProductImg ? 
                `<img src="${BASE_URL}/${post.ProductImg}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px;">` :
                `<div class="bg-light rounded d-flex align-items-center justify-content-center" style="width: 60px; height: 60px;">
                    <i class="bi bi-box"></i>
                </div>`
            }
            <div>
                <h6 class="mb-1">${post.Product?.Name || 'Product'}</h6>
                <p class="text-muted mb-0" style="font-size: 14px;">${formatCurrency(post.Price)} each</p>
            </div>
        </div>
    `;
    
    const modal = new bootstrap.Modal(document.getElementById('orderModal'));
    modal.show();
}

function updateQuantity(change) {
    const input = document.getElementById('orderQuantity');
    const current = parseInt(input.value) || 1;
    const max = currentPost?.RemainingQty || currentPost?.TotalQty || 100;
    const newValue = Math.max(1, Math.min(max, current + change));
    input.value = newValue;
    
    const total = (currentPost?.Price || 0) * newValue;
    document.getElementById('orderTotal').textContent = formatCurrency(total);
}

async function submitOrder() {
    const postId = parseInt(document.getElementById('orderPostId').value);
    const quantity = parseInt(document.getElementById('orderQuantity').value);
    const addressField = document.getElementById('orderAddress');
    const address = addressField.value.trim();
    
    // Get current user from localStorage
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    const userId = currentUser.id;
    
    if (!userId) {
        showToast('User not found. Please login again.', 'danger');
        return;
    }
    
    if (!address) {
        showToast('Please enter a delivery address', 'danger');
        addressField.focus();
        return;
    }
    
    // Calculate total price
    const totalPrice = (currentPost?.Price || 0) * quantity;
    
    try {
        const data = await apiCall('/orders', 'POST', {
            PostID: postId,
            ProductID: currentPost?.ProductID || currentPost?.Product?.ID,
            ProjectID: getPostProjectId(currentPost),
            UserID: userId,
            OrderQuantity: quantity,
            TotalPrice: totalPrice,
            OrderStatus: 'PENDING',
            Address: address
        });
        
        if (data.success) {
            bootstrap.Modal.getInstance(document.getElementById('orderModal')).hide();
            addressField.value = '';
            showToast('Order placed successfully!', 'success');
            
            const ordersData = await apiCall('/orders');
            allOrders = ordersData.data || [];
            
            const postsData = await apiCall('/posts');
            allPosts = postsData.data || [];
            
            renderMarketplace(allPosts.filter(p => p.Active !== false));
            renderMyOrders();
            
            setTimeout(() => {
                startSlidingActivities();
            }, 500);
        } else {
            showToast(data.message || 'Failed to place order', 'danger');
        }
    } catch (error) {
        console.error('Order error:', error);
        showToast('Failed to place order', 'danger');
    }
}

function showToast(message, type = 'info') {
    const toast = document.getElementById('liveToast');
    const msgEl = document.getElementById('toastMessage');
    toast.className = `toast show toast-${type}`;
    msgEl.textContent = message;
    const bsToast = new bootstrap.Toast(toast, { delay: 3000 });
    bsToast.show();
}
