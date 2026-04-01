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
  if (user) {
    menuLoginSection.style.display = 'none';
    menuUserSection.style.display  = 'flex';

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

  // Excluir cuentas no disponibles y las reservadas activamente por otro usuario
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .eq('product_id', productId)
    .eq('is_available', true)
    .or(`reserved.eq.false,reserved_until.lt.${now}`)
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
// ── Timer de reserva ──
let reserveTimer    = null;  // setInterval del countdown
let reserveDeadline = null;  // Date cuando expira la reserva

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

  const transferNote = document.getElementById('transferAmountNote');
  if (transferNote) transferNote.textContent = totalFmt + ' MXN';

  switchPayMethod('card');
  resetPayForm();
  buySheet.classList.add('open');
  buyOverlay.classList.add('visible');
}

async function closeBuySheet(releaseReserve = true) {
  // Si el usuario cierra sin completar el pago, liberar la reserva
  if (releaseReserve && currentAccount) {
    await supabase
      .from('accounts')
      .update({ reserved: false, reserved_until: null })
      .eq('id', currentAccount.id);
  }
  clearReserveTimer();
  disableNavigationBlock();
  buySheet.classList.remove('open');
  buySheetPay.classList.remove('open');
  buyOverlay.classList.remove('visible');
  currentAccount = null;
}

function clearReserveTimer() {
  if (reserveTimer) { clearInterval(reserveTimer); reserveTimer = null; }
  reserveDeadline = null;
  sessionStorage.removeItem('reserveDeadline');
  sessionStorage.removeItem('reserveAccountId');
  sessionStorage.removeItem('reserveAccountData');
  const el = document.getElementById('reserveCountdown');
  if (el) el.style.display = 'none';
}

function startReserveTimer() {
  clearReserveTimer();
  const MINUTES = 30;
  reserveDeadline = new Date(Date.now() + MINUTES * 60 * 1000);
  // Guardar en sessionStorage para recuperar si el usuario refresca
  sessionStorage.setItem('reserveDeadline', reserveDeadline.toISOString());
  sessionStorage.setItem('reserveAccountId', currentAccount.id);
  sessionStorage.setItem('reserveAccountData', JSON.stringify(currentAccount));

  const el = document.getElementById('reserveCountdown');
  if (el) el.style.display = 'flex';

  reserveTimer = setInterval(() => {
    const remaining = reserveDeadline - Date.now();
    if (remaining <= 0) {
      clearReserveTimer();
      disableNavigationBlock();
      closeBuySheet(false);
      showExpiredToast();
      return;
    }
    const m = Math.floor(remaining / 60000);
    const s = Math.floor((remaining % 60000) / 1000);
    const txt = `${m}:${s.toString().padStart(2,'0')}`;
    if (el) {
      el.querySelector('.reserve-time').textContent = txt;
      // Urgencia visual en 3 niveles
      el.classList.remove('urgent', 'warning');
      if (remaining < 2 * 60 * 1000) {
        el.classList.add('urgent');   // rojo + parpadeo
      } else if (remaining < 10 * 60 * 1000) {
        el.classList.add('warning'); // amarillo/naranja
      }
    }
  }, 1000);
}

function showExpiredToast() {
  const toast = document.createElement('div');
  toast.className = 'success-toast';
  toast.style.background = '#EF4444';
  toast.innerHTML = '<iconify-icon icon="lucide:clock" width="18"></iconify-icon><span>Tu reserva expiró. La cuenta volvió a estar disponible.</span>';
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 400); }, 4000);
}

/* ── Bloqueo de navegación durante el pago ── */
let navigationBlocked = false;

function enableNavigationBlock() {
  if (navigationBlocked) return;
  navigationBlocked = true;

  // Bloquear cierre/recarga de pestaña
  window.addEventListener('beforeunload', handleBeforeUnload);

  // Bloquear botón atrás del navegador — empujamos un estado al historial
  // para que el "atrás" vuelva aquí en lugar de salir
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
  e.returnValue = '¿Seguro que quieres salir? Tu reserva se cancelará.';
  return e.returnValue;
}

function handlePopState(e) {
  // El usuario tocó "atrás" — volvemos a empujar el estado para mantenerlo aquí
  if (navigationBlocked) {
    history.pushState({ paymentLocked: true }, '');
    // Mostrar un toast recordatorio
    showStayToast();
  }
}

function showStayToast() {
  // Evitar múltiples toasts apilados
  if (document.querySelector('.stay-toast')) return;
  const toast = document.createElement('div');
  toast.className = 'success-toast stay-toast';
  toast.style.background = '#F59E0B';
  toast.innerHTML = '<iconify-icon icon="lucide:lock" width="18"></iconify-icon><span>Completa el pago o toca "Cancelar Compra" para salir.</span>';
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 400); }, 3500);
}

/* ── Recuperar reserva activa si el usuario refrescó la página ── */
async function tryRecoverReservation() {
  const savedDeadline   = sessionStorage.getItem('reserveDeadline');
  const savedAccountId  = sessionStorage.getItem('reserveAccountId');
  const savedAccountRaw = sessionStorage.getItem('reserveAccountData');

  if (!savedDeadline || !savedAccountId || !savedAccountRaw) return;

  const deadline = new Date(savedDeadline);
  const remaining = deadline - Date.now();

  // Si ya expiró, limpiar y liberar en BD
  if (remaining <= 0) {
    sessionStorage.removeItem('reserveDeadline');
    sessionStorage.removeItem('reserveAccountId');
    sessionStorage.removeItem('reserveAccountData');
    await supabase
      .from('accounts')
      .update({ reserved: false, reserved_until: null })
      .eq('id', savedAccountId);
    return;
  }

  // Reserva aún vigente — restaurar estado y mostrar el sheet de pago
  try {
    const savedAccount = JSON.parse(savedAccountRaw);
    currentAccount  = savedAccount;
    reserveDeadline = deadline;

    const price    = parseFloat(savedAccount.price) || 0;
    const totalFmt = `$${price.toFixed(2)}`;

    // Obtener producto para mostrar datos del sheet
    const { data: productData } = await supabase
      .from('products')
      .select('*')
      .eq('id', savedAccount.product_id)
      .single();

    if (productData) {
      currentProduct = productData;
      buySheetTitle.textContent = productData.name;
      savedAccount._productImageUrl = productData.image_url;

      buyThumb.innerHTML = '';
      if (productData.image_url) {
        const img = document.createElement('img');
        img.src = productData.image_url;
        buyThumb.appendChild(img);
      }
    }

    buySheetDesc.textContent  = savedAccount.description || 'Cuenta disponible';
    buySheetPrice.textContent = totalFmt;
    buyHeaderTotal.textContent = totalFmt;
    btnPayAmount.textContent   = totalFmt;
    const transferNote = document.getElementById('transferAmountNote');
    if (transferNote) transferNote.textContent = totalFmt + ' MXN';

    switchPayMethod('card');
    resetPayForm();

    // Abrir sheet directo en paso 2 (pago)
    buySheet.classList.add('open');
    buyOverlay.classList.add('visible');
    buySheetPay.classList.add('open');

    // Reanudar el countdown con el tiempo restante
    const el = document.getElementById('reserveCountdown');
    if (el) el.style.display = 'flex';

    reserveTimer = setInterval(() => {
      const rem = reserveDeadline - Date.now();
      if (rem <= 0) {
        clearReserveTimer();
        disableNavigationBlock();
        closeBuySheet(false);
        showExpiredToast();
        return;
      }
      const m = Math.floor(rem / 60000);
      const s = Math.floor((rem % 60000) / 1000);
      if (el) {
        el.querySelector('.reserve-time').textContent = `${m}:${s.toString().padStart(2,'0')}`;
        el.classList.remove('urgent', 'warning');
        if (rem < 2 * 60 * 1000)        el.classList.add('urgent');
        else if (rem < 10 * 60 * 1000)  el.classList.add('warning');
      }
    }, 1000);

    enableNavigationBlock();

    // Mostrar toast de bienvenida de vuelta
    const toast = document.createElement('div');
    toast.className = 'success-toast';
    toast.style.background = '#4F46E5';
    toast.innerHTML = '<iconify-icon icon="lucide:lock" width="18"></iconify-icon><span>Tu reserva sigue activa. Completa el pago.</span>';
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 400); }, 4000);

  } catch (err) {
    console.error('Error al recuperar reserva:', err);
    clearReserveTimer();
  }
}

async function showBuyStep(n) {
  if (n === 2) {
    // ── Intentar reservar la cuenta de forma atómica ──
    const now       = new Date().toISOString();
    const deadline  = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    // UPDATE condicional: solo actualiza si la cuenta NO está reservada por otro
    const { data: updated, error } = await supabase
      .from('accounts')
      .update({ reserved: true, reserved_until: deadline })
      .eq('id', currentAccount.id)
      .eq('is_available', true)
      .or(`reserved.eq.false,reserved_until.lt.${now}`)
      .select('id');

    if (error || !updated || updated.length === 0) {
      // Alguien más llegó primero — mostrar error y cerrar
      showUnavailableError();
      closeBuySheet(false);
      return;
    }

    // Reserva exitosa — iniciar countdown, bloquear navegación y mostrar paso 2
    startReserveTimer();
    enableNavigationBlock();
    buySheetPay.classList.add('open');
  } else {
    // Volver al paso 1 — liberar reserva
    if (currentAccount) {
      await supabase
        .from('accounts')
        .update({ reserved: false, reserved_until: null })
        .eq('id', currentAccount.id);
    }
    clearReserveTimer();
    disableNavigationBlock();
    buySheetPay.classList.remove('open');
  }
}

function showUnavailableError() {
  const toast = document.createElement('div');
  toast.className = 'success-toast';
  toast.style.background = '#EF4444';
  toast.innerHTML = '<iconify-icon icon="lucide:x-circle" width="18"></iconify-icon><span>Esta cuenta ya fue reservada por otro usuario.</span>';
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 400); }, 4000);
}

function resetPayForm() {
  ['cardNumber', 'cardExpiry', 'cardCvv', 'cardName'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  btnBuy.classList.remove('loading');
  btnBuy.disabled = false;

  // Actualizar solo el span de monto, sin reconstruir innerHTML
  const amountSpan = document.getElementById('btnPayAmount');
  if (amountSpan) amountSpan.textContent = buyHeaderTotal.textContent || '$0.00';

  // Reset card visual
  const cvn = document.getElementById('cardVisualNumber');
  const cvna = document.getElementById('cardVisualName');
  const cve = document.getElementById('cardVisualExpiry');
  const cvb = document.getElementById('cardVisualBrand');
  if (cvn)  cvn.textContent  = '•••• •••• •••• ••••';
  if (cvna) cvna.textContent = 'NOMBRE COMPLETO';
  if (cve)  cve.textContent  = 'MM / AA';
  if (cvb)  cvb.innerHTML    = '';

  // Reset upload transfer
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
  // Si está en la pantalla de pago (paso 2), no dejar cerrar por overlay
  if (buySheetPay.classList.contains('open')) {
    showStayToast();
    return;
  }
  closeBuySheet(true);
});
btnBuyCancel.addEventListener('click', () => closeBuySheet(true));
btnGoToPayment.addEventListener('click', async () => {
  // Verificar sesión antes de continuar al pago
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    // Guardar la cuenta pendiente y pedir login
    pendingAccount = currentAccount;
    // Cerrar el sheet de resumen primero
    buySheet.classList.remove('open');
    buyOverlay.classList.remove('visible');
    openAuthModal('Inicia sesión para continuar con tu compra');
    return;
  }
  showBuyStep(2);
});
btnBackToSummary.addEventListener('click', () => {
  // Volver al paso 1 libera la reserva (equivale a cancelar)
  closeBuySheet(true);
});

// Botones "Cancelar compra" dentro del paso 2
document.getElementById('btnCancelPurchase')?.addEventListener('click', () => closeBuySheet(true));
document.getElementById('btnCancelPurchaseCard')?.addEventListener('click', () => closeBuySheet(true));

/* ── Método de pago ── */
function switchPayMethod(method) {
  const isCard   = method === 'card';
  const showEl   = document.getElementById(isCard ? 'panelCard' : 'panelTransfer');
  const hideEl   = document.getElementById(isCard ? 'panelTransfer' : 'panelCard');

  document.getElementById('payOptCard').classList.toggle('active', isCard);
  document.getElementById('payOptTransfer').classList.toggle('active', !isCard);

  hideEl.style.display = 'none';
  hideEl.classList.remove('entering');

  showEl.style.display = 'block';
  // Force reflow so animation triggers
  void showEl.offsetWidth;
  showEl.classList.add('entering');
  showEl.addEventListener('animationend', () => showEl.classList.remove('entering'), { once: true });
}

document.getElementById('payOptCard').addEventListener('click', () => switchPayMethod('card'));
document.getElementById('payOptTransfer').addEventListener('click', () => switchPayMethod('transfer'));

/* ── Card visual preview ── */
const cardVisualNumber = document.getElementById('cardVisualNumber');
const cardVisualName   = document.getElementById('cardVisualName');
const cardVisualExpiry = document.getElementById('cardVisualExpiry');
const cardVisualBrand  = document.getElementById('cardVisualBrand');

const CARD_BRANDS = {
  visa:       { pattern: /^4/,            icon: '<iconify-icon icon="logos:visa" width="42" height="28"></iconify-icon>' },
  mastercard: { pattern: /^5[1-5]|^2[2-7]/, icon: '<iconify-icon icon="logos:mastercard" width="42" height="28"></iconify-icon>' },
  amex:       { pattern: /^3[47]/,        icon: '<iconify-icon icon="logos:amex" width="42" height="28"></iconify-icon>' },
};

function detectBrand(num) {
  for (const [, b] of Object.entries(CARD_BRANDS)) {
    if (b.pattern.test(num)) return b.icon;
  }
  return '';
}

document.getElementById('cardNumber').addEventListener('input', function () {
  let v = this.value.replace(/\D/g, '').substring(0, 16);
  this.value = v.replace(/(.{4})/g, '$1 ').trim();
  const raw = v.padEnd(16, '•');
  cardVisualNumber.textContent =
    raw.substring(0,4) + ' ' + raw.substring(4,8) + ' ' + raw.substring(8,12) + ' ' + raw.substring(12,16);
  cardVisualBrand.innerHTML = detectBrand(v);
});

document.getElementById('cardExpiry').addEventListener('input', function () {
  let v = this.value.replace(/\D/g, '').substring(0, 4);
  if (v.length >= 2) v = v.substring(0, 2) + ' / ' + v.substring(2);
  this.value = v;
  cardVisualExpiry.textContent = v || 'MM / AA';
});

document.getElementById('cardCvv').addEventListener('input', function () {
  this.value = this.value.replace(/\D/g, '').substring(0, 4);
});

document.getElementById('cardName').addEventListener('input', function () {
  cardVisualName.textContent = this.value.trim().toUpperCase() || 'NOMBRE COMPLETO';
});

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
  const sendBtn = document.getElementById('btnTransferSend');
  sendBtn.disabled = true;
  sendBtn.querySelector('span').textContent = 'Enviando…';

  try {
    // 0. Verificar que la reserva sigue vigente antes de subir
    const now = new Date().toISOString();
    const { data: accountCheck, error: checkError } = await supabase
      .from('accounts')
      .select('id, reserved, reserved_until')
      .eq('id', currentAccount.id)
      .single();

    const reservaVigente = accountCheck &&
      accountCheck.reserved === true &&
      accountCheck.reserved_until &&
      new Date(accountCheck.reserved_until) > new Date();

    if (checkError || !reservaVigente) {
      throw new Error('Tu reserva ya expiró. Esta cuenta no está disponible para ti.');
    }

    // 1. Convertir a Blob JPEG limpio (garantiza tipo correcto independientemente del fallback)
    let uploadBlob = compressedBlob;
    if (!(uploadBlob instanceof Blob) || uploadBlob.type !== 'image/jpeg') {
      uploadBlob = new Blob([uploadBlob], { type: 'image/jpeg' });
    }

    // 2. Subir comprobante a Supabase Storage
    const fileName = `comprobantes/${Date.now()}_${Math.random().toString(36).substring(2,7)}.jpg`;
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('vouchers')
      .upload(fileName, uploadBlob, {
        contentType: 'image/jpeg',
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('Storage error:', uploadError);
      throw new Error('No se pudo subir el comprobante. Verifica que el bucket "vouchers" existe en Supabase Storage y es público.');
    }

    const { data: urlData } = supabase
      .storage
      .from('vouchers')
      .getPublicUrl(fileName);

    const voucherUrl = urlData?.publicUrl;
    if (!voucherUrl) throw new Error('No se pudo obtener la URL del comprobante.');

    // 3. Crear la orden en la tabla orders
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    const { error: orderError } = await supabase
      .from('orders')
      .insert({
        account_id:  currentAccount.id,
        amount:      parseFloat(currentAccount.price) || 0,
        voucher_url: voucherUrl,
        status:      'pendiente',
        user_id:     currentSession?.user?.id || null,
        user_email:  currentSession?.user?.email || null,
      });

    if (orderError) {
      console.error('Orders insert error:', orderError);
      throw new Error('No se pudo registrar el pedido: ' + orderError.message);
    }

    // 4. Éxito — cerrar sin liberar reserva (el admin la elimina al aprobar)
    disableNavigationBlock();
    closeBuySheet(false);
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

/* ── Pagar con tarjeta ── */
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
  el.classList.add('error');
  el.style.animation = 'shake 0.35s ease';
  setTimeout(() => {
    el.classList.remove('error');
    el.style.animation = '';
  }, 500);
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
loadProducts(currentTab);

// Recuperar sesión activa y reserva pendiente
supabase.auth.getSession().then(({ data: { session } }) => {
  updateMenuAuth(session?.user || null);
  tryRecoverReservation();
});

setTimeout(() => {
  if (productsLoading.style.display !== 'none') {
    productsLoading.style.display = 'none';
    productsEmpty.style.display = 'block';
  }
}, 8000);


}); // fin DOMContentLoaded
