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

  const headers = Array.from(thead.querySelectorAll('th')).map(th => (th.textContent || '').trim());

  Array.from(tbody.querySelectorAll('tr')).forEach(tr => {
    const tds = Array.from(tr.children).filter(el => el.tagName === 'TD');
    tds.forEach((td, idx) => {
      const label = headers[idx] || `Col ${idx+1}`;
      td.setAttribute('data-label', label);
    });
  });
}

window.sgfMakeTableCardResponsive = sgfMakeTableCardResponsive;
