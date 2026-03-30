/* ==============================
   CUENTIFY – script.js
   ============================== */

// ── TAB NAVIGATION ──
const tabs = document.querySelectorAll('.tab-item');

tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    tabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    const selected = tab.dataset.tab;
    console.log('Tab seleccionada:', selected);
  });
});

// ── MENU SHEET ──
const hamburgerBtn  = document.getElementById('hamburgerBtn');
const menuSheet     = document.getElementById('menuSheet');
const menuOverlay   = document.getElementById('menuOverlay');
const navbar        = document.querySelector('.navbar');

let menuOpen = false;

function openMenu() {
  menuOpen = true;
  menuSheet.classList.add('open');
  menuOverlay.classList.add('visible');
  navbar.classList.add('menu-open');
  hamburgerBtn.classList.add('is-open');
}

function closeMenu() {
  menuOpen = false;
  menuSheet.classList.remove('open');
  menuOverlay.classList.remove('visible');
  navbar.classList.remove('menu-open');
  hamburgerBtn.classList.remove('is-open');
}

hamburgerBtn.addEventListener('click', () => {
  menuOpen ? closeMenu() : openMenu();
});

menuOverlay.addEventListener('click', closeMenu);

// ── ADMIN MODE ──
const ADMIN_USER = 'admin'; // placeholder – replace with real auth later

const btnEntrar   = document.getElementById('btnEntrar');
const adminBar    = document.getElementById('adminBar');
const adminExitBtn = document.getElementById('adminExitBtn');

let isAdmin = false;

function enterAdmin() {
  isAdmin = true;
  document.body.classList.add('admin-mode');
  adminBar.classList.add('visible');
  closeMenu();
}

function exitAdmin() {
  isAdmin = false;
  document.body.classList.remove('admin-mode');
  adminBar.classList.remove('visible');
}

btnEntrar.addEventListener('click', () => {
  // TODO: replace with Supabase Google OAuth
  enterAdmin();
});

adminExitBtn.addEventListener('click', exitAdmin);
