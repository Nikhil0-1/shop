// ============================================
// Authentication Module
// Login, Signup, Logout, Session Management
// ============================================

import {
    auth,
    database,
    googleProvider,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signInWithPopup,
    signOut,
    ref,
    set,
    get,
    showLoader,
    hideLoader,
    showToast,
    isAdmin,
    ADMIN_EMAIL
} from './firebase.js';

// ============================================
// DOM ELEMENTS
// ============================================
let currentUser = null;

// ============================================
// AUTH STATE LISTENER
// ============================================

/**
 * Initialize auth state listener
 * Updates UI based on logged in/out state
 */
function initAuthListener() {
    onAuthStateChanged(auth, async (user) => {
        currentUser = user;
        updateAuthUI(user);
        updateCartCount();

        // Check if on admin.html and user is not admin
        const currentPage = window.location.pathname.split('/').pop();
        if (currentPage === 'admin.html') {
            if (user === null) {
                // Not logged in
                window.location.href = 'login.html';
                return;
            } else if (!isAdmin(user)) {
                // Logged in but not admin
                showToast('Access Denied: Admin only', 'error');
                window.location.href = 'index.html';
                return;
            }
        }

        // Update slide menu auth state
        try {
            const { updateMenuAuth } = await import('./menu.js');
            updateMenuAuth(user);
        } catch (e) {
            // Menu module not loaded on this page
        }

        if (user) {
            // Check if user exists in database, if not create entry
            const userRef = ref(database, `users/${user.uid}`);
            const snapshot = await get(userRef);

            if (!snapshot.exists()) {
                // Create new user entry
                await set(userRef, {
                    email: user.email,
                    role: user.email === ADMIN_EMAIL ? 'admin' : 'user',
                    createdAt: Date.now()
                });
            } else if (user.email === ADMIN_EMAIL && snapshot.val().role !== 'admin') {
                // Update specific user to admin if email matches but role is not admin
                await update(userRef, { role: 'admin' });
            }
        } else {
            // Clear cart from localStorage on logout
            // localStorage.removeItem('cart'); // Uncomment if you want to clear cart on logout
        }
    });
}

/**
 * Update UI based on auth state
 * @param {object|null} user - Firebase user object
 */
function updateAuthUI(user) {
    const loginBtn = document.getElementById('loginBtn');
    const userMenu = document.getElementById('userMenu');
    const userEmail = document.getElementById('userEmail');
    const adminLink = document.getElementById('adminLink');

    // Update bottom nav login items
    const navLoginItem = document.querySelector('.bottom-nav-item[href="login.html"]');
    const navUserItem = document.getElementById('navUserItem');

    if (user) {
        // User is logged in
        if (loginBtn) loginBtn.classList.add('hidden');
        if (userMenu) userMenu.classList.remove('hidden');
        if (userEmail) userEmail.textContent = user.email;

        // Show admin link if user is admin
        if (adminLink) {
            if (isAdmin(user)) {
                adminLink.classList.remove('hidden');
            } else {
                adminLink.classList.add('hidden');
            }
        }

        // Update bottom nav
        if (navLoginItem) navLoginItem.classList.add('hidden');
        if (navUserItem) {
            navUserItem.classList.remove('hidden');
            const span = navUserItem.querySelector('span');
            if (span) span.textContent = 'Account';
        }
    } else {
        // User is logged out
        if (loginBtn) loginBtn.classList.remove('hidden');
        if (userMenu) userMenu.classList.add('hidden');
        if (adminLink) adminLink.classList.add('hidden');

        // Update bottom nav
        if (navLoginItem) navLoginItem.classList.remove('hidden');
        if (navUserItem) navUserItem.classList.add('hidden');
    }
}

/**
 * Update cart count badge
 */
function updateCartCount() {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

    // Update header cart count
    const cartCount = document.getElementById('cartCount');
    if (cartCount) {
        cartCount.textContent = totalItems;
        cartCount.style.display = totalItems > 0 ? 'flex' : 'none';
    }

    // Update bottom nav cart badge
    const navCartBadge = document.getElementById('navCartBadge');
    if (navCartBadge) {
        navCartBadge.textContent = totalItems;
        navCartBadge.style.display = totalItems > 0 ? 'flex' : 'none';
    }
}

// ============================================
// AUTHENTICATION FUNCTIONS
// ============================================

/**
 * Sign up with email and password
 * @param {string} email 
 * @param {string} password 
 */
async function signUp(email, password) {
    try {
        showLoader();
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Create user in database
        await set(ref(database, `users/${user.uid}`), {
            email: user.email,
            role: user.email === ADMIN_EMAIL ? 'admin' : 'user',
            createdAt: Date.now()
        });

        hideLoader();
        showToast('Account created successfully!', 'success');

        // Redirect to home page
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);

    } catch (error) {
        hideLoader();
        console.error('Signup error:', error);

        let errorMessage = 'Signup failed. Please try again.';
        if (error.code === 'auth/email-already-in-use') {
            errorMessage = 'Email already in use. Please login instead.';
        } else if (error.code === 'auth/weak-password') {
            errorMessage = 'Password should be at least 6 characters.';
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = 'Invalid email address.';
        }

        showToast(errorMessage, 'error');
    }
}

/**
 * Login with email and password
 * @param {string} email 
 * @param {string} password 
 */
async function login(email, password) {
    try {
        showLoader();
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        hideLoader();
        showToast('Logged in successfully!', 'success');

        // Redirect based on role
        setTimeout(() => {
            if (isAdmin(user)) {
                window.location.href = 'admin.html';
            } else {
                window.location.href = 'index.html';
            }
        }, 1000);

    } catch (error) {
        hideLoader();
        console.error('Login error:', error);

        let errorMessage = 'Login failed. Please try again.';
        if (error.code === 'auth/user-not-found') {
            errorMessage = 'No account found with this email.';
        } else if (error.code === 'auth/wrong-password') {
            errorMessage = 'Incorrect password.';
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = 'Invalid email address.';
        } else if (error.code === 'auth/invalid-credential') {
            errorMessage = 'Invalid email or password.';
        }

        showToast(errorMessage, 'error');
    }
}

/**
 * Login with Google
 */
async function loginWithGoogle() {
    try {
        showLoader();
        const result = await signInWithPopup(auth, googleProvider);
        const user = result.user;

        // Check/create user in database
        const userRef = ref(database, `users/${user.uid}`);
        const snapshot = await get(userRef);

        if (!snapshot.exists()) {
            await set(userRef, {
                email: user.email,
                role: user.email === ADMIN_EMAIL ? 'admin' : 'user',
                createdAt: Date.now()
            });
        }

        hideLoader();
        showToast('Logged in with Google!', 'success');

        // Redirect based on role
        setTimeout(() => {
            if (isAdmin(user)) {
                window.location.href = 'admin.html';
            } else {
                window.location.href = 'index.html';
            }
        }, 1000);

    } catch (error) {
        hideLoader();
        console.error('Google login error:', error);

        let errorMessage = 'Google login failed. Please try again.';
        if (error.code === 'auth/popup-closed-by-user') {
            errorMessage = 'Login cancelled.';
        }

        showToast(errorMessage, 'error');
    }
}

/**
 * Logout current user
 */
async function logout() {
    try {
        await signOut(auth);
        showToast('Logged out successfully!', 'success');

        // Redirect to home if on protected page
        const currentPage = window.location.pathname.split('/').pop();
        if (currentPage === 'admin.html') {
            window.location.href = 'index.html';
        }
    } catch (error) {
        console.error('Logout error:', error);
        showToast('Logout failed. Please try again.', 'error');
    }
}

// ============================================
// AUTH PAGE INITIALIZATION
// ============================================

/**
 * Initialize login page
 */
function initLoginPage() {
    const loginTab = document.getElementById('loginTab');
    const signupTab = document.getElementById('signupTab');
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const googleBtn = document.getElementById('googleLoginBtn');

    // Tab switching
    if (loginTab && signupTab) {
        loginTab.addEventListener('click', () => {
            loginTab.classList.add('active');
            signupTab.classList.remove('active');
            if (loginForm) loginForm.classList.remove('hidden');
            if (signupForm) signupForm.classList.add('hidden');
        });

        signupTab.addEventListener('click', () => {
            signupTab.classList.add('active');
            loginTab.classList.remove('active');
            if (signupForm) signupForm.classList.remove('hidden');
            if (loginForm) loginForm.classList.add('hidden');
        });
    }

    // Login form submission
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
            login(email, password);
        });
    }

    // Signup form submission
    if (signupForm) {
        signupForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('signupEmail').value;
            const password = document.getElementById('signupPassword').value;
            const confirmPassword = document.getElementById('confirmPassword').value;

            if (password !== confirmPassword) {
                showToast('Passwords do not match!', 'error');
                return;
            }

            signUp(email, password);
        });
    }

    // Google login
    if (googleBtn) {
        googleBtn.addEventListener('click', loginWithGoogle);
    }
}

/**
 * Get current user
 * @returns {object|null}
 */
function getCurrentUser() {
    return currentUser;
}

// ============================================
// EXPORTS
// ============================================
export {
    initAuthListener,
    updateAuthUI,
    updateCartCount,
    signUp,
    login,
    loginWithGoogle,
    logout,
    initLoginPage,
    getCurrentUser
};
