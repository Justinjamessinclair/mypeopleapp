const SPREADSHEET_ID = '1coMq-xbH33gAqecEzfdXglUEjF3XuKyCqJcYyLb1bJw';
const GID = '0';
mapboxgl.accessToken = 'pk.eyJ1IjoianVzdGluc2luY2xhaXJjcmVhdGl2ZSIsImEiOiJjbTl2dmJ2Z20wb3M4MnFtdzVqZ3l1YTdtIn0.yRr3osd2oFqcKbjg_3O1Hg';
const defaultView = { center: [-97.553372, 38.282550], zoom: 3 };

let contacts = [], markers = {}, selectedIdx = null, clusterIndex = null, expandedStates = {}, clusterContacts = [];
const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/justinsinclaircreative/cma43snlr002t01sih71s9nng',
  ...defaultView
});

const spinner = document.getElementById('spinner');
const basicInfo = document.getElementById('directory-count');
const contactList = document.getElementById('contact-list');
const searchInput = document.getElementById('search');
const suggestions = document.getElementById('search-suggestions');
const sortSelect = document.getElementById('sort-select');
const activeContactCard = document.getElementById('active-contact-card');
const recenterBtn = document.getElementById('recenter-btn');

// --- DATA FETCH ---
map.on('load', () => {
  map.addControl(new mapboxgl.NavigationControl(), 'top-right');
  const geoCtrl = new mapboxgl.GeolocateControl({
    positionOptions: { enableHighAccuracy: true },
    trackUserLocation: false,
    showAccuracyCircle: false
  });
  map.addControl(geoCtrl, 'top-left');
  // Move recenter button just below geolocate
  setTimeout(() => {
    const geoBtn = document.querySelector('.mapboxgl-ctrl-geolocate');
    if (geoBtn) {
      recenterBtn.style.display = '';
      recenterBtn.style.position = 'absolute';
      recenterBtn.style.left = geoBtn.offsetLeft + 'px';
      recenterBtn.style.top = (geoBtn.offsetTop + geoBtn.offsetHeight + 8) + 'px';
      geoBtn.parentNode.insertBefore(recenterBtn, geoBtn.nextSibling);
    }
  }, 500);

  recenterBtn.onclick = () => {
    selectedIdx = null;
    clusterContacts = [];
    reorderList(getVisibleContacts());
    map.flyTo({ center: defaultView.center, zoom: defaultView.zoom, speed: 1.5 });
  };

  map.on('moveend', handleMapMove);
  fetchData();
});

function fetchData() {
  spinner.style.display = 'block';
  window.google = {
    visualization: {
      Query: {
        setResponse: res => {
          try {
            contacts = res.table.rows
              .map(r => ({
                fullName: r.c[0]?.v,
                city: r.c[1]?.v,
                state: r.c[2]?.v,
                zip: r.c[3]?.v,
                country: r.c[4]?.v || 'USA',
                details: r.c[5]?.v || '',
                coords: null
              }))
              .filter(c => c.fullName);
            window.contacts = contacts;
            geocodeAll();
          } catch (error) {
            console.error('Error processing data:', error);
            alert('Failed to load contact data.');
          }
        }
      }
    }
  };
  const s = document.createElement('script');
  s.src = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?gid=${GID}&tqx=out:json-in-script`;
  s.onerror = () => {
    spinner.style.display = 'none';
    alert('Failed to fetch data from Google Sheets.');
  };
  document.head.appendChild(s);
}

async function geocodeAll() {
  await Promise.all(contacts.map(async c => {
    const key = `geo_${c.city},${c.state} ${c.zip},${c.country}`;
    const saved = localStorage.getItem(key);
    if (saved) c.coords = JSON.parse(saved);
    else {
      try {
        const q = encodeURIComponent(`${c.city}, ${c.state} ${c.zip}, ${c.country}`);
        const js = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${q}.json?access_token=${mapboxgl.accessToken}`
        ).then(r => r.json());
        c.coords = js.features[0]?.geometry.coordinates || defaultView.center;
      } catch {
        c.coords = defaultView.center;
      }
      localStorage.setItem(key, JSON.stringify(c.coords));
    }
  }));
  spinner.style.display = 'none';
  buildClusterIndex();
  sortSelect.value = 'state';
  updateSearchSuggestions();
  reorderList(getVisibleContacts());
  updateClusters();

  if (document.getElementById('sheet-view').style.display !== 'none' && window.renderSheetView) {
    window.renderSheetView();
  }
}

// --- AUTOFILL SUGGESTIONS ---
function updateSearchSuggestions() {
  suggestions.innerHTML = '';
  if (!searchInput.value.trim()) return;
  const set = new Set();
  contacts.forEach(c => {
    if (c.fullName) set.add(c.fullName);
    if (c.city) set.add(c.city);
    if (c.state) set.add(c.state);
  });
  Array.from(set).forEach(val => {
    const o = document.createElement('option');
    o.value = val;
    suggestions.appendChild(o);
  });
}
searchInput.addEventListener('input', updateSearchSuggestions);

// --- CLUSTERING ---
function clusterSize(count) {
  if (count <= 5) return 38 + (count - 1) * 0.05 * 38;
  if (count <= 50) return 38 + (4 * 0.05 * 38) + ((count - 5) * 0.01 * 38);
  return 38 + (4 * 0.05 * 38) + (45 * 0.01 * 38) + ((count - 50) * 0.001 * 38);
}

function buildClusterIndex() {
  clusterIndex = new Supercluster({ radius: 30, maxZoom: 14, minPoints: 2 });
  const feats = contacts.map((c, i) => ({
    type: 'Feature',
    id: i,
    geometry: { type: 'Point', coordinates: c.coords },
    properties: {}
  }));
  clusterIndex.load(feats);
}

function getInitials(name) {
  if (!name) return '';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0][0] ? parts[0][0].toUpperCase() : '';
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function updateClusters() {
  if (!clusterIndex) return;
  const bbox = map.getBounds().toArray().flat();
  const z = Math.floor(map.getZoom());
  const clusters = clusterIndex.getClusters(bbox, z);
  const need = new Set();

  clusters.forEach(c => {
    if (c.properties.cluster) need.add(`c_${c.properties.cluster_id}`);
    else need.add(`p_${c.id}`);
  });

  for (const k in markers) {
    if (!need.has(k)) {
      markers[k].remove();
      delete markers[k];
    }
  }

  clusters.forEach(c => {
    if (c.properties.cluster) {
      const key = `c_${c.properties.cluster_id}`;
      if (markers[key]) return;
      const [lng, lat] = c.geometry.coordinates;
      const count = c.properties.point_count;
      const size = clusterSize(count);
      const el = document.createElement('div');
      el.className = 'cluster-marker';
      el.textContent = count;
      el.style.width = el.style.height = `${size}px`;
      el.style.fontSize = `${Math.max(1.08, Math.min(1.3, 1 + count*0.01))}rem`;
      el.style.zIndex = 1000 + count; // Higher count = higher z-index
      el.onclick = async () => {
        const leaves = clusterIndex.getLeaves(c.properties.cluster_id, Infinity);
        const ids = leaves.map(f => f.id);
        const allCoords = leaves.map(f => JSON.stringify(f.geometry.coordinates));
        const allSame = allCoords.every(coord => coord === allCoords[0]);
        if (allSame && ids.length > 1) {
          if (markers[key]) {
            markers[key].remove();
            delete markers[key];
          }
          ids.forEach(idx => {
            if (!markers[`p_${idx}`]) {
              const [lng, lat] = contacts[idx].coords;
              const el = document.createElement('div');
              el.className = 'pin-marker';
              el.title = contacts[idx].fullName;
              el.textContent = getInitials(contacts[idx].fullName);
              el.onclick = () => onContactClick(idx);
              markers[`p_${idx}`] = new mapboxgl.Marker(el)
                .setLngLat([lng, lat])
                .addTo(map);
            }
          });
        } else {
          clusterContacts = ids;
          selectedIdx = null;
          reorderList(getVisibleContacts());
          const clusterPoints = leaves.map(f => f.geometry.coordinates);
          if (clusterPoints.length > 1) {
            const bounds = clusterPoints.reduce((b, p) => b.extend(p), new mapboxgl.LngLatBounds(clusterPoints[0], clusterPoints[0]));
            map.fitBounds(bounds, { padding: 80, speed: 1.5 });
          } else {
            map.flyTo({ center: c.geometry.coordinates, zoom: map.getZoom() + 1, speed: 1.5 });
          }
        }
      };
      markers[key] = new mapboxgl.Marker(el)
        .setLngLat([lng, lat])
        .addTo(map);
    } else {
      const key = `p_${c.id}`;
      if (markers[key]) return;
      const [lng, lat] = c.geometry.coordinates;
      const el = document.createElement('div');
      el.className = 'pin-marker' + (c.id === selectedIdx ? ' active' : '');
      el.title = contacts[c.id].fullName;
      el.textContent = getInitials(contacts[c.id].fullName);
      el.onclick = () => onContactClick(c.id);
      markers[key] = new mapboxgl.Marker(el)
        .setLngLat([lng, lat])
        .addTo(map);
    }
  });
}

// --- DIRECTORY LOGIC ---
function reorderList(list) {
  contactList.innerHTML = '';
  let sorted = list.slice();

  // Sort logic with headers
  const crit = sortSelect.value;
  let grouped = {};
  if (crit === 'first') {
    sorted.sort((a, b) => a.fullName.localeCompare(b.fullName));
  } else if (crit === 'last') {
    sorted.forEach(c => {
      const idx = contacts.indexOf(c);
      if (idx === -1) return; // skip if not found
      const k = c.fullName.split(' ').pop()[0].toUpperCase();
      (grouped[k] = grouped[k] || []).push({c, idx});
    });
  } else if (crit === 'state') {
    sorted.forEach(c => {
      const idx = contacts.indexOf(c);
      if (idx === -1) return; // skip if not found
      const k = c.state || '–';
      (grouped[k] = grouped[k] || []).push({c, idx});
    });
  }

  // Cluster/selected logic
  if (clusterContacts.length) {
    const clusterSet = new Set(clusterContacts);
    const clusterList = sorted.filter(c => clusterSet.has(contacts.indexOf(c)));
    sorted = clusterList.concat(sorted.filter(c => !clusterSet.has(contacts.indexOf(c))));
  }
  if (selectedIdx !== null) {
    const selected = sorted.find(c => contacts.indexOf(c) === selectedIdx);
    if (selected) {
      sorted = [selected].concat(sorted.filter(c => c !== selected));
    }
  }

  // Render with headers if needed
  if (crit === 'first') {
    sorted.forEach(c => appendListItem(c, contacts.indexOf(c)));
  } else {
    Object.keys(grouped).sort().forEach(h => {
      appendHeader(h, grouped[h].map(x => x.idx));
      grouped[h].sort((a, b) => a.c.fullName.localeCompare(b.c.fullName))
        .forEach(x => appendListItem(x.c, x.idx));
    });
  }
  updateActiveContactCard();
  updateDirectoryCount(sorted.length);
}

function appendHeader(txt, idxArr) {
  const h = document.createElement('li');
  h.className = 'list-header';
  h.textContent = txt;
  h.tabIndex = 0;
  if (expandedStates[txt]) h.classList.add('active');
  h.onclick = () => {
    expandedStates = {};
    expandedStates[txt] = true;
    const filtered = contacts.filter((c, idx) => idxArr.includes(idx));
    reorderList(filtered);

    if (filtered.length > 0) {
      const coords = filtered.map(c => c.coords).filter(Boolean);
      if (coords.length > 1) {
        const bounds = coords.reduce((b, p) => b.extend(p), new mapboxgl.LngLatBounds(coords[0], coords[0]));
        map.fitBounds(bounds, { padding: 60, speed: 1.5 });
      } else if (coords.length === 1) {
        map.flyTo({ center: coords[0], zoom: 7, speed: 1.5 });
      }
    }
  };
  contactList.appendChild(h);
}

function appendListItem(c, idx) {
  const li = document.createElement('li');
  li.textContent = c.fullName;
  if (clusterContacts.includes(idx)) li.classList.add('cluster-highlight');
  if (idx === selectedIdx) li.classList.add('selected-contact');
  li.onclick = () => onContactClick(idx);
  contactList.appendChild(li);
}

function updateActiveContactCard() {
  if (selectedIdx === null || !contacts[selectedIdx]) {
    activeContactCard.className = '';
    activeContactCard.innerHTML = '';
    return;
  }
  const c = contacts[selectedIdx];
  activeContactCard.className = 'active';
  activeContactCard.innerHTML = `
    <div class="contact-name">${c.fullName}</div>
    <div class="contact-location">${c.city || ''}${c.state ? ', ' + c.state : ''} ${c.zip || ''}</div>
    <div class="contact-details">${c.country || ''}</div>
    <button class="details-btn">Details</button>
    <div class="extra-details">${c.details ? c.details : '<em>No additional details.</em>'}</div>
  `;
  const btn = activeContactCard.querySelector('.details-btn');
  btn.onclick = e => {
    e.stopPropagation();
    activeContactCard.classList.toggle('expanded');
    btn.textContent = activeContactCard.classList.contains('expanded') ? 'Hide Details' : 'Details';
  };
}

function updateDirectoryCount(count) {
  basicInfo.textContent = `${count} people`;
}

// --- INTERACTIONS ---
function onContactClick(i) {
  selectedIdx = i;
  clusterContacts = [];
  // Always show the selected contact at the top
  const visible = getVisibleContacts();
  const selectedContact = contacts[i];
  let sorted = visible.filter(c => c === selectedContact);
  sorted = sorted.concat(visible.filter(c => c !== selectedContact));
  reorderList(sorted);
  updateClusters();

  const thisCoord = contacts[i].coords;
  let minDist = Infinity, closestCoord = null;
  contacts.forEach((c, idx) => {
    if (idx !== i && c.coords) {
      const dx = c.coords[0] - thisCoord[0];
      const dy = c.coords[1] - thisCoord[1];
      const dist = dx*dx + dy*dy;
      if (dist < minDist) {
        minDist = dist;
        closestCoord = c.coords;
      }
    }
  });
  if (closestCoord) {
    const bounds = new mapboxgl.LngLatBounds(thisCoord, thisCoord);
    bounds.extend(closestCoord);
    map.fitBounds(bounds, { padding: 100, speed: 1.5, maxZoom: 10 });
  } else {
    map.flyTo({ center: thisCoord, zoom: 8, speed: 1.5 });
  }
}

function getVisibleContacts() {
  const bounds = map.getBounds();
  return contacts.filter(c => c.coords && bounds.contains(c.coords));
}

function handleMapMove() {
  if (!clusterContacts.length && selectedIdx === null) {
    reorderList(getVisibleContacts());
  }
  updateClusters();
}

// --- SEARCH & SORT ---
document.getElementById('show-all').onclick = () => {
  expandedStates = {};
  selectedIdx = null;
  clusterContacts = [];
  reorderList(getVisibleContacts());
  if (!contacts.length) return;
  const pts = contacts.map(c => c.coords),
    bnds = pts.reduce((b, p) => b.extend(p),
      new mapboxgl.LngLatBounds(pts[0], pts[0]));
  map.fitBounds(bnds, { padding: 20, speed: 2 });
  updateClusters();
};
searchInput.oninput = e => {
  updateSearchSuggestions();
  const q = e.target.value.toLowerCase();
  const filt = getVisibleContacts().filter(c =>
    [c.fullName, c.city, c.state, c.zip, c.country].join(' ')
      .toLowerCase().includes(q)
  );
  expandedStates = {};
  selectedIdx = null;
  clusterContacts = [];
  reorderList(filt);
  updateClusters();
};

sortSelect.onchange = () => {
  expandedStates = {};
  selectedIdx = null;
  clusterContacts = [];
  reorderList(getVisibleContacts());
};

// Initial render
reorderList(getVisibleContacts());

// Responsive: scroll sidebar to top on resize
window.addEventListener('resize', () => {
  document.querySelector('.directory-content').scrollTop = 0;
});

// --- SELECT CONTACT BY NAME ---
window.selectContactByName = function(name) {
  // Highlight in map view
  const idx = contacts.findIndex(c => c.fullName === name);
  if (idx !== -1) onContactClick(idx);
  // Highlight in sheet view
  if (window.renderSheetView) window.renderSheetView(name);
};

const sheetViewButton = document.createElement('button');
sheetViewButton.textContent = 'Sheet';
sheetViewButton.style.position = 'absolute';
sheetViewButton.style.top = '10px';
sheetViewButton.style.left = '10px';
sheetViewButton.style.zIndex = '1000';
sheetViewButton.style.backgroundColor = '#545E68';
sheetViewButton.style.color = '#fff';
sheetViewButton.style.border = 'none';
sheetViewButton.style.borderRadius = '4px';
sheetViewButton.style.padding = '10px';
sheetViewButton.style.cursor = 'pointer';

document.body.appendChild(sheetViewButton);

let isSheetView = false;

sheetViewButton.addEventListener('click', () => {
    isSheetView = !isSheetView;
    const sheet = document.getElementById('sheet-view');
    const mapDiv = document.getElementById('map');
    const sidebar = document.querySelector('.sidebar');
    const recenterBtn = document.getElementById('recenter-btn');
    if (isSheetView) {
        sheet.style.display = 'block';
        mapDiv.style.display = 'none';
        sidebar.style.display = 'none';
        recenterBtn.style.display = 'none';
        sheetViewButton.textContent = 'Map';
        if (window.renderSheetView) window.renderSheetView();
    } else {
        sheet.style.display = 'none';
        mapDiv.style.display = '';
        sidebar.style.display = '';
        recenterBtn.style.display = '';
        sheetViewButton.textContent = 'sheet';
    }
});