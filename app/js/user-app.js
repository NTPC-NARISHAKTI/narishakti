/**
 * Marketplace User Dashboard - JavaScript Application
 * Mobile-first, production-ready implementation
 */

// ===================================
// Configuration & State
// ===================================
const API_URL = 'http://localhost:8080/api';
const BASE_URL = 'http://localhost:8080';
let authToken = localStorage.getItem('authToken');
let currentUser = JSON.parse(localStorage.getItem('currentUser')) || {};
let allPosts = [];
let allOrders = [];
let userOrders = [];
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

function getPostProjectId(post) {
    return post?.ProjectID || post?.Project?.ID || post?.Product?.ProjectID || post?.Product?.Project?.ID || null;
}

function createProductCard(post, role = 'user') {
    const postOrders = getPostRecentOrders(post.ID);
    const initialText = postOrders.length > 0
        ? `<span class="ticker-text"><strong>${postOrders[0].User?.Name || 'Someone'}</strong> just ordered ${postOrders[0].OrderQuantity}x</span>`
        : `<span class="ticker-text" style="color: var(--text-muted);">No recent orders</span>`;
    const projectName = post.Product?.Project?.Name || '';
    const remainingQty = post.RemainingQty !== undefined ? post.RemainingQty : post.TotalQty;
    const postDate = formatDisplayDateTime(post.CreatedAt);
    const productName = post.Product?.Name || 'Product';

    return `
        <article class="product-card marketplace-card marketplace-card-${role}">
            <div class="marketplace-card-top">
                <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(productName)}&background=3498db&color=fff&size=96" class="marketplace-card-avatar" alt="">
                <div class="marketplace-card-top-text">
                    <h3 class="product-title">${productName}</h3>
                    <div class="marketplace-card-subtitle">
                        ${projectName ? `<span><i class="bi bi-building"></i> ${projectName}</span>` : ''}
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
                    ${projectName ? `<span class="product-project-tag">${projectName}</span>` : ''}
                </div>
                <div class="product-stats">
                    <span><i class="bi bi-cart3"></i> ${post.TotalOrders || 0} orders</span>
                    <span><i class="bi bi-box-seam"></i> ${remainingQty} left</span>
                </div>
                <div class="product-extra-info" id="productInfo-${post.ID}" hidden>
                    <p>${post.Product?.Description || 'No description available'}</p>
                    ${projectName ? `<span><i class="bi bi-building"></i> ${projectName}</span>` : ''}
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
    console.log('User Dashboard initialized');
    
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
                
                // Update stored user with all user data including projectName
                currentUser = { 
                    ...currentUser, 
                    role: userRole,
                    projectName: data.data.projectName,
                    ProjectID: data.data.projectId,
                    id: data.data.id,
                    name: data.data.name,
                    email: data.data.email
                };
                localStorage.setItem('currentUser', JSON.stringify(currentUser));
                
                // Check if user is admin - redirect to admin dashboard
                if (userRole === 'ADMIN') {
                    window.location.href = 'index.html';
                    return;
                }
                
                // Check if user is DIRECTOR - redirect to director dashboard
                if (userRole === 'DIRECTOR') {
                    window.location.href = 'director.html';
                    return;
                }
                
                // Check if user is CAPTAIN - redirect to captain dashboard
                if (userRole === 'CAPTAIN') {
                    window.location.href = 'captain.html';
                    return;
                }
                
                showUserDashboard();
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
    document.getElementById('userDashboard').style.display = 'none';
    loadProjectsForSelect('registerProject');
}

function showUserDashboard() {
    document.getElementById('authContainer').style.display = 'none';
    document.getElementById('userDashboard').style.display = 'block';
    document.getElementById('userInfo').textContent = `Welcome, ${currentUser.name || 'User'}`;
    
    if (currentUser.projectName) {
        const projectBadge = document.getElementById('userProject');
        projectBadge.textContent = currentUser.projectName;
        projectBadge.style.display = 'inline-block';
    } else if (currentUser.ProjectID) {
        loadProjectName(currentUser.ProjectID);
    }
    
    loadMarketplace();
}

async function loadProjectName(projectId) {
    try {
        const data = await apiCall(`/projects/${projectId}`);
        if (data.success && data.data) {
            const projectBadge = document.getElementById('userProject');
            projectBadge.textContent = data.data.Name || `Project #${projectId}`;
            projectBadge.style.display = 'inline-block';
        }
    } catch (error) {
        console.error('Error loading project:', error);
    }
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
            localStorage.setItem('authToken', authToken);
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            
            // Role-based routing: Redirect users based on their role
            if (currentUser.role === 'ADMIN') {
                window.location.href = 'index.html';
                return;
            }
            
            if (currentUser.role === 'DIRECTOR') {
                window.location.href = 'director.html';
                return;
            }
            
            if (currentUser.role === 'CAPTAIN') {
                window.location.href = 'captain.html';
                return;
            }
            
            // Fetch full user data including projectName for USER role
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
            
            showUserDashboard();
            showToast('Login successful!', 'success');
        } else {
            // Show the error message from backend
            const errorMsg = data.error || data.message || 'Invalid credentials';
            showMessage('authMessage', errorMsg, 'danger');
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

    if (password.length < 6) {
        showMessage('authMessage', 'Password must be at least 6 characters.', 'danger');
        return;
    }

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
const PAGE_SIZE = 12;
let currentOffset = 0;
let isLoadingPosts = false;
let hasMorePosts = true;
let allPostsCache = [];

async function loadMarketplace() {
    const productsGrid = document.getElementById('productsGrid');
    const loadMoreContainer = document.getElementById('loadMoreContainer');
    
    // Reset pagination state
    currentOffset = 0;
    hasMorePosts = true;
    allPostsCache = [];
    isLoadingPosts = false;
    
    // Show skeleton loaders
    productsGrid.innerHTML = `
        <div class="skeleton-container">
            <div class="skeleton-card"></div>
            <div class="skeleton-card"></div>
            <div class="skeleton-card"></div>
            <div class="skeleton-card"></div>
        </div>
    `;
    loadMoreContainer.style.display = 'none';
    
    try {
        // Load initial posts
        await loadMorePosts();
        
        // Load orders
        const ordersData = await apiCall('/orders');
        allOrders = ordersData.data || [];
        
        if (allPostsCache.length === 0) {
            productsGrid.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1;">
                    <i class="bi bi-box-seam"></i>
                    <h4>No products available</h4>
                    <p>Check back later for new items</p>
                </div>
            `;
            return;
        }
        
        renderProducts(allPostsCache);
        
        // Show load more button if there are more posts
        if (hasMorePosts) {
            loadMoreContainer.style.display = 'block';
        }
        
        // Start sliding activities for each product
        setTimeout(() => {
            startSlidingActivities();
        }, 500);
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
        loadMoreContainer.style.display = 'none';
    }
}

async function loadMorePosts() {
    if (isLoadingPosts || !hasMorePosts) return;
    
    isLoadingPosts = true;
    
    try {
        const response = await apiCall(`/posts?limit=${PAGE_SIZE}&offset=${currentOffset}`);
        
        // Handle paginated response
        let posts = response.data?.data || response.data || [];
        let total = response.data?.total || 0;
        let hasMore = response.data?.has_more !== undefined ? response.data.has_more : posts.length >= PAGE_SIZE;
        
        // Filter active posts only
        posts = posts.filter(p => p.Active !== false);
        
        allPostsCache = [...allPostsCache, ...posts];
        hasMorePosts = allPostsCache.length < total || posts.length > 0;
        currentOffset += posts.length;
        
    } catch (err) {
        console.error('[LoadMorePosts] Failed:', err);
    } finally {
        isLoadingPosts = false;
    }
}

function renderProducts(posts, isLastPage = false) {
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

    productsGrid.innerHTML = posts.map(post => createProductCard(post, 'user')).join('');
} `
        <div id="loadMoreSentinel" class="load-more-sentinel">
            ${isLastPage ? '<span class="end-message">You\'re all caught up!</span>' : '<div class="load-more-spinner"><div class="spinner"></div><span>Loading more...</span></div>'}
        </div>
    `;
    
    // Append to the products grid
    productsGrid.insertAdjacentHTML('beforeend', loadMoreIndicator);
    
    // Re-start sliding activities
    setTimeout(() => {
        startSlidingActivities();
    }, 100);
}

// Lazy loading scroll detection for load more button
function setupLazyLoading() {
    const loadMoreBtn = document.querySelector('.btn-load-more');
    if (!loadMoreBtn) return;
    
    // Intersection Observer for detecting when user is near bottom
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && hasMorePosts && !isLoadingPosts) {
                loadMoreProducts();
            }
        });
    }, {
        rootMargin: '200px' // Trigger when 200px from bottom
    });
    
    // Observe a sentinel element at the bottom
    const sentinel = document.getElementById('loadMoreSentinel');
    if (sentinel) {
        observer.observe(sentinel);
    }
}

// Update the loadMarketplace function to setup lazy loading after initial load
async function loadMarketplace() {
    const productsGrid = document.getElementById('productsGrid');
    const loadMoreContainer = document.getElementById('loadMoreContainer');
    
    // Reset pagination state
    currentOffset = 0;
    hasMorePosts = true;
    allPostsCache = [];
    isLoadingPosts = false;
    
    // Show skeleton loaders
    productsGrid.innerHTML = `
        <div class="skeleton-container">
            <div class="skeleton-card"></div>
            <div class="skeleton-card"></div>
            <div class="skeleton-card"></div>
            <div class="skeleton-card"></div>
        </div>
    `;
    loadMoreContainer.style.display = 'none';
    
    try {
        // Load initial posts
        await loadMorePosts();
        
        // Load orders
        const ordersData = await apiCall('/orders');
        allOrders = ordersData.data || [];
        
        if (allPostsCache.length === 0) {
            productsGrid.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1;">
                    <i class="bi bi-box-seam"></i>
                    <h4>No products available</h4>
                    <p>Check back later for new items</p>
                </div>
            `;
            loadMoreContainer.style.display = 'none';
            return;
        }
        
        renderProducts(allPostsCache);
        
        // Show load more button if there are more posts
        if (hasMorePosts) {
            loadMoreContainer.style.display = 'block';
            setupLazyLoading(); // Setup lazy loading observer
        }
        
        // Start sliding activities for each product
        setTimeout(() => {
            startSlidingActivities();
        }, 500);
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
        loadMoreContainer.style.display = 'none';
    }
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
    const filteredPosts = allPostsCache.filter(post => 
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
        userOrders = sortByLatest((data.data || []).filter(order => order.UserID === currentUser.id));
        
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
                        <p class="order-product-meta">Qty: ${order.OrderQuantity || 0} | ${formatCurrency(order.TotalPrice)}</p>
                    </div>
                </div>
                <div class="order-footer">
                    <span class="order-date">${new Date(order.CreatedAt).toLocaleDateString()}</span>
                    <span class="order-total">${formatCurrency(order.TotalPrice)}</span>
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
            document.getElementById('profileAddress').value = user.Address || '';
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
    const address = document.getElementById('profileAddress').value;
    
    try {
        await apiCall(`/users/${currentUser.id}`, 'PUT', {
            PhoneNo: phone,
            Address: address
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
    currentPost = allPostsCache.find(p => p.ID === postId || p.id === postId);
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
            <p class="price">${formatCurrency(currentPost.Price)}</p>
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
    document.getElementById('orderTotal').textContent = formatCurrency(total);
}

function validateAddress(user) {
    return user.address && user.address.trim().length > 0;
}

async function submitOrder() {
    if (!currentPost) return;
    
    const quantity = parseInt(document.getElementById('orderQuantity').value);
    const total = quantity * (currentPost.Price || 0);
    const addressInput = document.getElementById('orderAddress').value.trim();
    
    // Prefer modal address, fallback to profile address
    const address = addressInput || (currentUser.address || '').trim();
    
    if (!address) {
        showToast('Please enter a delivery address', 'danger');
        return;
    }
    
    const orderData = {
        PostID: currentPost.ID,
        ProductID: currentPost.ProductID || currentPost.Product?.ID,
        ProjectID: getPostProjectId(currentPost),
        UserID: currentUser.id,
        OrderQuantity: quantity,
        TotalPrice: total,
        OrderStatus: 'PENDING',
        Address: address
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
