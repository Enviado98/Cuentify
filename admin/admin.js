/* ==============================
   CUENTIFY – admin.js
   UI puro. Sin lógica de backend.
   Conectar Supabase en cada TODO.
   ============================== */

document.addEventListener('DOMContentLoaded', () => {


/* ════════════════════════════════════
   NAVEGACIÓN DE SECCIONES
════════════════════════════════════ */

const navItems    = document.querySelectorAll('.nav-item');
const sections    = document.querySelectorAll('.section');
const topbarTitle = document.getElementById('topbarTitle');

const sectionTitles = {
  dashboard:      'Dashboard',
  productos:      'Productos',
  cuentas:        'Cuentas',
  pedidos:        'Pedidos',
  clientes:       'Clientes',
  configuracion:  'Configuración',
};

function goToSection(name) {
  // Nav items
  navItems.forEach(item => {
    item.classList.toggle('active', item.dataset.section === name);
  });

  // Sections
  sections.forEach(s => {
    s.classList.toggle('active', s.id === `section-${name}`);
  });

  // Topbar title
  topbarTitle.textContent = sectionTitles[name] || name;

  // Close sidebar on mobile
  closeSidebar();
}

navItems.forEach(item => {
  item.addEventListener('click', (e) => {
    e.preventDefault();
    goToSection(item.dataset.section);
  });
});

// "Ver todos" desde dashboard
document.querySelectorAll('[data-goto]').forEach(btn => {
  btn.addEventListener('click', () => goToSection(btn.dataset.goto));
});


/* ════════════════════════════════════
   SIDEBAR MOBILE
════════════════════════════════════ */

const sidebar        = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');
const sidebarToggle  = document.getElementById('sidebarToggle');

function openSidebar() {
  sidebar.classList.add('open');
  sidebarOverlay.classList.add('visible');
}
function closeSidebar() {
  sidebar.classList.remove('open');
  sidebarOverlay.classList.remove('visible');
}

sidebarToggle.addEventListener('click', openSidebar);
sidebarOverlay.addEventListener('click', closeSidebar);


/* ════════════════════════════════════
   FILTROS DE TABS (productos / cuentas)
════════════════════════════════════ */

document.querySelectorAll('.filter-tabs').forEach(group => {
  group.querySelectorAll('.filter-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      group.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      // TODO: filtrar tabla según tab.dataset.filter
    });
  });
});


/* ════════════════════════════════════
   MODAL: PRODUCTO
════════════════════════════════════ */

const modalProductoOverlay  = document.getElementById('modalProductoOverlay');
const modalProducto         = document.getElementById('modalProducto');
const modalProductoTitle    = document.getElementById('modalProductoTitle');
const modalProductoClose    = document.getElementById('modalProductoClose');
const modalProductoCancelBtn = document.getElementById('modalProductoCancelBtn');
const modalProductoSaveBtn  = document.getElementById('modalProductoSaveBtn');
const btnNuevoProducto      = document.getElementById('btnNuevoProducto');

const imgUploadAreaProducto = document.getElementById('imgUploadAreaProducto');
const imgInputProducto      = document.getElementById('imgInputProducto');
const imgPreviewProducto    = document.getElementById('imgPreviewProducto');

function openModalProducto(editData = null) {
  modalProductoTitle.textContent = editData ? 'Editar producto' : 'Nuevo producto';
  modalProductoSaveBtn.textContent = editData ? 'Guardar cambios' : 'Guardar producto';

  if (editData) {
    document.getElementById('inputProductoNombre').value = editData.nombre || '';
    document.getElementById('inputProductoCat').value    = editData.categoria || 'streaming';
  } else {
    document.getElementById('inputProductoNombre').value = '';
    document.getElementById('inputProductoCat').value    = 'streaming';
    imgPreviewProducto.classList.remove('visible');
    imgPreviewProducto.src = '';
  }

  modalProductoOverlay.classList.add('visible');
  modalProducto.classList.add('visible');
}

function closeModalProducto() {
  modalProductoOverlay.classList.remove('visible');
  modalProducto.classList.remove('visible');
}

btnNuevoProducto.addEventListener('click', () => openModalProducto());
modalProductoClose.addEventListener('click', closeModalProducto);
modalProductoCancelBtn.addEventListener('click', closeModalProducto);
modalProductoOverlay.addEventListener('click', closeModalProducto);

imgUploadAreaProducto.addEventListener('click', () => imgInputProducto.click());
imgInputProducto.addEventListener('change', () => {
  const file = imgInputProducto.files[0];
  if (!file) return;
  imgPreviewProducto.src = URL.createObjectURL(file);
  imgPreviewProducto.classList.add('visible');
});

modalProductoSaveBtn.addEventListener('click', () => {
  const nombre    = document.getElementById('inputProductoNombre').value.trim();
  const categoria = document.getElementById('inputProductoCat').value;

  if (!nombre) {
    showToast('El nombre es obligatorio', 'error');
    return;
  }

  // TODO: guardar en Supabase
  // const { error } = await supabase.from('products').insert([{ name: nombre, category: categoria }]);

  showToast('Producto guardado ✓', 'success');
  closeModalProducto();
  renderProductosTable([]);  // TODO: recargar tabla real
});


/* ════════════════════════════════════
   MODAL: CUENTA
════════════════════════════════════ */

const modalCuentaOverlay   = document.getElementById('modalCuentaOverlay');
const modalCuenta          = document.getElementById('modalCuenta');
const modalCuentaTitle     = document.getElementById('modalCuentaTitle');
const modalCuentaClose     = document.getElementById('modalCuentaClose');
const modalCuentaCancelBtn = document.getElementById('modalCuentaCancelBtn');
const modalCuentaSaveBtn   = document.getElementById('modalCuentaSaveBtn');
const btnNuevaCuenta       = document.getElementById('btnNuevaCuenta');

function openModalCuenta(editData = null) {
  modalCuentaTitle.textContent    = editData ? 'Editar cuenta' : 'Publicar cuenta';
  modalCuentaSaveBtn.textContent  = editData ? 'Guardar cambios' : 'Publicar cuenta';

  if (editData) {
    document.getElementById('inputCuentaDesc').value    = editData.descripcion || '';
    document.getElementById('inputCuentaPrecio').value  = editData.precio || '';
    document.getElementById('inputCuentaDias').value    = editData.dias || '';
  } else {
    document.getElementById('inputCuentaProducto').value = '';
    document.getElementById('inputCuentaDesc').value    = '';
    document.getElementById('inputCuentaPrecio').value  = '';
    document.getElementById('inputCuentaDias').value    = '';
    document.getElementById('inputCuentaEmail').value   = '';
    document.getElementById('inputCuentaPass').value    = '';
    document.getElementById('inputCuentaEntrega').value = '12';
  }

  modalCuentaOverlay.classList.add('visible');
  modalCuenta.classList.add('visible');
}

function closeModalCuenta() {
  modalCuentaOverlay.classList.remove('visible');
  modalCuenta.classList.remove('visible');
}

btnNuevaCuenta.addEventListener('click', () => openModalCuenta());
modalCuentaClose.addEventListener('click', closeModalCuenta);
modalCuentaCancelBtn.addEventListener('click', closeModalCuenta);
modalCuentaOverlay.addEventListener('click', closeModalCuenta);

modalCuentaSaveBtn.addEventListener('click', () => {
  const desc   = document.getElementById('inputCuentaDesc').value.trim();
  const precio = document.getElementById('inputCuentaPrecio').value;
  const dias   = document.getElementById('inputCuentaDias').value;

  if (!desc)   { showToast('La descripción es obligatoria', 'error'); return; }
  if (!precio) { showToast('El precio es obligatorio', 'error'); return; }
  if (!dias)   { showToast('La duración es obligatoria', 'error'); return; }

  // TODO: guardar en Supabase
  // const expiresAt = new Date(); expiresAt.setDate(expiresAt.getDate() + parseInt(dias));
  // const { error } = await supabase.from('accounts').insert([{ ... }]);

  showToast('Cuenta publicada ✓', 'success');
  closeModalCuenta();
  renderCuentasTable([]); // TODO: recargar tabla real
});


/* ════════════════════════════════════
   MODAL: PEDIDO DETALLE
════════════════════════════════════ */

const modalPedidoOverlay = document.getElementById('modalPedidoOverlay');
const modalPedido        = document.getElementById('modalPedido');
const modalPedidoClose   = document.getElementById('modalPedidoClose');
const modalPedidoClose2  = document.getElementById('modalPedidoClose2');

function openModalPedido(pedidoData = null) {
  // TODO: rellenar con datos reales del pedido
  modalPedidoOverlay.classList.add('visible');
  modalPedido.classList.add('visible');
}

function closeModalPedido() {
  modalPedidoOverlay.classList.remove('visible');
  modalPedido.classList.remove('visible');
}

modalPedidoClose.addEventListener('click', closeModalPedido);
modalPedidoClose2.addEventListener('click', closeModalPedido);
modalPedidoOverlay.addEventListener('click', closeModalPedido);


/* ════════════════════════════════════
   TABLA: PRODUCTOS
   Renderiza filas a partir de un array.
   Reemplazar [] con datos de Supabase.
════════════════════════════════════ */

function renderProductosTable(data) {
  const body  = document.getElementById('productosTableBody');
  const empty = document.getElementById('productosEmpty');

  body.innerHTML = '';

  if (!data || data.length === 0) {
    empty.style.display = 'flex';
    return;
  }
  empty.style.display = 'none';

  data.forEach(item => {
    const row = document.createElement('div');
    row.className = 'table-row';
    row.innerHTML = `
      <div class="col-thumb">
        <div class="cell-thumb">
          ${item.image_url ? `<img src="${item.image_url}" alt="" />` : '📦'}
        </div>
      </div>
      <div class="col-name">
        <div class="cell-name">${item.name}</div>
      </div>
      <div class="col-cat">
        <span class="cat-badge">${item.category}</span>
      </div>
      <div class="col-stock">
        <span class="stock-badge ${item.stock > 2 ? 'stock-ok' : item.stock > 0 ? 'stock-low' : 'stock-none'}">
          <span class="stock-dot"></span>
          ${item.stock ?? '—'}
        </span>
      </div>
      <div class="col-date">
        <span class="cell-muted">${item.created_at ? new Date(item.created_at).toLocaleDateString('es-MX') : '—'}</span>
      </div>
      <div class="col-actions">
        <button class="action-btn action-btn--edit" title="Editar" data-id="${item.id}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button class="action-btn action-btn--delete" title="Borrar" data-id="${item.id}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
        </button>
      </div>
    `;

    row.querySelector('.action-btn--edit').addEventListener('click', () => {
      openModalProducto(item);
    });

    row.querySelector('.action-btn--delete').addEventListener('click', () => {
      if (!confirm(`¿Borrar "${item.name}"?`)) return;
      // TODO: await supabase.from('products').delete().eq('id', item.id);
      showToast('Producto eliminado', 'success');
      renderProductosTable(data.filter(p => p.id !== item.id));
    });

    body.appendChild(row);
  });
}


/* ════════════════════════════════════
   TABLA: CUENTAS
════════════════════════════════════ */

function renderCuentasTable(data) {
  const body  = document.getElementById('cuentasTableBody');
  const empty = document.getElementById('cuentasEmpty');

  body.innerHTML = '';

  if (!data || data.length === 0) {
    empty.style.display = 'flex';
    return;
  }
  empty.style.display = 'none';

  data.forEach(item => {
    const row = document.createElement('div');
    row.className = 'table-row';

    const vence = item.expires_at
      ? new Date(item.expires_at).toLocaleDateString('es-MX')
      : '—';

    const estadoMap = {
      disponible: { label: 'Disponible', cls: 'status-badge--ok' },
      vendida:    { label: 'Vendida',    cls: 'status-badge--sold' },
      expirada:   { label: 'Expirada',   cls: 'status-badge--expired' },
    };
    const estado = estadoMap[item.status] || { label: item.status || '—', cls: '' };

    row.innerHTML = `
      <div class="col-name">
        <div class="cell-name">${item.description || '—'}</div>
      </div>
      <div class="col-cat">
        <span class="cat-badge">${item.product_name || '—'}</span>
      </div>
      <div class="col-price">
        <span class="cell-price">$${item.price ? parseFloat(item.price).toFixed(2) : '—'}</span>
      </div>
      <div class="col-date">
        <span class="cell-muted">${vence}</span>
      </div>
      <div class="col-status">
        <span class="status-badge ${estado.cls}">${estado.label}</span>
      </div>
      <div class="col-actions">
        <button class="action-btn action-btn--edit" title="Editar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button class="action-btn action-btn--delete" title="Borrar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
        </button>
      </div>
    `;

    row.querySelector('.action-btn--edit').addEventListener('click', () => {
      openModalCuenta(item);
    });

    row.querySelector('.action-btn--delete').addEventListener('click', () => {
      if (!confirm('¿Borrar esta cuenta?')) return;
      // TODO: await supabase.from('accounts').delete().eq('id', item.id);
      showToast('Cuenta eliminada', 'success');
      renderCuentasTable(data.filter(c => c.id !== item.id));
    });

    body.appendChild(row);
  });
}


/* ════════════════════════════════════
   TABLA: PEDIDOS
════════════════════════════════════ */

function renderPedidosTable(data) {
  const body = document.getElementById('pedidosTableBody');
  body.innerHTML = '';

  if (!data || data.length === 0) return;

  data.forEach(item => {
    const row = document.createElement('div');
    row.className = 'table-row';

    const estadoMap = {
      completado: { label: 'Completado', cls: 'status-badge--ok' },
      pendiente:  { label: 'Pendiente',  cls: 'status-badge--pending' },
      cancelado:  { label: 'Cancelado',  cls: 'status-badge--canceled' },
    };
    const estado = estadoMap[item.status] || { label: item.status || '—', cls: '' };

    row.innerHTML = `
      <div class="col-id">#${item.id || '—'}</div>
      <div class="col-name">
        <div class="cell-name">${item.cliente || '—'}</div>
      </div>
      <div class="col-cat">
        <span class="cat-badge">${item.producto || '—'}</span>
      </div>
      <div class="col-price">
        <span class="cell-price">$${item.total ? parseFloat(item.total).toFixed(2) : '—'}</span>
      </div>
      <div class="col-date">
        <span class="cell-muted">${item.fecha ? new Date(item.fecha).toLocaleDateString('es-MX') : '—'}</span>
      </div>
      <div class="col-status">
        <span class="status-badge ${estado.cls}">${estado.label}</span>
      </div>
      <div class="col-actions">
        <button class="action-btn action-btn--view" title="Ver detalle">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
        </button>
      </div>
    `;

    row.querySelector('.action-btn--view').addEventListener('click', () => {
      openModalPedido(item);
    });

    body.appendChild(row);
  });
}


/* ════════════════════════════════════
   TOGGLES DE CONFIGURACIÓN
════════════════════════════════════ */

document.querySelectorAll('.toggle').forEach(toggle => {
  toggle.addEventListener('click', () => {
    const isOn = toggle.dataset.toggled === 'true';
    toggle.dataset.toggled = (!isOn).toString();
    toggle.classList.toggle('active', !isOn);
    // TODO: guardar preferencia en Supabase/config
  });
});

document.querySelectorAll('.btn-save-config').forEach(btn => {
  btn.addEventListener('click', () => {
    // TODO: guardar configuración real
    showToast('Configuración guardada ✓', 'success');
  });
});


/* ════════════════════════════════════
   TOAST
════════════════════════════════════ */

let toastTimeout;

function showToast(msg, type = 'default') {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = `toast toast--${type} show`;
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.remove('show');
  }, 2800);
}


/* ════════════════════════════════════
   INIT
   Aquí se inicializa todo vacío.
   Cuando conectes Supabase, llama:
     renderProductosTable(dataDeSupabase)
     renderCuentasTable(dataDeSupabase)
     renderPedidosTable(dataDeSupabase)
════════════════════════════════════ */

renderProductosTable([]);
renderCuentasTable([]);
renderPedidosTable([]);

// TODO: reemplazar con llamadas reales:
// const { data } = await supabase.from('products').select('*');
// renderProductosTable(data);


}); // fin DOMContentLoaded
