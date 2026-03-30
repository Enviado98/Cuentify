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
let editingProduct = null;
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
const buyOverlay      = document.getElementById('buyOverlay');
const buySheet        = document.getElementById('buySheet');
const buyStep1        = document.getElementById('buyStep1');
const buyStep2        = document.getElementById('buyStep2');
const buySheetTitle   = document.getElementById('buySheetTitle');
const buySheetDesc    = document.getElementById('buySheetDesc');
const buySubtotal     = document.getElementById('buySubtotal');
const buyFee          = document.getElementById('buyFee');
const buySheetPrice   = document.getElementById('buySheetPrice');
const buyHeaderTotal  = document.getElementById('buyHeaderTotal');
const btnPayAmount    = document.getElementById('btnPayAmount');
const buyThumb        = document.getElementById('buyThumb');
const btnBuy          = document.getElementById('btnBuy');
const btnBuyCancel    = document.getElementById('btnBuyCancel');
const btnGoToPayment  = document.getElementById('btnGoToPayment');
const btnBackToSummary= document.getElementById('btnBackToSummary');


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
      <div class="product-admin-actions">
        <button class="product-btn-edit" aria-label="Editar">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button class="product-btn-delete" aria-label="Borrar">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
        </button>
      </div>
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

  card.querySelector('.product-btn-edit').addEventListener('click', e => {
    e.stopPropagation();
    openModal(product);
  });

  card.querySelector('.product-btn-delete').addEventListener('click', async e => {
    e.stopPropagation();
    if (!confirm(`¿Borrar "${product.name}"? Se eliminarán también sus cuentas asociadas.`)) return;
    const { error } = await supabase.from('products').delete().eq('id', product.id);
    if (error) return alert('Error al borrar: ' + error.message);
    loadProducts(currentTab);
  });

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
    <div class="account-card-actions">
      <button class="account-btn-edit" aria-label="Editar">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
      </button>
      <button class="account-btn-delete" aria-label="Borrar">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
      </button>
    </div>
    <svg class="account-card-arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg>
  `;

  // Admin actions
  const editBtn   = card.querySelector('.account-btn-edit');
  const deleteBtn = card.querySelector('.account-btn-delete');

  editBtn.addEventListener('click', e => {
    e.stopPropagation();
    openPublishSheet(account);
  });

  deleteBtn.addEventListener('click', async e => {
    e.stopPropagation();
    if (!confirm('¿Borrar esta cuenta? Esta acción no se puede deshacer.')) return;
    const { error } = await supabase.from('accounts').delete().eq('id', account.id);
    if (error) return alert('Error al borrar: ' + error.message);
    loadAccounts(currentProduct.id, currentProduct);
  });

  card.addEventListener('click', () => {
    if (isAdmin) return; // en admin no abre el flujo de compra
    openBuySheet(account, priceDisplay);
  });

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
   BUY SHEET — 2 pasos
════════════════════════════════════ */

const STRIPE_FEE_RATE = 0.036; // 3.6% estimado (Stripe MX)

function openBuySheet(account, priceDisplay) {
  currentAccount = account;

  const price    = parseFloat(account.price) || 0;
  const fee      = parseFloat((price * STRIPE_FEE_RATE).toFixed(2));
  const total    = parseFloat((price + fee).toFixed(2));
  const totalFmt = `$${total.toFixed(2)}`;

  // Paso 1: resumen
  buySheetTitle.textContent = currentProduct ? currentProduct.name : '—';
  buySheetDesc.textContent  = account.description || 'Cuenta disponible';
  buySubtotal.textContent   = `$${price.toFixed(2)}`;
  buyFee.textContent        = `$${fee.toFixed(2)}`;
  buySheetPrice.textContent = totalFmt;

  // Thumbnail
  buyThumb.innerHTML = '';
  if (account._productImageUrl) {
    const img = document.createElement('img');
    img.src = account._productImageUrl;
    buyThumb.appendChild(img);
  }

  // Paso 2: totales en header y botón
  buyHeaderTotal.textContent = totalFmt;
  btnPayAmount.textContent   = totalFmt;

  // Reset form & step
  showBuyStep(1);
  resetPayForm();
  buySheet.classList.add('open');
  buyOverlay.classList.add('visible');
}

function closeBuySheet() {
  buySheet.classList.remove('open');
  buyOverlay.classList.remove('visible');
  currentAccount = null;
}

function showBuyStep(n) {
  buyStep1.classList.toggle('hidden', n !== 1);
  buyStep2.classList.toggle('hidden', n !== 2);
}

function resetPayForm() {
  ['cardNumber','cardExpiry','cardCvv','cardName'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  btnBuy.classList.remove('loading');
  btnBuy.querySelector('.btn-buy-text').innerHTML =
    'Pagar <span id="btnPayAmount">' + (buyHeaderTotal.textContent || '$0.00') + '</span>';
  btnBuy.disabled = false;
}

buyOverlay.addEventListener('click', closeBuySheet);
btnBuyCancel.addEventListener('click', closeBuySheet);
btnGoToPayment.addEventListener('click', () => showBuyStep(2));
btnBackToSummary.addEventListener('click', () => showBuyStep(1));

// ── Formateo automático de campos ──
document.getElementById('cardNumber').addEventListener('input', function() {
  let v = this.value.replace(/\D/g, '').substring(0, 16);
  this.value = v.replace(/(.{4})/g, '$1 ').trim();
});
document.getElementById('cardExpiry').addEventListener('input', function() {
  let v = this.value.replace(/\D/g, '').substring(0, 4);
  if (v.length >= 2) v = v.substring(0,2) + ' / ' + v.substring(2);
  this.value = v;
});
document.getElementById('cardCvv').addEventListener('input', function() {
  this.value = this.value.replace(/\D/g, '').substring(0, 4);
});

// ── Pagar ──
btnBuy.addEventListener('click', async () => {
  if (btnBuy.disabled) return;

  const number = document.getElementById('cardNumber').value.replace(/\s/g,'');
  const expiry = document.getElementById('cardExpiry').value;
  const cvv    = document.getElementById('cardCvv').value;
  const name   = document.getElementById('cardName').value.trim();

  if (number.length < 15) { shakeInput('cardNumber'); return; }
  if (expiry.length < 7)  { shakeInput('cardExpiry'); return; }
  if (cvv.length < 3)     { shakeInput('cardCvv'); return; }
  if (!name)              { shakeInput('cardName'); return; }

  btnBuy.disabled = true;
  btnBuy.classList.add('loading');

  // ─────────────────────────────────────────────
  // TODO: Conectar Stripe aquí
  // const { paymentMethod, error } = await stripe.createPaymentMethod({
  //   type: 'card',
  //   card: cardElement,
  //   billing_details: { name }
  // });
  // ─────────────────────────────────────────────

  // Simulación (quitar al integrar Stripe real)
  await new Promise(r => setTimeout(r, 1800));
  closeBuySheet();
  showSuccessToast();
});

function shakeInput(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.borderColor = '#EF4444';
  el.style.animation = 'shake 0.35s ease';
  setTimeout(() => {
    el.style.borderColor = '';
    el.style.animation = '';
  }, 400);
}

function showSuccessToast() {
  const toast = document.createElement('div');
  toast.className = 'success-toast';
  toast.innerHTML = '<iconify-icon icon="lucide:check-circle" width="18"></iconify-icon><span>¡Pago procesado! Recibirás los datos pronto.</span>';
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 400);
  }, 3500);
}


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
  fabPublish.classList.add('visible');
  closeMenu();
}

function exitAdmin() {
  isAdmin = false;
  document.body.classList.remove('admin-mode');
  adminBar.classList.remove('visible');
  fabPublish.classList.remove('visible');
}

btnEntrar.addEventListener('click', enterAdmin);
adminExitBtn.addEventListener('click', exitAdmin);


/* ════════════════════════════════════
   ADMIN MODAL
════════════════════════════════════ */
function openModal(product = null) {
  editingProduct = product || null;
  resetModal();

  const modalTitle = modalSheet.querySelector('.modal-title');

  if (product) {
    modalTitle.textContent  = 'Editar producto';
    btnSave.textContent     = 'Guardar cambios';
    productName.value       = product.name || '';
    productCat.value        = product.category || currentTab;
    // Mostrar imagen actual si existe
    if (product.image_url) {
      imgPreview.src = product.image_url;
      imgPreview.classList.add('visible');
      imgPlaceholder.style.display = 'none';
      imgUploadArea.classList.add('has-image');
    }
  } else {
    modalTitle.textContent = 'Nuevo producto';
    btnSave.textContent    = 'Guardar producto';
    productCat.value       = currentTab;
  }

  modalSheet.classList.add('open');
  modalOverlay.classList.add('visible');
  modalOpen = true;
}

function closeModal() {
  modalSheet.classList.remove('open');
  modalOverlay.classList.remove('visible');
  modalOpen = false;
  editingProduct = null;
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
}

adminAddBtn.addEventListener('click', openModal);
modalCloseBtn.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', closeModal);


/* ════════════════════════════════════
   IMAGE UPLOAD + COMPRESIÓN
════════════════════════════════════ */
const MAX_DIM  = 200;
const QUALITY  = 0.78;
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

async function compressImage(file) {
  return new Promise((resolve, reject) => {
    if (!ACCEPTED.includes(file.type)) {
      reject(new Error('Formato no soportado. Usa JPG, PNG o WebP.'));
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('No se pudo leer la imagen.'));
    };

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let { width, height } = img;
      if (width > height) { height = Math.round(height * MAX_DIM / width);  width  = MAX_DIM; }
      else                { width  = Math.round(width  * MAX_DIM / height); height = MAX_DIM; }

      const canvas = document.createElement('canvas');
      canvas.width  = width;
      canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);

      canvas.toBlob(blob => {
        if (!blob) { reject(new Error('Error al comprimir la imagen.')); return; }
        resolve(new File([blob], 'img.jpg', { type: 'image/jpeg' }));
      }, 'image/jpeg', QUALITY);
    };

    img.src = objectUrl;
  });
}

imgUploadArea.addEventListener('click', () => imgInput.click());

imgInput.addEventListener('change', async () => {
  const file = imgInput.files[0];
  if (!file) return;
  try {
    selectedFile = await compressImage(file);
    imgPreview.src = URL.createObjectURL(selectedFile);
    imgPreview.classList.add('visible');
    imgPlaceholder.style.display = 'none';
    imgUploadArea.classList.add('has-image');
  } catch (err) {
    imgInput.value = '';
    modalError.textContent = err.message;
  }
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

  let image_url = editingProduct ? editingProduct.image_url : null;

  if (selectedFile) {
    const path = `${category}/${Date.now()}.jpg`;

    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(path, selectedFile, { upsert: false });

    if (uploadError) {
      modalError.textContent = 'Error subiendo imagen: ' + uploadError.message;
      btnSave.disabled = false;
      btnSave.textContent = editingProduct ? 'Guardar cambios' : 'Guardar producto';
      return;
    }

    const { data: urlData } = supabase.storage
      .from('product-images')
      .getPublicUrl(path);

    image_url = urlData.publicUrl;
  }

  const payload = { name, image_url, category };

  const { error } = editingProduct
    ? await supabase.from('products').update(payload).eq('id', editingProduct.id)
    : await supabase.from('products').insert([payload]);

  if (error) {
    modalError.textContent = 'Error guardando: ' + error.message;
    btnSave.disabled = false;
    btnSave.textContent = editingProduct ? 'Guardar cambios' : 'Guardar producto';
    return;
  }

  closeModal();
  loadProducts(category === currentTab ? currentTab : currentTab);
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
   PUBLISH ACCOUNT (Admin) — crear y editar
════════════════════════════════════ */

const fabPublish      = document.getElementById('fabPublish');
const publishOverlay  = document.getElementById('publishOverlay');
const publishSheet    = document.getElementById('publishSheet');
const publishCloseBtn = document.getElementById('publishCloseBtn');
const publishSheetTitle = document.getElementById('publishSheetTitle') || publishSheet.querySelector('.publish-sheet-title');
const publishDesc     = document.getElementById('publishDesc');
const publishPrice    = document.getElementById('publishPrice');
const publishDays     = document.getElementById('publishDays');
const publishDelivery = document.getElementById('publishDelivery');
const btnPublish      = document.getElementById('btnPublish');
const publishError    = document.getElementById('publishError');

const pvName         = document.getElementById('pvName');
const pvDaysText     = document.getElementById('pvDaysText');
const pvDeliveryText = document.getElementById('pvDeliveryText');
const pvPrice        = document.getElementById('pvPrice');

let editingAccountId = null; // null = crear, id = editar

// ── Open / Close ──
function openPublishSheet(account = null) {
  editingAccountId = account ? account.id : null;

  if (account) {
    // Modo edición: pre-rellenar campos
    publishSheetTitle.textContent = 'Editar cuenta';
    btnPublish.querySelector('.btn-publish-text').textContent = 'Guardar cambios';
    publishDesc.value     = account.description || '';
    publishPrice.value    = account.price ? parseFloat(account.price).toFixed(2) : '';
    publishDays.value     = account.expires_at
      ? Math.max(1, Math.round((new Date(account.expires_at) - new Date()) / 86400000))
      : '';
    publishDelivery.value = account.delivery_hours ?? 12;
  } else {
    resetPublishForm();
    publishSheetTitle.textContent = 'Publicar cuenta';
    btnPublish.querySelector('.btn-publish-text').textContent = 'Publicar cuenta';
  }

  publishError.textContent = '';
  btnPublish.disabled = false;
  btnPublish.classList.remove('loading');
  updatePreview();

  publishSheet.classList.add('open');
  publishOverlay.classList.add('visible');
  setTimeout(() => publishDesc.focus(), 380);
}

function closePublishSheet() {
  publishSheet.classList.remove('open');
  publishOverlay.classList.remove('visible');
  editingAccountId = null;
}

fabPublish.addEventListener('click', () => openPublishSheet());
publishCloseBtn.addEventListener('click', closePublishSheet);
publishOverlay.addEventListener('click', closePublishSheet);

// ── Live preview ──
function updatePreview() {
  const desc     = publishDesc.value.trim() || '—';
  const price    = parseFloat(publishPrice.value);
  const days     = parseInt(publishDays.value, 10);
  const delivery = parseInt(publishDelivery.value, 10);

  pvName.textContent         = desc;
  pvDaysText.textContent     = isNaN(days)     ? '— días'       : `${days} día${days !== 1 ? 's' : ''}`;
  pvDeliveryText.textContent = isNaN(delivery) ? '—h entrega'   : `${delivery}h entrega`;
  pvPrice.textContent        = isNaN(price)    ? '$—'           : `$${price.toFixed(2)}`;
}

[publishDesc, publishPrice, publishDays, publishDelivery].forEach(el => {
  el.addEventListener('input', updatePreview);
  el.addEventListener('change', updatePreview);
});

// ── Reset form ──
function resetPublishForm() {
  publishDesc.value        = '';
  publishPrice.value       = '';
  publishDays.value        = '';
  publishDelivery.value    = '12';
  publishError.textContent = '';
  btnPublish.disabled      = false;
  btnPublish.classList.remove('loading');
  updatePreview();
}

// ── Save to Supabase (crear o editar) ──
btnPublish.addEventListener('click', async () => {
  publishError.textContent = '';

  const desc     = publishDesc.value.trim();
  const price    = parseFloat(publishPrice.value);
  const days     = parseInt(publishDays.value, 10);
  const delivery = parseInt(publishDelivery.value, 10);

  if (!desc)                      { publishError.textContent = 'La descripción es obligatoria.'; return; }
  if (isNaN(price) || price < 0)  { publishError.textContent = 'Ingresa un precio válido.'; return; }
  if (isNaN(days)  || days < 1)   { publishError.textContent = 'Ingresa la duración en días.'; return; }
  if (!currentProduct)            { publishError.textContent = 'Error: no hay producto seleccionado.'; return; }

  btnPublish.disabled = true;
  btnPublish.classList.add('loading');
  btnPublish.querySelector('.btn-publish-text').textContent = editingAccountId ? 'Guardando…' : 'Publicando…';

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + days);

  const payload = {
    description:    desc,
    price:          price,
    expires_at:     expiresAt.toISOString(),
    delivery_hours: delivery,
  };

  const { error } = editingAccountId
    ? await supabase.from('accounts').update(payload).eq('id', editingAccountId)
    : await supabase.from('accounts').insert([{ ...payload, product_id: currentProduct.id, is_available: true }]);

  if (error) {
    publishError.textContent = 'Error: ' + error.message;
    btnPublish.disabled = false;
    btnPublish.classList.remove('loading');
    btnPublish.querySelector('.btn-publish-text').textContent = editingAccountId ? 'Guardar cambios' : 'Publicar cuenta';
    return;
  }

  closePublishSheet();
  loadAccounts(currentProduct.id, currentProduct);
});


}); // fin DOMContentLoaded
