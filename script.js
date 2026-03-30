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
    // TODO: load content for selected tab
    console.log('Tab seleccionada:', selected);
  });
});

// ── HAMBURGER MENU ──
const hamburgerBtn = document.getElementById('hamburgerBtn');

hamburgerBtn.addEventListener('click', () => {
  // TODO: implement menu open/close logic
  console.log('Hamburger clicked');
});
