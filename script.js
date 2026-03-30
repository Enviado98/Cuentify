/* ==============================
   CUENTIFY – script.js
   ============================== */

document.addEventListener('DOMContentLoaded', () => {

/* ════════════════════════════════════
   CONFIG
════════════════════════════════════ */

const SUPABASE_URL  = 'https://cfmmmrytieudxjfcfrag.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNmbW1tcnl0aWV1ZHhqZmNmcmFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4NzUwMzcsImV4cCI6MjA5MDQ1MTAzN30.xMUI43qDEwgpkYotKSPY6KfAJM4Sf1ZjX4WHcgg4cS4';

// ── Datos bancarios para transferencia ──
// Cambia estos valores con tus datos reales
const BANK_INFO = {
  bank:  'Nu México',
  name:  'Tu Nombre Aquí',
  clabe: '000000000000000000',
};

if (!window.supabase) {
  console.error('Supabase SDK no cargó');
  document.getElementById('productsLoading').style.display = 'none';
  document.getElementById('productsEmpty').style.display = 'block';
  return;
}

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);


/* ════════════════════════════════════
   STATE
════════════════════════════════════ */

let currentTab      = 'streaming';
let menuOpen        = false;
let currentProduct  = null;
let currentAccount  = null;
let selectedDelivery = 'perfil';   // 'perfil' | 'completa'
let selectedMethod  = null;        // 'transferencia' | 'tarjeta'


/* ════════════════════════════════════
   ELEMENTOS
════════════════════════════════════ */

const viewHome        = document.getElementById('viewHome');
const viewDetail      = document.getElementById('viewDetail');
const navbar          = document.querySelector('#viewHome .navbar');
const hamburgerBtn    = document.getElementById('hamburgerBtn');
const menuSheet       = document.getElementById('menuSheet');
const menuOverlay     = document.getElementById('menuOverlay');
const productsGrid    = document.getElementById('productsGrid');
const productsEmpty   = document.getElementById('productsEmpty');
const productsLoading = document.getElementById('productsLoading');

const backBtn               = document.getElementById('backBtn');
const detailNavTitle        = document.getElementById('detailNavTitle');
const detailHeroImg         = document.getElementById('detailHeroImg');
const detailHeroPlaceholder = document.getElementById('detailHeroPlaceholder');
const detailHeroTitle       = document.getElementById('detailHeroTitle');
const accountsList          = document.getElementById('accountsList');
const accountsLoading       = document.getElementById('accountsLoading');
const accountsEmpty         = document.getElementById('accountsEmpty');

const buyOverlay    = document.getElementById('buyOverlay');
const buySheet      = document.getElementById('buySheet');
const buyStep1      = document.getElementById('buyStep1');
const buyStep2      = document.getElementById('buyStep2');
const buyStep3T     = document.getElementById('buyStep3Transfer');
const buyStep3C     = document.getElementById('buyStep3Card');


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

  const productIds = data.map(p => p.id);
  const { data: countData } = await supabase
    .from('accounts')
    .select('product_id')
    .in('product_id', productIds)
    .eq('status', 'disponible');

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

  const imgHtml = product.image_url
    ? `<img class="product-thumb" src="${product.image_url}" alt="${product.name}" loading="lazy" />`
    : `<div class="product-thumb-placeholder">📦</div>`;

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

  card.addEventListener('click', () => openDetailView(product));
  return card;
}


/* ════════════════════════════════════
   DETAIL VIEW
════════════════════════════════════ */

function openDetailView(product) {
  currentProduct = product;
  detailNavTitle.textContent  = product.name;
  detailHeroTitle.textContent = product.name;

  if (product.image_url) {
    detailHeroImg.src = product.image_url;
    detailHeroImg.classList.add('visible');
    detailHeroPlaceholder.style.display = 'none';
  } else {
    detailHeroImg.classList.remove('visible');
    detailHeroPlaceholder.style.display = 'flex';
  }

  viewDetail.classList.add('open');
  viewHome.classList.add('pushed');
  viewDetail.scrollTop = 0;
  loadAccounts(product.id, product);
}

function closeDetailView() {
  viewDetail.classList.remove('open');
  viewHome.classList.remove('pushed');
  currentProduct = null;
}

backBtn.addEventListener('click', closeDetailView);
window.addEventListener('popstate', () => {
  if (viewDetail.classList.contains('open')) closeDetailView();
});


/* ════════════════════════════════════
   LOAD ACCOUNTS
════════════════════════════════════ */

async function loadAccounts(productId, product) {
  accountsList.innerHTML = '';
  accountsEmpty.style.display = 'none';
  accountsLoading.style.display = 'flex';

  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .eq('product_id', productId)
    .eq('status', 'disponible')
    .order('price', { ascending: true });

  accountsLoading.style.display = 'none';

  if (error || !data || data.length === 0) {
    accountsEmpty.style.display = 'flex';
    return;
  }

  data.forEach(account => {
    account._productImageUrl = product.image_url;
    accountsList.appendChild(buildAccountCard(account));
  });
}

function buildAccountCard(account) {
  const card = document.createElement('div');
  card.className = 'account-card';

  const days  = daysRemaining(account);
  const price = calcPrice(account) ?? parseFloat(account.price ?? 0);

  const thumbHtml = account._productImageUrl
    ? `<div class="account-card-thumb"><img src="${account._productImageUrl}" alt="" /></div>`
    : `<div class="account-card-thumb">📦</div>`;

  const daysBadge = days !== null
    ? `<span class="account-card-days">
         <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
         ${days} día${days !== 1 ? 's' : ''}
       </span>`
    : '';

  const hours = account.delivery_hours ?? 12;
  const durationBadge = `<span class="account-card-duration">
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
    ${hours}h entrega
  </span>`;

  card.innerHTML = `
    ${thumbHtml}
    <div class="account-card-info">
      <div class="account-card-name">${account.description || 'Cuenta disponible'}</div>
      <div class="account-card-meta">
        ${daysBadge}
        ${durationBadge}
      </div>
    </div>
    <div class="account-card-price-wrap">
      <span class="account-card-price">$${price.toFixed(2)}</span>
      <span class="account-card-currency">MXN</span>
    </div>
    <svg class="account-card-arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg>
  `;

  card.addEventListener('click', () => openBuySheet(account, price));
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
   BUY SHEET — NAVEGACIÓN DE PASOS
════════════════════════════════════ */

const ALL_STEPS = [buyStep1, buyStep2, buyStep3T, buyStep3C];

function showStep(step) {
  ALL_STEPS.forEach(s => s.classList.add('hidden'));
  step.classList.remove('hidden');
  buySheet.scrollTop = 0;
}

function openBuySheet(account, price) {
  currentAccount  = account;
  selectedDelivery = account.delivery_type || 'perfil';
  selectedMethod  = null;

  const totalFmt = `$${price.toFixed(2)} MXN`;

  // Paso 1
  document.getElementById('buySheetTitle').textContent = currentProduct?.name || '—';
  document.getElementById('buySheetDesc').textContent  = account.description || 'Cuenta disponible';
  document.getElementById('buySheetPrice').textContent = totalFmt;
  document.getElementById('buyHeaderTotal').textContent         = totalFmt;
  document.getElementById('buyHeaderTotalTransfer').textContent = totalFmt;
  document.getElementById('buyHeaderTotalCard').textContent     = totalFmt;
  document.getElementById('btnPayAmount').textContent           = totalFmt;

  // Transferencia info
  document.getElementById('transferBank').textContent   = BANK_INFO.bank;
  document.getElementById('transferName').textContent   = BANK_INFO.name;
  document.getElementById('transferClabe').textContent  = BANK_INFO.clabe;
  document.getElementById('transferAmount').textContent = totalFmt;

  // Thumb
  const buyThumb = document.getElementById('buyThumb');
  buyThumb.innerHTML = '';
  if (account._productImageUrl) {
    const img = document.createElement('img');
    img.src = account._productImageUrl;
    buyThumb.appendChild(img);
  }

  // Tipo de entrega
  setDeliveryType(selectedDelivery);

  // Limpiar campos
  ['inputCustomerName', 'inputCustomerEmail', 'inputTvCode',
   'cardNumber', 'cardExpiry', 'cardCvv', 'cardName'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  resetComprobanteUpload();

  showStep(buyStep1);
  buySheet.classList.add('open');
  buyOverlay.classList.add('visible');
}

function closeBuySheet() {
  buySheet.classList.remove('open');
  buyOverlay.classList.remove('visible');
  currentAccount = null;
  selectedMethod = null;
}

buyOverlay.addEventListener('click', closeBuySheet);
document.getElementById('btnBuyCancel').addEventListener('click', closeBuySheet);

// Paso 1 → 2
document.getElementById('btnGoToPayment').addEventListener('click', () => {
  const name  = document.getElementById('inputCustomerName').value.trim();
  const email = document.getElementById('inputCustomerEmail').value.trim();
  const code  = document.getElementById('inputTvCode').value.trim();

  if (!name)  { shakeInput('inputCustomerName'); return; }
  if (!email || !email.includes('@')) { shakeInput('inputCustomerEmail'); return; }
  if (selectedDelivery === 'perfil' && !code) { shakeInput('inputTvCode'); return; }

  showStep(buyStep2);
});

// Paso 2 → 1
document.getElementById('btnBackToStep1').addEventListener('click', () => showStep(buyStep1));

// Paso 2 → 3A o 3B
document.getElementById('payOptTransfer').addEventListener('click', () => {
  selectedMethod = 'transferencia';
  showStep(buyStep3T);
});
document.getElementById('payOptCard').addEventListener('click', () => {
  selectedMethod = 'tarjeta';
  showStep(buyStep3C);
});

// Paso 3A → 2
document.getElementById('btnBackToStep2FromTransfer').addEventListener('click', () => showStep(buyStep2));

// Paso 3B → 2
document.getElementById('btnBackToStep2FromCard').addEventListener('click', () => showStep(buyStep2));


/* ════════════════════════════════════
   TIPO DE ENTREGA
════════════════════════════════════ */

function setDeliveryType(type) {
  selectedDelivery = type;
  document.querySelectorAll('.delivery-opt').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.type === type);
  });
  const tvField = document.getElementById('tvCodeField');
  tvField.style.display = type === 'perfil' ? 'flex' : 'none';
}

document.querySelectorAll('.delivery-opt').forEach(btn => {
  btn.addEventListener('click', () => setDeliveryType(btn.dataset.type));
});


/* ════════════════════════════════════
   COPIA CLABE
════════════════════════════════════ */

document.getElementById('transferClabeCopy').addEventListener('click', () => {
  navigator.clipboard.writeText(BANK_INFO.clabe).then(() => {
    const btn = document.getElementById('transferClabeCopy');
    const original = btn.innerHTML;
    btn.innerHTML = '¡Copiado! ✓';
    btn.style.color = '#16a34a';
    setTimeout(() => {
      btn.innerHTML = original;
      btn.style.color = '';
    }, 2000);
  });
});


/* ════════════════════════════════════
   COMPROBANTE UPLOAD
════════════════════════════════════ */

const comprobanteInput       = document.getElementById('comprobanteInput');
const comprobanteUpload      = document.getElementById('comprobanteUpload');
const comprobantePreviewWrap = document.getElementById('comprobantePreviewWrap');
const comprobantePreview     = document.getElementById('comprobantePreview');

function resetComprobanteUpload() {
  comprobanteInput.value = '';
  comprobantePreview.src = '';
  comprobantePreviewWrap.style.display = 'none';
  comprobanteUpload.style.display = 'flex';
}

comprobanteUpload.addEventListener('click', () => comprobanteInput.click());

comprobanteInput.addEventListener('change', () => {
  const file = comprobanteInput.files[0];
  if (!file) return;
  comprobantePreview.src = URL.createObjectURL(file);
  comprobantePreviewWrap.style.display = 'flex';
  comprobanteUpload.style.display = 'none';
});

document.getElementById('comprobanteRemove').addEventListener('click', resetComprobanteUpload);


/* ════════════════════════════════════
   SUBMIT: TRANSFERENCIA
════════════════════════════════════ */

document.getElementById('btnSubmitTransfer').addEventListener('click', async () => {
  const file = comprobanteInput.files[0];
  if (!file) {
    comprobanteUpload.style.boxShadow = '0 0 0 2px #EF4444';
    setTimeout(() => comprobanteUpload.style.boxShadow = '', 1500);
    return;
  }

  const btn = document.getElementById('btnSubmitTransfer');
  btn.disabled = true;
  btn.classList.add('loading');

  try {
    // 1. Subir comprobante a Storage
    const ext      = file.name.split('.').pop();
    const fileName = `comprobantes/${Date.now()}.${ext}`;
    const { error: uploadErr } = await supabase.storage
      .from('comprobantes')
      .upload(fileName, file);

    if (uploadErr) throw uploadErr;

    const { data: urlData } = supabase.storage
      .from('comprobantes')
      .getPublicUrl(fileName);

    // 2. Crear pedido en Supabase
    const price = calcPrice(currentAccount) ?? parseFloat(currentAccount.price ?? 0);
    const { error: orderErr } = await supabase.from('orders').insert([{
      account_id:      currentAccount.id,
      product_id:      currentProduct.id,
      customer_name:   document.getElementById('inputCustomerName').value.trim(),
      customer_email:  document.getElementById('inputCustomerEmail').value.trim(),
      tv_code:         selectedDelivery === 'perfil'
                         ? document.getElementById('inputTvCode').value.trim()
                         : null,
      payment_method:  'transferencia',
      comprobante_url: urlData.publicUrl,
      total:           price,
      delivery_type:   selectedDelivery,
      status:          'pendiente',
    }]);

    if (orderErr) throw orderErr;

    closeBuySheet();
    showSuccessToast('transferencia');

  } catch (err) {
    console.error(err);
    showErrorToast('Error al enviar el pedido. Intenta de nuevo.');
  } finally {
    btn.disabled = false;
    btn.classList.remove('loading');
  }
});


/* ════════════════════════════════════
   SUBMIT: TARJETA (Stripe pendiente)
════════════════════════════════════ */

document.getElementById('cardNumber').addEventListener('input', function () {
  let v = this.value.replace(/\D/g, '').substring(0, 16);
  this.value = v.replace(/(.{4})/g, '$1 ').trim();
});
document.getElementById('cardExpiry').addEventListener('input', function () {
  let v = this.value.replace(/\D/g, '').substring(0, 4);
  if (v.length >= 2) v = v.substring(0, 2) + ' / ' + v.substring(2);
  this.value = v;
});
document.getElementById('cardCvv').addEventListener('input', function () {
  this.value = this.value.replace(/\D/g, '').substring(0, 4);
});

document.getElementById('btnBuy').addEventListener('click', async () => {
  const btn    = document.getElementById('btnBuy');
  if (btn.disabled) return;

  const number = document.getElementById('cardNumber').value.replace(/\s/g, '');
  const expiry = document.getElementById('cardExpiry').value;
  const cvv    = document.getElementById('cardCvv').value;
  const name   = document.getElementById('cardName').value.trim();

  if (number.length < 15) { shakeInput('cardNumber'); return; }
  if (expiry.length < 7)  { shakeInput('cardExpiry'); return; }
  if (cvv.length < 3)     { shakeInput('cardCvv');    return; }
  if (!name)              { shakeInput('cardName');    return; }

  btn.disabled = true;
  btn.classList.add('loading');

  // TODO: Integrar Stripe aquí
  await new Promise(r => setTimeout(r, 1800));

  btn.disabled = false;
  btn.classList.remove('loading');
  closeBuySheet();
  showSuccessToast('tarjeta');
});


/* ════════════════════════════════════
   TOASTS
════════════════════════════════════ */

function showSuccessToast(method) {
  const msg = method === 'transferencia'
    ? '¡Pedido enviado! Te confirmaremos el pago en breve.'
    : '¡Pago procesado! Recibirás los datos pronto.';

  const toast = document.createElement('div');
  toast.className = 'success-toast';
  toast.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
    <span>${msg}</span>
  `;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 400);
  }, 4000);
}

function showErrorToast(msg) {
  const toast = document.createElement('div');
  toast.className = 'success-toast success-toast--error';
  toast.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
    <span>${msg}</span>
  `;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 400);
  }, 3500);
}


/* ════════════════════════════════════
   SHAKE INPUT
════════════════════════════════════ */

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
   INIT
════════════════════════════════════ */

loadProducts(currentTab);

setTimeout(() => {
  if (productsLoading.style.display !== 'none') {
    productsLoading.style.display = 'none';
    productsEmpty.style.display = 'block';
  }
}, 8000);


}); // fin DOMContentLoaded
