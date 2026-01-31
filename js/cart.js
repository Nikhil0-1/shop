// ============================================
// Cart Module - Add, Remove, Update, Checkout
// ============================================

import {
    auth, database, ref, push, set,
    showToast, formatPrice, getTimestamp
} from './firebase.js';
import { updateCartCount } from './auth.js';

// Get cart from localStorage
function getCart() {
    return JSON.parse(localStorage.getItem('cart')) || [];
}

// Save cart to localStorage
function saveCart(cart) {
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartCount();
}

// Clear cart
function clearCart() {
    localStorage.removeItem('cart');
    updateCartCount();
}

// Add product to cart
function addToCart(product, quantity = 1) {
    // Check if user is logged in
    if (!auth.currentUser) {
        showToast('Please login to use cart', 'warning');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1000);
        return;
    }

    const cart = getCart();
    const existingIndex = cart.findIndex(item => item.id === product.id);

    if (existingIndex > -1) {
        const newQty = cart[existingIndex].quantity + quantity;
        if (newQty > product.stock) {
            showToast(`Only ${product.stock} items available`, 'warning');
            cart[existingIndex].quantity = product.stock;
        } else {
            cart[existingIndex].quantity = newQty;
        }
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            price: product.price,
            imageURL: product.imageURL || '',
            quantity: Math.min(quantity, product.stock),
            stock: product.stock
        });
    }

    saveCart(cart);
    showToast(`${product.name} added to cart!`, 'success');
}

// Remove product from cart
function removeFromCart(productId) {
    let cart = getCart();
    cart = cart.filter(item => item.id !== productId);
    saveCart(cart);
    showToast('Item removed from cart', 'success');
}

// Update item quantity
function updateCartItemQuantity(productId, quantity) {
    const cart = getCart();
    const itemIndex = cart.findIndex(item => item.id === productId);

    if (itemIndex > -1) {
        if (quantity <= 0) {
            removeFromCart(productId);
        } else if (quantity > cart[itemIndex].stock) {
            showToast(`Only ${cart[itemIndex].stock} items available`, 'warning');
            cart[itemIndex].quantity = cart[itemIndex].stock;
            saveCart(cart);
        } else {
            cart[itemIndex].quantity = quantity;
            saveCart(cart);
        }
    }
}

// Calculate cart totals
function calculateCartTotals() {
    const cart = getCart();
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const shipping = subtotal > 500 ? 0 : 50;
    return { subtotal, shipping, total: subtotal + shipping, itemCount: cart.reduce((sum, item) => sum + item.quantity, 0) };
}

// Render cart page
function renderCartPage() {
    const cart = getCart();
    const cartContainer = document.getElementById('cartItems');
    const cartEmpty = document.getElementById('cartEmpty');
    const cartContent = document.getElementById('cartContent');

    if (!cartContainer) return;

    if (cart.length === 0) {
        if (cartEmpty) cartEmpty.classList.remove('hidden');
        if (cartContent) cartContent.classList.add('hidden');
        return;
    }

    if (cartEmpty) cartEmpty.classList.add('hidden');
    if (cartContent) cartContent.classList.remove('hidden');

    cartContainer.innerHTML = cart.map(item => `
        <div class="cart-item" data-product-id="${item.id}">
            <div class="cart-item-image">
                ${item.imageURL ? `<img src="${item.imageURL}" alt="${item.name}">` : '<div style="display:flex;align-items:center;justify-content:center;height:100%;"><svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22v-5"/><path d="M9 8V2"/><path d="M15 8V2"/><path d="M18 8v5a6 6 0 0 1-6 6v0a6 6 0 0 1-6-6V8Z"/></svg></div>'}
            </div>
            <div class="cart-item-info">
                <h4 class="cart-item-name">${item.name}</h4>
                <p class="cart-item-price">${formatPrice(item.price)}</p>
                <div class="cart-item-controls">
                    <div class="quantity-controls">
                        <button class="quantity-btn decrease-qty" data-id="${item.id}">−</button>
                        <input type="number" class="quantity-input" value="${item.quantity}" min="1" max="${item.stock}" data-id="${item.id}">
                        <button class="quantity-btn increase-qty" data-id="${item.id}">+</button>
                    </div>
                    <button class="cart-item-remove" data-id="${item.id}">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                        Remove
                    </button>
                </div>
            </div>
        </div>
    `).join('');

    updateCartSummary();
    initCartEventListeners();
}

// Update cart summary
function updateCartSummary() {
    const totals = calculateCartTotals();
    const subtotalEl = document.getElementById('cartSubtotal');
    const shippingEl = document.getElementById('cartShipping');
    const totalEl = document.getElementById('cartTotal');

    if (subtotalEl) subtotalEl.textContent = formatPrice(totals.subtotal);
    if (shippingEl) shippingEl.textContent = totals.shipping === 0 ? 'FREE' : formatPrice(totals.shipping);
    if (totalEl) totalEl.textContent = formatPrice(totals.total);
}

// Initialize cart event listeners
function initCartEventListeners() {
    document.querySelectorAll('.decrease-qty').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.dataset.id;
            const input = document.querySelector(`.quantity-input[data-id="${id}"]`);
            let qty = parseInt(input.value) || 1;
            if (qty > 1) { updateCartItemQuantity(id, qty - 1); renderCartPage(); }
        });
    });

    document.querySelectorAll('.increase-qty').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.dataset.id;
            const input = document.querySelector(`.quantity-input[data-id="${id}"]`);
            updateCartItemQuantity(id, (parseInt(input.value) || 1) + 1);
            renderCartPage();
        });
    });

    document.querySelectorAll('.cart-item .quantity-input').forEach(input => {
        input.addEventListener('change', () => {
            updateCartItemQuantity(input.dataset.id, parseInt(input.value) || 1);
            renderCartPage();
        });
    });

    document.querySelectorAll('.cart-item-remove').forEach(btn => {
        btn.addEventListener('click', () => { removeFromCart(btn.dataset.id); renderCartPage(); });
    });
}

// Process checkout
async function processCheckout() {
    const user = auth.currentUser;
    if (!user) { showToast('Please login to checkout', 'warning'); window.location.href = 'login.html'; return; }

    const cart = getCart();
    if (cart.length === 0) { showToast('Your cart is empty', 'warning'); return; }

    const totals = calculateCartTotals();

    try {
        const ordersRef = ref(database, 'orders');
        const newOrderRef = push(ordersRef);

        await set(newOrderRef, {
            uid: user.uid, userEmail: user.email,
            items: cart.map(item => ({ productId: item.id, name: item.name, price: item.price, quantity: item.quantity })),
            subtotal: totals.subtotal, shipping: totals.shipping, total: totals.total,
            status: 'pending', timestamp: getTimestamp()
        });

        clearCart();
        showToast('Order placed successfully!', 'success');
        showOrderConfirmation(newOrderRef.key, totals.total);
    } catch (error) {
        console.error('Checkout error:', error);
        showToast('Checkout failed. Please try again.', 'error');
    }
}

// Show order confirmation
function showOrderConfirmation(orderId, total) {
    const container = document.querySelector('.cart-page');
    if (container) {
        container.innerHTML = `
            <div class="cart-empty" style="display:block;">
                <div class="cart-empty-icon" style="color: var(--gold);">
                    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>
                </div>
                <h2>Order Placed Successfully!</h2>
                <p>Order ID: <strong>${orderId}</strong></p>
                <p>Total: <strong>${formatPrice(total)}</strong></p>
                <a href="index.html" class="btn-primary" style="display:inline-flex;margin-top:24px;">Continue Shopping</a>
            </div>
        `;
    }
}

// Initialize cart page
function initCartPage() {
    renderCartPage();
    const checkoutBtn = document.getElementById('checkoutBtn');
    if (checkoutBtn) checkoutBtn.addEventListener('click', processCheckout);
}

export { getCart, saveCart, clearCart, addToCart, removeFromCart, updateCartItemQuantity, calculateCartTotals, renderCartPage, updateCartSummary, initCartEventListeners, processCheckout, initCartPage };
