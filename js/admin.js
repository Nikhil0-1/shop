import {
    auth, database, storage, ref, set, get, push, update, remove, onValue,
    storageRef, uploadBytes, getDownloadURL, deleteObject,
    showLoader, hideLoader, showToast, formatPrice, isAdmin, getTimestamp
} from './firebase.js';

let editingProductId = null;
let selectedImageFile = null;

/**
 * Check admin access
 */
function checkAdminAccess() {
    const user = auth.currentUser;
    if (!user || !isAdmin(user)) {
        showToast('Access denied. Admin only.', 'error');
        window.location.href = 'index.html';
        return false;
    }
    return true;
}

/**
 * Initialize admin page
 */
function initAdminPage() {
    auth.onAuthStateChanged((user) => {
        if (!user || !isAdmin(user)) {
            // Already handled by the script in head, but safety first
            if (window.location.pathname.includes('admin.html')) {
                window.location.href = 'login.html';
            }
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

/**
 * Initialize admin tabs
 */
function initAdminTabs() {
    const tabs = document.querySelectorAll('.admin-tab');
    const panels = document.querySelectorAll('.admin-panel');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.dataset.tab;

            tabs.forEach(t => t.classList.remove('active'));
            panels.forEach(p => p.classList.remove('active'));

            tab.classList.add('active');
            const panel = document.getElementById(target);
            if (panel) panel.classList.add('active');

            // Update page title / header
            const headerTitle = document.querySelector('.admin-header h1');
            if (headerTitle) {
                const titleMap = {
                    'dashboard': 'Dashboard',
                    'addProduct': editingProductId ? 'Edit Product' : 'Add Product',
                    'productsList': 'Products',
                    'ordersList': 'Orders',
                    'enquiriesList': 'Enquiries'
                };
                headerTitle.textContent = titleMap[target] || 'Admin';
            }

            // Update bottom nav active state
            updateBottomNavActive(target);
        });
    });
}

/**
 * Initialize admin bottom navigation (mobile)
 */
function initAdminBottomNav() {
    const navItems = document.querySelectorAll('.admin-bottom-nav .bottom-nav-item[data-tab]');

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const target = item.dataset.tab;

            // Trigger tab click
            const tab = document.querySelector(`.admin-tab[data-tab="${target}"]`);
            if (tab) tab.click();
        });
    });
}

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

/**
 * Load all products
 */
function loadProducts() {
    const productsRef = ref(database, 'products');

    onValue(productsRef, (snapshot) => {
        const container = document.getElementById('adminProductsList');
        if (!container) return;

        if (!snapshot.exists()) {
            container.innerHTML = `
                <div class="no-products">
                    <span class="icon-xl icon-muted" style="margin-bottom:16px;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>
                    </span>
                    <h3>No products yet</h3>
                    <p>Add your first product!</p>
                </div>`;
            updateProductCount(0);
            return;
        }

        const products = [];
        snapshot.forEach(child => {
            products.push({ id: child.key, ...child.val() });
        });

        // Update counts
        updateProductCount(products.length);
        const totalProductsStat = document.getElementById('totalProducts');
        if (totalProductsStat) totalProductsStat.textContent = products.length;

        // Sort by update/created date
        products.sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0));

        container.innerHTML = products.map(p => `
            <div class="admin-product-item">
                <div class="admin-product-image">
                    ${p.imageURL ? `<img src="${p.imageURL}" alt="${p.name}" onerror="this.onerror=null; this.src='https://via.placeholder.com/80?text=Error';">` : '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22v-5"/><path d="M9 8V2"/><path d="M15 8V2"/><path d="M18 8v5a6 6 0 0 1-6 6v0a6 6 0 0 1-6-6V8Z"/></svg>'}
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

function updateProductCount(count) {
    const badge = document.getElementById('productCountBadge');
    if (badge) {
        badge.textContent = count;
        badge.style.display = count > 0 ? 'flex' : 'none';
    }
}

/**
 * Upload image to Storage
 */
async function uploadProductImage(file) {
    const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
    const storageReference = storageRef(storage, `products/${fileName}`);
    const snapshot = await uploadBytes(storageReference, file);
    return await getDownloadURL(snapshot.ref);
}

/**
 * Initialize product form
 */
function initProductForm() {
    const form = document.getElementById('productForm');
    if (!form) return;

    const fileInput = document.getElementById('productImage');
    const imageURLInput = document.getElementById('productImageURL');
    const preview = document.getElementById('imagePreview');
    const uploadBox = document.getElementById('uploadBox');

    // Handle File selection
    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                selectedImageFile = file;
                const reader = new FileReader();
                reader.onload = (e) => {
                    preview.src = e.target.result;
                    preview.style.display = 'block';
                    preview.classList.add('show');
                };
                reader.readAsDataURL(file);
                if (uploadBox) uploadBox.querySelector('span').textContent = file.name;
            }
        });
    }

    // Handle URL input preview
    if (imageURLInput) {
        imageURLInput.addEventListener('input', (e) => {
            const url = e.target.value.trim();
            if (url) {
                selectedImageFile = null;
                if (fileInput) fileInput.value = '';
                if (uploadBox) uploadBox.querySelector('span').textContent = 'Click to upload image';
                preview.src = url;
                preview.style.display = 'block';
                preview.classList.add('show');
            } else if (!selectedImageFile) {
                preview.style.display = 'none';
                preview.classList.remove('show');
            }
        });
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = document.getElementById('productName').value.trim();
        const category = document.getElementById('productCategory').value;
        const price = parseFloat(document.getElementById('productPrice').value);
        const stock = parseInt(document.getElementById('productStock').value);
        const description = document.getElementById('productDescription').value.trim();
        let imageURL = document.getElementById('productImageURL').value.trim();

        if (!name || !category || isNaN(price) || isNaN(stock)) {
            showToast('Please fill all required fields', 'error');
            return;
        }

        showLoader();

        try {
            // Upload image if file is selected
            if (selectedImageFile) {
                imageURL = await uploadProductImage(selectedImageFile);
            }

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
            } else {
                productData.createdAt = getTimestamp();
                await push(ref(database, 'products'), productData);
                showToast('Product added!', 'success');
            }

            // Reset form and UI
            editingProductId = null;
            selectedImageFile = null;
            form.reset();
            preview.style.display = 'none';
            preview.classList.remove('show');
            if (uploadBox) uploadBox.querySelector('span').textContent = 'Click to upload image';

            document.getElementById('formTitle').textContent = 'Add New Product';
            document.getElementById('submitBtn').innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg> Add Product';
            document.getElementById('cancelEditBtn').classList.add('hidden');

            hideLoader();

            // Switch to products list
            document.querySelector('.admin-tab[data-tab="productsList"]').click();

        } catch (error) {
            hideLoader();
            console.error('Error saving product:', error);
            showToast('Failed to save product: ' + error.message, 'error');
        }
    });

    // Cancel edit button
    const cancelBtn = document.getElementById('cancelEditBtn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            editingProductId = null;
            selectedImageFile = null;
            form.reset();
            preview.style.display = 'none';
            preview.classList.remove('show');
            if (uploadBox) uploadBox.querySelector('span').textContent = 'Click to upload image';
            document.getElementById('formTitle').textContent = 'Add New Product';
            document.getElementById('submitBtn').innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg> Add Product';
            cancelBtn.classList.add('hidden');
        });
    }
}

/**
 * Edit product
 */
window.editProduct = async function (productId) {
    showLoader();
    try {
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

        const preview = document.getElementById('imagePreview');
        if (product.imageURL) {
            preview.src = product.imageURL;
            preview.style.display = 'block';
            preview.classList.add('show');
        } else {
            preview.style.display = 'none';
            preview.classList.remove('show');
        }

        document.getElementById('formTitle').textContent = 'Edit Product';
        document.getElementById('submitBtn').innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> Update Product';
        document.getElementById('cancelEditBtn').classList.remove('hidden');

        // Switch to form tab
        document.querySelector('.admin-tab[data-tab="addProduct"]').click();
        window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (error) {
        hideLoader();
        console.error('Edit error:', error);
        showToast('Error loading product details', 'error');
    }
};

/**
 * Delete product
 */
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

/**
 * Load orders
 */
function loadOrders() {
    const ordersRef = ref(database, 'orders');

    onValue(ordersRef, (snapshot) => {
        const container = document.getElementById('ordersTable');
        const orderCountBadge = document.getElementById('orderCountBadge');
        const dashTotalOrders = document.getElementById('totalOrders');

        if (!container) return;

        if (!snapshot.exists()) {
            container.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:40px;color:rgba(255,255,255,0.4);">No orders yet</td></tr>';
            if (orderCountBadge) orderCountBadge.style.display = 'none';
            if (dashTotalOrders) dashTotalOrders.textContent = '0';
            return;
        }

        const orders = [];
        snapshot.forEach(child => {
            orders.push({ id: child.key, ...child.val() });
        });

        if (orderCountBadge) {
            orderCountBadge.textContent = orders.length;
            orderCountBadge.style.display = 'flex';
        }
        if (dashTotalOrders) dashTotalOrders.textContent = orders.length;

        orders.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

        container.innerHTML = orders.map(order => {
            const date = new Date(order.timestamp || Date.now()).toLocaleDateString('en-IN');
            return `
                <tr>
                    <td><strong>#${order.id.slice(-6).toUpperCase()}</strong></td>
                    <td>${order.userEmail || 'Guest'}</td>
                    <td>${order.items?.length || 0} items</td>
                    <td><strong>${formatPrice(order.total || 0)}</strong></td>
                    <td><span class="status-badge ${order.status || 'pending'}">${order.status || 'Pending'}</span></td>
                </tr>
            `;
        }).join('');
    });
}

/**
 * Load enquiries
 */
function loadEnquiries() {
    const enquiriesRef = ref(database, 'enquiries');

    onValue(enquiriesRef, (snapshot) => {
        const container = document.getElementById('enquiriesContainer');
        const dashTotalEnquiries = document.getElementById('totalEnquiries');

        if (!container) return;

        if (!snapshot.exists()) {
            container.innerHTML = '<div style="text-align: center; padding: 40px; color: rgba(255,255,255,0.4);">No enquiries yet</div>';
            if (dashTotalEnquiries) dashTotalEnquiries.textContent = '0';
            return;
        }

        const enquiries = [];
        snapshot.forEach(child => {
            enquiries.push({ id: child.key, ...child.val() });
        });

        if (dashTotalEnquiries) dashTotalEnquiries.textContent = enquiries.length;

        // Newest first
        enquiries.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

        container.innerHTML = enquiries.map(enq => {
            const date = new Date(enq.timestamp || Date.now()).toLocaleDateString('en-IN', {
                day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
            });

            return `
                <div class="enquiry-card">
                    <div class="enquiry-card-header">
                        <span class="enquiry-sender">${enq.name || 'User'}</span>
                        <span class="enquiry-date">${date}</span>
                    </div>
                    <div class="enquiry-subject">${enq.subject || 'No Subject'}</div>
                    <div class="enquiry-message">${enq.message || ''}</div>
                    <div class="enquiry-contact">
                        <span class="enquiry-contact-item">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 17a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9.5C2 7 4 5 6.5 5H18c2.5 0 4 2 4 4.5V17z"/><path d="M15 7v5"/><path d="M9 7v5"/></svg>
                            ${enq.email || ''}
                        </span>
                        <span class="enquiry-contact-item">
                            ${enq.phone || ''}
                        </span>
                    </div>
                </div>
            `;
        }).join('');
    });
}

export { initAdminPage, checkAdminAccess, loadProducts, loadOrders, loadEnquiries };
