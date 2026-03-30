/* ==============================
   CUENTIFY – script.js
   ============================== */

document.addEventListener('DOMContentLoaded', () => {

// ── SUPABASE ──
const SUPABASE_URL  = 'https://cfmmmrytieudxjfcfrag.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNmbW1tcnl0aWV1ZHhqZmNmcmFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4NzUwMzcsImV4cCI6MjA5MDQ1MTAzN30.xMUI43qDEwgpkYotKSPY6KfAJM4Sf1ZjX4WHcgg4cS4';

if (!window.supabase) {
  console.error('Supabase SDK no cargó');
  document.getElementById('productsLoading').style.display = 'none';
  document.getElementById('productsEmpty').style.display = 'block';
  return;
}

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

// ── STATE ──
let currentTab  = 'streaming';
let isAdmin     = false;
let menuOpen    = false;
let modalOpen   = false;
let selectedFile = null;

// ── ELEMENTS ──
const navbar        = document.querySelector('.navbar');
const hamburgerBtn  = document.getElementById('hamburgerBtn');
const menuSheet     = document.getElementById('menuSheet');
const menuOverlay   = document.getElementById('menuOverlay');
const adminBar      = document.getElementById('adminBar');
const adminAddBtn   = document.getElementById('adminAddBtn');
const adminExitBtn  = document.getElementById('adminExitBtn');
const btnEntrar     = document.getElementById('btnEntrar');
const modalSheet    = document.getElementById('modalSheet');
const modalOverlay  = document.getElementById('modalOverlay');
const modalCloseBtn = document.getElementById('modalCloseBtn');
const imgUploadArea = document.getElementById('imgUploadArea');
const imgInput      = document.getElementById('imgInput');
const imgPlaceholder= document.getElementById('imgPlaceholder');
const imgPreview    = document.getElementById('imgPreview');
const productName   = document.getElementById('productName');
const productCat    = document.getElementById('productCategory');
const btnSave       = document.getElementById('btnSave');
const modalError    = document.getElementById('modalError');
const productsGrid  = document.getElementById('productsGrid');
const productsEmpty = document.getElementById('productsEmpty');
const productsLoading = document.getElementById('productsLoading');

// ── TAB NAVIGATION ──
document.querySelectorAll('.tab-item').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentTab = tab.dataset.tab;
    loadProducts(currentTab);
  });
});

document.querySelectorAll('.menu-nav-item').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const tab = link.dataset.tab;
    document.querySelectorAll('.tab-item').forEach(t => {
      t.classList.toggle('active', t.dataset.tab === tab);
    });
    currentTab = tab;
    closeMenu();
    loadProducts(tab);
  });
});

// ── LOAD PRODUCTS ──
async function loadProducts(category) {
  productsGrid.innerHTML = '';
  productsEmpty.style.display = 'none';
  productsLoading.style.display = 'flex';

  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('category', category)
    .order('created_at', { ascending: false });

  productsLoading.style.display = 'none';

  if (error) {
    console.error('Error cargando productos:', error);
    productsEmpty.style.display = 'block';
    return;
  }

  if (!data || data.length === 0) {
    productsEmpty.style.display = 'block';
    return;
  }

  data.forEach(product => {
    productsGrid.appendChild(buildCard(product));
  });
}

function buildCard(product) {
  const card = document.createElement('div');
  card.className = 'product-card';

  let thumbHtml;
  if (product.image_url) {
    thumbHtml = `<div class="product-thumb-wrapper"><img class="product-thumb" src="${product.image_url}" alt="${product.name}" loading="lazy" /></div>`;
  } else {
    thumbHtml = `<div class="product-thumb-wrapper"><div class="product-thumb-placeholder">📦</div></div>`;
  }

  card.innerHTML = `
    ${thumbHtml}
    <div class="product-info">
      <div class="product-name">${product.name}</div>
    </div>
  `;
  return card;
}

// ── MENU ──
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

hamburgerBtn.addEventListener('click', () => menuOpen ? closeMenu() : openMenu());
menuOverlay.addEventListener('click', closeMenu);

// ── ADMIN MODE ──
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

// ── ADMIN MODAL ──
function openModal() {
  modalSheet.classList.add('open');
  modalOverlay.classList.add('visible');
  // pre-select current tab
  productCat.value = currentTab;
  modalOpen = true;
}

function closeModal() {
  modalSheet.classList.remove('open');
  modalOverlay.classList.remove('visible');
  modalOpen = false;
  resetModal();
}

function resetModal() {
  productName.value = '';
  imgPreview.src = '';
  imgPreview.classList.remove('visible');
  imgPlaceholder.style.display = 'flex';
  imgUploadArea.classList.remove('has-image');
  selectedFile = null;
  modalError.textContent = '';
  btnSave.disabled = false;
  btnSave.textContent = 'Guardar producto';
}

adminAddBtn.addEventListener('click', openModal);
modalCloseBtn.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', closeModal);

// ── IMAGE UPLOAD ──
imgUploadArea.addEventListener('click', () => imgInput.click());

imgInput.addEventListener('change', () => {
  const file = imgInput.files[0];
  if (!file) return;
  selectedFile = file;
  const url = URL.createObjectURL(file);
  imgPreview.src = url;
  imgPreview.classList.add('visible');
  imgPlaceholder.style.display = 'none';
  imgUploadArea.classList.add('has-image');
});

// ── SAVE PRODUCT ──
btnSave.addEventListener('click', async () => {
  modalError.textContent = '';
  const name = productName.value.trim();
  const category = productCat.value;

  if (!name) { modalError.textContent = 'El nombre es obligatorio.'; return; }

  btnSave.disabled = true;
  btnSave.textContent = 'Guardando...';

  let image_url = null;

  // Upload image if selected
  if (selectedFile) {
    const ext  = selectedFile.name.split('.').pop();
    const path = `${category}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(path, selectedFile, { upsert: false });

    if (uploadError) {
      modalError.textContent = 'Error subiendo imagen: ' + uploadError.message;
      btnSave.disabled = false;
      btnSave.textContent = 'Guardar producto';
      return;
    }

    const { data: urlData } = supabase.storage
      .from('product-images')
      .getPublicUrl(path);

    image_url = urlData.publicUrl;
  }

  // Insert product
  const { error: insertError } = await supabase
    .from('products')
    .insert([{ name, image_url, category }]);

  if (insertError) {
    modalError.textContent = 'Error guardando: ' + insertError.message;
    btnSave.disabled = false;
    btnSave.textContent = 'Guardar producto';
    return;
  }

  closeModal();
  // Refresh if we're on the same tab
  if (category === currentTab) loadProducts(currentTab);
});

// ── INIT ──
loadProducts(currentTab);

// Seguridad: si el spinner sigue visible a los 8s, mostramos vacío
setTimeout(() => {
  if (productsLoading.style.display !== 'none') {
    productsLoading.style.display = 'none';
    productsEmpty.style.display = 'block';
  }
}, 8000);

}); // fin DOMContentLoaded
