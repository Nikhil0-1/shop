// ============================================
// Products Module
// Fetch, Display, Search, Filter Products
// ============================================

import {
    auth,
    database,
    ref,
    get,
    onValue,
    query,
    orderByChild,
    showLoader,
    hideLoader,
    showToast,
    formatPrice
} from './firebase.js';

import { addToCart } from './cart.js';

// ============================================
// PRODUCT DATA
// ============================================
let allProducts = [];
let currentCategory = 'all';
let searchQuery = '';

// ============================================
// FETCH PRODUCTS
// ============================================

/**
 * Fetch all products from Firebase
 * @returns {Promise<Array>}
 */
async function fetchProducts() {
    try {
        const productsRef = ref(database, 'products');
        const snapshot = await get(productsRef);

        if (snapshot.exists()) {
            const data = snapshot.val();
            allProducts = Object.keys(data).map(key => ({
                id: key,
                ...data[key]
            }));
            return allProducts;
        }
        return [];
    } catch (error) {
        console.error('Error fetching products:', error);
        showToast('Failed to load products', 'error');
        return [];
    }
}

/**
 * Listen for real-time product updates
 * @param {Function} callback 
 */
function listenForProducts(callback) {
    const productsRef = ref(database, 'products');

    onValue(productsRef, (snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            allProducts = Object.keys(data).map(key => ({
                id: key,
                ...data[key]
            }));
        } else {
            allProducts = [];
        }

        if (callback) callback(allProducts);
    });
}

/**
 * Get product by ID
 * @param {string} productId 
 * @returns {Promise<object|null>}
 */
async function getProductById(productId) {
    try {
        const productRef = ref(database, `products/${productId}`);
        const snapshot = await get(productRef);

        if (snapshot.exists()) {
            return {
                id: productId,
                ...snapshot.val()
            };
        }
        return null;
    } catch (error) {
        console.error('Error fetching product:', error);
        return null;
    }
}

// ============================================
// RENDER PRODUCTS
// ============================================

/**
 * Render products to grid
 * @param {Array} products 
 * @param {string} containerId 
 */
function renderProducts(products, containerId = 'productsGrid') {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (products.length === 0) {
        container.innerHTML = `
            <div class="no-products">
                <i>📦</i>
                <h3>No products found</h3>
                <p>Try adjusting your search or filter</p>
            </div>
        `;
        return;
    }

    container.innerHTML = products.map(product => createProductCard(product)).join('');

    // Add event listeners to add-to-cart buttons
    container.querySelectorAll('.add-to-cart-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const productId = btn.dataset.productId;
            handleAddToCart(productId);
        });
    });
}

/**
 * Create product card HTML
 * @param {object} product 
 * @returns {string}
 */
function createProductCard(product) {
    const isOutOfStock = product.stock <= 0;
    const isNew = isNewProduct(product.createdAt);

    let badge = '';
    if (isOutOfStock) {
        badge = '<span class="product-badge out-of-stock">Out of Stock</span>';
    } else if (isNew) {
        badge = '<span class="product-badge new">New</span>';
    }

    return `
        <div class="product-card animate-fadeInUp" data-product-id="${product.id}">
            ${badge}
            <div class="product-image">
                ${product.imageURL
            ? `<img src="${product.imageURL}" alt="${product.name}" loading="lazy" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
               <div class="product-image-placeholder" style="display:none;"><svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22v-5"/><path d="M9 8V2"/><path d="M15 8V2"/><path d="M18 8v5a6 6 0 0 1-6 6v0a6 6 0 0 1-6-6V8Z"/></svg></div>`
            : '<div class="product-image-placeholder"><svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22v-5"/><path d="M9 8V2"/><path d="M15 8V2"/><path d="M18 8v5a6 6 0 0 1-6 6v0a6 6 0 0 1-6-6V8Z"/></svg></div>'
        }
                <div class="product-actions">
                    <a href="product.html?id=${product.id}" class="product-action-btn" title="View Details">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                    </a>
                </div>
            </div>
            <div class="product-info">
                <span class="product-category">${product.category}</span>
                <h3 class="product-name">
                    <a href="product.html?id=${product.id}">${product.name}</a>
                </h3>
                <p class="product-description">${product.description || ''}</p>
                <div class="product-footer">
                    <span class="product-price">${formatPrice(product.price)}</span>
                    <span class="product-stock ${isOutOfStock ? 'out-of-stock' : 'in-stock'}">
                        ${isOutOfStock ? 'Out of Stock' : `${product.stock} in stock`}
                    </span>
                </div>
                <button class="add-to-cart-btn" 
                        data-product-id="${product.id}" 
                        ${isOutOfStock ? 'disabled' : ''}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>
                    ${isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
                </button>
            </div>
        </div>
    `;
}

/**
 * Check if product is new (within last 7 days)
 * @param {number} createdAt 
 * @returns {boolean}
 */
function isNewProduct(createdAt) {
    if (!createdAt) return false;
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    return createdAt > sevenDaysAgo;
}

// ============================================
// SEARCH & FILTER
// ============================================

/**
 * Filter products by category
 * @param {string} category 
 */
function filterByCategory(category) {
    currentCategory = category;
    applyFilters();
}

/**
 * Search products
 * @param {string} query 
 */
function searchProducts(query) {
    searchQuery = query.toLowerCase().trim();
    applyFilters();
}

/**
 * Apply all filters and render
 */
function applyFilters() {
    let filtered = [...allProducts];

    // Apply category filter
    if (currentCategory && currentCategory !== 'all') {
        filtered = filtered.filter(p =>
            p.category && p.category.toLowerCase() === currentCategory.toLowerCase()
        );
    }

    // Apply search filter
    if (searchQuery) {
        filtered = filtered.filter(p =>
            (p.name && p.name.toLowerCase().includes(searchQuery)) ||
            (p.description && p.description.toLowerCase().includes(searchQuery)) ||
            (p.category && p.category.toLowerCase().includes(searchQuery))
        );
    }

    renderProducts(filtered);
}

/**
 * Initialize search functionality
 */
function initSearch() {
    const searchInputs = document.querySelectorAll('.search-input');

    searchInputs.forEach(input => {
        input.addEventListener('input', (e) => {
            searchProducts(e.target.value);
        });
    });
}

/**
 * Initialize category filters
 */
function initCategoryFilters() {
    const filterBtns = document.querySelectorAll('.filter-btn, .category-card');

    filterBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();

            const category = btn.dataset.category || 'all';

            // Update active state
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            if (btn.classList.contains('filter-btn')) {
                btn.classList.add('active');
            }

            filterByCategory(category);
        });
    });
}

// ============================================
// ADD TO CART HANDLER
// ============================================

/**
 * Handle add to cart button click
 * @param {string} productId 
 */
async function handleAddToCart(productId) {
    // Check if user is logged in
    if (!auth.currentUser) {
        showToast('Please login to use cart', 'warning');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1000);
        return;
    }

    const product = allProducts.find(p => p.id === productId);

    if (!product) {
        showToast('Product not found', 'error');
        return;
    }

    if (product.stock <= 0) {
        showToast('Product is out of stock', 'warning');
        return;
    }

    addToCart(product, 1);
}

// ============================================
// PRODUCT DETAIL PAGE
// ============================================

/**
 * Initialize product detail page
 */
async function initProductDetailPage() {
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');

    if (!productId) {
        window.location.href = 'index.html';
        return;
    }

    showLoader();
    const product = await getProductById(productId);
    hideLoader();

    if (!product) {
        showToast('Product not found', 'error');
        window.location.href = 'index.html';
        return;
    }

    renderProductDetail(product);
}

/**
 * Render product detail
 * @param {object} product 
 */
function renderProductDetail(product) {
    const container = document.getElementById('productDetail');
    if (!container) return;

    const isOutOfStock = product.stock <= 0;

    container.innerHTML = `
        <div class="product-detail-grid">
            <div class="product-gallery">
                ${product.imageURL
            ? `<img src="${product.imageURL}" alt="${product.name}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
               <div class="product-image-placeholder" style="display:none;"><svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22v-5"/><path d="M9 8V2"/><path d="M15 8V2"/><path d="M18 8v5a6 6 0 0 1-6 6v0a6 6 0 0 1-6-6V8Z"/></svg></div>`
            : '<div class="product-image-placeholder"><svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22v-5"/><path d="M9 8V2"/><path d="M15 8V2"/><path d="M18 8v5a6 6 0 0 1-6 6v0a6 6 0 0 1-6-6V8Z"/></svg></div>'
        }
            </div>
            <div class="product-detail-info">
                <span class="product-detail-category">${product.category}</span>
                <h1>${product.name}</h1>
                <p class="product-detail-price">${formatPrice(product.price)}</p>
                
                <div class="product-stock ${isOutOfStock ? 'out-of-stock' : 'in-stock'}" style="display: inline-block; margin-bottom: 16px;">
                    ${isOutOfStock ? '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg> Out of Stock' : `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg> ${product.stock} in stock`}
                </div>
                
                <p class="product-detail-description">${product.description || 'No description available.'}</p>
                
                ${product.specifications ? `
                    <div class="product-specs">
                        <h3><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/></svg> Specifications</h3>
                        <table class="specs-table">
                            ${Object.keys(product.specifications).map(key => `
                                <tr>
                                    <td>${key}</td>
                                    <td>${product.specifications[key]}</td>
                                </tr>
                            `).join('')}
                        </table>
                    </div>
                ` : ''}
                
                <div class="quantity-selector" ${isOutOfStock ? 'style="display: none;"' : ''}>
                    <label>Quantity:</label>
                    <div class="quantity-controls">
                        <button class="quantity-btn" id="decreaseQty">−</button>
                        <input type="number" class="quantity-input" id="quantityInput" value="1" min="1" max="${product.stock}">
                        <button class="quantity-btn" id="increaseQty">+</button>
                    </div>
                </div>
                
                <div class="product-actions-btns">
                    <button class="btn-primary" id="addToCartBtn" ${isOutOfStock ? 'disabled' : ''}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>
                        ${isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
                    </button>
                    <button class="btn-secondary" id="buyNowBtn" ${isOutOfStock ? 'disabled' : ''}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/></svg>
                        Buy Now
                    </button>
                </div>
            </div>
        </div>
    `;

    // Initialize quantity controls
    initQuantityControls(product);
}

/**
 * Initialize quantity controls
 * @param {object} product 
 */
function initQuantityControls(product) {
    const quantityInput = document.getElementById('quantityInput');
    const decreaseBtn = document.getElementById('decreaseQty');
    const increaseBtn = document.getElementById('increaseQty');
    const addToCartBtn = document.getElementById('addToCartBtn');
    const buyNowBtn = document.getElementById('buyNowBtn');

    if (decreaseBtn) {
        decreaseBtn.addEventListener('click', () => {
            let qty = parseInt(quantityInput.value) || 1;
            if (qty > 1) {
                quantityInput.value = qty - 1;
            }
        });
    }

    if (increaseBtn) {
        increaseBtn.addEventListener('click', () => {
            let qty = parseInt(quantityInput.value) || 1;
            if (qty < product.stock) {
                quantityInput.value = qty + 1;
            }
        });
    }

    if (addToCartBtn && product.stock > 0) {
        addToCartBtn.addEventListener('click', () => {
            const qty = parseInt(quantityInput.value) || 1;
            addToCart(product, qty);
        });
    }

    if (buyNowBtn && product.stock > 0) {
        buyNowBtn.addEventListener('click', () => {
            const qty = parseInt(quantityInput.value) || 1;
            addToCart(product, qty);
            window.location.href = 'cart.html';
        });
    }
}

// ============================================
// FEATURED PRODUCTS
// ============================================

/**
 * Get featured products (latest 8)
 * @returns {Array}
 */
function getFeaturedProducts() {
    return allProducts
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
        .slice(0, 8);
}

/**
 * Render featured products section
 */
function renderFeaturedProducts() {
    const featured = getFeaturedProducts();
    renderProducts(featured, 'featuredProducts');
}

// ============================================
// CATEGORY COUNTS
// ============================================

/**
 * Get product count by category
 * @param {string} category 
 * @returns {number}
 */
function getCategoryCount(category) {
    return allProducts.filter(p =>
        p.category && p.category.toLowerCase() === category.toLowerCase()
    ).length;
}

/**
 * Update category cards with counts
 */
function updateCategoryCounts() {
    const categoryCards = document.querySelectorAll('.category-card');

    categoryCards.forEach(card => {
        const category = card.dataset.category;
        if (category) {
            const count = getCategoryCount(category);
            const countEl = card.querySelector('.category-count');
            if (countEl) {
                countEl.textContent = `${count} products`;
            }
        }
    });
}

// ============================================
// INITIALIZE PRODUCTS PAGE
// ============================================

/**
 * Initialize home page products
 */
async function initHomePage() {
    showLoader();
    await fetchProducts();
    hideLoader();

    renderFeaturedProducts();
    updateCategoryCounts();
    renderProducts(allProducts);

    initSearch();
    initCategoryFilters();

    // Listen for real-time updates
    listenForProducts(() => {
        renderProducts(allProducts);
        updateCategoryCounts();
    });
}

// ============================================
// EXPORTS
// ============================================
export {
    fetchProducts,
    listenForProducts,
    getProductById,
    renderProducts,
    createProductCard,
    filterByCategory,
    searchProducts,
    applyFilters,
    initSearch,
    initCategoryFilters,
    handleAddToCart,
    initProductDetailPage,
    renderProductDetail,
    getFeaturedProducts,
    renderFeaturedProducts,
    getCategoryCount,
    updateCategoryCounts,
    initHomePage,
    allProducts
};
