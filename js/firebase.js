// ============================================
// Firebase Configuration & Initialization
// Electronic Components E-Commerce
// ============================================

// Firebase SDK (Using modular SDK via CDN import maps)
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import {
    getAuth,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signInWithPopup,
    GoogleAuthProvider,
    signOut
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import {
    getDatabase,
    ref,
    set,
    get,
    push,
    update,
    remove,
    onValue,
    query,
    orderByChild,
    equalTo
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
import {
    getStorage,
    ref as storageRef,
    uploadBytes,
    getDownloadURL,
    deleteObject
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js';

// ============================================
// 🔥 FIREBASE CONFIGURATION (Your Project)
// ============================================
const firebaseConfig = {
    apiKey: "AIzaSyA8U-rknJZEvGGvfIpmQ2fL-zMtPK6UM4Y",
    authDomain: "shop-4fcbd.firebaseapp.com",
    databaseURL: "https://shop-4fcbd-default-rtdb.firebaseio.com",
    projectId: "shop-4fcbd",
    storageBucket: "shop-4fcbd.firebasestorage.app",
    messagingSenderId: "206450876343",
    appId: "1:206450876343:web:29d097c5b797e9397bd232"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);
const storage = getStorage(app);
const googleProvider = new GoogleAuthProvider();

// ============================================
// ADMIN CONFIGURATION
// ============================================
// Set your admin email here
const ADMIN_EMAIL = "shop@gmail.com";

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Show loading overlay
 */
function showLoader() {
    let loader = document.querySelector('.loader-overlay');
    if (!loader) {
        loader = document.createElement('div');
        loader.className = 'loader-overlay';
        loader.innerHTML = '<div class="loader"></div>';
        document.body.appendChild(loader);
    }
    loader.style.display = 'flex';
}

/**
 * Hide loading overlay
 */
function hideLoader() {
    const loader = document.querySelector('.loader-overlay');
    if (loader) {
        loader.style.display = 'none';
    }
}

/**
 * Show toast notification
 * @param {string} message - Toast message
 * @param {string} type - Toast type (success, error, warning, info)
 */
function showToast(message, type = 'info') {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    let icon = '💡';
    if (type === 'success') icon = '✓';
    if (type === 'error') icon = '✕';
    if (type === 'warning') icon = '⚠';

    toast.innerHTML = `
        <span class="toast-icon">${icon}</span>
        <span>${message}</span>
    `;

    container.appendChild(toast);

    // Remove after 3 seconds
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

/**
 * Format price in INR
 * @param {number} price - Price value
 * @returns {string} Formatted price
 */
function formatPrice(price) {
    return '₹' + parseFloat(price).toLocaleString('en-IN', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    });
}

/**
 * Check if user is admin
 * @param {object} user - Firebase user object
 * @returns {boolean}
 */
function isAdmin(user) {
    return user && user.email === ADMIN_EMAIL;
}

/**
 * Get current timestamp
 * @returns {number}
 */
function getTimestamp() {
    return Date.now();
}

// ============================================
// EXPORTS
// ============================================
export {
    // Firebase instances
    app,
    auth,
    database,
    storage,
    googleProvider,

    // Firebase Auth functions
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signInWithPopup,
    signOut,

    // Firebase Database functions
    ref,
    set,
    get,
    push,
    update,
    remove,
    onValue,
    query,
    orderByChild,
    equalTo,

    // Firebase Storage functions
    storageRef,
    uploadBytes,
    getDownloadURL,
    deleteObject,

    // Utility functions
    showLoader,
    hideLoader,
    showToast,
    formatPrice,
    isAdmin,
    getTimestamp,

    // Config
    ADMIN_EMAIL
};
