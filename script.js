/* ==============================
   CUENTIFY – script.js
   Cliente puro. Sin lógica admin.
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
let currentTab     = 'streaming';
let menuOpen       = false;
let currentProduct = null;
let currentAccount = null;

// ── ELEMENTS: HOME ──
const viewHome        = document.getElementById('viewHome');
const viewDetail      = document.getElementById('viewDetail');
const navbar          = document.querySelector('#viewHome .navbar');
const hamburgerBtn    = document.getElementById('hamburgerBtn');
const menuSheet       = document.getElementById('menuSheet');
const menuOverlay     = document.getElementById('menuOverlay');
const productsGrid    = document.getElementById('productsGrid');
const productsEmpty   = document.getElementById('productsEmpty');
const productsLoading = document.getElementById('productsLoading');

// ── ELEMENTS: DETAIL ──
const backBtn               = document.getElementById('backBtn');
const detailNavTitle        = document.getElementById('detailNavTitle');
const detailHeroImg         = document.getElementById('detailHeroImg');
const detailHeroPlaceholder = document.getElementById('detailHeroPlaceholder');
const detailHeroTitle       = document.getElementById('detailHeroTitle');
const detailHeroSub         = document.getElementById('detailHeroSub');
const accountsList          = document.getElementById('accountsList');
const accountsLoading       = document.getElementById('accountsLoading');
const accountsEmpty         = document.getElementById('accountsEmpty');

// ── ELEMENTS: BUY SHEET ──
const buyOverlay       = document.getElementById('buyOverlay');
const buySheet         = document.getElementById('buySheet');
const buyStep1         = document.getElementById('buyStep1');
const buyStep2         = document.getElementById('buyStep2');
const buySheetTitle    = document.getElementById('buySheetTitle');
const buySheetDesc     = document.getElementById('buySheetDesc');
const buySheetPrice    = document.getElementById('buySheetPrice');
const buyHeaderTotal   = document.getElementById('buyHeaderTotal');
const btnPayAmount     = document.getElementById('btnPayAmount');
const buyThumb         = document.getElementById('buyThumb');
const btnBuy           = document.getElementById('btnBuy');
const btnBuyCancel     = document.getElementById('btnBuyCancel');
const btnGoToPayment   = document.getElementById('btnGoToPayment');
const btnBackToSummary = document.getElementById('btnBackToSummary');


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
    .eq('is_available', true);

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
  detailHeroSub.textContent   = 'Elige la cuenta que más te convenga';

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
    .order('expires_at', { ascending: true });

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
  const price = calcPrice(account);

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

  const desc = account.description || (days !== null ? `Expira en ${days} días` : 'Cuenta disponible');

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
   BUY SHEET — 2 pasos
════════════════════════════════════ */
function openBuySheet(account, priceDisplay) {
  currentAccount = account;

  const price    = parseFloat(account.price) || 0;
  const totalFmt = `$${price.toFixed(2)}`;

  buySheetTitle.textContent = currentProduct ? currentProduct.name : '—';
  buySheetDesc.textContent  = account.description || 'Cuenta disponible';
  buySheetPrice.textContent = totalFmt;

  buyThumb.innerHTML = '';
  if (account._productImageUrl) {
    const img = document.createElement('img');
    img.src = account._productImageUrl;
    buyThumb.appendChild(img);
  }

  buyHeaderTotal.textContent = totalFmt;
  btnPayAmount.textContent   = totalFmt;

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
  ['cardNumber', 'cardExpiry', 'cardCvv', 'cardName'].forEach(id => {
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

btnBuy.addEventListener('click', async () => {
  if (btnBuy.disabled) return;

  const number = document.getElementById('cardNumber').value.replace(/\s/g, '');
  const expiry = document.getElementById('cardExpiry').value;
  const cvv    = document.getElementById('cardCvv').value;
  const name   = document.getElementById('cardName').value.trim();

  if (number.length < 15) { shakeInput('cardNumber'); return; }
  if (expiry.length < 7)  { shakeInput('cardExpiry'); return; }
  if (cvv.length < 3)     { shakeInput('cardCvv'); return; }
  if (!name)              { shakeInput('cardName'); return; }

  btnBuy.disabled = true;
  btnBuy.classList.add('loading');

  // TODO: Conectar Stripe aquí
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
