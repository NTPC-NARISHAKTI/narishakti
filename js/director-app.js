/**
 * Marketplace Director Dashboard - JavaScript Application
 */

const API_URL = 'http://localhost:8080';
let authToken = localStorage.getItem('authToken');
let currentUser = JSON.parse(localStorage.getItem('currentUser')) || {};
let allPosts = [];
let allOrders = [];
let allUsers = [];

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
                
                currentUser = { ...currentUser, role: userRole };
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
                            projectName: meData.data.projectName,
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
        
        allPosts = postsData.data || [];
        allOrders = ordersData.data || [];
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
        const projectName = product.Project?.Name || `Project #${product.ProjectID}`;
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
    
    if (!posts || posts.length === 0) {
        productsGrid.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
                <i class="bi bi-box-seam"></i>
                <h4>No products available</h4>
                <p>Check back later for new items</p>
            </div>
        `;
        return;
    }

    productsGrid.innerHTML = posts.map(post => {
        const postOrders = getPostRecentOrders(post.ID);
        const initialText = postOrders.length > 0 
            ? `<span class="ticker-text"><strong>${postOrders[0].User?.Name || 'Someone'}</strong> just ordered ${postOrders[0].OrderQuantity}x</span>`
            : `<span class="ticker-text" style="color: var(--text-muted);">No recent orders</span>`;
        const projectName = post.Product?.Project?.Name || '';
        
        return `
        <div class="product-card">
            <div class="product-header-bar">
                <div class="product-header-info">
                    <span class="product-title">${post.Product?.Name || 'Product'}</span>
                    ${projectName ? `<span class="product-project-tag">${projectName}</span>` : ''}
                </div>
                <span class="product-price-tag">$${(post.Price || 0).toFixed(2)}</span>
            </div>
            ${post.ProductImg ? 
                `<img src="${API_URL}/${post.ProductImg}" class="product-image" alt="${post.Product?.Name || 'Product'}">` :
                `<div class="product-image placeholder">
                    <i class="bi bi-box"></i>
                </div>`
            }
            <div class="product-activity-ticker" id="ticker-${post.ID}">
                <div class="ticker-content active">
                    <i class="bi bi-lightning-fill ticker-icon"></i>
                    ${initialText}
                </div>
            </div>
            <div class="product-info">
                <div class="product-stats">
                    <span><i class="bi bi-cart3"></i> ${post.TotalOrders || 0} orders</span>
                    <span><i class="bi bi-box-seam"></i> ${post.RemainingQty !== undefined ? post.RemainingQty : post.TotalQty} left</span>
                </div>
                <p class="product-description">${post.Product?.Description || 'No description available'}</p>
                <button class="btn btn-primary btn-order w-100" onclick="openOrderModal(${post.ID})">
                    <i class="bi bi-bag-plus"></i> Order Now
                </button>
            </div>
        </div>
    `}).join('');
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
    
    const myOrders = allOrders.filter(order => order.UserID === currentUser.id);
    
    if (!myOrders || myOrders.length === 0) {
        ordersList.innerHTML = '';
        ordersEmpty.style.display = 'flex';
        return;
    }
    
    ordersEmpty.style.display = 'none';
    
    const sortedOrders = myOrders.sort((a, b) => new Date(b.CreatedAt) - new Date(a.CreatedAt));
    
    ordersList.innerHTML = sortedOrders.map(order => {
        const statusClass = getStatusClass(order.OrderStatus);
        const statusText = order.OrderStatus || 'PENDING';
        const orderDate = new Date(order.CreatedAt).toLocaleDateString('en-IN', {
            day: '2-digit', month: 'short', year: 'numeric'
        });
        
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
                        <i class="bi bi-currency-dollar"></i>
                        <span>Total: $${((order.OrderQuantity || 0) * (order.Post?.Price || 0)).toFixed(2)}</span>
                    </div>
                    <div class="director-order-detail">
                        <i class="bi bi-building"></i>
                        <span>Project #${order.Post?.Product?.ProjectID || '—'}</span>
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
                        <span>Project #${user.ProjectID || 'N/A'}</span>
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
                <span>Project ID: ${user.ProjectID || 'N/A'}</span>
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
    document.getElementById('orderTotal').textContent = `$${total.toFixed(2)}`;
    
    document.getElementById('orderProductInfo').innerHTML = `
        <div class="d-flex align-items-center gap-3 mb-3">
            ${post.ProductImg ? 
                `<img src="${API_URL}/${post.ProductImg}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px;">` :
                `<div class="bg-light rounded d-flex align-items-center justify-content-center" style="width: 60px; height: 60px;">
                    <i class="bi bi-box"></i>
                </div>`
            }
            <div>
                <h6 class="mb-1">${post.Product?.Name || 'Product'}</h6>
                <p class="text-muted mb-0" style="font-size: 14px;">$${(post.Price || 0).toFixed(2)} each</p>
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
    document.getElementById('orderTotal').textContent = `$${total.toFixed(2)}`;
}

async function submitOrder() {
    const postId = parseInt(document.getElementById('orderPostId').value);
    const quantity = parseInt(document.getElementById('orderQuantity').value);
    
    try {
        const data = await apiCall('/orders', 'POST', {
            PostID: postId,
            OrderQuantity: quantity
        });
        
        if (data.success) {
            bootstrap.Modal.getInstance(document.getElementById('orderModal')).hide();
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
