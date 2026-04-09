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
  clearAllSkeletons();
  return;
}

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

// ── STATE ──
let currentTab     = 'streaming';
let menuOpen       = false;
let currentProduct = null;
let selectedOrderType = null; // se asigna en openBuySheet
let currentUser    = null;          // sesión activa de Supabase Auth
let pendingAccount = null;          // cuenta que el usuario quería comprar antes del login

/* ════════════════════════════════════
   AUTH — Google + Email/Password
════════════════════════════════════ */
const APP_URL = 'https://cuentify.onrender.com';

// ── Elementos del modal ──
const authOverlay          = document.getElementById('authOverlay');
const authModal            = document.getElementById('authModal');
const authCloseBtn         = document.getElementById('authCloseBtn');
const authGoogleBtn        = document.getElementById('authGoogleBtn');
const authLoginBtn         = document.getElementById('authLoginBtn');
const authRegisterBtn      = document.getElementById('authRegisterBtn');
const authSwitchToRegister = document.getElementById('authSwitchToRegister');
const authSwitchToLogin    = document.getElementById('authSwitchToLogin');
const authError            = document.getElementById('authError');
const authSubtitle         = document.getElementById('authSubtitle');
const menuUserSection      = document.getElementById('menuUserSection');
const menuLoginSection     = document.getElementById('menuLoginSection');
const menuLogoutBtn        = document.getElementById('menuLogoutBtn');
const menuLoginBtn         = document.getElementById('menuLoginBtn');

function openAuthModal(subtitle = 'Inicia sesión para continuar con tu compra') {
  authSubtitle.textContent = subtitle;
  authError.style.display = 'none';
  authOverlay.classList.add('visible');
  // Mostrar modal con un pequeño delay para que la animación funcione
  requestAnimationFrame(() => {
    authModal.style.display = 'block';
    requestAnimationFrame(() => authModal.classList.add('visible'));
  });
}

function closeAuthModal() {
  authModal.classList.remove('visible');
  authOverlay.classList.remove('visible');
  setTimeout(() => { authModal.style.display = 'none'; }, 220);
  authError.style.display = 'none';
}

function showAuthError(msg) {
  authError.textContent = msg;
  authError.style.display = 'block';
}

function switchAuthForm(form) {
  authError.style.display = 'none';
  if (form === 'register') {
    document.getElementById('authFormLogin').style.display = 'none';
    document.getElementById('authFormRegister').style.display = 'flex';
  } else {
    document.getElementById('authFormRegister').style.display = 'none';
    document.getElementById('authFormLogin').style.display = 'flex';
  }
}

// ── Actualizar UI del menú según sesión ──
function updateMenuAuth(user) {
  currentUser = user;
  const ordersLink = document.getElementById('menuOrdersLink');
  if (user) {
    menuLoginSection.style.display = 'none';
    menuUserSection.style.display  = 'flex';
    if (ordersLink) ordersLink.style.display = 'block';

    const name  = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuario';
    const email = user.email || '';
    const avatar = user.user_metadata?.avatar_url;

    document.getElementById('menuUserName').textContent  = name;
    document.getElementById('menuUserEmail').textContent = email;

    const avatarEl = document.getElementById('menuUserAvatar');
    if (avatar) {
      avatarEl.innerHTML = `<img src="${avatar}" alt="${name}" />`;
    } else {
      avatarEl.textContent = name.charAt(0).toUpperCase();
    }
  } else {
    menuLoginSection.style.display = 'block';
    menuUserSection.style.display  = 'none';
    if (ordersLink) ordersLink.style.display = 'none';
  }
}

// ── Escuchar cambios de sesión ──
supabase.auth.onAuthStateChange((_event, session) => {
  updateMenuAuth(session?.user || null);

  // Si acaba de loguearse y había una cuenta pendiente, continuar al pago
  if (session?.user && pendingAccount) {
    const account = pendingAccount;
    pendingAccount = null;
    closeAuthModal();
    // Pequeño delay para que el modal cierre primero
    setTimeout(() => {
      openBuySheet(account, `$${parseFloat(account.price || 0).toFixed(2)}`);
    }, 280);
  }
});

// ── Google OAuth ──
authGoogleBtn.addEventListener('click', async () => {
  authGoogleBtn.disabled = true;
  authGoogleBtn.style.opacity = '0.7';
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: APP_URL }
  });
  if (error) {
    showAuthError('Error al conectar con Google. Intenta de nuevo.');
    authGoogleBtn.disabled = false;
    authGoogleBtn.style.opacity = '1';
  }
});

// ── Login con email ──
authLoginBtn.addEventListener('click', async () => {
  const email    = document.getElementById('authEmail').value.trim();
  const password = document.getElementById('authPassword').value;
  if (!email || !password) { showAuthError('Completa todos los campos.'); return; }

  authLoginBtn.disabled = true;
  authLoginBtn.textContent = 'Ingresando…';
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  authLoginBtn.disabled = false;
  authLoginBtn.textContent = 'Iniciar sesión';

  if (error) {
    showAuthError('Correo o contraseña incorrectos.');
  } else {
    closeAuthModal();
  }
});

// ── Registro con email ──
authRegisterBtn.addEventListener('click', async () => {
  const email    = document.getElementById('authRegEmail').value.trim();
  const password = document.getElementById('authRegPassword').value;
  if (!email || !password) { showAuthError('Completa todos los campos.'); return; }
  if (password.length < 6) { showAuthError('La contraseña debe tener al menos 6 caracteres.'); return; }

  authRegisterBtn.disabled = true;
  authRegisterBtn.textContent = 'Creando cuenta…';
  const { error } = await supabase.auth.signUp({ email, password });
  authRegisterBtn.disabled = false;
  authRegisterBtn.textContent = 'Crear cuenta';

  if (error) {
    showAuthError('No se pudo crear la cuenta: ' + error.message);
  } else {
    showAuthError('✅ Revisa tu correo para confirmar tu cuenta.');
    authError.style.background = '#F0FDF4';
    authError.style.borderColor = '#86EFAC';
    authError.style.color = '#16A34A';
  }
});

// ── Cerrar sesión ──
menuLogoutBtn.addEventListener('click', async () => {
  await supabase.auth.signOut();
  closeMenu();
});

// ── Abrir login desde el menú ──
menuLoginBtn.addEventListener('click', () => {
  closeMenu();
  openAuthModal('Inicia sesión o crea tu cuenta');
});

// ── Mis pedidos ──
document.getElementById('btnMyOrders')?.addEventListener('click', () => {
  closeMenu();
  openOrdersView();
});

document.getElementById('backOrdersBtn')?.addEventListener('click', closeOrdersView);

function openOrdersView() {
  const viewOrders = document.getElementById('viewOrders');
  viewOrders.classList.add('open');
  document.getElementById('viewHome').classList.add('pushed');
  viewOrders.scrollTop = 0;
  loadMyOrders();
}

function closeOrdersView() {
  document.getElementById('viewOrders').classList.remove('open');
  document.getElementById('viewHome').classList.remove('pushed');
}

async function loadMyOrders() {
  const listEl    = document.getElementById('myOrdersList');
  const loadingEl = document.getElementById('myOrdersLoading');
  const emptyEl   = document.getElementById('myOrdersEmpty');

  listEl.innerHTML  = '';
  emptyEl.style.display   = 'none';
  loadingEl.style.display = 'flex';

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    loadingEl.style.display = 'none';
    emptyEl.style.display   = 'flex';
    return;
  }

  const { data, error } = await supabase
    .from('orders')
    .select('*, products(name, image_url)')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false });

  loadingEl.style.display = 'none';

  if (error || !data || !data.length) {
    emptyEl.style.display = 'flex';
    return;
  }

  data.forEach((order, i) => {
    const card = buildMyOrderCard(order);
    card.style.animationDelay = `${i * 60}ms`;
    listEl.appendChild(card);
  });
}

function buildMyOrderCard(order) {
  const card = document.createElement('div');
  card.className = 'my-order-card';

  const typeLabel    = order.order_type === 'full' ? 'Cuenta completa' : 'Perfil compartido';
  const delivered    = order.delivery_status === 'delivered';
  const dateStr      = new Date(order.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
  const amountStr    = `$${parseFloat(order.amount || 0).toFixed(0)} MXN`;

  const thumbHtml = order.products?.image_url
    ? `<div class="my-order-thumb"><img src="${order.products.image_url}" alt="" /></div>`
    : `<div class="my-order-thumb">📦</div>`;

  const badgeHtml = delivered
    ? `<span class="my-order-badge delivered"><iconify-icon icon="lucide:check-circle" width="11"></iconify-icon>Entregado</span>`
    : `<span class="my-order-badge pending"><iconify-icon icon="lucide:clock" width="11"></iconify-icon>En proceso</span>`;

  card.innerHTML = `
    <div class="my-order-header">
      ${thumbHtml}
      <div class="my-order-info">
        <div class="my-order-name">${order.products?.name || '—'}</div>
        <div class="my-order-meta">
          <span class="order-type-chip">${typeLabel}</span>
          <span class="my-order-amount">${amountStr}</span>
          <span class="my-order-date">${dateStr}</span>
        </div>
      </div>
      ${badgeHtml}
    </div>
  `;

  if (delivered) {
    const credsHtml = buildCredentialsBlock(order);
    card.insertAdjacentHTML('beforeend', credsHtml);
  } else {
    card.insertAdjacentHTML('beforeend', `
      <div class="my-order-pending-block">
        <iconify-icon icon="lucide:clock" width="18" style="color:#D97706;flex-shrink:0;"></iconify-icon>
        <p>Estamos preparando tu acceso. Recibirás tus datos en menos de 12 horas.</p>
      </div>`);
  }

  return card;
}

function buildCredentialsBlock(order) {
  const copyBtn = (value, field) =>
    `<button class="my-order-cred-copy" data-copy="${value}" title="Copiar">
      <iconify-icon icon="lucide:copy" width="14"></iconify-icon>
    </button>`;

  const noteHtml = order.credentials_note
    ? `<div class="my-order-cred-note">📝 ${order.credentials_note}</div>`
    : '';

  return `
    <div class="my-order-credentials">
      <div class="my-order-cred-title">
        <iconify-icon icon="lucide:key-round" width="12"></iconify-icon>
        Credenciales de acceso
      </div>
      <div class="my-order-cred-row">
        <span class="my-order-cred-label">👤</span>
        <span class="my-order-cred-value">${order.credentials_user || '—'}</span>
        ${copyBtn(order.credentials_user || '', 'user')}
      </div>
      <div class="my-order-cred-row">
        <span class="my-order-cred-label">🔑</span>
        <span class="my-order-cred-value">${order.credentials_pass || '—'}</span>
        ${copyBtn(order.credentials_pass || '', 'pass')}
      </div>
      ${noteHtml}
    </div>`;
}

// Copiar credenciales al portapapeles
document.getElementById('myOrdersList').addEventListener('click', e => {
  const btn = e.target.closest('[data-copy]');
  if (!btn) return;
  const value = btn.dataset.copy;
  if (!value) return;
  navigator.clipboard.writeText(value).then(() => {
    const icon = btn.querySelector('iconify-icon');
    if (icon) {
      icon.setAttribute('icon', 'lucide:check');
      setTimeout(() => icon.setAttribute('icon', 'lucide:copy'), 1500);
    }
  }).catch(() => {});
});

// ── Switches entre login/register ──
authSwitchToRegister.addEventListener('click', () => switchAuthForm('register'));
authSwitchToLogin.addEventListener('click', () => switchAuthForm('login'));

// ── Cerrar modal ──
authCloseBtn.addEventListener('click', () => {
  pendingAccount = null; // cancelar intención de compra
  closeAuthModal();
});
authOverlay.addEventListener('click', (e) => {
  if (e.target === authOverlay) {
    pendingAccount = null;
    closeAuthModal();
  }
});

// ── ELEMENTS: HOME ──
const viewHome        = document.getElementById('viewHome');
const viewDetail      = document.getElementById('viewDetail');
const navbar          = document.querySelector('#viewHome .navbar');
const hamburgerBtn    = document.getElementById('hamburgerBtn');
const menuSheet       = document.getElementById('menuSheet');
const menuOverlay     = document.getElementById('menuOverlay');
// ── SKELETON HELPERS ──
const SKELETON_COUNT = 4; // cards placeholder por categoría

function buildSkeletonCard() {
  const card = document.createElement('div');
  card.className = 'product-card skeleton-card';
  card.innerHTML = `
    <div class="product-thumb-wrapper">
      <div class="sk-thumb skeleton-base"></div>
      <div class="sk-body">
        <div class="sk-line sk-line-long  skeleton-base"></div>
        <div class="sk-line sk-line-short skeleton-base"></div>
      </div>
    </div>
  `;
  return card;
}

function injectSkeletons(gridId) {
  const grid = document.getElementById(gridId);
  if (!grid) return;
  grid.innerHTML = '';
  for (let i = 0; i < SKELETON_COUNT; i++) {
    grid.appendChild(buildSkeletonCard());
  }
}

function clearSkeletons(gridId) {
  const grid = document.getElementById(gridId);
  if (!grid) return;
  grid.classList.remove('skeleton-grid');
  grid.querySelectorAll('.skeleton-card').forEach(el => el.remove());
}

function clearAllSkeletons() {
  ['streaming', 'musica', 'gaming', 'software'].forEach(cat => clearSkeletons(`grid-${cat}`));
}

// ── ELEMENTS: DETAIL ──
const backBtn               = document.getElementById('backBtn');
const detailNavTitle        = document.getElementById('detailNavTitle');
const detailHeroImg         = document.getElementById('detailHeroImg');
const detailHeroPlaceholder = document.getElementById('detailHeroPlaceholder');
const detailHeroTitle       = document.getElementById('detailHeroTitle');
const detailHeroSub         = document.getElementById('detailHeroSub');
const accountsEmpty         = document.getElementById('accountsEmpty');

// ── ELEMENTS: BUY SHEET ──
const buyOverlay       = document.getElementById('buyOverlay');
const buySheet         = document.getElementById('buySheet');
const buySheetPay      = document.getElementById('buySheetPay');
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
   TAB NAVIGATION (solo Internet)
════════════════════════════════════ */
document.querySelectorAll('.tab-item').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentTab = tab.dataset.tab;
    switchTab(currentTab);
  });
});

function switchTab(tab) {
  const categorySections = document.getElementById('categorySections');
  const internetSection  = document.getElementById('internetSection');
  if (tab === 'internet') {
    categorySections.style.display = 'none';
    internetSection.style.display  = 'block';
  } else {
    categorySections.style.display = 'block';
    internetSection.style.display  = 'none';
  }
}


/* ════════════════════════════════════
   TENDENCIAS
════════════════════════════════════ */
async function loadTrends() {
  const section = document.getElementById('trendsSection');
  const scroll  = document.getElementById('trendsScroll');

  const { data, error } = await supabase
    .from('trends')
    .select('*')
    .eq('active', true)
    .order('sort_order', { ascending: true });

  if (error || !data || data.length === 0) {
    section.style.display = 'none';
    return;
  }

  scroll.innerHTML = '';
  data.forEach(item => {
    const card = document.createElement('div');
    card.className = 'trend-card';

    const bgStyle = item.image_url
      ? `style="background-image:url('${item.image_url}')"`
      : `style="background:${item.bg_color || '#1e293b'}"`;

    card.innerHTML = `
      <div class="trend-card-bg" ${bgStyle}></div>
      <div class="trend-card-overlay"></div>
      <div class="trend-card-content">
        <span class="trend-card-label">${item.label || ''}</span>
        <span class="trend-card-name">${item.name}</span>
      </div>
    `;

    if (item.link_tab) {
      card.addEventListener('click', () => {
        document.querySelectorAll('.tab-item').forEach(t => {
          t.classList.toggle('active', t.dataset.tab === item.link_tab);
        });
        currentTab = item.link_tab;
        loadProducts(currentTab);
        loadTrends();
      });
      card.style.cursor = 'pointer';
    }

    scroll.appendChild(card);
  });

  section.style.display = 'block';
}


/* Carga todas las categorías en secciones verticales */
async function loadAllCategories() {
  const categories = ['streaming', 'musica', 'gaming', 'software'];

  // Inyectar skeletons inmediatamente en cada grid
  categories.forEach(cat => injectSkeletons(`grid-${cat}`));

  // Traer todos los productos de una vez
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .in('category', categories)
    .order('created_at', { ascending: false });

  if (error || !data || data.length === 0) {
    clearAllSkeletons();
    return;
  }

  // Renderizar por sección: primero limpiar skeletons, luego insertar cards escalonados
  categories.forEach(cat => {
    const grid    = document.getElementById(`grid-${cat}`);
    const empty   = document.getElementById(`empty-${cat}`);
    const section = document.getElementById(`section-${cat}`);
    const catProducts = data.filter(p => p.category === cat);

    clearSkeletons(`grid-${cat}`);

    if (!catProducts.length) {
      section.style.display = 'none';
      return;
    }

    catProducts.forEach((product, i) => {
      const card = buildCard(product);
      card.style.animationDelay = `${i * 60}ms`;
      grid.appendChild(card);
    });
  });
}

/* Carga solo la categoría Internet (tab aparte) */
async function loadInternetProducts() {
  const grid    = document.getElementById('grid-internet');
  const empty   = document.getElementById('empty-internet');
  const section = document.getElementById('internetSection');

  if (grid) { grid.innerHTML = ''; grid.classList.add('skeleton-grid'); injectSkeletons('grid-internet'); }
  if (empty) empty.style.display = 'none';
  if (section) section.style.display = 'block';

  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('category', 'internet')
    .order('created_at', { ascending: false });

  clearSkeletons('grid-internet');

  if (error || !data || data.length === 0) {
    if (empty) empty.style.display = 'block';
    return;
  }

  data.forEach((product, i) => {
    const card = buildCard(product);
    card.style.animationDelay = `${i * 60}ms`;
    grid.appendChild(card);
  });
}

/* Alias para compatibilidad con loadTrends click handler */
function loadProducts(category) {
  if (category === 'internet') loadInternetProducts();
}

function buildCard(product) {
  const card = document.createElement('div');
  card.className = 'product-card';

  // Precio a mostrar: el más bajo disponible, o "Consultar" si no hay ninguno
  const prices = [product.price_full, product.price_shared].filter(v => v != null && v > 0);
  const minPrice = prices.length ? Math.min(...prices) : null;
  const priceLabel = minPrice != null
    ? `Desde $${Number(minPrice).toFixed(0)} MXN`
    : 'Consultar precio';

  const imgHtml = product.image_url
    ? `<img class="product-thumb" src="${product.image_url}" alt="${product.name}" loading="lazy" />`
    : `<div class="product-thumb-placeholder">📦</div>`;

  card.innerHTML = `
    <div class="product-thumb-wrapper">
      ${imgHtml}
      <div class="product-card-body">
        <div class="product-name">${product.name}</div>
        <div class="product-divider"></div>
        <div class="product-price-label">${priceLabel}</div>
      </div>
    </div>
  `;

  // Fade-in de la imagen al terminar de cargar
  const img = card.querySelector('.product-thumb');
  if (img) {
    img.addEventListener('load',  () => img.classList.add('loaded'));
    img.addEventListener('error', () => img.classList.add('loaded'));
    if (img.complete) img.classList.add('loaded');
  }

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
  detailHeroSub.textContent   = 'Elige el plan que más te convenga';

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

  renderOrderTypes(product);
}

function renderOrderTypes(product) {
  const list  = document.getElementById('orderTypeList');
  const empty = document.getElementById('accountsEmpty');
  list.innerHTML = '';

  const options = [
    {
      type:  'full',
      label: 'Cuenta completa',
      desc:  'Acceso total a la cuenta. Solo para ti.',
      icon:  'lucide:shield-check',
      price: product.price_full,
    },
    {
      type:  'shared',
      label: 'Perfil compartido',
      desc:  'Un perfil dentro de una cuenta compartida.',
      icon:  'lucide:users',
      price: product.price_shared,
    },
  ];

  const available = options.filter(o => o.price != null && o.price > 0);

  if (!available.length) {
    empty.style.display = 'flex';
    return;
  }
  empty.style.display = 'none';

  available.forEach((opt, i) => {
    const card = document.createElement('div');
    card.className = 'order-type-card';
    card.style.animationDelay = `${i * 80}ms`;
    card.innerHTML = `
      <div class="order-type-icon">
        <iconify-icon icon="${opt.icon}" width="22"></iconify-icon>
      </div>
      <div class="order-type-info">
        <div class="order-type-name">${opt.label}</div>
        <div class="order-type-desc">${opt.desc}</div>
      </div>
      <div class="order-type-price-wrap">
        <span class="order-type-price">$${Number(opt.price).toFixed(0)}</span>
        <span class="order-type-currency">MXN</span>
      </div>
      <svg class="account-card-arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg>
    `;
    card.addEventListener('click', () => openBuySheet(opt));
    list.appendChild(card);
  });
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
   BUY SHEET — 2 pasos (sin reservas)
════════════════════════════════════ */
// { type, label, price } — se asigna en openBuySheet

function openBuySheet(opt) {
  selectedOrderType = opt;

  const price    = parseFloat(opt.price) || 0;
  const totalFmt = `$${price.toFixed(2)}`;
  const typeLabel = opt.type === 'full' ? 'Cuenta completa' : 'Perfil compartido';

  buySheetTitle.textContent = currentProduct ? currentProduct.name : '—';
  buySheetDesc.textContent  = opt.label;
  buySheetPrice.textContent = totalFmt;

  const badge = document.getElementById('buyTypeBadge');
  if (badge) badge.textContent = typeLabel;

  buyThumb.innerHTML = '';
  if (currentProduct?.image_url) {
    const img = document.createElement('img');
    img.src = currentProduct.image_url;
    buyThumb.appendChild(img);
  }

  buyHeaderTotal.textContent = totalFmt;
  btnPayAmount.textContent   = totalFmt;

  const transferNote = document.getElementById('transferAmountNote');
  if (transferNote) transferNote.textContent = totalFmt + ' MXN';

  showStripePanel();
  resetPayForm();
  buySheet.classList.add('open');
  buyOverlay.classList.add('visible');
}

function closeBuySheet() {
  disableNavigationBlock();
  buySheet.classList.remove('open');
  buySheetPay.classList.remove('open');
  buyOverlay.classList.remove('visible');
  selectedOrderType = null;
}

/* ── Bloqueo de navegación durante el pago ── */
let navigationBlocked = false;

function enableNavigationBlock() {
  if (navigationBlocked) return;
  navigationBlocked = true;
  window.addEventListener('beforeunload', handleBeforeUnload);
  history.pushState({ paymentLocked: true }, '');
  window.addEventListener('popstate', handlePopState);
}

function disableNavigationBlock() {
  if (!navigationBlocked) return;
  navigationBlocked = false;
  window.removeEventListener('beforeunload', handleBeforeUnload);
  window.removeEventListener('popstate', handlePopState);
}

function handleBeforeUnload(e) {
  e.preventDefault();
  e.returnValue = '¿Seguro que quieres salir? Tu pedido no se completará.';
  return e.returnValue;
}

function handlePopState() {
  if (navigationBlocked) {
    history.pushState({ paymentLocked: true }, '');
    showStayToast();
  }
}

function showStayToast() {
  if (document.querySelector('.stay-toast')) return;
  const toast = document.createElement('div');
  toast.className = 'success-toast stay-toast';
  toast.style.background = '#F59E0B';
  toast.innerHTML = '<iconify-icon icon="lucide:lock" width="18"></iconify-icon><span>Completa el pago o toca "Cancelar" para salir.</span>';
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 400); }, 3500);
}

function resetPayForm() {
  btnBuy.classList.remove('loading');
  btnBuy.disabled = false;
  const amountSpan = document.getElementById('btnPayAmount');
  if (amountSpan) amountSpan.textContent = buyHeaderTotal.textContent || '$0.00';
  compressedBlob = null;
  const area = document.getElementById('transferUploadArea');
  const fi   = document.getElementById('transferFileInput');
  if (fi)   fi.value = '';
  if (area) {
    area.classList.remove('has-file');
    area.style.borderColor = '';
    const icon  = document.getElementById('transferUploadIcon');
    const title = document.getElementById('transferUploadTitle');
    const sub   = document.getElementById('transferUploadSub');
    if (icon)  icon.innerHTML    = '<iconify-icon icon="lucide:upload-cloud" width="22" style="color:#4F46E5;"></iconify-icon>';
    if (title) title.textContent = 'Adjuntar captura';
    if (sub)   sub.textContent   = 'JPG o PNG · Se optimiza automáticamente';
  }
  showCompressStatus(false);
}

buyOverlay.addEventListener('click', () => {
  if (buySheetPay.classList.contains('open')) { showStayToast(); return; }
  closeBuySheet();
});
btnBuyCancel.addEventListener('click', () => closeBuySheet());

btnGoToPayment.addEventListener('click', async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    pendingAccount = selectedOrderType;
    buySheet.classList.remove('open');
    buyOverlay.classList.remove('visible');
    openAuthModal('Inicia sesión para continuar con tu compra');
    return;
  }
  buySheetPay.classList.add('open');
  enableNavigationBlock();
});

btnBackToSummary.addEventListener('click', () => {
  buySheetPay.classList.remove('open');
  disableNavigationBlock();
});

document.getElementById('btnCancelPurchase')?.addEventListener('click', () => closeBuySheet());
document.getElementById('btnCancelPurchaseCard')?.addEventListener('click', () => closeBuySheet());


/* ── Método de pago ── */
document.getElementById('payOptCard').addEventListener('click', () => showStripePanel());
document.getElementById('payOptTransfer').addEventListener('click', () => showTransferPanel());

function showStripePanel() {
  document.getElementById('payOptCard').classList.add('active');
  document.getElementById('payOptTransfer').classList.remove('active');
  const pc = document.getElementById('panelCard');
  const pt = document.getElementById('panelTransfer');
  pt.style.display = 'none';
  pc.style.display = 'block';
  void pc.offsetWidth;
  pc.classList.add('entering');
  pc.addEventListener('animationend', () => pc.classList.remove('entering'), { once: true });
}

function showTransferPanel() {
  document.getElementById('payOptCard').classList.remove('active');
  document.getElementById('payOptTransfer').classList.add('active');
  const pc = document.getElementById('panelCard');
  const pt = document.getElementById('panelTransfer');
  pc.style.display = 'none';
  pt.style.display = 'block';
  void pt.offsetWidth;
  pt.classList.add('entering');
  pt.addEventListener('animationend', () => pt.classList.remove('entering'), { once: true });
}

/* ── Copiar CLABE ── */
document.getElementById('transferCopyBtn').addEventListener('click', function () {
  navigator.clipboard.writeText('127290013355244437').catch(() => {});
  this.classList.add('copied');
  this.innerHTML = '<iconify-icon icon="lucide:check" width="13"></iconify-icon> Copiado';
  setTimeout(() => {
    this.classList.remove('copied');
    this.innerHTML = '<iconify-icon icon="lucide:copy" width="13"></iconify-icon> Copiar';
  }, 2000);
});

/* ── Upload comprobante con compresión por Canvas ── */
const transferFileInput  = document.getElementById('transferFileInput');
const transferUploadArea = document.getElementById('transferUploadArea');

// Blob comprimido listo para subir
let compressedBlob = null;

// Muestra la barra de progreso simulada durante la compresión
function showCompressStatus(visible) {
  const el = document.getElementById('transferCompressStatus');
  el.style.display = visible ? 'flex' : 'none';
}

function setCompressBar(pct, label) {
  document.getElementById('transferCompressBar').style.width = pct + '%';
  document.getElementById('transferCompressLabel').textContent = label;
}

// Comprime la imagen con Canvas manteniendo la máxima calidad visual posible
// Estrategia: redimensiona a máx. 1600px en el lado mayor, JPEG quality 0.82
// Resultado típico: captura de 4-8 MB → 150-400 KB, visualmente indistinguible
function compressImage(file) {
  return new Promise((resolve, reject) => {
    const MAX_SIDE = 1600;
    const QUALITY  = 0.82;

    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      let { width, height } = img;
      if (width > MAX_SIDE || height > MAX_SIDE) {
        if (width >= height) { height = Math.round((height / width) * MAX_SIDE); width = MAX_SIDE; }
        else                 { width  = Math.round((width / height) * MAX_SIDE); height = MAX_SIDE; }
      }

      const canvas = document.createElement('canvas');
      canvas.width  = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(blob => {
        if (!blob) { reject(new Error('Canvas toBlob falló')); return; }
        resolve(blob);
      }, 'image/jpeg', QUALITY);
    };

    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('No se pudo leer la imagen')); };
    img.src = url;
  });
}

function fmtSize(bytes) {
  if (bytes < 1024)       return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

transferFileInput.addEventListener('change', async function () {
  if (!this.files || !this.files[0]) return;
  const file = this.files[0];
  compressedBlob = null;

  // Solo imágenes
  if (!file.type.startsWith('image/')) {
    transferUploadArea.style.borderColor = '#EF4444';
    setTimeout(() => { transferUploadArea.style.borderColor = ''; }, 800);
    return;
  }

  // Muestra estado de compresión
  showCompressStatus(true);
  setCompressBar(20, 'Leyendo imagen…');

  try {
    setCompressBar(50, 'Optimizando calidad…');
    const blob = await compressImage(file);
    setCompressBar(90, 'Finalizando…');

    compressedBlob = blob;

    await new Promise(r => setTimeout(r, 180)); // pequeña pausa visual
    setCompressBar(100, `✓ ${fmtSize(file.size)} → ${fmtSize(blob.size)}`);

    await new Promise(r => setTimeout(r, 900));
    showCompressStatus(false);

    // Marca el área como lista
    transferUploadArea.classList.add('has-file');
    document.getElementById('transferUploadIcon').innerHTML =
      '<iconify-icon icon="lucide:check-circle-2" width="22" style="color:#16a34a;"></iconify-icon>';
    const name = file.name;
    document.getElementById('transferUploadTitle').textContent =
      name.length > 28 ? name.substring(0, 25) + '…' : name;
    document.getElementById('transferUploadSub').textContent =
      `Optimizado · ${fmtSize(blob.size)}`;
  } catch (err) {
    showCompressStatus(false);
    console.error('Compresión fallida:', err);
    // Fallback: usar archivo original
    compressedBlob = file;
    transferUploadArea.classList.add('has-file');
    document.getElementById('transferUploadIcon').innerHTML =
      '<iconify-icon icon="lucide:check-circle-2" width="22" style="color:#16a34a;"></iconify-icon>';
    document.getElementById('transferUploadTitle').textContent = file.name.length > 28 ? file.name.substring(0, 25) + '…' : file.name;
    document.getElementById('transferUploadSub').textContent = 'Comprobante adjuntado ✓';
  }
});

/* ── Enviar comprobante ── */
document.getElementById('btnTransferSend').addEventListener('click', async () => {
  if (!compressedBlob) {
    transferUploadArea.style.borderColor = '#EF4444';
    setTimeout(() => { transferUploadArea.style.borderColor = ''; }, 800);
    return;
  }
  if (!selectedOrderType || !currentProduct) return;

  const sendBtn = document.getElementById('btnTransferSend');
  sendBtn.disabled = true;
  sendBtn.querySelector('span').textContent = 'Enviando…';

  try {
    // 1. Subir comprobante a Supabase Storage
    let uploadBlob = compressedBlob;
    if (!(uploadBlob instanceof Blob) || uploadBlob.type !== 'image/jpeg') {
      uploadBlob = new Blob([uploadBlob], { type: 'image/jpeg' });
    }

    const fileName = `comprobantes/${Date.now()}_${Math.random().toString(36).substring(2,7)}.jpg`;
    const { error: uploadError } = await supabase
      .storage
      .from('vouchers')
      .upload(fileName, uploadBlob, {
        contentType: 'image/jpeg',
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) throw new Error('No se pudo subir el comprobante.');

    const { data: urlData } = supabase.storage.from('vouchers').getPublicUrl(fileName);
    const voucherUrl = urlData?.publicUrl;
    if (!voucherUrl) throw new Error('No se pudo obtener la URL del comprobante.');

    // 2. Crear la orden
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    const { error: orderError } = await supabase
      .from('orders')
      .insert({
        product_id:      currentProduct.id,
        order_type:      selectedOrderType.type,
        amount:          parseFloat(selectedOrderType.price) || 0,
        voucher_url:     voucherUrl,
        status:          'pendiente',
        delivery_status: 'pending',
        user_id:         currentSession?.user?.id || null,
        user_email:      currentSession?.user?.email || null,
      });

    if (orderError) throw new Error('No se pudo registrar el pedido: ' + orderError.message);

    disableNavigationBlock();
    closeBuySheet();
    showSuccessToast();
  } catch (err) {
    console.error('Error al enviar comprobante:', err);
    const sub = document.getElementById('transferUploadSub');
    if (sub) sub.textContent = err.message || 'Error al enviar. Inténtalo de nuevo.';
    transferUploadArea.style.borderColor = '#EF4444';
    setTimeout(() => { transferUploadArea.style.borderColor = ''; }, 2000);
  } finally {
    sendBtn.disabled = false;
    sendBtn.querySelector('span').textContent = 'Enviar comprobante';
  }
});

/* ── Pagar con tarjeta — Stripe Checkout ── */
btnBuy.addEventListener('click', async () => {
  if (btnBuy.disabled) return;
  if (!selectedOrderType || !currentProduct) return;

  btnBuy.disabled = true;
  btnBuy.classList.add('loading');

  try {
    const { data: { session: authSession } } = await supabase.auth.getSession();
    const user_email = authSession?.user?.email || null;

    const res = await fetch(`${SUPABASE_URL}/functions/v1/create-checkout-session`, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON}`,
      },
      body: JSON.stringify({
        product_id:  currentProduct.id,
        order_type:  selectedOrderType.type,
        amount:      selectedOrderType.price,
        product_name: currentProduct.name,
        user_email,
        user_id: authSession?.user?.id || null,
      }),
    });

    const { url, error } = await res.json();
    if (error || !url) throw new Error(error || 'No se pudo iniciar el pago.');

    disableNavigationBlock();

    const overlay = document.createElement('div');
    overlay.className = 'stripe-redirect-overlay';
    overlay.innerHTML = `
      <div class="stripe-redirect-spinner"></div>
      <div class="stripe-redirect-logo">
        <iconify-icon icon="simple-icons:stripe" width="28"></iconify-icon>
      </div>
      <div class="stripe-redirect-label">Redirigiendo a Stripe…</div>
      <div class="stripe-redirect-sub">Pago seguro · SSL 256-bit · PCI DSS</div>
    `;
    document.body.appendChild(overlay);
    setTimeout(() => { window.location.href = url; }, 300);

  } catch (err) {
    console.error('Error al iniciar pago:', err);
    btnBuy.disabled = false;
    btnBuy.classList.remove('loading');
    const toast = document.createElement('div');
    toast.className = 'success-toast';
    toast.style.background = '#EF4444';
    toast.innerHTML = `<iconify-icon icon="lucide:alert-circle" width="18"></iconify-icon><span>${err.message || 'Error al conectar con el servidor de pagos.'}</span>`;
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 400); }, 4000);
  }
});



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

hamburgerBtn.addEventListener('click', async () => {
  if (menuOpen) { closeMenu(); return; }
  // Si no hay sesión, abrir modal de login en lugar del menú
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    openAuthModal('Inicia sesión o crea tu cuenta');
    return;
  }
  openMenu();
});
menuOverlay.addEventListener('click', closeMenu);


/* ════════════════════════════════════
   INIT
════════════════════════════════════ */
switchTab("digital");
loadAllCategories();
loadTrends();

supabase.auth.getSession().then(({ data: { session } }) => {
  updateMenuAuth(session?.user || null);
});

// ── Manejar retorno desde Stripe Checkout ──
(function handleStripeReturn() {
  const params = new URLSearchParams(window.location.search);
  const payment = params.get('payment');

  if (!payment) return;

  const cleanUrl = window.location.pathname;
  history.replaceState({}, '', cleanUrl);

  if (payment === 'success') {
    const toast = document.createElement('div');
    toast.className = 'success-toast';
    toast.innerHTML = '<iconify-icon icon="lucide:check-circle" width="18"></iconify-icon><span>¡Pago completado! Recibirás los datos pronto.</span>';
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 400); }, 5000);
  }

  if (payment === 'cancelled') {
    const toast = document.createElement('div');
    toast.className = 'success-toast';
    toast.style.background = '#6B7280';
    toast.innerHTML = '<iconify-icon icon="lucide:x-circle" width="18"></iconify-icon><span>Pago cancelado.</span>';
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 400); }, 4000);
  }
})();


}); // fin DOMContentLoaded
