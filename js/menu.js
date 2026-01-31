// ============================================
// Menu Module - Slide Menu Functionality
// ============================================

import { auth, showToast, isAdmin, database, ref, get } from './firebase.js';
import { logout } from './auth.js';

let menuOpen = false;

/**
 * Initialize slide menu
 */
function initMenu() {
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const menuCloseBtn = document.getElementById('menuCloseBtn');
    const menuOverlay = document.getElementById('menuOverlay');
    const slideMenu = document.getElementById('slideMenu');
    const menuLogoutBtn = document.getElementById('menuLogoutBtn');
    const categoryToggle = document.getElementById('categoryToggle');
    const categoryItems = document.getElementById('categoryItems');

    // Open menu
    if (hamburgerBtn) {
        hamburgerBtn.addEventListener('click', openMenu);
    }

    // Close menu
    if (menuCloseBtn) {
        menuCloseBtn.addEventListener('click', closeMenu);
    }

    // Close on overlay click
    if (menuOverlay) {
        menuOverlay.addEventListener('click', closeMenu);
    }

    // Logout from menu
    if (menuLogoutBtn) {
        menuLogoutBtn.addEventListener('click', async () => {
            closeMenu();
            await logout();
        });
    }

    // Category toggle
    if (categoryToggle && categoryItems) {
        categoryToggle.addEventListener('click', () => {
            categoryToggle.classList.toggle('expanded');
            categoryItems.classList.toggle('expanded');
        });
    }

    // Close menu on escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && menuOpen) {
            closeMenu();
        }
    });
}

/**
 * Open slide menu
 */
function openMenu() {
    const menuOverlay = document.getElementById('menuOverlay');
    const slideMenu = document.getElementById('slideMenu');

    if (menuOverlay && slideMenu) {
        menuOverlay.classList.add('active');
        slideMenu.classList.add('active');
        document.body.style.overflow = 'hidden';
        menuOpen = true;
    }
}

/**
 * Close slide menu
 */
function closeMenu() {
    const menuOverlay = document.getElementById('menuOverlay');
    const slideMenu = document.getElementById('slideMenu');

    if (menuOverlay && slideMenu) {
        menuOverlay.classList.remove('active');
        slideMenu.classList.remove('active');
        document.body.style.overflow = '';
        menuOpen = false;
    }
}

/**
 * Update menu based on auth state
 * @param {object|null} user - Firebase user object
 */
async function updateMenuAuth(user) {
    const menuUserName = document.getElementById('menuUserName');
    const menuUserEmail = document.getElementById('menuUserEmail');
    const menuUserAvatar = document.getElementById('menuUserAvatar');
    const menuAuthRequired = document.querySelectorAll('.menu-auth-required');
    const menuGuestOnly = document.querySelectorAll('.menu-guest-only');
    const menuAdminOnly = document.querySelectorAll('.menu-admin-only');
    const menuFooter = document.getElementById('menuFooter');
    const menuCartBadge = document.getElementById('menuCartBadge');

    if (user) {
        // User is logged in
        if (menuUserEmail) menuUserEmail.textContent = user.email;

        // Get user profile from database
        try {
            const userRef = ref(database, `users/${user.uid}`);
            const snapshot = await get(userRef);
            if (snapshot.exists()) {
                const userData = snapshot.val();
                if (menuUserName) {
                    menuUserName.textContent = userData.fullName || user.email.split('@')[0];
                }
                if (userData.profileImage && menuUserAvatar) {
                    menuUserAvatar.innerHTML = `<img src="${userData.profileImage}" alt="Profile">`;
                }
            } else {
                if (menuUserName) menuUserName.textContent = user.email.split('@')[0];
            }
        } catch (error) {
            if (menuUserName) menuUserName.textContent = user.email.split('@')[0];
        }

        // Show auth required items
        menuAuthRequired.forEach(el => el.style.display = 'flex');
        menuGuestOnly.forEach(el => el.style.display = 'none');
        if (menuFooter) menuFooter.style.display = 'block';

        // Show admin link if admin
        if (isAdmin(user)) {
            menuAdminOnly.forEach(el => el.style.display = 'flex');
        } else {
            menuAdminOnly.forEach(el => el.style.display = 'none');
        }
    } else {
        // User is guest
        if (menuUserName) menuUserName.textContent = 'Guest';
        if (menuUserEmail) menuUserEmail.textContent = 'Not logged in';
        if (menuUserAvatar) {
            menuUserAvatar.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                </svg>
            `;
        }

        // Hide auth required items
        menuAuthRequired.forEach(el => el.style.display = 'none');
        menuGuestOnly.forEach(el => el.style.display = 'flex');
        menuAdminOnly.forEach(el => el.style.display = 'none');
        if (menuFooter) menuFooter.style.display = 'none';
    }

    // Update cart badge
    updateMenuCartBadge();
}

/**
 * Update menu cart badge
 */
function updateMenuCartBadge() {
    const menuCartBadge = document.getElementById('menuCartBadge');
    if (menuCartBadge) {
        const cart = JSON.parse(localStorage.getItem('cart')) || [];
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        menuCartBadge.textContent = totalItems;
        menuCartBadge.style.display = totalItems > 0 ? 'flex' : 'none';
    }
}

export { initMenu, openMenu, closeMenu, updateMenuAuth, updateMenuCartBadge };
