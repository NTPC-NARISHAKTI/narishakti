/**
 * Marketplace User Dashboard - JavaScript Application
 * Mobile-first, production-ready implementation
 */

// ===================================
// Configuration & State
// ===================================
const API_URL = 'http://localhost:8080';
let authToken = localStorage.getItem('authToken');
let currentUser = JSON.parse(localStorage.getItem('currentUser')) || {};
let allPosts = [];
let userOrders = [];
let currentPost = null;

// ===================================
// Initialize Application
// ===================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('User Dashboard initialized');
    
    if (authToken) {
        // Check if user is admin - redirect to admin dashboard
        if (currentUser.role === 'ADMIN') {
            window.location.href = 'index.html';
            return;
        }
        showUserDashboard();
    } else {
        showAuth();
    }
});

// ===================================
// Authentication Functions
// ===================================
function showAuth() {
    document.getElementById('authContainer').style.display = 'flex';
    document.getElementById('userDashboard').style.display = 'none';
    loadProjectsForSelect('registerProject');
}

function showUserDashboard() {
    document.getElementById('authContainer').style.display = 'none';
    document.getElementById('userDashboard').style.display = 'block';
    document.getElementById('userInfo').textContent = `Welcome, ${currentUser.name || 'User'}`;
    loadMarketplace();
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
            currentUser = data.data.user || { name: 'User', role: 'USER' };
            
            // Check if admin - redirect to admin dashboard
            if (currentUser.role === 'ADMIN') {
                localStorage.setItem('authToken', authToken);
                localStorage.setItem('currentUser', JSON.stringify(currentUser));
                window.location.href = 'index.html';
                return;
            }
            
            localStorage.setItem('authToken', authToken);
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            showUserDashboard();
            showToast('Login successful!', 'success');
        } else {
            showMessage('authMessage', 'Login failed: ' + (data.error || data.message || 'Invalid credentials'), 'danger');
        }
    } catch (error) {
        console.error('Login error:', error);
        showMessage('authMessage', 'Error: Failed to connect to server. Make sure backend is running on ' + API_URL, 'danger');
    }
});

document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('registerName').value;
    const empNo = document.getElementById('registerEmpNo').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('registerConfirmPassword').value;
    const projectId = document.getElementById('registerProject').value;

    if (password !== confirmPassword) {
        showMessage('authMessage', 'Password and confirm password do not match.', 'danger');
        return;
    }

    if (!projectId) {
        showMessage('authMessage', 'Please select a project.', 'danger');
        return;
    }

    const registerData = { name, empNo, email, password, confirmPassword, projectId: parseInt(projectId) };

    try {
        const response = await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(registerData)
        });

        const data = await response.json();
        if (response.ok && data.success) {
            showMessage('authMessage', 'Registration successful! Please login.', 'success');
            document.getElementById('registerForm').reset();
            setTimeout(() => {
                document.getElementById('login-tab').click();
            }, 1500);
        } else {
            showMessage('authMessage', 'Registration failed: ' + (data.error || data.message || 'Unknown error'), 'danger');
        }
    } catch (error) {
        console.error('Registration error:', error);
        showMessage('authMessage', 'Error: Failed to connect to server.', 'danger');
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

// ===================================
// Navigation
// ===================================
function switchSection(sectionName) {
    // Hide all sections
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.getElementById(sectionName).classList.add('active');

    // Update bottom nav
    document.querySelectorAll('.bottom-nav .nav-item').forEach(item => item.classList.remove('active'));
    event.target.closest('.nav-item').classList.add('active');

    // Load data for section
    switch (sectionName) {
        case 'marketplace':
            loadMarketplace();
            break;
        case 'orders':
            loadOrders();
            break;
        case 'profile':
            loadProfile();
            break;
        case 'members':
            loadMembers();
            break;
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
// Marketplace Section
// ===================================
async function loadMarketplace() {
    const productsGrid = document.getElementById('productsGrid');
    const recentActivity = document.getElementById('recentActivity');
    
    // Show skeleton loaders
    productsGrid.innerHTML = `
        <div class="skeleton-container">
            <div class="skeleton-card"></div>
            <div class="skeleton-card"></div>
            <div class="skeleton-card"></div>
            <div class="skeleton-card"></div>
        </div>
    `;
    
    recentActivity.innerHTML = `
        <div class="skeleton-activity">
            <div class="skeleton-activity-item"></div>
            <div class="skeleton-activity-item"></div>
            <div class="skeleton-activity-item"></div>
        </div>
    `;

    try {
        // Load posts and orders in parallel
        const [postsData, ordersData] = await Promise.all([
            apiCall('/posts'),
            apiCall('/orders')
        ]);
        
        allPosts = postsData.data || [];
        const allOrders = ordersData.data || [];
        
        // Render recent activity first
        renderRecentActivity(allOrders);
        
        if (allPosts.length === 0) {
            productsGrid.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1;">
                    <i class="bi bi-box-seam"></i>
                    <h4>No products available</h4>
                    <p>Check back later for new items</p>
                </div>
            `;
            return;
        }

        renderProducts(allPosts);
    } catch (error) {
        console.error('Error loading marketplace:', error);
        productsGrid.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
                <i class="bi bi-exclamation-triangle"></i>
                <h4>Error loading products</h4>
                <p>Please check your connection and try again</p>
                <button class="btn btn-primary" onclick="loadMarketplace()">Retry</button>
            </div>
        `;
        recentActivity.innerHTML = '';
    }
}

// ===================================
// Recent Activity Section
// ===================================
function renderRecentActivity(orders) {
    const recentActivity = document.getElementById('recentActivity');
    
    if (!orders || orders.length === 0) {
        recentActivity.innerHTML = `
            <div class="activity-empty">
                <p>No recent activity yet. Be the first to order!</p>
            </div>
        `;
        return;
    }
    
    // Sort orders by date (most recent first) and take last 5
    const recentOrders = orders
        .sort((a, b) => new Date(b.CreatedAt) - new Date(a.CreatedAt))
        .slice(0, 5);
    
    recentActivity.innerHTML = recentOrders.map(order => {
        const userName = order.User?.Name || 'Anonymous';
        const productName = order.Post?.Product?.Name || 'Product';
        const status = order.OrderStatus || 'PENDING';
        const orderDate = new Date(order.CreatedAt);
        
        // Calculate delivery time if completed
        let deliveryInfo = '';
        if (status === 'COMPLETED' && order.OrderConfirmedAt) {
            const deliveredDate = new Date(order.OrderConfirmedAt);
            const days = Math.ceil((deliveredDate - orderDate) / (1000 * 60 * 60 * 24));
            deliveryInfo = `Delivered in ${days} day${days !== 1 ? 's' : ''}`;
        } else if (status === 'COMPLETED') {
            deliveryInfo = 'Delivered';
        } else if (status === 'CONFIRMED') {
            deliveryInfo = 'Processing...';
        } else {
            deliveryInfo = 'Pending';
        }
        
        // Determine icon type
        let iconClass = 'processing';
        let icon = 'bi-clock';
        if (status === 'COMPLETED') {
            iconClass = 'delivered';
            icon = 'bi-check-circle';
        } else if (status === 'CONFIRMED') {
            iconClass = 'ordered';
            icon = 'bi-cart-check';
        }
        
        return `
            <div class="activity-item">
                <div class="activity-icon ${iconClass}">
                    <i class="bi ${icon}"></i>
                </div>
                <div class="activity-content">
                    <div class="activity-text">
                        <strong>${userName}</strong> ordered "${productName}"
                    </div>
                    <div class="activity-time">${deliveryInfo} • ${orderDate.toLocaleDateString()}</div>
                </div>
            </div>
        `;
    }).join('');
}

function renderProducts(posts) {
    const productsGrid = document.getElementById('productsGrid');
    
    productsGrid.innerHTML = posts.map(post => `
        <div class="product-card">
            ${post.ProductImg ? 
                `<img src="${API_URL}/${post.ProductImg}" class="product-image" alt="${post.Product?.Name || 'Product'}">` :
                `<div class="product-image placeholder">
                    <i class="bi bi-box"></i>
                </div>`
            }
            <div class="product-info">
                <h3 class="product-title">${post.Product?.Name || 'Product'}</h3>
                <p class="product-description">${post.Product?.Description || 'No description available'}</p>
                <div class="product-stats">
                    <span><i class="bi bi-cart3"></i> ${post.TotalOrders || 0} ordered</span>
                    <span><i class="bi bi-box-seam"></i> ${post.TotalQty - (post.TotalOrders || 0)} left</span>
                </div>
                <div class="product-footer mt-2">
                    <span class="product-price">$${(post.Price || 0).toFixed(2)}</span>
                    <button class="btn btn-primary btn-order" onclick="openOrderModal(${post.ID})">
                        Order
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// Search functionality
document.getElementById('searchInput').addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const filteredPosts = allPosts.filter(post => 
        post.Product?.Name?.toLowerCase().includes(searchTerm) ||
        post.Product?.Description?.toLowerCase().includes(searchTerm)
    );
    renderProducts(filteredPosts);
});

// ===================================
// Orders Section
// ===================================
async function loadOrders() {
    const ordersList = document.getElementById('ordersList');
    const ordersEmpty = document.getElementById('ordersEmpty');

    try {
        const data = await apiCall('/orders');
        // Filter orders for current user
        userOrders = (data.data || []).filter(order => order.UserID === currentUser.id);
        
        if (userOrders.length === 0) {
            ordersList.style.display = 'none';
            ordersEmpty.style.display = 'block';
            return;
        }

        ordersList.style.display = 'flex';
        ordersEmpty.style.display = 'none';

        ordersList.innerHTML = userOrders.map(order => `
            <div class="order-card">
                <div class="order-header">
                    <span class="order-id">Order #${order.ID}</span>
                    <span class="order-status ${order.OrderStatus?.toLowerCase()}">${order.OrderStatus || 'PENDING'}</span>
                </div>
                <div class="order-product">
                    ${order.Post?.ProductImg ? 
                        `<img src="${API_URL}/${order.Post.ProductImg}" class="order-product-image" alt="Product">` :
                        `<div class="order-product-image" style="display: flex; align-items: center; justify-content: center; background: var(--light-bg);">
                            <i class="bi bi-box" style="font-size: 24px; color: var(--text-muted);"></i>
                        </div>`
                    }
                    <div class="order-product-details">
                        <h4 class="order-product-name">${order.Post?.Product?.Name || 'Product'}</h4>
                        <p class="order-product-meta">Qty: ${order.OrderQuantity || 0} | $${(order.TotalPrice || 0).toFixed(2)}</p>
                    </div>
                </div>
                <div class="order-footer">
                    <span class="order-date">${new Date(order.CreatedAt).toLocaleDateString()}</span>
                    <span class="order-total">$${(order.TotalPrice || 0).toFixed(2)}</span>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading orders:', error);
        ordersList.innerHTML = `
            <div class="empty-state">
                <i class="bi bi-exclamation-triangle"></i>
                <h4>Error loading orders</h4>
                <p>Please try again later</p>
            </div>
        `;
    }
}

// ===================================
// Profile Section
// ===================================
async function loadProfile() {
    try {
        const data = await apiCall(`/users/${currentUser.id}`);
        const user = data.data;
        
        if (user) {
            document.getElementById('profileEmpNo').value = user.EmpNo || '-';
            document.getElementById('profileName').value = user.Name || '-';
            document.getElementById('profileEmail').value = user.Email || '-';
            document.getElementById('profilePhone').value = user.PhoneNo || '';
            document.getElementById('profileProject').value = user.Project?.Name || '-';
            
            // Update avatar
            const avatarUrl = user.Name ? 
                `https://ui-avatars.com/api/?name=${encodeURIComponent(user.Name)}&background=3498db&color=fff` : 
                'https://ui-avatars.com/api/?name=User&background=3498db&color=fff';
            document.getElementById('profileAvatar').src = avatarUrl;
        }
    } catch (error) {
        console.error('Error loading profile:', error);
    }
}

document.getElementById('profileForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const phone = document.getElementById('profilePhone').value;
    
    try {
        await apiCall(`/users/${currentUser.id}`, 'PUT', {
            PhoneNo: phone
        });
        
        showToast('Profile updated successfully!', 'success');
        loadProfile();
    } catch (error) {
        showToast('Error updating profile: ' + error.message, 'danger');
    }
});

// Avatar upload handling
document.getElementById('avatarUpload').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            document.getElementById('profileAvatar').src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
});

// ===================================
// Members Section
// ===================================
async function loadMembers() {
    const membersGrid = document.getElementById('membersGrid');
    const membersEmpty = document.getElementById('membersEmpty');

    try {
        const data = await apiCall('/users');
        // Filter approved members from same project
        const allUsers = data.data || [];
        const projectMembers = allUsers.filter(user => 
            user.ApprovalStatus === 'APPROVED' && 
            user.ProjectID === currentUser.projectId
        );
        
        if (projectMembers.length === 0) {
            membersGrid.style.display = 'none';
            membersEmpty.style.display = 'block';
            return;
        }

        membersGrid.style.display = 'grid';
        membersEmpty.style.display = 'none';

        membersGrid.innerHTML = projectMembers.map(member => {
            const avatarUrl = member.Name ? 
                `https://ui-avatars.com/api/?name=${encodeURIComponent(member.Name)}&background=3498db&color=fff&size=120` : 
                'https://ui-avatars.com/api/?name=U&background=3498db&color=fff&size=120';
            
            return `
                <div class="member-card">
                    <img src="${avatarUrl}" class="member-avatar" alt="${member.Name}">
                    <h4 class="member-name">${member.Name}</h4>
                    <p class="member-role">${member.Role || 'Member'}</p>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Error loading members:', error);
    }
}

// ===================================
// Order Modal Functions
// ===================================
function openOrderModal(postId) {
    currentPost = allPosts.find(p => p.ID === postId);
    if (!currentPost) return;

    const modal = new bootstrap.Modal(document.getElementById('orderModal'));
    
    // Populate modal with product info
    document.getElementById('orderPostId').value = postId;
    document.getElementById('orderQuantity').value = 1;
    
    const productInfo = document.getElementById('orderProductInfo');
    productInfo.innerHTML = `
        ${currentPost.ProductImg ? 
            `<img src="${API_URL}/${currentPost.ProductImg}" alt="${currentPost.Product?.Name}">` :
            `<div style="width: 80px; height: 80px; background: var(--light-bg); border-radius: 8px; display: flex; align-items: center; justify-content: center;">
                <i class="bi bi-box" style="font-size: 32px; color: var(--text-muted);"></i>
            </div>`
        }
        <div class="info-details">
            <h6>${currentPost.Product?.Name || 'Product'}</h6>
            <p class="price">$${(currentPost.Price || 0).toFixed(2)}</p>
        </div>
    `;
    
    document.getElementById('availableQty').textContent = `Available: ${currentPost.TotalQty - (currentPost.TotalOrders || 0)}`;
    updateOrderTotal();
    
    modal.show();
}

function updateQuantity(change) {
    const quantityInput = document.getElementById('orderQuantity');
    let quantity = parseInt(quantityInput.value) + change;
    const maxQty = currentPost ? currentPost.TotalQty - (currentPost.TotalOrders || 0) : 1;
    
    if (quantity < 1) quantity = 1;
    if (quantity > maxQty) quantity = maxQty;
    
    quantityInput.value = quantity;
    updateOrderTotal();
}

function updateOrderTotal() {
    if (!currentPost) return;
    const quantity = parseInt(document.getElementById('orderQuantity').value) || 1;
    const total = quantity * (currentPost.Price || 0);
    document.getElementById('orderTotal').textContent = `$${total.toFixed(2)}`;
}

async function submitOrder() {
    if (!currentPost) return;
    
    const quantity = parseInt(document.getElementById('orderQuantity').value);
    const total = quantity * (currentPost.Price || 0);
    
    const orderData = {
        PostID: currentPost.ID,
        UserID: currentUser.id,
        OrderQuantity: quantity,
        TotalPrice: total,
        OrderStatus: 'PENDING'
    };
    
    try {
        const response = await apiCall('/orders', 'POST', orderData);
        
        if (response.success) {
            showToast('Order placed successfully!', 'success');
            bootstrap.Modal.getInstance(document.getElementById('orderModal')).hide();
            loadMarketplace(); // Refresh products
        } else {
            showToast('Error placing order: ' + (response.error || 'Unknown error'), 'danger');
        }
    } catch (error) {
        showToast('Error placing order: ' + error.message, 'danger');
    }
}

// ===================================
// Utility Functions
// ===================================
function showMessage(elementId, message, type) {
    const element = document.getElementById(elementId);
    element.innerHTML = `<div class="alert alert-${type} alert-dismissible fade show" role="alert">
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    </div>`;
}

function showToast(message, type = 'info') {
    const toastEl = document.getElementById('liveToast');
    const toastMessage = document.getElementById('toastMessage');
    
    toastMessage.innerHTML = `
        <div class="d-flex">
            <div class="flex-grow-1">${message}</div>
            <button type="button" class="btn-close me-2 m-auto" data-bs-dismiss="toast"></button>
        </div>
    `;
    
    // Set toast color based on type
    toastEl.className = `toast show bg-${type === 'success' ? 'success' : type === 'danger' ? 'danger' : 'info'} text-white`;
    
    const toast = new bootstrap.Toast(toastEl);
    toast.show();
}

async function loadProjectsForSelect(selectId) {
    try {
        const data = await apiCall('/projects');
        const projects = data.data || [];
        const select = document.getElementById(selectId);
        select.innerHTML = '<option value="">Select a project</option>' + 
            projects.map(p => `<option value="${p.ID}">${p.Name}</option>`).join('');
    } catch (error) {
        console.error('Error loading projects:', error);
    }
}

// ===================================
// Load More Products (for pagination)
// ===================================
let currentPage = 1;
const itemsPerPage = 12;

function loadMoreProducts() {
    currentPage++;
    // In a real implementation, you would fetch more data from the API
    // For now, we'll just show a message
    showToast('All products loaded', 'info');
}