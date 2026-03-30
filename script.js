// ===========================
// CUENTIFY — script.js
// ===========================

/* ── HAMBURGER MENU ── */
const hamburger = document.getElementById('hamburger');
const menuOverlay = document.getElementById('menuOverlay');
const menuPanel = document.getElementById('menuPanel');
const menuClose = document.getElementById('menuClose');

function openMenu() {
  menuOverlay.classList.add('open');
  hamburger.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeMenu() {
  menuOverlay.classList.remove('open');
  hamburger.classList.remove('open');
  document.body.style.overflow = '';
}

hamburger.addEventListener('click', openMenu);
menuClose.addEventListener('click', closeMenu);

// Cerrar al hacer clic fuera del panel
menuOverlay.addEventListener('click', (e) => {
  if (!menuPanel.contains(e.target) && e.target !== hamburger) {
    closeMenu();
  }
});

// Cerrar con Escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeMenu();
});


/* ── TABS ── */
const tabs = document.querySelectorAll('.tab');
const tabBlocks = {
  suscripciones: document.getElementById('tab-suscripciones'),
  recargas:      document.getElementById('tab-recargas'),
  juegos:        document.getElementById('tab-juegos'),
};

tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    // Actualizar tab activo
    tabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');

    // Mostrar bloque correspondiente
    const target = tab.dataset.tab;
    Object.entries(tabBlocks).forEach(([key, el]) => {
      if (key === target) {
        el.classList.remove('hidden');
      } else {
        el.classList.add('hidden');
      }
    });
  });
});


/* ── STICKY HEADER SHADOW ── */
const header = document.getElementById('header');
window.addEventListener('scroll', () => {
  if (window.scrollY > 10) {
    header.style.boxShadow = '0 4px 24px rgba(0,0,0,0.5)';
  } else {
    header.style.boxShadow = 'none';
  }
});


/* ── PRODUCT CARD RIPPLE ── */
document.querySelectorAll('.product-card').forEach(card => {
  card.addEventListener('click', function (e) {
    const rect = this.getBoundingClientRect();
    const ripple = document.createElement('span');
    ripple.style.cssText = `
      position: absolute;
      border-radius: 50%;
      transform: scale(0);
      animation: rippleAnim .5s linear;
      background: rgba(26,107,255,0.3);
      width: 80px; height: 80px;
      left: ${e.clientX - rect.left - 40}px;
      top:  ${e.clientY - rect.top  - 40}px;
      pointer-events: none;
    `;
    this.style.position = 'relative';
    this.style.overflow = 'hidden';
    this.appendChild(ripple);
    ripple.addEventListener('animationend', () => ripple.remove());
  });
});

// Inyectar keyframe de ripple dinámicamente
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes rippleAnim {
    to { transform: scale(3); opacity: 0; }
  }
`;
document.head.appendChild(styleSheet);

