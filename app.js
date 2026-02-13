(() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const app = $('.app');
  const sidebar = $('#sidebar');
  const backdrop = $('#backdrop');
  const main = $('#main');
  const gate = $('#gateScreen');
  const modalHost = $('#modalHost');

  // -------------------------
  // NAVIGATION (UI only)
  // -------------------------
  function setActiveView(viewName) {
    $$('.nav-item[data-view]').forEach(btn => {
      btn.classList.toggle('is-active', btn.dataset.view === viewName);
    });

    $$('.view').forEach(v => {
      v.classList.toggle('is-active', v.dataset.view === viewName);
    });

    closeSidebar();
    main.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function openSidebar() {
    sidebar.classList.add('is-open');
    backdrop.hidden = false;
  }
  function closeSidebar() {
    sidebar.classList.remove('is-open');
    backdrop.hidden = true;
  }

  $('#btnMenu').addEventListener('click', () => {
    if (sidebar.classList.contains('is-open')) closeSidebar();
    else openSidebar();
  });
  backdrop.addEventListener('click', closeSidebar);

  $$('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const view = btn.dataset.view;
      const modal = btn.dataset.modal;
      if (view) setActiveView(view);
      if (modal) openModal(modal);
    });
  });

  $$('[data-view]').forEach(btn => {
    if (btn.classList.contains('nav-item')) return;
    btn.addEventListener('click', () => setActiveView(btn.dataset.view));
  });

  // -------------------------
  // THEME (UI only)
  // -------------------------
  const themes = ['finpro', 'finsoft'];

  function setTheme(theme) {
    app.dataset.theme = theme;
    $$('.seg-btn[data-theme]').forEach(b => b.classList.toggle('is-on', b.dataset.theme === theme));
  }

  $('#btnTheme').addEventListener('click', () => {
    const idx = themes.indexOf(app.dataset.theme || 'finpro');
    const next = themes[(idx + 1) % themes.length];
    setTheme(next);
  });

  $$('.seg-btn[data-theme]').forEach(b => {
    b.addEventListener('click', () => setTheme(b.dataset.theme));
  });

  // -------------------------
  // TREEVIEW (UI only)
  // -------------------------
  $$('.tree-node[aria-expanded]').forEach(node => {
    const toggle = $('.tree-toggle', node);
    if (!toggle) return;

    toggle.addEventListener('click', () => {
      const expanded = node.getAttribute('aria-expanded') === 'true';
      node.setAttribute('aria-expanded', expanded ? 'false' : 'true');

      const children = node.nextElementSibling;
      if (children && children.classList.contains('tree-children')) {
        children.classList.toggle('is-hidden', expanded);
      }

      toggle.textContent = expanded ? '▸' : '▾';
    });
  });

  // -------------------------
  // GATE / LOGIN (UI only)
  // -------------------------
  $('#gateForm').addEventListener('submit', (e) => {
    e.preventDefault();
    gate.classList.add('is-hidden');
    setActiveView('dashboard');
  });

  $('#btnLogout').addEventListener('click', () => {
    gate.classList.remove('is-hidden');
    closeModal();
    closeSidebar();
  });

  $('#btnQuickSave').addEventListener('click', () => {
    openModal('toastSave');
  });

  // -------------------------
  // MODALS
  // -------------------------
  function closeModal() {
    modalHost.innerHTML = '';
    modalHost.style.pointerEvents = 'none';
  }

  function openModal(key) {
    const def = MODALS[key];
    if (!def) {
      showModal({
        title: 'Modal no definido',
        subtitle: `No existe modal con key: ${key}`,
        body: `<p class="note">Agrega la definición en MODALS.</p>`,
        actions: [{ text: 'Cerrar', kind: 'btn btn-ghost', close: true }]
      });
      return;
    }
    showModal(def);
  }

  function showModal({ title, subtitle, body, actions = [] }) {
    modalHost.style.pointerEvents = 'auto';
    modalHost.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true" aria-label="${escapeHtml(title)}">
        <div class="modal-back" data-close="1"></div>
        <div class="modal-card">
          <div class="modal-head">
            <div>
              <h3>${escapeHtml(title)}</h3>
              ${subtitle ? `<div class="modal-sub">${escapeHtml(subtitle)}</div>` : ``}
            </div>
            <button class="xbtn" title="Cerrar" aria-label="Cerrar" data-close="1">✕</button>
          </div>
          <div class="modal-body">${body || ''}</div>
          <div class="modal-foot">
            ${actions.map(a => `
              <button class="${a.kind || 'btn btn-ghost'}" data-act="${escapeHtml(a.id || a.text)}">
                ${escapeHtml(a.text)}
              </button>
            `).join('')}
          </div>
        </div>
      </div>
    `;

    $$('[data-close="1"]', modalHost).forEach(el => el.addEventListener('click', closeModal));

    const onEsc = (ev) => {
      if (ev.key === 'Escape') {
        closeModal();
        window.removeEventListener('keydown', onEsc);
      }
    };
    window.addEventListener('keydown', onEsc);

    $$('[data-act]', modalHost).forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.act;
        const a = actions.find(x => (x.id || x.text) === id);
        if (!a) return closeModal();
        if (a.close !== false) closeModal();
      });
    });

    // allow modal content buttons with data-modal to open other modals
    $$('[data-modal]', modalHost).forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        openModal(btn.dataset.modal);
      });
    });
  }

  $$('[data-modal]').forEach(btn => {
    btn.addEventListener('click', () => openModal(btn.dataset.modal));
  });

  const formRow = (label, inputHtml) => `
    <div class="field">
      <label>${escapeHtml(label)}</label>
      ${inputHtml}
    </div>
  `;

  const MODALS = {
    gateTools: {
      title: 'Gate · Herramientas',
      subtitle: 'Gestión de usuarios y bases locales (UI)',
      body: `
        <div class="btn-row">
          <button class="btn btn-warn">Eliminar usuarios (este dispositivo)</button>
          <button class="btn btn-ghost">Reparar/Recrear DB</button>
          <button class="btn btn-ghost">Importar base cifrada</button>
          <button class="btn btn-ghost">Exportar base cifrada</button>
        </div>
        <div class="note">Fase 1: solo diseño. Futuro: IndexedDB + cifrado por contraseña.</div>
      `,
      actions: [{ text: 'Cerrar', kind: 'btn btn-ghost', close: true }]
    },

    help: {
      title: 'Ayuda',
      subtitle: 'Atajos y guía rápida (UI)',
      body: `
        <ul class="note">
          <li>Menú: botón ☰ (móvil).</li>
          <li>ESC: cierra modals.</li>
          <li>Las acciones no guardan datos en esta fase.</li>
        </ul>
      `,
      actions: [{ text: 'Entendido', kind: 'btn btn-primary', close: true }]
    },

    toastSave: {
      title: 'Guardar (UI)',
      subtitle: 'Simulación',
      body: `<div class="note">Acción de guardar simulada. En fase 2 se conectará a IndexedDB y modelos.</div>`,
      actions: [{ text: 'OK', kind: 'btn btn-primary', close: true }]
    },

    // Dashboard
    dashFilters: {
      title: 'Dashboard · Filtros',
      subtitle: 'Año/Mes/Periodo/Moneda (UI)',
      body: `
        <div class="grid2 gap">
          ${formRow('Año', `<select><option>2026</option><option>2025</option></select>`)}
          ${formRow('Mes', `<select><option value="">(Todos)</option><option>Enero</option><option>Febrero</option></select>`)}
          ${formRow('Periodo contable (YYYY-MM)', `<input placeholder="2026-02" />`)}
          ${formRow('Moneda', `<select><option>CRC</option><option>USD</option></select>`)}
        </div>
        <div class="note">En fase 2: coherencia Año↔Mes y auto-aplicación.</div>
      `,
      actions: [
        { text: 'Cancelar', kind: 'btn btn-ghost' },
        { text: 'Aplicar', kind: 'btn btn-primary' }
      ]
    },
    dashQuickAdd: {
      title: 'Dashboard · Agregar rápido',
      subtitle: 'Accesos directos (UI)',
      body: `
        <div class="btn-row">
          <button class="btn btn-primary" data-modal="movCreate">Nuevo movimiento</button>
          <button class="btn btn-primary" data-modal="savCreate">Nuevo ahorro</button>
          <button class="btn btn-primary" data-modal="budCreate">Nuevo presupuesto</button>
        </div>
        <div class="note">En fase 1 estos botones solo abren modals.</div>
      `,
      actions: [{ text: 'Cerrar', kind: 'btn btn-ghost' }]
    },
    dashAccounts: {
      title: 'Dashboard · Detalle por cuenta',
      subtitle: 'Tabla ampliada (UI)',
      body: `
        <div class="table-wrap">
          <table class="table" style="min-width:760px">
            <thead><tr><th>Cuenta</th><th>Tipo</th><th class="right">Saldo</th><th>Moneda</th><th>Activa</th></tr></thead>
            <tbody>
              <tr><td>Banco · Principal</td><td>Banco</td><td class="right">₡ 0.00</td><td>CRC</td><td><span class="tag ok">Sí</span></td></tr>
              <tr><td>Ahorro · CRC</td><td>Ahorros</td><td class="right">₡ 0.00</td><td>CRC</td><td><span class="tag ok">Sí</span></td></tr>
            </tbody>
          </table>
        </div>
      `,
      actions: [{ text: 'Cerrar', kind: 'btn btn-primary' }]
    },

    // Movements
    movFilters: {
      title: 'Movimientos · Filtros',
      subtitle: 'Año/Mes/Periodo/Tipo/Cuenta/Categoría/Texto/Moneda (UI)',
      body: `
        <div class="grid2 gap">
          ${formRow('Año', `<select><option>2026</option><option>2025</option></select>`)}
          ${formRow('Mes', `<select><option value="">(Todos)</option><option>Enero</option><option>Febrero</option></select>`)}
          ${formRow('Periodo contable (YYYY-MM)', `<input placeholder="2026-02" />`)}
          ${formRow('Tipo', `<select><option>(Todos)</option><option>Gasto</option><option>Ingreso</option><option>Transferencia</option></select>`)}
          ${formRow('Cuenta', `<select><option>(Todas)</option><option>Banco · Principal</option><option>Tarjeta · Visa</option></select>`)}
          ${formRow('Categoría', `<select><option>(Todas)</option><option>Alimentación</option><option>Servicios</option></select>`)}
          ${formRow('Texto (q)', `<input placeholder="buscar en descripción/cuenta/categoría" />`)}
          ${formRow('Moneda', `<select><option>(Todas)</option><option>CRC</option><option>USD</option></select>`)}
        </div>
      `,
      actions: [{ text: 'Limpiar', kind: 'btn btn-ghost' }, { text: 'Aplicar', kind: 'btn btn-primary' }]
    },
    movGroup: {
      title: 'Movimientos · Agrupar',
      subtitle: 'Periodo / Cuentas / Categorías (UI)',
      body: `
        <div class="form">
          ${formRow('Agrupar por', `
            <select>
              <option>Periodo</option>
              <option>Cuentas</option>
              <option>Categorías</option>
              <option>Periodo + Categorías</option>
            </select>
          `)}
          ${formRow('Modo', `<select><option>Resumen</option><option>Detalle</option></select>`)}
        </div>
        <div class="note">En fase 2: agregación real sobre movimientos.</div>
      `,
      actions: [{ text: 'Cancelar', kind: 'btn btn-ghost' }, { text: 'Aplicar', kind: 'btn btn-primary' }]
    },
    movRecurringGen: {
      title: 'Movimientos · Generar por mes',
      subtitle: 'Aplicar recurrentes al periodo (UI)',
      body: `
        <div class="grid2 gap">
          ${formRow('Periodo destino (YYYY-MM)', `<input placeholder="2026-02" />`)}
          ${formRow('Simular', `<select><option>No</option><option>Sí</option></select>`)}
        </div>
        <div class="note">En fase 2: creará movimientos desde plantillas recurrentes.</div>
      `,
      actions: [{ text: 'Cancelar', kind: 'btn btn-ghost' }, { text: 'Generar', kind: 'btn btn-primary' }]
    },
    movImport: {
      title: 'Movimientos · Importar',
      subtitle: 'CSV/JSON (UI)',
      body: `
        <div class="form">
          ${formRow('Archivo', `<input type="file" />`)}
          ${formRow('Formato', `<select><option>CSV</option><option>JSON</option></select>`)}
        </div>
      `,
      actions: [{ text: 'Cancelar', kind: 'btn btn-ghost' }, { text: 'Importar', kind: 'btn btn-primary' }]
    },
    movExport: {
      title: 'Movimientos · Exportar',
      subtitle: 'CSV/JSON (UI)',
      body: `
        <div class="form">
          ${formRow('Formato', `<select><option>CSV</option><option>JSON</option></select>`)}
          ${formRow('Rango', `<select><option>Según filtros</option><option>Todo</option></select>`)}
        </div>
      `,
      actions: [{ text: 'Cerrar', kind: 'btn btn-ghost' }, { text: 'Exportar', kind: 'btn btn-primary' }]
    },
    movCreate: movementForm('Nuevo movimiento'),
    movEdit: movementForm('Editar movimiento'),
    movDelete: confirmForm('Eliminar movimiento', 'Esto eliminará el movimiento (y cualquier relación asociada en fases futuras).'),
    movRecurring: movementRecurringForm(),

    // Savings
    savFilters: {
      title: 'Ahorros · Filtros',
      subtitle: 'Año/Mes/Periodo/Tipo/Cuenta/Categoría/Meta/Texto (UI)',
      body: `
        <div class="grid2 gap">
          ${formRow('Año', `<select><option>2026</option><option>2025</option></select>`)}
          ${formRow('Mes', `<select><option value="">(Todos)</option><option>Enero</option><option>Febrero</option></select>`)}
          ${formRow('Periodo (YYYY-MM)', `<input placeholder="2026-02" />`)}
          ${formRow('Tipo', `<select><option>(Todos)</option><option>Depósito</option><option>Retiro</option></select>`)}
          ${formRow('Cuenta', `<select><option>(Todas)</option><option>Banco · Principal</option><option>Ahorro · CRC</option></select>`)}
          ${formRow('Categoría', `<select><option>(Todas)</option><option>Alimentación</option><option>Servicios</option></select>`)}
          ${formRow('Meta', `<select><option>(Todas)</option><option>Meta · Viaje</option><option>Meta · Fondo emergencia</option></select>`)}
          ${formRow('Texto (q)', `<input placeholder="buscar en descripción" />`)}
        </div>
      `,
      actions: [{ text: 'Limpiar', kind: 'btn btn-ghost' }, { text: 'Aplicar', kind: 'btn btn-primary' }]
    },
    savCreate: savingsForm('Nuevo ahorro'),
    savEdit: savingsForm('Editar ahorro'),
    savWithdraw: confirmForm('Retirar ahorro', 'Se registrará un retiro asociado al depósito (UI).'),
    savDelete: confirmForm('Eliminar ahorro', 'Eliminar afectará saldos en fases futuras (UI).'),
    savExport: {
      title: 'Ahorros · Exportar',
      subtitle: 'CSV (UI)',
      body: `${formRow('Formato', `<select><option>CSV</option><option>JSON</option></select>`)}<div class="note">UI solamente.</div>`,
      actions: [{ text: 'Cerrar', kind: 'btn btn-ghost' }, { text: 'Exportar', kind: 'btn btn-primary' }]
    },

    // Goals
    goalList: {
      title: 'Metas de ahorro',
      subtitle: 'Listado + acciones (UI)',
      body: `
        <div class="panel" style="box-shadow:none">
          <div class="panel-head">
            <h3>Metas</h3>
            <button class="btn btn-primary" data-modal="goalCreate">Nueva meta</button>
          </div>
          <div class="table-wrap">
            <table class="table" style="min-width:760px">
              <thead><tr><th>Nombre</th><th>Moneda</th><th class="right">Meta</th><th class="right">Progreso</th><th>Activa</th><th class="right">Acciones</th></tr></thead>
              <tbody>
                <tr>
                  <td>Meta · Viaje</td><td>USD</td><td class="right">0.00</td><td class="right">0.00</td>
                  <td><span class="tag ok">Sí</span></td>
                  <td class="right">
                    <button class="mini" data-modal="goalEdit">Editar</button>
                    <button class="mini" data-modal="goalDelete">Eliminar</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      `,
      actions: [{ text: 'Cerrar', kind: 'btn btn-ghost' }]
    },
    goalCreate: goalForm('Nueva meta'),
    goalEdit: goalForm('Editar meta'),
    goalDelete: confirmForm('Eliminar meta', 'Si hay ahorros asociados, en fase 2 se validará “en uso”.'),

    // Budgets
    budFilters: {
      title: 'Presupuestos · Filtros',
      subtitle: 'Periodo/Tipo/Categoría/Moneda/Texto (UI)',
      body: `
        <div class="grid2 gap">
          ${formRow('Periodo (YYYY-MM)', `<input placeholder="2026-02" />`)}
          ${formRow('Tipo', `<select><option>(Todos)</option><option>Gasto</option><option>Ingreso</option></select>`)}
          ${formRow('Categoría', `<select><option>(Todas)</option><option>Alimentación</option><option>Servicios</option></select>`)}
          ${formRow('Moneda', `<select><option>(Todas)</option><option>CRC</option><option>USD</option></select>`)}
          ${formRow('Texto (q)', `<input placeholder="buscar..." />`)}
        </div>
      `,
      actions: [{ text: 'Limpiar', kind: 'btn btn-ghost' }, { text: 'Aplicar', kind: 'btn btn-primary' }]
    },
    budRecurring: {
      title: 'Presupuesto recurrente mensual',
      subtitle: 'Fallback si no hay presupuesto específico (UI)',
      body: `
        <div class="form">
          ${formRow('Habilitado', `<select><option>Sí</option><option>No</option></select>`)}
          ${formRow('Aplicar a', `<select><option>Gastos</option><option>Ingresos</option><option>Ambos</option></select>`)}
          ${formRow('Nota', `<textarea placeholder="Descripción del presupuesto recurrente..."></textarea>`)}
        </div>
      `,
      actions: [{ text: 'Cancelar', kind: 'btn btn-ghost' }, { text: 'Guardar', kind: 'btn btn-primary' }]
    },
    budCreate: budgetForm('Nuevo presupuesto'),
    budEdit: budgetForm('Editar presupuesto'),
    budDelete: confirmForm('Eliminar presupuesto', 'Se eliminará el registro (UI).'),
    budExport: {
      title: 'Presupuestos · Exportar',
      subtitle: 'CSV/JSON (UI)',
      body: `
        <div class="form">
          ${formRow('Formato', `<select><option>CSV</option><option>JSON</option></select>`)}
          ${formRow('Rango', `<select><option>Según filtros</option><option>Todo</option></select>`)}
        </div>
      `,
      actions: [{ text: 'Cerrar', kind: 'btn btn-ghost' }, { text: 'Exportar', kind: 'btn btn-primary' }]
    },

    // Reconciliations
    recFilters: {
      title: 'Conciliaciones · Filtros',
      subtitle: 'Cuenta/Año/Mes/Periodo/Estado (UI)',
      body: `
        <div class="grid2 gap">
          ${formRow('Cuenta', `<select><option>(Todas)</option><option>Banco · Principal</option><option>Tarjeta · Visa</option></select>`)}
          ${formRow('Año', `<select><option>2026</option><option>2025</option></select>`)}
          ${formRow('Mes', `<select><option value="">(Todos)</option><option>Enero</option><option>Febrero</option></select>`)}
          ${formRow('Periodo (YYYY-MM)', `<input placeholder="2026-02" />`)}
          ${formRow('Estado', `<select><option>(Todos)</option><option>Abierta</option><option>Cerrada</option></select>`)}
        </div>
      `,
      actions: [{ text: 'Limpiar', kind: 'btn btn-ghost' }, { text: 'Aplicar', kind: 'btn btn-primary' }]
    },
    recCreate: {
      title: 'Nueva conciliación',
      subtitle: 'Cuenta + Periodo + Saldos (UI)',
      body: `
        <div class="grid2 gap">
          ${formRow('Cuenta', `<select><option>Banco · Principal</option><option>Tarjeta · Visa</option></select>`)}
          ${formRow('Periodo (YYYY-MM)', `<input placeholder="2026-02" />`)}
          ${formRow('Saldo final banco', `<input type="number" step="0.01" placeholder="0.00" />`)}
          ${formRow('Saldo final SGF (calculado)', `<input placeholder="(auto)" disabled />`)}
        </div>
        <div class="note">En fase 2: detalle de movimientos del mes y marcas conciliadas.</div>
      `,
      actions: [{ text: 'Cancelar', kind: 'btn btn-ghost' }, { text: 'Crear', kind: 'btn btn-primary' }]
    },
    recExport: {
      title: 'Conciliaciones · Export CSV',
      subtitle: 'UI',
      body: `${formRow('Incluir', `<select><option>Resumen</option><option>Detalle</option><option>Ambos</option></select>`)}<div class="note">UI solamente.</div>`,
      actions: [{ text: 'Cerrar', kind: 'btn btn-ghost' }, { text: 'Exportar', kind: 'btn btn-primary' }]
    },
    recDetail: {
      title: 'Conciliación · Detalle',
      subtitle: 'Movimientos del mes con marca OK (UI)',
      body: `
        <div class="grid2 gap">
          <div class="panel" style="box-shadow:none">
            <div class="panel-head"><h3>Resumen</h3></div>
            <div class="form">
              ${formRow('Final banco', `<input placeholder="0.00" />`)}
              ${formRow('Final SGF', `<input placeholder="0.00" disabled />`)}
              ${formRow('Diferencia', `<input placeholder="0.00" disabled />`)}
              ${formRow('Estado', `<select><option>Abierta</option><option>Cerrada</option></select>`)}
            </div>
          </div>

          <div class="panel" style="box-shadow:none">
            <div class="panel-head"><h3>Movimientos</h3></div>
            <div class="table-wrap">
              <table class="table" style="min-width:760px">
                <thead><tr><th>OK</th><th>Fecha</th><th>Descripción</th><th class="right">Monto</th><th>Tipo</th></tr></thead>
                <tbody>
                  <tr><td><input type="checkbox" /></td><td>—</td><td>—</td><td class="right">0.00</td><td>Gasto</td></tr>
                  <tr><td><input type="checkbox" /></td><td>—</td><td>—</td><td class="right">0.00</td><td>Ingreso</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `,
      actions: [{ text: 'Cerrar', kind: 'btn btn-ghost' }, { text: 'Guardar', kind: 'btn btn-primary' }]
    },
    recClose: confirmForm('Cerrar conciliación', 'En fase 2: “closed=true” restringirá cambios.'),
    recReopen: confirmForm('Reabrir conciliación', 'En fase 2: volverá a permitir edición.'),

    // Catalogs
    catAccountTypes: {
      title: 'Tipos de Cuenta',
      subtitle: 'Catálogo base (UI)',
      body: `
        <div class="panel" style="box-shadow:none">
          <div class="panel-head">
            <h3>Listado</h3>
            <button class="btn btn-primary" data-modal="acctTypeCreate">Nuevo tipo</button>
          </div>
          <div class="table-wrap">
            <table class="table" style="min-width:760px">
              <thead><tr><th>Nombre</th><th>Base</th><th>En uso</th><th class="right">Acciones</th></tr></thead>
              <tbody>
                <tr><td>Banco</td><td><span class="tag ok">Sí</span></td><td>Sí</td><td class="right">
                  <button class="mini" data-modal="acctTypeEdit">Editar</button>
                  <button class="mini" data-modal="acctTypeDelete">Eliminar</button>
                </td></tr>
              </tbody>
            </table>
          </div>
        </div>
        <div class="note">En fase 2: no eliminar base o en uso.</div>
      `,
      actions: [{ text: 'Cerrar', kind: 'btn btn-ghost' }]
    },
    acctTypeCreate: acctTypeForm('Nuevo tipo de cuenta'),
    acctTypeEdit: acctTypeForm('Editar tipo de cuenta'),
    acctTypeDelete: confirmForm('Eliminar tipo de cuenta', 'En fase 2 se validará: no eliminar base o en uso.'),

    catCreateAny: {
      title: 'Catálogos · Crear',
      subtitle: 'Selecciona qué deseas crear (UI)',
      body: `
        <div class="btn-row">
          <button class="btn btn-primary" data-modal="accCreate">Cuenta</button>
          <button class="btn btn-primary" data-modal="catCreate">Categoría</button>
          <button class="btn btn-primary" data-modal="acctTypeCreate">Tipo de cuenta</button>
        </div>
      `,
      actions: [{ text: 'Cerrar', kind: 'btn btn-ghost' }]
    },

    accCreate: accountForm('Nueva cuenta'),
    accEdit: accountForm('Editar cuenta'),
    accDisable: confirmForm('Deshabilitar cuenta', 'En fase 2: validar “en uso” y restricciones.'),

    catCreate: categoryForm('Nueva categoría'),
    catEdit: categoryForm('Editar categoría'),
    catDisable: confirmForm('Deshabilitar categoría', 'En fase 2: validar “en uso”.'),

    // Settings
    cfgSave: {
      title: 'Configuración · Guardar',
      subtitle: 'UI',
      body: `<div class="note">Cambios guardados (simulado). En fase 2: persistencia en IndexedDB.</div>`,
      actions: [{ text: 'OK', kind: 'btn btn-primary' }]
    },
    cfgBackup: {
      title: 'Auto-backup',
      subtitle: 'Parámetros (UI)',
      body: `
        <div class="grid2 gap">
          ${formRow('Habilitado', `<select><option>Sí</option><option>No</option></select>`)}
          ${formRow('Frecuencia', `<select><option>Diario</option><option>Semanal</option><option>Mensual</option></select>`)}
          ${formRow('Retención (copias)', `<input type="number" min="1" step="1" placeholder="7" />`)}
          ${formRow('Incluir adjuntos', `<select><option>Sí</option><option>No</option></select>`)}
        </div>
      `,
      actions: [{ text: 'Cancelar', kind: 'btn btn-ghost' }, { text: 'Guardar', kind: 'btn btn-primary' }]
    },
    cfgImport: {
      title: 'Importar',
      subtitle: 'Base cifrada / JSON / CSV (UI)',
      body: `
        <div class="form">
          ${formRow('Archivo', `<input type="file" />`)}
          ${formRow('Tipo', `<select><option>Base cifrada</option><option>JSON</option><option>CSV</option></select>`)}
        </div>
      `,
      actions: [{ text: 'Cancelar', kind: 'btn btn-ghost' }, { text: 'Importar', kind: 'btn btn-primary' }]
    },
    cfgExport: {
      title: 'Exportar',
      subtitle: 'Base cifrada / JSON / CSV (UI)',
      body: `
        <div class="form">
          ${formRow('Tipo', `<select><option>Base cifrada</option><option>JSON</option><option>CSV</option></select>`)}
          ${formRow('Incluir', `<select><option>Todo</option><option>Según módulo</option></select>`)}
        </div>
      `,
      actions: [{ text: 'Cerrar', kind: 'btn btn-ghost' }, { text: 'Exportar', kind: 'btn btn-primary' }]
    },
    cfgLoadBase: confirmForm('Cargar estructura base', 'En fase 2: crea catálogos base (cuentas/categorías/tipos).'),
    cfgLoadDemo: confirmForm('Cargar demo', 'En fase 2: carga datos de ejemplo (ingresos/gastos/ahorros/etc).'),
    cfgReset: confirmForm('Reset completo', 'En fase 2: borra toda la base local (confirmación fuerte).'),
    cfgDiagnose: {
      title: 'Diagnosticar y reparar',
      subtitle: 'UI',
      body: `
        <div class="note">
          En fase 2: revisará integridad, reparará índices, reconstruirá si aplica.
        </div>
        <div class="btn-row">
          <button class="btn btn-ghost">Ejecutar diagnóstico</button>
          <button class="btn btn-warn">Reparar</button>
        </div>
      `,
      actions: [{ text: 'Cerrar', kind: 'btn btn-ghost' }]
    },
  };

  function movementForm(title) {
    return {
      title,
      subtitle: 'Gasto / Ingreso / Transferencia (UI)',
      body: `
        <div class="grid2 gap">
          ${formRow('Tipo', `<select><option>Gasto</option><option>Ingreso</option><option>Transferencia</option></select>`)}
          ${formRow('Fecha', `<input type="date" />`)}
          ${formRow('Periodo contable (YYYY-MM)', `<input placeholder="2026-02" />`)}
          ${formRow('Moneda', `<select><option>CRC</option><option>USD</option></select>`)}
          ${formRow('Cuenta origen', `<select><option>Banco · Principal</option><option>Tarjeta · Visa</option></select>`)}
          ${formRow('Cuenta destino (solo transferencia)', `<select><option>(N/A)</option><option>Ahorro · CRC</option></select>`)}
          ${formRow('Categoría (opcional)', `<select><option>(Sin categoría)</option><option>Alimentación</option><option>Servicios</option></select>`)}
          ${formRow('Monto', `<input type="number" step="0.01" placeholder="0.00" />`)}
          ${formRow('Tipo de cambio (si aplica)', `<input type="number" step="0.01" placeholder="0.00" />`)}
          ${formRow('Descripción', `<input placeholder="detalle..." />`)}
          ${formRow('Adjuntos (UI)', `<input type="file" multiple />`)}
        </div>

        <div class="note">
          Reglas (fase 2): 2 decimales, transferencia requiere origen+destino, periodo coherente.
        </div>
      `,
      actions: [
        { text: 'Cancelar', kind: 'btn btn-ghost' },
        { text: 'Guardar', kind: 'btn btn-primary' }
      ]
    };
  }

  function movementRecurringForm() {
    return {
      title: 'Movimiento recurrente',
      subtitle: 'Plantilla recurrente + generación mensual (UI)',
      body: `
        <div class="grid2 gap">
          ${formRow('Nombre', `<input placeholder="Ej: Internet" />`)}
          ${formRow('Tipo', `<select><option>Gasto</option><option>Ingreso</option><option>Transferencia</option></select>`)}
          ${formRow('Día del mes', `<input type="number" min="1" max="31" step="1" placeholder="1" />`)}
          ${formRow('Cuenta origen', `<select><option>Banco · Principal</option><option>Tarjeta · Visa</option></select>`)}
          ${formRow('Cuenta destino (si transferencia)', `<select><option>(N/A)</option><option>Ahorro · CRC</option></select>`)}
          ${formRow('Categoría', `<select><option>(Sin categoría)</option><option>Servicios</option></select>`)}
          ${formRow('Monto', `<input type="number" step="0.01" placeholder="0.00" />`)}
          ${formRow('Moneda', `<select><option>CRC</option><option>USD</option></select>`)}
          ${formRow('Activo', `<select><option>Sí</option><option>No</option></select>`)}
          ${formRow('Notas', `<textarea placeholder="opcional..."></textarea>`)}
        </div>
      `,
      actions: [
        { text: 'Cancelar', kind: 'btn btn-ghost' },
        { text: 'Guardar', kind: 'btn btn-primary' }
      ]
    };
  }

  function savingsForm(title) {
    return {
      title,
      subtitle: 'Depósito / Retiro (UI)',
      body: `
        <div class="grid2 gap">
          ${formRow('Tipo', `<select><option>Depósito</option><option>Retiro</option></select>`)}
          ${formRow('Fecha', `<input type="date" />`)}
          ${formRow('Periodo (YYYY-MM)', `<input placeholder="2026-02" />`)}
          ${formRow('Cuenta origen', `<select><option>Banco · Principal</option><option>Ahorro · CRC</option></select>`)}
          ${formRow('Cuenta destino (predeterminada)', `<select><option>Ahorro · CRC</option><option>Ahorro · USD</option></select>`)}
          ${formRow('Categoría (opcional)', `<select><option>(Sin categoría)</option><option>Servicios</option></select>`)}
          ${formRow('Meta (opcional)', `<select><option>(Sin meta)</option><option>Meta · Viaje</option></select>`)}
          ${formRow('Monto', `<input type="number" step="0.01" placeholder="0.00" />`)}
          ${formRow('Descripción', `<input placeholder="detalle..." />`)}
        </div>
        <div class="note">En fase 2: validación saldo suficiente y retiros limitados al disponible.</div>
      `,
      actions: [{ text: 'Cancelar', kind: 'btn btn-ghost' }, { text: 'Guardar', kind: 'btn btn-primary' }]
    };
  }

  function goalForm(title) {
    return {
      title,
      subtitle: 'Planificación por moneda + progreso (UI)',
      body: `
        <div class="grid2 gap">
          ${formRow('Nombre', `<input placeholder="Meta · Fondo emergencia" />`)}
          ${formRow('Moneda', `<select><option>CRC</option><option>USD</option></select>`)}
          ${formRow('Monto meta', `<input type="number" step="0.01" placeholder="0.00" />`)}
          ${formRow('Activa', `<select><option>Sí</option><option>No</option></select>`)}
        </div>
      `,
      actions: [{ text: 'Cancelar', kind: 'btn btn-ghost' }, { text: 'Guardar', kind: 'btn btn-primary' }]
    };
  }

  function budgetForm(title) {
    return {
      title,
      subtitle: 'Por periodo + categoría + tipo (UI)',
      body: `
        <div class="grid2 gap">
          ${formRow('Periodo (YYYY-MM)', `<input placeholder="2026-02" />`)}
          ${formRow('Tipo', `<select><option>Gasto</option><option>Ingreso</option></select>`)}
          ${formRow('Categoría', `<select><option>Alimentación</option><option>Servicios</option></select>`)}
          ${formRow('Moneda', `<select><option>CRC</option><option>USD</option></select>`)}
          ${formRow('Monto presupuestado', `<input type="number" step="0.01" placeholder="0.00" />`)}
          ${formRow('Recurrente', `<select><option>No</option><option>Sí</option></select>`)}
          ${formRow('Activo', `<select><option>Sí</option><option>No</option></select>`)}
          ${formRow('Notas', `<textarea placeholder="opcional..."></textarea>`)}
        </div>
      `,
      actions: [{ text: 'Cancelar', kind: 'btn btn-ghost' }, { text: 'Guardar', kind: 'btn btn-primary' }]
    };
  }

  function accountForm(title) {
    return {
      title,
      subtitle: 'Cuentas multinivel + moneda + reglas (UI)',
      body: `
        <div class="grid2 gap">
          ${formRow('Nombre', `<input placeholder="Banco · Principal" />`)}
          ${formRow('Tipo de cuenta', `<select><option>Banco</option><option>Tarjeta</option><option>Ahorros</option></select>`)}
          ${formRow('Cuenta padre (nullable)', `<select><option>(Sin padre)</option><option>Banco</option></select>`)}
          ${formRow('Moneda', `<select><option>CRC</option><option>USD</option></select>`)}
          ${formRow('Color', `<input type="color" value="#2f6bff" />`)}
          ${formRow('Activa', `<select><option>Sí</option><option>No</option></select>`)}
          ${formRow('Permite saldo negativo', `<select><option>No</option><option>Sí</option></select>`)}
          ${formRow('Saldo inicial (referencial)', `<input type="number" step="0.01" placeholder="0.00" />`)}
        </div>
        <div class="note">En fase 2: no permitir eliminar “en uso”; treeview hasta 3 niveles.</div>
      `,
      actions: [{ text: 'Cancelar', kind: 'btn btn-ghost' }, { text: 'Guardar', kind: 'btn btn-primary' }]
    };
  }

  function categoryForm(title) {
    return {
      title,
      subtitle: 'Categorías multinivel (UI)',
      body: `
        <div class="grid2 gap">
          ${formRow('Nombre', `<input placeholder="Alimentación" />`)}
          ${formRow('Categoría padre (nullable)', `<select><option>(Sin padre)</option><option>Gastos</option></select>`)}
          ${formRow('Color', `<input type="color" value="#ff8b3d" />`)}
          ${formRow('Activa', `<select><option>Sí</option><option>No</option></select>`)}
        </div>
        <div class="note">En fase 2: no permitir eliminar “en uso”; treeview hasta 3 niveles.</div>
      `,
      actions: [{ text: 'Cancelar', kind: 'btn btn-ghost' }, { text: 'Guardar', kind: 'btn btn-primary' }]
    };
  }

  function acctTypeForm(title) {
    return {
      title,
      subtitle: 'Catálogo base de tipos de cuenta (UI)',
      body: `
        <div class="grid2 gap">
          ${formRow('Nombre', `<input placeholder="Banco" />`)}
          ${formRow('Es base', `<select><option>Sí</option><option>No</option></select>`)}
        </div>
      `,
      actions: [{ text: 'Cancelar', kind: 'btn btn-ghost' }, { text: 'Guardar', kind: 'btn btn-primary' }]
    };
  }

  function confirmForm(title, message) {
    return {
      title,
      subtitle: 'Confirmación',
      body: `<div class="note">${escapeHtml(message)}</div>`,
      actions: [
        { text: 'Cancelar', kind: 'btn btn-ghost' },
        { text: 'Confirmar', kind: 'btn btn-danger' }
      ]
    };
  }

  function escapeHtml(s) {
    return String(s)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  setTheme(app.dataset.theme || 'finpro');
  setActiveView('dashboard');
})();
