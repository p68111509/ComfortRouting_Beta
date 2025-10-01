// i18n dictionary
const i18nDict = {
  en: {
    title: "Comfort Routing System",
    start: "Start address",
    end: "End address",
    travelMode: "Travel mode",
    motorcycle: "Motorcycle",
    bicycle: "Bicycle",
    walk: "Walk",
    maxDistance: "Max Distance Increase",
    distanceLimitToggle: "Distance Limit Feature",
    off: "OFF",
    on: "ON",
    plan: "Plan routes",
    helper: "You can also click the map to set start/end alternately.",
    legendShortest: "Shortest Route",
    legendLowest: "Low-Exposure Route",
    overlayTitle: "Overlay Layer",
    overlayNone: "None",
    overlayPM25: "PM₂.₅",
    overlayNO2: "NO₂",
    overlayWBGT: "Temperature",
    compareTitle: "Route Comparison",
    colType: "Route Type",
    colDist: "Distance (km)",
    colTime: "Travel Time (min)",
    colExp: "Exposure Reduction",
    colExpUnit: "μg/m³·min",
    colExtra: "Extra Distance (m)",
    colImprove: "Improvement Rate (%)",
    shortest: "Shortest",
    lowest: "Lowest Exposure",
    validation: "Please set both start and end points.",
    coordsStart: "Start coords",
    coordsEnd: "End coords",
    langEN: "EN",
    langZH: "中文",
    reset: "Reset",
    helpBtn: "Help",
    helpTitle: "Usage Instructions"
  },
  zh: {
    title: "舒適路徑系統",
    start: "起點地址",
    end: "終點地址",
    travelMode: "交通方式",
    motorcycle: "機車",
    bicycle: "單車",
    walk: "步行",
    maxDistance: "最大增加距離",
    distanceLimitToggle: "距離限制功能",
    off: "關",
    on: "開",
    plan: "規劃路徑",
    helper: "也可以點地圖依序設定起點/終點。",
    legendShortest: "最短路徑",
    legendLowest: "低暴露路徑",
    overlayTitle: "疊加圖層",
    overlayNone: "無",
    overlayPM25: "PM₂.₅",
    overlayNO2: "NO₂",
    overlayWBGT: "氣溫",
    compareTitle: "路徑比較",
    colType: "路徑類型",
    colDist: "距離（km）",
    colTime: "通勤時間（min）",
    colExp: "暴露量減少",
    colExpUnit: "μg/m³·min",
    colExtra: "額外距離（m）",
    colImprove: "改善率（%）",
    shortest: "最短",
    lowest: "最低暴露",
    validation: "請先設定起點與終點。",
    coordsStart: "起點座標",
    coordsEnd: "終點座標",
    langEN: "EN",
    langZH: "中文",
    reset: "重置選擇",
    helpBtn: "說明",
    helpTitle: "使用說明"
  }
};

let currentLang = 'zh';

function applyI18n() {
  const dict = i18nDict[currentLang] || i18nDict.zh;
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (!key) return;
    const text = dict[key];
    if (typeof text === 'string') {
      el.textContent = text;
    }
  });
  document.documentElement.lang = currentLang;
  document.title = dict.title || document.title;
}

function setLanguage(lang) {
  if (!i18nDict[lang]) return;
  currentLang = lang;
  try { localStorage.setItem('app_lang', lang); } catch (_) {}
  applyI18n();
}

// Map and routing state
let map;
let onlineTileLayerAdded = false;
let startMarker = null;
let endMarker = null;

// 交通方式速度常數 (km/h)
const SPEED_CONSTANTS = {
  motorcycle: 45,  // 機車 45 km/h
  bicycle: 18,     // 單車 18 km/h  
  walk: 5          // 步行 5 km/h
};
let shortestLine = null;
let lowestLine = null;
let isPlanningMode = false; // 是否已進入規劃模式
let nextPointIsStart = true; // alternating clicks
let currentOverlay = null; // 當前疊圖層
let overlayLayer = null; // Leaflet 疊圖層物件

// Marker styles
const START_COLOR = '#16a34a'; // green
const END_COLOR = '#dc2626';   // red

// API base（本機 FastAPI）
const API_BASE = ''; // 使用相對路徑，部署時自動使用當前域名

// Taipei center
const DEFAULT_CENTER = [25.04, 121.56];
const DEFAULT_ZOOM = 12;

function initMap() {
  map = L.map('map', {
    center: DEFAULT_CENTER,
    zoom: DEFAULT_ZOOM,
    zoomControl: true
  });

  try {
    if (L.control && typeof L.control.scale === 'function') {
      L.control.scale({ metric: true, imperial: false }).addTo(map);
    }
  } catch (_) {}

  try {
    if (navigator.onLine) {
      const tl = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/">OSM</a> contributors'
      });
      if (typeof tl.on === 'function') {
        tl.on('tileerror', () => {
          try { map.removeLayer(tl); } catch (_) {}
          onlineTileLayerAdded = false;
        });
      }
      tl.addTo(map);
      onlineTileLayerAdded = true;
    }
  } catch (e) {
    onlineTileLayerAdded = false;
  }

  map.on('click', onMapClick);

  setTimeout(() => { try { map.invalidateSize && map.invalidateSize(); } catch (_) {} }, 0);
  window.addEventListener('resize', () => { try { map.invalidateSize && map.invalidateSize(); } catch (_) {} });
}

function formatLatLng(latlng) {
  return `${latlng.lat.toFixed(6)}, ${latlng.lng.toFixed(6)}`;
}

function setInputValue(which, text) {
  const id = which === 'start' ? 'input-start' : 'input-end';
  document.getElementById(id).value = text;
}

function onMapClick(e) {
  // 只有在非規劃模式下才能設定起點終點
  if (isPlanningMode) {
    console.log('[debug] in planning mode, ignoring map clicks');
    return;
  }
  
  const latlng = e.latlng;
  if (nextPointIsStart) {
    setStart(latlng);
    setInputValue('start', '解析地址中… ' + formatLatLng(latlng));
    reverseToInput('start', latlng);
  } else {
    setEnd(latlng);
    setInputValue('end', '解析地址中… ' + formatLatLng(latlng));
    reverseToInput('end', latlng);
  }
  nextPointIsStart = !nextPointIsStart;
  updatePlanButtonState();
}

function setStart(latlng) {
  if (startMarker) startMarker.remove();
  
  // 創建綠色3D地圖針圖標（放大兩倍）
  const greenPinIcon = L.divIcon({
    className: 'custom-pin-icon',
    html: `
      <div style="
        width: 48px;
        height: 64px;
        position: relative;
        filter: drop-shadow(0 6px 12px rgba(0,0,0,0.3));
      ">
        <!-- 圓形頭部 -->
        <div style="
          width: 40px;
          height: 40px;
          background: linear-gradient(135deg, #22C55E 0%, #16A34A 100%);
          border-radius: 50%;
          position: absolute;
          top: 0;
          left: 4px;
          border: 4px solid white;
          box-shadow: 
            inset 0 4px 8px rgba(255,255,255,0.3),
            inset 0 -4px 8px rgba(0,0,0,0.2);
        "></div>
        <!-- 中心圓孔 -->
        <div style="
          width: 16px;
          height: 16px;
          background: white;
          border-radius: 50%;
          position: absolute;
          top: 12px;
          left: 16px;
          box-shadow: inset 0 2px 4px rgba(0,0,0,0.1);
        "></div>
        <!-- 三角形底部 -->
        <div style="
          width: 0;
          height: 0;
          border-left: 24px solid transparent;
          border-right: 24px solid transparent;
          border-top: 32px solid #22C55E;
          position: absolute;
          top: 36px;
          left: 0;
          filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));
        "></div>
      </div>
    `,
    iconSize: [48, 64],
    iconAnchor: [24, 64]
  });
  
  startMarker = L.marker(latlng, { icon: greenPinIcon }).addTo(map);
  document.getElementById('coords-start').textContent = `${latlng.lat.toFixed(5)}, ${latlng.lng.toFixed(5)}`;
}

function setEnd(latlng) {
  if (endMarker) endMarker.remove();
  
  // 創建紅色3D地圖針圖標（放大兩倍）
  const redPinIcon = L.divIcon({
    className: 'custom-pin-icon',
    html: `
      <div style="
        width: 48px;
        height: 64px;
        position: relative;
        filter: drop-shadow(0 6px 12px rgba(0,0,0,0.3));
      ">
        <!-- 圓形頭部 -->
        <div style="
          width: 40px;
          height: 40px;
          background: linear-gradient(135deg, #DC2626 0%, #B91C1C 100%);
          border-radius: 50%;
          position: absolute;
          top: 0;
          left: 4px;
          border: 4px solid white;
          box-shadow: 
            inset 0 4px 8px rgba(255,255,255,0.3),
            inset 0 -4px 8px rgba(0,0,0,0.2);
        "></div>
        <!-- 中心圓孔 -->
        <div style="
          width: 16px;
          height: 16px;
          background: white;
          border-radius: 50%;
          position: absolute;
          top: 12px;
          left: 16px;
          box-shadow: inset 0 2px 4px rgba(0,0,0,0.1);
        "></div>
        <!-- 三角形底部 -->
        <div style="
          width: 0;
          height: 0;
          border-left: 24px solid transparent;
          border-right: 24px solid transparent;
          border-top: 32px solid #DC2626;
          position: absolute;
          top: 36px;
          left: 0;
          filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));
        "></div>
      </div>
    `,
    iconSize: [48, 64],
    iconAnchor: [24, 64]
  });
  
  endMarker = L.marker(latlng, { icon: redPinIcon }).addTo(map);
  document.getElementById('coords-end').textContent = `${latlng.lat.toFixed(5)}, ${latlng.lng.toFixed(5)}`;
}

function updatePlanButtonState() {
  const btn = document.getElementById('btn-plan');
  const hasStart = !!startMarker || !!document.getElementById('input-start').value.trim();
  const hasEnd = !!endMarker || !!document.getElementById('input-end').value.trim();
  btn.disabled = !(hasStart && hasEnd);
  const validation = document.getElementById('validation');
  validation.style.visibility = btn.disabled ? 'visible' : 'hidden';
}

function clearGeometries() {
  if (shortestLine) { shortestLine.remove(); shortestLine = null; }
  if (lowestLine) { lowestLine.remove(); lowestLine = null; }
}

function resetAll() {
  const startInput = document.getElementById('input-start');
  const endInput = document.getElementById('input-end');
  if (startInput) startInput.value = '';
  if (endInput) endInput.value = '';
  if (startMarker) { try { startMarker.remove(); } catch (_) {} startMarker = null; }
  if (endMarker) { try { endMarker.remove(); } catch (_) {} endMarker = null; }
  clearGeometries();
  document.getElementById('coords-start').textContent = '-';
  document.getElementById('coords-end').textContent = '-';
  
  // 清空路徑比較表格
  const tbody = document.getElementById('compare-tbody');
  if (tbody) {
    tbody.innerHTML = '';
  }
  
  // 退出規劃模式，解鎖起點終點
  isPlanningMode = false;
  console.log('[debug] exited planning mode, start/end points unlocked');
  
  // 啟用輸入框
  if (startInput) startInput.disabled = false;
  if (endInput) endInput.disabled = false;
  
  // 重置開關和拉桿
  const toggle = document.getElementById('distance-limit-toggle');
  const sliderContainer = document.getElementById('distance-slider-container');
  const slider = document.getElementById('max-distance-slider');
  
  if (toggle) {
    toggle.checked = false; // 重置為關閉狀態
  }
  
  if (sliderContainer) {
    sliderContainer.style.display = 'none'; // 隱藏拉桿容器
  }
  
  if (slider) {
    slider.value = 10000; // 重置為預設值
    const sliderValue = document.getElementById('slider-value');
    if (sliderValue) {
      sliderValue.textContent = '+10000m';
    }
  }
  
  // 確保清除任何可能的延遲事件
  setTimeout(() => {
    if (!isPlanningMode) {
      console.log('[debug] reset completed, ensuring no auto-recalc');
    }
  }, 100);
  
  nextPointIsStart = true;
  try { map.setView(DEFAULT_CENTER, DEFAULT_ZOOM); } catch (_) {}
  updatePlanButtonState();
}

function renderRoutes(data) {
  console.log('[debug] renderRoutes called with data:', data);
  
  // 儲存路徑資料以便交通方式變更時重新計算
  window.lastRouteData = data;
  
  clearGeometries();
  if (Array.isArray(data.start) && data.start.length === 2) {
    setStart({ lat: data.start[0], lng: data.start[1] });
  }
  if (Array.isArray(data.end) && data.end.length === 2) {
    setEnd({ lat: data.end[0], lng: data.end[1] });
  }
  if (data.shortest?.geometry) {
    shortestLine = L.polyline(data.shortest.geometry, {
      color: '#2563EB', // 藍色
      weight: 6, // 加粗
      opacity: 0.9,
      dashArray: null
    }).addTo(map);
  }
  if (data.lowest?.geometry) {
    lowestLine = L.polyline(data.lowest.geometry, {
      color: '#16A34A', // 綠色
      weight: 6, // 加粗
      opacity: 0.9,
      dashArray: '8,8' // 更粗的虛線
    }).addTo(map);
  }
  const group = L.featureGroup([].concat(
    startMarker ? [startMarker] : [],
    endMarker ? [endMarker] : [],
    shortestLine ? [shortestLine] : [],
    lowestLine ? [lowestLine] : []
  ));
  try { map.fitBounds(group.getBounds(), { padding: [20, 20] }); } catch (_) {}
  renderTable(data);
}

function formatNumber(num, digits = 1) {
  if (num === null || num === undefined || isNaN(num)) return '-';
  return Number(num).toFixed(digits);
}

function computeImprovementRate(shortest, lowest) {
  const s = shortest?.exposure;
  const l = lowest?.exposure;
  if (typeof shortest?.improvement_rate === 'number') return shortest.improvement_rate;
  if (typeof lowest?.improvement_rate === 'number') return lowest.improvement_rate;
  if (typeof s === 'number' && typeof l === 'number' && s > 0) {
    return ((s - l) / s) * 100;
  }
  return null;
}

function computeExtraDistance(shortest, lowest) {
  if (typeof lowest?.extra_distance_m === 'number') return lowest.extra_distance_m;
  const s = shortest?.distance_km;
  const l = lowest?.distance_km;
  if (typeof s === 'number' && typeof l === 'number') {
    return Math.max(0, (l - s) * 1000);
  }
  return null;
}

// 計算通勤時間 (分鐘)
function computeTravelTime(distanceKm, transportMode) {
  const speed = SPEED_CONSTANTS[transportMode] || SPEED_CONSTANTS.motorcycle;
  return (distanceKm / speed) * 60; // 轉換為分鐘
}

// 疊圖層配置
const OVERLAY_CONFIG = {
  pm25: {
    name: 'PM₂.₅',
    imagePath: 'data/PM25_全台.png',
    // 使用簡化的台灣地區座標範圍
    bounds: {
      left: 120.0,   // 西經
      right: 122.0,  // 東經
      bottom: 22.0,  // 南緯
      top: 25.5      // 北緯
    }
  },
  no2: {
    name: 'NO₂',
    imagePath: 'data/NO2_全台.png',
    bounds: {
      left: 120.0,
      right: 122.0,
      bottom: 22.0,
      top: 25.5
    }
  },
  wbgt: {
    name: '氣溫',
    imagePath: 'data/WBGT_全台.png',
    bounds: {
      left: 120.0,
      right: 122.0,
      bottom: 22.0,
      top: 25.5
    }
  }
};


// 更新疊圖層
function updateOverlay(overlayType) {
  // 移除現有疊圖層
  if (overlayLayer) {
    map.removeLayer(overlayLayer);
    overlayLayer = null;
  }
  
  currentOverlay = overlayType;
  
  if (overlayType === 'none' || !OVERLAY_CONFIG[overlayType]) {
    return;
  }
  
  const config = OVERLAY_CONFIG[overlayType];
  
  // 直接使用 WGS84 座標（已經是經緯度格式）
  const imageBounds = [
    [config.bounds.bottom, config.bounds.left],  // 西南角
    [config.bounds.top, config.bounds.right]     // 東北角
  ];
  
  console.log(`[debug] Loading overlay: ${config.name}`);
  console.log(`[debug] Image bounds:`, imageBounds);
  
  // 創建疊圖層
  try {
    overlayLayer = L.imageOverlay(config.imagePath, imageBounds, {
      opacity: 0.5,
      interactive: false,
      zIndex: 1
    }).addTo(map);
    
    console.log(`[success] Overlay ${config.name} loaded successfully`);
    
    // 添加錯誤處理
    overlayLayer.on('error', function(e) {
      console.error(`[error] Failed to load overlay image: ${config.imagePath}`, e);
      showError(`無法載入 ${config.name} 圖層，請檢查圖片檔案是否存在`);
    });
    
  } catch (error) {
    console.error(`[error] Error creating overlay:`, error);
    showError(`創建 ${config.name} 圖層時發生錯誤`);
  }
}

function renderTable(data) {
  const tbody = document.getElementById('compare-tbody');
  tbody.innerHTML = '';
  const dict = i18nDict[currentLang];
  const imp = computeImprovementRate(data.shortest, data.lowest);
  const extra = computeExtraDistance(data.shortest, data.lowest);
  
  // 計算暴露量減少值（μg·m⁻³·min）
  const exposureReduction = data.lowest?.exposure_reduction || 0;
  
  // 獲取當前交通方式
  const transportMode = document.getElementById('select-mode')?.value || 'motorcycle';
  
  // 計算通勤時間
  const shortestTime = computeTravelTime(data.shortest?.distance_km || 0, transportMode);
  const lowestTime = computeTravelTime(data.lowest?.distance_km || 0, transportMode);
  
  const rows = [
    { 
      type: dict.shortest, 
      distance: formatNumber(data.shortest?.distance_km, 1), 
      time: formatNumber(shortestTime, 1),
      exposure: '-',  // 最短路徑不顯示暴露量減少
      extra: '-', 
      improve: '-' 
    },
    { 
      type: dict.lowest, 
      distance: formatNumber(data.lowest?.distance_km, 1), 
      time: formatNumber(lowestTime, 1),
      exposure: exposureReduction > 0 ? formatNumber(exposureReduction, 2) : '-', 
      extra: extra !== null ? Math.round(extra).toString() : '-', 
      improve: imp !== null ? formatNumber(imp, 1) : '-' 
    }
  ];
  rows.forEach(r => {
    const tr = document.createElement('tr');
    ['type','distance','time','exposure','extra','improve'].forEach(k => {
      const td = document.createElement('td');
      td.textContent = r[k];
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
}

// 呼叫後端 /api/routes：優先用地圖標記的座標；否則用輸入框地址文字
async function planRoutes() {
  hideError();
  
  // 檢查是否有起點和終點
  const hasStart = !!startMarker || !!document.getElementById('input-start').value.trim();
  const hasEnd = !!endMarker || !!document.getElementById('input-end').value.trim();
  
  if (!hasStart || !hasEnd) {
    console.log('[debug] planRoutes called but no start/end points, skipping');
    return;
  }
  
  // 檢查距離限制開關狀態
  const isDistanceLimitEnabled = document.getElementById('distance-limit-toggle').checked;
  let maxDistanceIncrease = null;
  
  if (isDistanceLimitEnabled) {
    maxDistanceIncrease = parseInt(document.getElementById('max-distance-slider').value);
    if (maxDistanceIncrease === 0) maxDistanceIncrease = null;
  }
  
  const payload = { 
    mode: document.getElementById('select-mode').value,
    max_distance_increase: maxDistanceIncrease
  };
  const startInput = document.getElementById('input-start').value.trim();
  const endInput = document.getElementById('input-end').value.trim();
  if (startMarker) payload.start = { lat: startMarker.getLatLng ? startMarker.getLatLng().lat : startMarker._latlng.lat, lng: startMarker.getLatLng ? startMarker.getLatLng().lng : startMarker._latlng.lng };
  else if (startInput) payload.start = startInput;
  if (endMarker) payload.end = { lat: endMarker.getLatLng ? endMarker.getLatLng().lat : endMarker._latlng.lat, lng: endMarker.getLatLng ? endMarker.getLatLng().lng : endMarker._latlng.lng };
  else if (endInput) payload.end = endInput;

  console.log('[debug] planRoutes called, sending payload:', payload);
  
  try {
    const res = await fetch(`${API_BASE}/api/routes`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || err.message || `HTTP ${res.status}`);
    }
    const data = await res.json();
    renderRoutes(data);
    
    // 進入規劃模式，鎖定起點終點
    isPlanningMode = true;
    console.log('[debug] entered planning mode, start/end points locked');
    
    // 禁用輸入框
    document.getElementById('input-start').disabled = true;
    document.getElementById('input-end').disabled = true;
    
  } catch (err) {
    showError(`路徑計算失敗：${err.message || err}`);
  }
}

// 輸入框觸發地理編碼：在 blur 或 Enter 時呼叫 /api/geocode，並放置對應的 marker
async function geocodeToMarker(which) {
  const id = which === 'start' ? 'input-start' : 'input-end';
  const val = document.getElementById(id).value.trim();
  if (!val) return;
  try {
    const res = await fetch(`${API_BASE}/api/geocode`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ address: val }) });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || err.message || `HTTP ${res.status}`);
    }
    const data = await res.json();
    const latlng = { lat: data.lat, lng: data.lng };
    if (which === 'start') setStart(latlng); else setEnd(latlng);
    updatePlanButtonState();
  } catch (err) {
    showError(`地理編碼失敗：${err.message || err}`);
  }
}

// 地圖點擊後做反向地理編碼，把地址寫回輸入框（失敗時保留經緯度文字），失敗自動重試一次
async function reverseToInput(which, latlng) {
  setInputValue(which, '解析地址中… ' + formatLatLng(latlng));
  const attempt = async () => {
    const res = await fetch(`${API_BASE}/api/reverse`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ point: { lat: latlng.lat, lng: latlng.lng } }) });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || err.message || `HTTP ${res.status}`);
    }
    const data = await res.json();
    setInputValue(which, data.label || formatLatLng(latlng));
  };
  try {
    await attempt();
  } catch (e1) {
    console.warn('reverse failed, retrying once', e1);
    try { await attempt(); }
    catch (e2) {
      console.warn('reverse failed again', e2);
      setInputValue(which, formatLatLng(latlng) + '（地址解析失敗）');
    }
  }
}

function showError(msg) {
  const box = document.getElementById('error-box');
  const msgEl = document.getElementById('error-msg');
  msgEl.textContent = msg;
  box.hidden = false;
}

function hideError() {
  const box = document.getElementById('error-box');
  box.hidden = true;
}

function bindUI() {
  document.getElementById('btn-lang-en').addEventListener('click', () => setLanguage('en'));
  document.getElementById('btn-lang-zh').addEventListener('click', () => setLanguage('zh'));
  document.getElementById('btn-plan').addEventListener('click', planRoutes);
  document.getElementById('btn-reset').addEventListener('click', resetAll);

  const onInputChange = () => updatePlanButtonState();
  const startEl = document.getElementById('input-start');
  const endEl = document.getElementById('input-end');
  startEl.addEventListener('input', onInputChange);
  endEl.addEventListener('input', onInputChange);

  const fireGeocode = (which, ev) => {
    if (ev.type === 'blur' || (ev.type === 'keydown' && ev.key === 'Enter')) {
      geocodeToMarker(which);
    }
  };
  startEl.addEventListener('blur', (e) => fireGeocode('start', e));
  endEl.addEventListener('blur', (e) => fireGeocode('end', e));
  startEl.addEventListener('keydown', (e) => fireGeocode('start', e));
  endEl.addEventListener('keydown', (e) => fireGeocode('end', e));
  
  // 交通方式變更時重新計算表格
  const modeSelect = document.getElementById('select-mode');
  modeSelect.addEventListener('change', () => {
    // 如果已經有路徑資料，重新渲染表格
    if (shortestLine && lowestLine) {
      const currentData = window.lastRouteData; // 儲存最後一次的路徑資料
      if (currentData) {
        renderTable(currentData);
      }
    }
  });
  
  // 疊圖選擇器事件監聽
  const overlayRadios = document.querySelectorAll('input[name="overlay"]');
  overlayRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      if (e.target.checked) {
        updateOverlay(e.target.value);
      }
    });
  });
  
  
  // 開關事件處理
  const toggle = document.getElementById('distance-limit-toggle');
  const sliderContainer = document.getElementById('distance-slider-container');
  
  toggle.addEventListener('change', (e) => {
    const isEnabled = e.target.checked;
    console.log('[debug] distance limit toggle changed:', isEnabled);
    
    if (isEnabled) {
      // 開啟距離限制功能
      sliderContainer.style.display = 'block';
      // 使用 requestAnimationFrame 確保 DOM 更新後再執行動畫
      requestAnimationFrame(() => {
        sliderContainer.style.animation = 'slideDown 0.3s ease-out';
      });
    } else {
      // 關閉距離限制功能
      sliderContainer.style.animation = 'slideUp 0.3s ease-out';
      setTimeout(() => {
        sliderContainer.style.display = 'none';
        sliderContainer.style.animation = ''; // 清除動畫
      }, 300);
    }
    
    // 如果在規劃模式下，重新解算路徑
    if (isPlanningMode) {
      console.log('[debug] toggle changed in planning mode, recalculating routes...');
      planRoutes();
    }
  });
  
  // 拉桿事件處理
  const slider = document.getElementById('max-distance-slider');
  const sliderValue = document.getElementById('slider-value');
  
  slider.addEventListener('input', (e) => {
    const value = parseInt(e.target.value);
    if (value === 0) {
      sliderValue.textContent = currentLang === 'zh' ? '無限制' : 'No limit';
    } else {
      sliderValue.textContent = `+${value}m`;
    }
    
    // 只有在規劃模式下才自動重新解算路徑
    if (isPlanningMode) {
      console.log('[debug] slider changed, auto-recalculating routes...');
      planRoutes();
    } else {
      console.log('[debug] slider changed but not in planning mode, skipping auto-recalc');
    }
  });
  
  // 使用說明按鈕事件處理
  const helpBtn = document.getElementById('help-btn');
  const helpModal = document.getElementById('help-modal');
  const closeHelp = document.getElementById('close-help');
  
  helpBtn.addEventListener('click', () => {
    helpModal.style.display = 'flex';
    document.body.style.overflow = 'hidden'; // 防止背景滾動
  });
  
  closeHelp.addEventListener('click', () => {
    helpModal.style.display = 'none';
    document.body.style.overflow = 'auto'; // 恢復背景滾動
  });
  
  // 點擊背景關閉彈出視窗
  helpModal.addEventListener('click', (e) => {
    if (e.target === helpModal) {
      helpModal.style.display = 'none';
      document.body.style.overflow = 'auto';
    }
  });
  
  // ESC 鍵關閉彈出視窗
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && helpModal.style.display === 'flex') {
      helpModal.style.display = 'none';
      document.body.style.overflow = 'auto';
    }
  });
}

function restoreLanguage() {
  try {
    const saved = localStorage.getItem('app_lang');
    if (saved && i18nDict[saved]) currentLang = saved;
  } catch (_) { currentLang = 'zh'; }
}

// Boot
window.addEventListener('DOMContentLoaded', () => {
  restoreLanguage();
  applyI18n();
  bindUI();
  initMap();
  updatePlanButtonState();
});
