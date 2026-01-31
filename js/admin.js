// ============================================
// Admin Module - CRUD Operations for Products
// ============================================

import {
    auth, database, ref, set, get, push, update, remove, onValue,
    showLoader, hideLoader, showToast, formatPrice, isAdmin, getTimestamp
} from './firebase.js';

let editingProductId = null;

// Check admin access
function checkAdminAccess() {
    const user = auth.currentUser;
    if (!user || !isAdmin(user)) {
        showToast('Access denied. Admin only.', 'error');
        window.location.href = 'index.html';
        return false;
    }
    return true;
}

// Initialize admin page
function initAdminPage() {
    auth.onAuthStateChanged((user) => {
        if (!user || !isAdmin(user)) {
            showToast('Admin access required', 'error');
            window.location.href = 'login.html';
            return;
        }

        // Update user email display
        const userEmailEl = document.getElementById('userEmail');
        if (userEmailEl) userEmailEl.textContent = user.email;

        initAdminTabs();
        loadProducts();
        loadOrders();
        loadEnquiries();
        initProductForm();
        initAdminBottomNav();
    });
}

// Initialize admin tabs
function initAdminTabs() {
    const tabs = document.querySelectorAll('.admin-tab');
    const panels = document.querySelectorAll('.admin-panel');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.dataset.tab;

            tabs.forEach(t => t.classList.remove('active'));
            panels.forEach(p => p.classList.remove('active'));

            tab.classList.add('active');
            document.getElementById(target)?.classList.add('active');

            // Update bottom nav active state
            updateBottomNavActive(target);
        });
    });
}

// Initialize admin bottom navigation
function initAdminBottomNav() {
    const navItems = document.querySelectorAll('.admin-bottom-nav .bottom-nav-item[data-tab]');

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const target = item.dataset.tab;

            // Trigger tab click
            const tab = document.querySelector(`.admin-tab[data-tab="${target}"]`);
            if (tab) tab.click();

            // Update bottom nav active
            navItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
        });
    });
}

// Update bottom nav active state
function updateBottomNavActive(target) {
    const navItems = document.querySelectorAll('.admin-bottom-nav .bottom-nav-item[data-tab]');
    navItems.forEach(item => {
        if (item.dataset.tab === target) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
}

// Load all products
function loadProducts() {
    const productsRef = ref(database, 'products');

    onValue(productsRef, (snapshot) => {
        const container = document.getElementById('adminProductsList');
        if (!container) return;

        if (!snapshot.exists()) {
            container.innerHTML = '<div class="no-products"><span class="icon-xl icon-muted" style="margin-bottom:16px;"><svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg></span><h3>No products yet</h3><p>Add your first product!</p></div>';
            updateProductCount(0);
            return;
        }

        const products = [];
        snapshot.forEach(child => {
            products.push({ id: child.key, ...child.val() });
        });

        updateProductCount(products.length);

        container.innerHTML = products.map(p => `
            <div class="admin-product-item">
                <div class="admin-product-image">
                    ${p.imageURL ? `<img src="${p.imageURL}" alt="${p.name}" onerror="this.style.display='none';">` : '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22v-5"/><path d="M9 8V2"/><path d="M15 8V2"/><path d="M18 8v5a6 6 0 0 1-6 6v0a6 6 0 0 1-6-6V8Z"/></svg>'}
                </div>
                <div class="admin-product-info">
                    <h4>${p.name}</h4>
                    <p>${formatPrice(p.price)} • ${p.stock} in stock • ${p.category}</p>
                </div>
                <div class="admin-product-actions">
                    <button class="admin-action-btn edit" onclick="editProduct('${p.id}')" title="Edit">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                    </button>
                    <button class="admin-action-btn delete" onclick="deleteProduct('${p.id}')" title="Delete">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                    </button>
                </div>
            </div>
        `).join('');
    });
}

// Update product count badge
function updateProductCount(count) {
    const badge = document.getElementById('productCountBadge');
    if (badge) {
        badge.textContent = count;
        badge.style.display = count > 0 ? 'flex' : 'none';
    }
}

// Initialize product form
function initProductForm() {
    const form = document.getElementById('productForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = document.getElementById('productName').value.trim();
        const category = document.getElementById('productCategory').value;
        const price = parseFloat(document.getElementById('productPrice').value);
        const stock = parseInt(document.getElementById('productStock').value);
        const description = document.getElementById('productDescription').value.trim();
        const imageURL = document.getElementById('productImageURL').value.trim();

        if (!name || !category || isNaN(price) || isNaN(stock)) {
            showToast('Please fill all required fields', 'error');
            return;
        }

        showLoader();

        try {
            const productData = {
                name,
                category,
                price,
                stock,
                description,
                imageURL: imageURL || '',
                updatedAt: getTimestamp()
            };

            if (editingProductId) {
                await update(ref(database, `products/${editingProductId}`), productData);
                showToast('Product updated!', 'success');
                editingProductId = null;
                document.getElementById('formTitle').textContent = 'Add New Product';
                document.getElementById('submitBtn').innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg> Add Product';
                document.getElementById('cancelEditBtn').classList.add('hidden');
            } else {
                productData.createdAt = getTimestamp();
                await push(ref(database, 'products'), productData);
                showToast('Product added!', 'success');
            }

            form.reset();
            document.getElementById('imagePreview').classList.remove('show');
            hideLoader();

            // Switch to products list
            document.querySelector('.admin-tab[data-tab="productsList"]').click();

        } catch (error) {
            hideLoader();
            console.error('Error saving product:', error);
            showToast('Failed to save product', 'error');
        }
    });

    // Image URL preview
    const imageURLInput = document.getElementById('productImageURL');
    const preview = document.getElementById('imagePreview');

    if (imageURLInput && preview) {
        imageURLInput.addEventListener('input', (e) => {
            const url = e.target.value.trim();
            if (url) {
                preview.src = url;
                preview.classList.add('show');
                preview.onerror = () => {
                    preview.classList.remove('show');
                    showToast('Invalid image URL', 'warning');
                };
            } else {
                preview.classList.remove('show');
            }
        });
    }

    // Cancel edit button
    const cancelBtn = document.getElementById('cancelEditBtn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            editingProductId = null;
            form.reset();
            document.getElementById('formTitle').textContent = 'Add New Product';
            document.getElementById('submitBtn').innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg> Add Product';
            cancelBtn.classList.add('hidden');
            document.getElementById('imagePreview').classList.remove('show');
        });
    }
}

// Edit product
window.editProduct = async function (productId) {
    showLoader();
    const snapshot = await get(ref(database, `products/${productId}`));
    hideLoader();

    if (!snapshot.exists()) {
        showToast('Product not found', 'error');
        return;
    }

    const product = snapshot.val();
    editingProductId = productId;

    document.getElementById('productName').value = product.name || '';
    document.getElementById('productCategory').value = product.category || '';
    document.getElementById('productPrice').value = product.price || '';
    document.getElementById('productStock').value = product.stock || '';
    document.getElementById('productDescription').value = product.description || '';
    document.getElementById('productImageURL').value = product.imageURL || '';

    if (product.imageURL) {
        const preview = document.getElementById('imagePreview');
        preview.src = product.imageURL;
        preview.classList.add('show');
    }

    document.getElementById('formTitle').textContent = 'Edit Product';
    document.getElementById('submitBtn').innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> Update Product';
    document.getElementById('cancelEditBtn').classList.remove('hidden');

    document.querySelector('.admin-tab[data-tab="addProduct"]').click();
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

// Delete product
window.deleteProduct = async function (productId) {
    if (!confirm('Are you sure you want to delete this product?')) return;

    showLoader();
    try {
        await remove(ref(database, `products/${productId}`));
        showToast('Product deleted', 'success');
    } catch (error) {
        console.error('Delete error:', error);
        showToast('Failed to delete', 'error');
    }
    hideLoader();
};

// Load orders
function loadOrders() {
    const ordersRef = ref(database, 'orders');

    onValue(ordersRef, (snapshot) => {
        const container = document.getElementById('ordersTable');
        const orderCount = document.getElementById('orderCountBadge');

        if (!container) return;

        if (!snapshot.exists()) {
            container.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:40px;color:var(--text-muted);">No orders yet</td></tr>';
            if (orderCount) orderCount.style.display = 'none';
            return;
        }

        const orders = [];
        snapshot.forEach(child => {
            orders.push({ id: child.key, ...child.val() });
        });

        // Update order count badge
        if (orderCount) {
            orderCount.textContent = orders.length;
            orderCount.style.display = orders.length > 0 ? 'flex' : 'none';
        }

        orders.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

        container.innerHTML = orders.map(order => {
            const date = new Date(order.timestamp || Date.now()).toLocaleDateString('en-IN');
            return `
                <tr>
                    <td><strong>#${order.id.slice(-6).toUpperCase()}</strong></td>
                    <td>${order.userEmail || 'N/A'}</td>
                    <td>${order.items?.length || 0} items</td>
                    <td><strong>${formatPrice(order.total || 0)}</strong></td>
                    <td><span class="order-status ${order.status || 'pending'}">${order.status || 'pending'}</span></td>
                </tr>
            `;
        }).join('');

        // Update total orders stat
        const totalOrdersEl = document.getElementById('totalOrders');
        if (totalOrdersEl) totalOrdersEl.textContent = orders.length;
    });
}

// Load enquiries
function loadEnquiries() {
    const enquiriesRef = ref(database, 'enquiries');

    onValue(enquiriesRef, (snapshot) => {
        const container = document.getElementById('enquiriesContainer');
        const totalEnquiriesEl = document.getElementById('totalEnquiries');

        if (!container) return;

        if (!snapshot.exists()) {
            container.innerHTML = '<div style="text-align: center; padding: 40px; color: rgba(255,255,255,0.5);">No enquiries yet</div>';
            if (totalEnquiriesEl) totalEnquiriesEl.textContent = '0';
            return;
        }

        const enquiries = [];
        snapshot.forEach(child => {
            enquiries.push({ id: child.key, ...child.val() });
        });

        // Sort by timestamp (newest first)
        enquiries.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

        // Update total count
        if (totalEnquiriesEl) totalEnquiriesEl.textContent = enquiries.length;

        container.innerHTML = enquiries.map(enquiry => {
            const date = new Date(enquiry.timestamp || Date.now()).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            return `
                <div class="enquiry-card">
                    <div class="enquiry-card-header">
                        <span class="enquiry-sender">${enquiry.name || 'Anonymous'}</span>
                        <span class="enquiry-date">${date}</span>
                    </div>
                    <div class="enquiry-subject">${enquiry.subject || 'No subject'}</div>
                    <div class="enquiry-message">${enquiry.message || ''}</div>
                    <div class="enquiry-contact">
                        <span class="enquiry-contact-item">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                            </svg>
                            ${enquiry.email || 'N/A'}
                        </span>
                        <span class="enquiry-contact-item">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                            </svg>
                            ${enquiry.phone || 'N/A'}
                        </span>
                    </div>
                </div>
            `;
        }).join('');
    });
}

export { initAdminPage, checkAdminAccess, loadProducts, loadOrders, loadEnquiries };

