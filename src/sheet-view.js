// This file contains the logic for rendering the sheet view. It creates a stylized table that displays the data fetched from the Google Sheet in a functional and intuitive format. It also includes functionality to toggle between the map view and the sheet view.
let sheetSortKey = 'fullName';
let sheetSortDir = 1;
let sheetFilter = '';
let sheetStateFilterValue = '';

function normalizeCountry(val) {
  if (!val) return '';
  const v = String(val).trim().toUpperCase();
  if (v === 'US' || v === 'USA') return 'United States';
  if (v === 'UK' || v === 'UNITED KINGDOM') return 'United Kingdom';
  return val;
}

function normalizeState(val) {
  if (!val) return '';
  const v = String(val).trim().toUpperCase();
  // Add more as needed
  if (v === 'CA' || v === 'CALIFORNIA') return 'CA';
  if (v === 'NY' || v === 'NEW YORK') return 'NY';
  if (v === 'TX' || v === 'TEXAS') return 'TX';
  if (v === 'FL' || v === 'FLORIDA') return 'FL';
  if (v === 'WA' || v === 'WASHINGTON') return 'WA';
  if (v === 'PA' || v === 'PENNSYLVANIA') return 'PA';
  if (v === 'AZ' || v === 'ARIZONA') return 'AZ';
  if (v === 'GA' || v === 'GEORGIA') return 'GA';
  if (v === 'IL' || v === 'ILLINOIS') return 'IL';
  if (v === 'CO' || v === 'COLORADO') return 'CO';
  if (v === 'NC' || v === 'NORTH CAROLINA') return 'NC';
  if (v === 'TN' || v === 'TENNESSEE') return 'TN';
  if (v === 'MO' || v === 'MISSOURI') return 'MO';
  if (v === 'MI' || v === 'MICHIGAN') return 'MI';
  if (v === 'OR' || v === 'OREGON') return 'OR';
  if (v === 'OK' || v === 'OKLAHOMA') return 'OK';
  if (v === 'MN' || v === 'MINNESOTA') return 'MN';
  if (v === 'NJ' || v === 'NEW JERSEY') return 'NJ';
  if (v === 'CT' || v === 'CONNECTICUT') return 'CT';
  if (v === 'ID' || v === 'IDAHO') return 'ID';
  if (v === 'WI' || v === 'WISCONSIN') return 'WI';
  if (v === 'MD' || v === 'MARYLAND') return 'MD';
  if (v === 'MT' || v === 'MONTANA') return 'MT';
  if (v === 'KY' || v === 'KENTUCKY') return 'KY';
  if (v === 'VA' || v === 'VIRGINIA') return 'VA';
  if (v === 'MA' || v === 'MASSACHUSETTS') return 'MA';
  if (v === 'IA' || v === 'IOWA') return 'IA';
  if (v === 'NV' || v === 'NEVADA') return 'NV';
  if (v === 'AL' || v === 'ALABAMA') return 'AL';
  if (v === 'LA' || v === 'LOUISIANA') return 'LA';
  if (v === 'IN' || v === 'INDIANA') return 'IN';
  if (v === 'OH' || v === 'OHIO') return 'OH';
  if (v === 'SC' || v === 'SOUTH CAROLINA') return 'SC';
  if (v === 'UT' || v === 'UTAH') return 'UT';
  if (v === 'NM' || v === 'NEW MEXICO') return 'NM';
  if (v === 'AR' || v === 'ARKANSAS') return 'AR';
  if (v === 'KS' || v === 'KANSAS') return 'KS';
  if (v === 'MS' || v === 'MISSISSIPPI') return 'MS';
  if (v === 'NE' || v === 'NEBRASKA') return 'NE';
  if (v === 'NH' || v === 'NEW HAMPSHIRE') return 'NH';
  if (v === 'WV' || v === 'WEST VIRGINIA') return 'WV';
  if (v === 'DE' || v === 'DELAWARE') return 'DE';
  if (v === 'ME' || v === 'MAINE') return 'ME';
  if (v === 'RI' || v === 'RHODE ISLAND') return 'RI';
  if (v === 'DC' || v === 'DISTRICT OF COLUMBIA') return 'DC';
  if (v === 'VT' || v === 'VERMONT') return 'VT';
  if (v === 'SD' || v === 'SOUTH DAKOTA') return 'SD';
  if (v === 'ND' || v === 'NORTH DAKOTA') return 'ND';
  if (v === 'AK' || v === 'ALASKA') return 'AK';
  if (v === 'HI' || v === 'HAWAII') return 'HI';
  return val;
}

window.renderSheetView = function(selectedName) {
  const sheet = document.getElementById('sheet-view');
  if (!window.contacts || !contacts.length) {
    sheet.innerHTML = '<div style="padding:40px;text-align:center;color:var(--muted);font-size:1.2em;">No data loaded yet.</div>';
    return;
  }

  // Add a container for the mini map popup
  if (!document.getElementById('mini-map-popup')) {
    const miniMapDiv = document.createElement('div');
    miniMapDiv.id = 'mini-map-popup';
    miniMapDiv.style.position = 'fixed';
    miniMapDiv.style.bottom = '24px';
    miniMapDiv.style.right = '24px';
    miniMapDiv.style.width = '340px';
    miniMapDiv.style.height = '240px';
    miniMapDiv.style.background = '#fff';
    miniMapDiv.style.border = '1.5px solid var(--border, #ddd)';
    miniMapDiv.style.borderRadius = '12px';
    miniMapDiv.style.boxShadow = '0 4px 24px 0 rgba(0,0,0,0.13)';
    miniMapDiv.style.zIndex = 3000;
    miniMapDiv.style.display = 'none';
    miniMapDiv.innerHTML = `<div id="mini-map" style="width:100%;height:100%;border-radius:12px;"></div>`;
    document.body.appendChild(miniMapDiv);
  }

  // Sheet toolbar
  sheet.innerHTML = `
    <div class="sheet-toolbar">
      <select id="sheet-state-filter" class="sheet-search">
        <option value="">All States</option>
        ${[...new Set(contacts.map(c => c.state).filter(Boolean))].sort().map(s => `<option value="${s}">${s}</option>`).join('')}
      </select>
      <input class="sheet-search" id="sheet-search" type="text" placeholder="Search all columns..." value="${sheetFilter}">
      <button type="button" class="sheet-btn" id="sheet-copy">Copy</button>
      <button type="button" class="sheet-btn" id="sheet-export">CSV</button>
      <span style="flex:1"></span>
      <span style="color:var(--muted);font-size:1.01em;">${contacts.length} people</span>
    </div>
    <div class="sheet-table-container">
      <table class="sheet-table" id="sheet-table"></table>
    </div>
  `;

  const table = document.getElementById('sheet-table');
  const searchInput = document.getElementById('sheet-search');
  const copyBtn     = document.getElementById('sheet-copy');
  const exportBtn   = document.getElementById('sheet-export');
  const stateFilter = document.getElementById('sheet-state-filter');
  const miniMapPopup = document.getElementById('mini-map-popup');

  // Restore state filter value if set
  if (sheetStateFilterValue) stateFilter.value = sheetStateFilterValue;

  // Add this event listener to make the "All States" filter work:
  stateFilter.addEventListener('change', e => {
    sheetStateFilterValue = e.target.value;
    renderTable();
  });

  // Selection state
  let selectedRows = new Set();
  let isDragging = false;
  let dragStartIdx = null;

  // Table columns
  const columns = [
    { key: 'fullName', label: 'Name' },
    { key: 'city', label: 'City' },
    { key: 'state', label: 'State' },
    { key: 'zip', label: 'Zip' },
    { key: 'country', label: 'Country' },
    { key: 'details', label: 'Details' }
  ];

  function getFilteredRows() {
    let rows = contacts.slice();
    if (sheetStateFilterValue) rows = rows.filter(c => c.state === sheetStateFilterValue);
    if (sheetFilter) {
      const q = sheetFilter.toLowerCase();
      rows = rows.filter(c =>
        columns.some(col => String(c[col.key] ?? '').toLowerCase().includes(q))
      );
    }
    rows.sort((a, b) => {
      const av = String(a[sheetSortKey] ?? '').toLowerCase();
      const bv = String(b[sheetSortKey] ?? '').toLowerCase();
      if (av < bv) return -1 * sheetSortDir;
      if (av > bv) return 1 * sheetSortDir;
      return 0;
    });
    return rows;
  }

  function renderTable() {
    const rows = getFilteredRows();
    table.innerHTML = `<thead><tr>${
      columns.map(col =>
        `<th data-key="${col.key}" class="${col.key === sheetSortKey ? (sheetSortDir === 1 ? 'sorted-asc' : 'sorted-desc') : ''}">${col.label}</th>`
      ).join('')
    }</tr></thead><tbody></tbody>`;

    const tbody = table.querySelector('tbody');
    rows.forEach((c, idx) => {
      const tr = document.createElement('tr');
      tr.dataset.idx = idx;
      if (selectedRows.has(idx)) tr.classList.add('selected-row');
      columns.forEach(col => {
        const td = document.createElement('td');
        if (col.key === 'country') {
          td.textContent = normalizeCountry(c[col.key]);
        } else if (col.key === 'state') {
          td.textContent = normalizeState(c[col.key]);
        } else {
          td.textContent = c[col.key] || '';
        }
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });

    // --- Row selection logic ---
    let lastSelectedIdx = null;

    function updateSelectionDisplay() {
      tbody.querySelectorAll('tr').forEach((tr, i) => {
        if (selectedRows.has(i)) tr.classList.add('selected-row');
        else tr.classList.remove('selected-row');
      });
    }

    tbody.onmousedown = e => {
      if (e.target.tagName !== 'TD') return;
      isDragging = true;
      const tr = e.target.parentElement;
      dragStartIdx = Number(tr.dataset.idx);
      if (!e.shiftKey && !e.ctrlKey && !e.metaKey) {
        selectedRows.clear();
      }
      selectedRows.add(dragStartIdx);
      updateSelectionDisplay();
      showMiniMap();
      lastSelectedIdx = dragStartIdx;
    };

    tbody.onmouseover = e => {
      if (!isDragging) return;
      if (e.target.tagName !== 'TD') return;
      const tr = e.target.parentElement;
      const idx = Number(tr.dataset.idx);
      selectedRows.clear();
      const [start, end] = [dragStartIdx, idx].sort((a, b) => a - b);
      for (let i = start; i <= end; i++) selectedRows.add(i);
      updateSelectionDisplay();
      showMiniMap();
    };

    document.onmouseup = () => {
      isDragging = false;
      dragStartIdx = null;
    };

    tbody.onclick = e => {
      if (e.target.tagName !== 'TD') return;
      const tr = e.target.parentElement;
      const idx = Number(tr.dataset.idx);
      if (e.shiftKey && lastSelectedIdx !== null) {
        const [start, end] = [lastSelectedIdx, idx].sort((a, b) => a - b);
        for (let i = start; i <= end; i++) selectedRows.add(i);
      } else if (e.ctrlKey || e.metaKey) {
        if (selectedRows.has(idx)) selectedRows.delete(idx);
        else selectedRows.add(idx);
        lastSelectedIdx = idx;
      } else {
        selectedRows.clear();
        selectedRows.add(idx);
        lastSelectedIdx = idx;
      }
      updateSelectionDisplay();
      showMiniMap();
    };
  }

  // Show mini map popup with selected contacts
  function showMiniMap() {
    const rows = getFilteredRows();
    const selectedContacts = Array.from(selectedRows).map(idx => rows[idx]).filter(Boolean);
    if (!selectedContacts.length) {
      miniMapPopup.style.display = 'none';
      return;
    }
    miniMapPopup.style.display = 'block';
    setTimeout(() => {
      // Remove previous map instance if any
      if (miniMapPopup._map && miniMapPopup._map.remove) {
        miniMapPopup._map.remove();
      }
      // Create new map
      miniMapPopup._map = new mapboxgl.Map({
        container: 'mini-map',
        style: 'mapbox://styles/mapbox/streets-v11',
        center: selectedContacts[0].coords || [-97.553372, 38.282550],
        zoom: 4
      });
      // Add markers
      selectedContacts.forEach(c => {
        if (c.coords) {
          new mapboxgl.Marker().setLngLat(c.coords).addTo(miniMapPopup._map);
        }
      });
      if (selectedContacts.length > 1) {
        const bounds = new mapboxgl.LngLatBounds();
        selectedContacts.forEach(c => {
          if (c.coords) bounds.extend(c.coords);
        });
        if (!bounds.isEmpty()) miniMapPopup._map.fitBounds(bounds, { padding: 30 });
      }
    }, 10);
  }

  // Sorting
  table.addEventListener('click', e => {
    if (e.target.tagName === 'TH') {
      const key = e.target.getAttribute('data-key');
      if (sheetSortKey === key) sheetSortDir *= -1;
      else { sheetSortKey = key; sheetSortDir = 1; }
      renderTable();
    }
  });

  // Search
  searchInput.addEventListener('input', e => {
    sheetFilter = e.target.value;
    renderTable();
  });

  // Copy
  copyBtn.onclick = () => {
    let csv = columns.map(c => c.label).join('\t') + '\n';
    let rows = getFilteredRows();
    rows.forEach((c, idx) => {
      csv += columns.map(col => {
        let val = c[col.key];
        if (col.key === 'country') val = normalizeCountry(val);
        if (col.key === 'state') val = normalizeState(val);
        return String(val ?? '').replace(/\t/g, ' ');
      }).join('\t') + '\n';
    });
    navigator.clipboard.writeText(csv);
    copyBtn.textContent = 'Copied!';
    setTimeout(() => copyBtn.textContent = 'Copy', 1200);
  };

  // CSV
  exportBtn.onclick = () => {
    let csv = columns.map(c => `"${c.label}"`).join(',') + '\n';
    let rows = getFilteredRows();
    rows.forEach((c, idx) => {
      csv += columns.map(col => {
        let val = c[col.key];
        if (col.key === 'country') val = normalizeCountry(val);
        if (col.key === 'state') val = normalizeState(val);
        return `"${String(val ?? '').replace(/"/g, '""')}"`;
      }).join(',') + '\n';
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'contacts.csv';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  };

  renderTable();
};

sheetViewButton.className = 'toggle-sheet-btn';
sheetViewButton.style.zIndex = '9999';
