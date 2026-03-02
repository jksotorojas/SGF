function filterTable(inputId, tableBodyId) {
  const q = (document.getElementById(inputId)?.value || '').toLowerCase();
  document.querySelectorAll(`#${tableBodyId} tr`).forEach(row => {
    row.style.display = row.innerText.toLowerCase().includes(q) ? '' : 'none';
  });
}

window.filterTable = filterTable;


function sgfMakeTableCardResponsive(tableEl){
  if (!tableEl) return;
  const thead = tableEl.querySelector('thead');
  const tbody = tableEl.querySelector('tbody');
  if (!thead || !tbody) return;

  // Construir headers respetando colspan (primer row del thead)
  const headerRow = thead.querySelector('tr');
  const ths = headerRow ? Array.from(headerRow.querySelectorAll('th')) : Array.from(thead.querySelectorAll('th'));
  const headers = [];
  ths.forEach(th=>{
    const txt = (th.textContent || '').trim();
    const cs = Number(th.getAttribute('colspan') || 1);
    for(let i=0;i<cs;i++) headers.push(txt);
  });

  Array.from(tbody.querySelectorAll('tr')).forEach(tr => {
    const tds = Array.from(tr.children).filter(el => el.tagName === 'TD');
    tds.forEach((td, idx) => {
      const raw = headers[idx];
      const label = (raw === undefined) ? '' : String(raw || '').trim();
      td.setAttribute('data-label', label);
    });
  });
}

window.sgfMakeTableCardResponsive = sgfMakeTableCardResponsive;


// Vincula la tabla para modo "cards" en móvil y re-aplica etiquetas al cambiar filas
(function(){
  const _obs = new WeakMap();

  function sgfBindResponsiveTable(tableEl){
    if (!tableEl) return;
    // aplicar ahora
    try { window.sgfMakeTableCardResponsive?.(tableEl); } catch(_) {}

    const tbody = tableEl.querySelector('tbody');
    if (!tbody) return;

    if (_obs.has(tableEl)) return; // ya está vinculada

    const mo = new MutationObserver(() => {
      try { window.sgfMakeTableCardResponsive?.(tableEl); } catch(_) {}
    });

    mo.observe(tbody, { childList: true, subtree: true });
    _obs.set(tableEl, mo);
  }

  window.sgfBindResponsiveTable = sgfBindResponsiveTable;
})();

