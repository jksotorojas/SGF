/* SGF UI - Fase 1: solo interacción visual (sin IndexedDB real) */

(function () {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const gate = $("#gate");
  const app = $("#app");
  const uiUser = $("#uiUser");
  const pageTitle = $("#pageTitle");
  const pageSubtitle = $("#pageSubtitle");
  const sidebar = $(".sidebar");

  const overlay = $("#modalOverlay");

  const routeMeta = {
    dashboard: { title: "Dashboard", subtitle: "Resumen general" },
    movimientos: { title: "Movimientos", subtitle: "Transacciones, recurrentes y filtros" },
    ahorros: { title: "Ahorros", subtitle: "Depósitos, retiros y metas" },
    presupuestos: { title: "Presupuestos", subtitle: "Plan vs real y recurrente mensual" },
    conciliaciones: { title: "Conciliaciones", subtitle: "Conciliación bancaria por cuenta y mes" },
    "cat-cuentas": { title: "Catálogo: Cuentas", subtitle: "Jerarquía, moneda y reglas" },
    "cat-tipos": { title: "Catálogo: Tipos de cuenta", subtitle: "Tipos base y personalizados" },
    "cat-categorias": { title: "Catálogo: Categorías", subtitle: "Jerarquía y clasificación" },
    configuracion: { title: "Configuración", subtitle: "Preferencias y utilidades" },
  };

  function showApp() {
    const user = ($("#gUser")?.value || "demo").trim();
    uiUser.textContent = user || "demo";

    gate.classList.add("hidden");
    app.classList.remove("hidden");
    navigate("dashboard");
  }

  function logout() {
    // UI only
    closeAllModals();
    app.classList.add("hidden");
    gate.classList.remove("hidden");
  }

  function navigate(route) {
    // nav active
    $$(".nav-item").forEach(btn => btn.classList.toggle("active", btn.dataset.route === route));

    // view show/hide
    $$("[data-route-view]").forEach(view => {
      view.classList.toggle("hidden", view.dataset.routeView !== route);
    });

    // title
    const meta = routeMeta[route] || { title: "SGF", subtitle: "" };
    pageTitle.textContent = meta.title;
    pageSubtitle.textContent = meta.subtitle;

    // mobile: hide sidebar after navigation
    if (window.matchMedia("(max-width: 980px)").matches) {
      sidebar.classList.add("is-hidden");
    }
  }

  // ------- Modals -------
  function openModal(id) {
    const el = document.getElementById(id);
    if (!el) return;

    overlay.classList.remove("hidden");
    el.classList.remove("hidden");
    overlay.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  function closeModal(el) {
    if (!el) return;
    el.classList.add("hidden");

    // if no visible modals, hide overlay
    const anyOpen = $$(".modal").some(m => !m.classList.contains("hidden"));
    if (!anyOpen) {
      overlay.classList.add("hidden");
      overlay.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
    }
  }

  function closeAllModals() {
    $$(".modal").forEach(m => m.classList.add("hidden"));
    overlay.classList.add("hidden");
    overlay.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  // ------- Theme (UI only) -------
  function setTheme(name) {
    document.body.classList.remove("theme-finpro", "theme-finsoft");
    document.body.classList.add(`theme-${name}`);
  }

  // ------- Events -------
  document.addEventListener("click", (e) => {
    const t = e.target;

    // route navigation
    const navBtn = t.closest("[data-route]");
    if (navBtn) {
      navigate(navBtn.dataset.route);
      return;
    }

    // route jump (buttons inside pages)
    const jump = t.closest("[data-route-jump]");
    if (jump) {
      navigate(jump.dataset.routeJump);
      return;
    }

    // enter app from gate
    if (t.closest('[data-action="enterApp"]')) {
      showApp();
      return;
    }

    // logout
    if (t.closest('[data-action="logout"]')) {
      logout();
      return;
    }

    // sidebar toggle (mobile)
    if (t.closest('[data-action="toggleSidebar"]')) {
      sidebar.classList.toggle("is-hidden");
      return;
    }

    // open modal
    const open = t.closest("[data-modal-open]");
    if (open) {
      openModal(open.dataset.modalOpen);
      return;
    }

    // close modal (button)
    if (t.closest("[data-modal-close]")) {
      const modal = t.closest(".modal");
      closeModal(modal);
      return;
    }

    // overlay click closes topmost modal
    if (t === overlay) {
      const openModals = $$(".modal").filter(m => !m.classList.contains("hidden"));
      const last = openModals[openModals.length - 1];
      closeModal(last);
      return;
    }

    // theme buttons
    const themeBtn = t.closest('[data-action="setTheme"]');
    if (themeBtn) {
      setTheme(themeBtn.dataset.theme);
      return;
    }

    // fake ok (no-op)
    if (t.closest('[data-action="fakeOk"]')) {
      const modal = t.closest(".modal");
      if (modal) closeModal(modal);
      return;
    }
  });

  // ESC closes modals
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      const openModals = $$(".modal").filter(m => !m.classList.contains("hidden"));
      if (openModals.length) closeModal(openModals[openModals.length - 1]);
    }
  });

  // initial mobile sidebar state
  function syncSidebarForMobile() {
    if (window.matchMedia("(max-width: 980px)").matches) {
      sidebar.classList.add("is-hidden");
    } else {
      sidebar.classList.remove("is-hidden");
    }
  }
  window.addEventListener("resize", syncSidebarForMobile);
  syncSidebarForMobile();

  // NOTE Fase 2:
  // - aquí se inicializa IndexedDB, carga usuario, config, catálogos, etc.
})();
