/* ==============================
   CUENTIFY – script.js v3
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
let currentTab   = 'streaming';
let isAdmin      = false;
let menuOpen     = false;
let modalOpen    = false;
let selectedFile = null;
let currentProduct = null;   // product being viewed in detail
let currentAccount = null;   // account selected for purchase

// ── ELEMENTS: HOME ──
const viewHome        = document.getElementById('viewHome');
const viewDetail      = document.getElementById('viewDetail');
const navbar          = document.querySelector('#viewHome .navbar');
const hamburgerBtn    = document.getElementById('hamburgerBtn');
const menuSheet       = document.getElementById('menuSheet');
const menuOverlay     = document.getElementById('menuOverlay');
const adminBar        = document.getElementById('adminBar');
const adminAddBtn     = document.getElementById('adminAddBtn');
const adminExitBtn    = document.getElementById('adminExitBtn');
const btnEntrar       = document.getElementById('btnEntrar');
const modalSheet      = document.getElementById('modalSheet');
const modalOverlay    = document.getElementById('modalOverlay');
const modalCloseBtn   = document.getElementById('modalCloseBtn');
const imgUploadArea   = document.getElementById('imgUploadArea');
const imgInput        = document.getElementById('imgInput');
const imgPlaceholder  = document.getElementById('imgPlaceholder');
const imgPreview      = document.getElementById('imgPreview');
const productName     = document.getElementById('productName');
const productCat      = document.getElementById('productCategory');
const btnSave         = document.getElementById('btnSave');
const modalError      = document.getElementById('modalError');
const productsGrid    = document.getElementById('productsGrid');
const productsEmpty   = document.getElementById('productsEmpty');
const productsLoading = document.getElementById('productsLoading');

// ── ELEMENTS: DETAIL ──
const backBtn           = document.getElementById('backBtn');
const detailNavTitle    = document.getElementById('detailNavTitle');
const detailHeroImg     = document.getElementById('detailHeroImg');
const detailHeroPlaceholder = document.getElementById('detailHeroPlaceholder');
const detailHeroTitle   = document.getElementById('detailHeroTitle');
const detailHeroSub     = document.getElementById('detailHeroSub');
const accountsList      = document.getElementById('accountsList');
const accountsLoading   = document.getElementById('accountsLoading');
const accountsEmpty     = document.getElementById('accountsEmpty');

// ── ELEMENTS: BUY SHEET ──
const buyOverlay    = document.getElementById('buyOverlay');
const buySheet      = document.getElementById('buySheet');
const buySheetTitle = document.getElementById('buySheetTitle');
const buySheetDesc  = document.getElementById('buySheetDesc');
const buySheetPrice = document.getElementById('buySheetPrice');
const btnBuy        = document.getElementById('btnBuy');
const btnBuyCancel  = document.getElementById('btnBuyCancel');


/* ════════════════════════════════════
   TAB NAVIGATION
════════════════════════════════════ */
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


/* ════════════════════════════════════
   LOAD PRODUCTS
════════════════════════════════════ */
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

  if (error || !data || data.length === 0) {
    productsEmpty.style.display = 'block';
    return;
  }

  // Obtener conteo real de cuentas disponibles por producto
  const productIds = data.map(p => p.id);
  const { data: countData } = await supabase
    .from('accounts')
    .select('product_id')
    .in('product_id', productIds)
    .eq('is_available', true);

  // Mapear conteos
  const countMap = {};
  (countData || []).forEach(row => {
    countMap[row.product_id] = (countMap[row.product_id] || 0) + 1;
  });

  data.forEach(product => {
    product._accountsCount = countMap[product.id] || 0;
    productsGrid.appendChild(buildCard(product));
  });
}

function buildCard(product) {
  const card = document.createElement('div');
  card.className = 'product-card';

  const count = product._accountsCount ?? 0;
  const countLabel = count === 1 ? '1 cuenta' : `${count} cuentas`;

  let imgHtml;
  if (product.image_url) {
    imgHtml = `<img class="product-thumb" src="${product.image_url}" alt="${product.name}" loading="lazy" />`;
  } else {
    imgHtml = `<div class="product-thumb-placeholder">📦</div>`;
  }

  card.innerHTML = `
    <div class="product-thumb-wrapper">
      ${imgHtml}
      <div class="product-card-body">
        <div class="product-name">${product.name}</div>
        <div class="product-divider"></div>
        <div class="product-count">
          <span class="product-count-dot"></span>
          ${countLabel} disponibles
        </div>
      </div>
    </div>
  `;

  // ── OPEN DETAIL VIEW ──
  card.addEventListener('click', () => openDetailView(product));

  return card;
}


/* ════════════════════════════════════
   DETAIL VIEW  (slide-in)
════════════════════════════════════ */
function openDetailView(product) {
  currentProduct = product;

  // Populate hero
  detailNavTitle.textContent = product.name;
  detailHeroTitle.textContent = product.name;
  detailHeroSub.textContent   = 'Elige la cuenta que más te convenga';

  if (product.image_url) {
    detailHeroImg.src = product.image_url;
    detailHeroImg.classList.add('visible');
    detailHeroPlaceholder.style.display = 'none';
  } else {
    detailHeroImg.classList.remove('visible');
    detailHeroPlaceholder.style.display = 'flex';
  }

  // Slide in
  viewDetail.classList.add('open');
  viewHome.classList.add('pushed');
  viewDetail.scrollTop = 0;

  // Load accounts for this product
  loadAccounts(product.id, product);
}

function closeDetailView() {
  viewDetail.classList.remove('open');
  viewHome.classList.remove('pushed');
  currentProduct = null;
}

backBtn.addEventListener('click', closeDetailView);

// Handle browser back gesture
window.addEventListener('popstate', () => {
  if (viewDetail.classList.contains('open')) {
    closeDetailView();
  }
});


/* ════════════════════════════════════
   LOAD ACCOUNTS
   Reads from table: accounts
   Columns expected:
     id, product_id, description,
     price, expires_at, delivery_hours,
     base_price (optional – dynamic pricing)
════════════════════════════════════ */
async function loadAccounts(productId, product) {
  accountsList.innerHTML = '';
  accountsEmpty.style.display = 'none';
  accountsLoading.style.display = 'flex';

  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .eq('product_id', productId)
    .order('expires_at', { ascending: true });

  accountsLoading.style.display = 'none';

  if (error || !data || data.length === 0) {
    accountsEmpty.style.display = 'flex';
    return;
  }

  data.forEach(account => {
    // Attach parent product image for thumbnail
    account._productImageUrl = product.image_url;
    accountsList.appendChild(buildAccountCard(account));
  });
}

function buildAccountCard(account) {
  const card = document.createElement('div');
  card.className = 'account-card';

  const days   = daysRemaining(account);
  const price  = calcPrice(account);

  // Thumbnail
  const thumbHtml = account._productImageUrl
    ? `<div class="account-card-thumb"><img src="${account._productImageUrl}" alt="" /></div>`
    : `<div class="account-card-thumb">📦</div>`;

  // Days badge
  const daysBadge = days !== null
    ? `<span class="account-card-days">
         <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
         ${days} día${days !== 1 ? 's' : ''}
       </span>`
    : '';

  // Duration
  const hours = account.delivery_hours ?? 12;
  const durationBadge = `<span class="account-card-duration">
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
    ${hours}h entrega
  </span>`;

  // Description fallback
  const desc = account.description || (days !== null ? `Expira en ${days} días` : 'Cuenta disponible');

  // Price display
  const priceDisplay = price !== null
    ? `$${price.toFixed(2)}`
    : (account.price ? `$${parseFloat(account.price).toFixed(2)}` : '$0.00');

  card.innerHTML = `
    ${thumbHtml}
    <div class="account-card-info">
      <div class="account-card-name">${account.description || 'Cuenta disponible'}</div>
      <div class="account-card-desc">${desc}</div>
      <div class="account-card-meta">
        ${daysBadge}
        ${durationBadge}
      </div>
    </div>
    <div class="account-card-price-wrap">
      <span class="account-card-price">${priceDisplay}</span>
      <span class="account-card-currency">MXN</span>
    </div>
    <svg class="account-card-arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg>
  `;

  card.addEventListener('click', () => openBuySheet(account, priceDisplay));

  return card;
}


/* ════════════════════════════════════
   PRICE HELPERS
════════════════════════════════════ */
function daysRemaining(item) {
  if (!item.expires_at) return null;
  const diff = new Date(item.expires_at) - new Date();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

function calcPrice(item) {
  if (!item.base_price) return null;
  const days = daysRemaining(item);
  if (days === null) return parseFloat(item.base_price);
  return parseFloat(((days / 30) * item.base_price).toFixed(2));
}


/* ════════════════════════════════════
   BUY CONFIRMATION SHEET
════════════════════════════════════ */
function openBuySheet(account, priceDisplay) {
  currentAccount = account;

  buySheetTitle.textContent = currentProduct ? currentProduct.name : 'Confirmar compra';
  buySheetDesc.textContent  = account.description || 'Cuenta disponible';
  buySheetPrice.textContent = priceDisplay;

  resetBuyBtn();
  buySheet.classList.add('open');
  buyOverlay.classList.add('visible');
}

function closeBuySheet() {
  buySheet.classList.remove('open');
  buyOverlay.classList.remove('visible');
  currentAccount = null;
}

buyOverlay.addEventListener('click', closeBuySheet);
btnBuyCancel.addEventListener('click', closeBuySheet);

function resetBuyBtn() {
  btnBuy.classList.remove('activated', 'ripple', 'ripple-expand');
  btnBuy.querySelector('.btn-buy-text').textContent = 'Comprar ahora';
  btnBuy.disabled = false;
}

btnBuy.addEventListener('click', () => {
  if (btnBuy.classList.contains('activated')) return;

  // Ripple effect
  btnBuy.classList.add('ripple');
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      btnBuy.classList.add('ripple-expand');
    });
  });

  // Animate to white/blue
  setTimeout(() => {
    btnBuy.classList.add('activated');
    btnBuy.querySelector('.btn-buy-text').textContent = 'Procesando…';
  }, 120);

  // ─────────────────────────────────────────────
  // TODO: lógica de compra aquí
  // Ejemplo:
  // const { error } = await supabase
  //   .from('orders')
  //   .insert([{ account_id: currentAccount.id, product_id: currentProduct.id }]);
  // ─────────────────────────────────────────────
});


/* ════════════════════════════════════
   MENU
════════════════════════════════════ */
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


/* ════════════════════════════════════
   ADMIN MODE
════════════════════════════════════ */
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

btnEntrar.addEventListener('click', enterAdmin);
adminExitBtn.addEventListener('click', exitAdmin);


/* ════════════════════════════════════
   ADMIN MODAL
════════════════════════════════════ */
function openModal() {
  modalSheet.classList.add('open');
  modalOverlay.classList.add('visible');
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


/* ════════════════════════════════════
   IMAGE UPLOAD
════════════════════════════════════ */
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


/* ════════════════════════════════════
   SAVE PRODUCT
════════════════════════════════════ */
btnSave.addEventListener('click', async () => {
  modalError.textContent = '';
  const name     = productName.value.trim();
  const category = productCat.value;

  if (!name) { modalError.textContent = 'El nombre es obligatorio.'; return; }

  btnSave.disabled = true;
  btnSave.textContent = 'Guardando…';

  let image_url = null;

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
  if (category === currentTab) loadProducts(currentTab);
});


/* ════════════════════════════════════
   INIT
════════════════════════════════════ */
loadProducts(currentTab);

setTimeout(() => {
  if (productsLoading.style.display !== 'none') {
    productsLoading.style.display = 'none';
    productsEmpty.style.display = 'block';
  }
}, 8000);



/* ════════════════════════════════════
   PUBLISH ACCOUNT (Admin)
════════════════════════════════════ */

const fabPublish      = document.getElementById('fabPublish');
const publishOverlay  = document.getElementById('publishOverlay');
const publishSheet    = document.getElementById('publishSheet');
const publishCloseBtn = document.getElementById('publishCloseBtn');
const publishDesc     = document.getElementById('publishDesc');
const publishPrice    = document.getElementById('publishPrice');
const publishDays     = document.getElementById('publishDays');
const publishDelivery = document.getElementById('publishDelivery');
const btnPublish      = document.getElementById('btnPublish');
const publishError    = document.getElementById('publishError');

// Preview elements
const pvName         = document.getElementById('pvName');
const pvDaysText     = document.getElementById('pvDaysText');
const pvDeliveryText = document.getElementById('pvDeliveryText');
const pvPrice        = document.getElementById('pvPrice');

// ── Open / Close ──
function openPublishSheet() {
  resetPublishForm();
  publishSheet.classList.add('open');
  publishOverlay.classList.add('visible');
  setTimeout(() => publishDesc.focus(), 380);
}

function closePublishSheet() {
  publishSheet.classList.remove('open');
  publishOverlay.classList.remove('visible');
}

fabPublish.addEventListener('click', openPublishSheet);
publishCloseBtn.addEventListener('click', closePublishSheet);
publishOverlay.addEventListener('click', closePublishSheet);

// ── Live preview ──
function updatePreview() {
  const desc     = publishDesc.value.trim() || '—';
  const price    = parseFloat(publishPrice.value);
  const days     = parseInt(publishDays.value, 10);
  const delivery = parseInt(publishDelivery.value, 10);

  pvName.textContent         = desc;
  pvDaysText.textContent     = isNaN(days)  ? '— días'     : `${days} día${days !== 1 ? 's' : ''}`;
  pvDeliveryText.textContent = isNaN(delivery) ? '—h entrega' : `${delivery}h entrega`;
  pvPrice.textContent        = isNaN(price) ? '$—'         : `$${price.toFixed(2)}`;
}

[publishDesc, publishPrice, publishDays, publishDelivery].forEach(el => {
  el.addEventListener('input', updatePreview);
  el.addEventListener('change', updatePreview);
});

// ── Reset form ──
function resetPublishForm() {
  publishDesc.value     = '';
  publishPrice.value    = '';
  publishDays.value     = '';
  publishDelivery.value = '12';
  publishError.textContent = '';
  btnPublish.disabled   = false;
  btnPublish.classList.remove('loading');
  btnPublish.querySelector('.btn-publish-text').textContent = 'Publicar cuenta';
  updatePreview();
}

// ── Save to Supabase ──
btnPublish.addEventListener('click', async () => {
  publishError.textContent = '';

  const desc     = publishDesc.value.trim();
  const price    = parseFloat(publishPrice.value);
  const days     = parseInt(publishDays.value, 10);
  const delivery = parseInt(publishDelivery.value, 10);

  // Validación
  if (!desc)          { publishError.textContent = 'La descripción es obligatoria.'; return; }
  if (isNaN(price) || price < 0) { publishError.textContent = 'Ingresa un precio válido.'; return; }
  if (isNaN(days) || days < 1)   { publishError.textContent = 'Ingresa la duración en días.'; return; }
  if (!currentProduct)           { publishError.textContent = 'Error: no hay producto seleccionado.'; return; }

  // UI: loading
  btnPublish.disabled = true;
  btnPublish.classList.add('loading');
  btnPublish.querySelector('.btn-publish-text').textContent = 'Publicando…';

  // Calcular expires_at
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + days);

  const { error } = await supabase
    .from('accounts')
    .insert([{
      product_id:     currentProduct.id,
      description:    desc,
      price:          price,
      expires_at:     expiresAt.toISOString(),
      delivery_hours: delivery,
      is_available:   true
    }]);

  if (error) {
    publishError.textContent = 'Error al publicar: ' + error.message;
    btnPublish.disabled = false;
    btnPublish.classList.remove('loading');
    btnPublish.querySelector('.btn-publish-text').textContent = 'Publicar cuenta';
    return;
  }

  // Éxito
  closePublishSheet();
  loadAccounts(currentProduct.id, currentProduct);
});


}); // fin DOMContentLoaded
