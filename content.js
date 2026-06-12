/* content.js – v4.7 – Guard against double injection */
(function() {
  if (window.__FARM_ASSISTANT_LOADED) return;
  window.__FARM_ASSISTANT_LOADED = true;

console.log('Farm Assistant v4.7 – Guarded');
// DEBUG MODE – WŁĄCZ
const DEBUG_BIRDS = false;
function debugLog(...args) {
  if (DEBUG_BIRDS) console.log('[BIRDS DEBUG]', ...args);
}
let currentGarden = 'unknown';
let wateringActive = false;
let activeTasks = 0;
let stopRequested = false;
let wateringTool = null;  // CACHED TOOL
let inventoryCache = {};  // CACHED INVENTORY
const intervals = {};

/* ---------- HELPERS ---------- */
function humanDelay(min = 300, max = 500) {
  return new Promise(r => setTimeout(r, min + Math.random() * (max - min)));
}

// Get speed settings from storage
async function getSpeedSettings() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['water', 'plant'], (result) => {
      resolve({
        water: result.water || 'normal',
        plant: result.plant || 'normal'
      });
    });
  });
}

// Get delay based on speed setting
function getDelayForSpeed(speed, baseMin, baseMax) {
  switch (speed) {
    case 'fast': return [Math.floor(baseMin * 0.3), Math.floor(baseMax * 0.3)]; // Much faster
    case 'slow': return [Math.floor(baseMin * 1.5), Math.floor(baseMax * 1.5)];
    default: return [baseMin, baseMax];
  }
}

function updateTaskCount() {
  try {
    const cnt = Object.values(intervals).filter(Boolean).length + (wateringActive ? 1 : 0);
    chrome.storage.local.set({ activeTasks: cnt });
  } catch (e) { }
}

/* ---------- GARDEN DETECTION ---------- */
function detectGarden() {
  try {
    const old = currentGarden;
    let newLocation = 'unknown';

    // === PRIORITY 1: SPECIFIC LOCATIONS (check first!) ===
    const checks = [
      { id: 'park_map', value: 'park' },      // CHECK PARK FIRST! (park_map is the actual game ID)
      { id: 'bonsai', value: 'bonsai' },
      { id: 'birds', value: 'birds' },
      { id: 'mine', value: 'mine' },
      { id: 'trophycontainer', value: 'trophy' },
      { id: 'watergarden_container', value: 'water' }, // MOVED DOWN
      { id: 'citymap', value: 'city' }
    ];

    for (const check of checks) {
      const el = document.getElementById(check.id);
      // FIX: Use offsetParent to reliably detect visibility
      if (el && el.offsetParent !== null) {
        newLocation = check.value;
        break;
      }
    }

    // === PRIORITY 2: MAIN GARDEN (only if nothing else) ===
    if (newLocation === 'unknown') {
      const gardenDiv = document.getElementById('gardenDiv');
      if (gardenDiv && gardenDiv.offsetParent !== null) {
        newLocation = 'main';
      }
    }

    // === UPDATE ONLY IF CHANGED ===
    if (old !== newLocation) {
      currentGarden = newLocation;
      console.log(`Location → ${newLocation}`);
      wateringTool = null;
      try {
        chrome.runtime.sendMessage({
          action: 'locationChanged',
          location: newLocation
        });
      } catch (e) { }
    }
  } catch (e) {
    // console.warn('detectGarden failed:', e);
  }
}

/* ---------- MUTATION OBSERVER – NO SPAM ---------- */
let lastPopupClosed = 0;
let lastHarvestClose = 0;
let lastLocationCheck = 0;
let lastNewsClose = 0;
let lastSpecialOfferClose = 0;
let lastBaseDialogClose = 0;
let lastDailyBonusCollect = 0;

const observer = new MutationObserver(() => {
  try {
    // Throttle location detection to reduce console spam
    const now = Date.now();
    if (now - lastLocationCheck > 500) { // Check location every 0.5 seconds (very fast)
      detectGarden();
      lastLocationCheck = now;
    }

    // ── 1. Collect Daily Login Bonus ──
    const dailyBonus = document.getElementById('dailyloginbonus');
    if (dailyBonus && dailyBonus.offsetParent !== null && Date.now() - lastDailyBonusCollect > 3000) {
      const collectBtn = document.getElementById('dailyloginbonus_button');
      if (collectBtn && collectBtn.offsetParent !== null) {
        const claimInner = collectBtn.querySelector('.inner');
        if (claimInner) {
          console.log('[Farm Assistant] Collecting daily login bonus...');
          collectBtn.click();
          lastDailyBonusCollect = Date.now();
          lastPopupClosed = Date.now();
        }
      }
    }

    // ── 2. Close News Layer (newszwergLayer) ──
    const newsLayer = document.getElementById('newszwergLayer');
    if (newsLayer && newsLayer.offsetParent !== null && Date.now() - lastNewsClose > 3000) {
      const newsClose = newsLayer.querySelector('img.closeBtn');
      if (newsClose && newsClose.offsetParent !== null) {
        console.log('[Farm Assistant] Closing news layer...');
        newsClose.click();
        lastNewsClose = Date.now();
        lastPopupClosed = Date.now();
      }
    }

    // ── 3. Close Special Offer ──
    const specialOffer = document.getElementById('specialoffer');
    if (specialOffer && specialOffer.offsetParent !== null && Date.now() - lastSpecialOfferClose > 3000) {
      const offerClose = specialOffer.querySelector('.close');
      if (offerClose && offerClose.offsetParent !== null) {
        console.log('[Farm Assistant] Closing special offer...');
        offerClose.click();
        lastSpecialOfferClose = Date.now();
        lastPopupClosed = Date.now();
      }
    }

    // ── 4. Base Dialog auto-close REMOVED ──
    // Previously auto-closed reward popups, but caused conflicts with
    // park shop "Kup" dialogs, purchase confirmations, etc.
    // Specific popups (daily bonus, news, special offer, harvest logs) are handled above.

    // Close any harvest-related popups
    const harvestClose = document.querySelector('#wgErntelog .link.closeBtn, #ernte_log .link.closeBtn');
    if (harvestClose && Date.now() - lastHarvestClose > 1500) {
      harvestClose.click();
      lastHarvestClose = Date.now();
      lastPopupClosed = Date.now();
    }
    
    // Dismiss "nothing to harvest" dialog
    const nothingDialog = document.querySelector('#baseDialogText');
    if (nothingDialog && nothingDialog.textContent.includes('Nie ma nic')) {
      const okBtn = document.querySelector('#baseDialogButton .inner');
      if (okBtn && okBtn.textContent.trim() === 'OK') {
        okBtn.click();
        lastPopupClosed = Date.now();
      }
    }
  } catch (e) {
    // console.warn('Observer failed:', e);
  }
});
try { observer.observe(document.body, { childList: true, subtree: true, attributes: true }); } catch (e) { }
detectGarden();

// === PERIODIC LOCATION REFRESH ===
// Refresh location every 5 seconds if not recently checked
const LOCATION_REFRESH_INTERVAL = 5000;
const LOCATION_STALE_THRESHOLD = 3000;

setInterval(() => {
  try {
    const now = Date.now();
    if (now - lastLocationCheck > LOCATION_STALE_THRESHOLD) {
      detectGarden();
      lastLocationCheck = now;
    }
  } catch (e) {
    // Silent fail
  }
}, LOCATION_REFRESH_INTERVAL);

/* ---------- TICK-BASED AUTOMATION STATE ---------- */
// Uses local setInterval (faster, not throttled by Chrome)
let autoState = {
  water: { active: false, tiles: [], index: 0, running: false, intervalId: null },
  plant: { active: false, tiles: [], index: 0, running: false, intervalId: null },
  harvest: { active: false, running: false, intervalId: null },
};

const AUTO_INTERVAL = 300; // ms between auto ticks

function startAutoInterval(type) {
  // No-op: auto ticks come from background worker via chrome.alarms
  // State is activated so process[type]Tick knows to run
  autoState[type].active = true;
}

function stopAutoInterval(type) {
  const state = autoState[type];
  state.active = false;
  state.tiles = [];
  state.index = 0;
  if (state.intervalId) {
    clearInterval(state.intervalId);
    state.intervalId = null;
  }
}

async function processWaterTick() {
  const state = autoState.water;
  if (state.running || !state.active) return;
  state.running = true;

  try {
    // If no tiles cached or index out of range, scan for dry tiles
    if (state.tiles.length === 0 || state.index >= state.tiles.length) {
      state.tiles = [];
      state.index = 0;
      
      const toolSelected = await selectWateringTool();
      if (!toolSelected) { state.running = false; return; }

      const isWaterGarden = currentGarden === 'water';
      const selector = isWaterGarden
        ? '.grid.water:not(.blocked), .grid:not(.blocked):not(.water)'
        : '#gardenDiv .gardenfield.feld';
      const tiles = Array.from(document.querySelectorAll(selector));

      state.tiles = tiles.filter(t => {
        const img = t.querySelector('.plantImage');
        if (!img) return false;
        const style = isWaterGarden ? img.style.backgroundImage : img.style.background;
        if (!style) return false;
        const url = style.replace(/.*url\(["']?/, '').replace(/["')].*/, '');
        const keyMatch = url.match(/produkte\/([^.?_]+(_\d+)?)/);
        const key = keyMatch ? keyMatch[1] : '';
        if (!key || key === '0') return false;
        const isWatered = isWaterGarden
          ? window.getComputedStyle(t.querySelector('.water') || {}).display !== 'none'
          : t.querySelector('.wasser')?.src?.includes('gegossen.gif');
        return !isWatered;
      });

      if (state.tiles.length === 0) { state.running = false; return; }
    }

    // Process ONE tile
    const tile = state.tiles[state.index];
    if (tile) {
      const reselected = await selectWateringTool();
      if (reselected) {
        tile.click();
      }
    }
    state.index++;

    // If we processed the last tile, reset
    if (state.index >= state.tiles.length) {
      state.tiles = [];
      state.index = 0;
    }
  } catch (e) {
    state.tiles = [];
    state.index = 0;
  }

  state.running = false;
}

async function processPlantTick() {
  const state = autoState.plant;
  if (state.running || !state.active) return;
  state.running = true;

  try {
    if (state.tiles.length === 0 || state.index >= state.tiles.length) {
      state.tiles = [];
      state.index = 0;

      const isWaterGarden = currentGarden === 'water';
      const selector = isWaterGarden
        ? '#wgGrid .grid:not(.blocked)'
        : '#gardenDiv .gardenfield.feld';

      let allTiles = Array.from(document.querySelectorAll(selector));
      state.tiles = allTiles.filter(t => {
        const img = t.querySelector('.plantImage');
        if (!img) return false;
        const bg = img.style.backgroundImage || img.style.background || '';
        if (isWaterGarden) {
          return bg === 'none' || bg === '' || bg.includes('0.gif');
        } else {
          return bg.includes('0.gif');
        }
      });

      // If in water garden, check if the selected plant has restricted placement
      if (isWaterGarden) {
        state.tiles = filterRestrictedWaterTiles(state.tiles);
      }

      if (state.tiles.length === 0) { state.running = false; return; }
    }

    const tile = state.tiles[state.index];
    if (tile) tile.click();
    state.index++;

    if (state.index >= state.tiles.length) {
      state.tiles = [];
      state.index = 0;
    }
  } catch (e) {
    state.tiles = [];
    state.index = 0;
  }

  state.running = false;
}

async function processHarvestTick() {
  const state = autoState.harvest;
  if (state.running || !state.active) return;
  state.running = true;

  try {
    const isWaterGarden = currentGarden === 'water';
    if (isWaterGarden) {
      const btn = document.getElementById('wgHarvester');
      if (!btn) { state.running = false; return; }
      btn.click();
      await humanDelay(200, 300);
      // Close harvest log if it appeared
      const logClose = document.querySelector('#wgErntelog .link.closeBtn');
      if (logClose) logClose.click();
    } else {
      const btn = document.querySelector('.link.harvest');
      if (!btn) { state.running = false; return; }
      btn.click();
      await humanDelay(1400, 2000);
      const logClose = document.querySelector('#ernte_log .link.closeBtn');
      if (logClose) logClose.click();
    }
  } catch (e) {}

  state.running = false;
}

/* ---------- MESSAGE HANDLER ---------- */
chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
  if (req.action === 'ping') {
    sendResponse({
      ready: true,
      location: currentGarden
    });
    return true;
  }

  // Prevents top-frame from overriding the response with empty items
  if (req.action === 'getShoppingList' && currentGarden === 'unknown') {
    return false;
  }

  console.log('Action:', req.action);
  
  // Handle auto start/stop from background proxy
  if (req.action === 'startAuto' && ['water', 'plant', 'harvest'].includes(req.type)) {
    startAutoInterval(req.type);
    sendResponse({ success: true });
    return true;
  }
  if (req.action === 'stopAuto' && ['water', 'plant', 'harvest'].includes(req.type)) {
    stopAutoInterval(req.type);
    sendResponse({ success: true });
    return true;
  }
  
  // Handle tick from background worker alarm (NOT throttled)
  if (req.action === 'autoTick' && ['water', 'plant', 'harvest'].includes(req.type)) {
    if (autoState[req.type].active) {
      if (req.type === 'water') processWaterTick();
      else if (req.type === 'plant') processPlantTick();
      else if (req.type === 'harvest') processHarvestTick();
    }
    sendResponse({ success: true });
    return true;
  }

  (async () => {
    try {
      switch (req.action) {
        case 'findSeller': await findSeller(); break;
        case 'start_watering': case 'waterCrops': {
          // Full loop — process ALL dry tiles immediately
          await waterCrops();
          break;
        }
        case 'stop_watering': {
          stopWatering();
          stopAutoInterval('water');
          // Force stop by clearing the wateringActive flag
          wateringActive = false;
          break;
        }
        case 'plantCrops': {
          // Full loop — process ALL empty tiles immediately
          await plantCrops();
          break;
        }
        case 'harvestCrops': {
          // Full loop — harvest immediately
          await harvestCrops();
          break;
        }
        case 'toggleWater': toggleAutomation('water', req.enabled, waterCrops); break;
        case 'togglePlant': toggleAutomation('plant', req.enabled, plantCrops); break;
        case 'toggleHarvest': toggleAutomation('harvest', req.enabled, harvestCrops); break;
        case 'goGARDEN1': await goToGarden(1); break;
        case 'goGARDEN2': await goToGarden(2); break;
        case 'goWATER': await goToWaterGarden(); break;
        case 'goPARK': await goToLocation('park'); break;
        case 'goBONSAI': await goToLocation('bonsai'); break;
        case 'goBIRDS': await goToLocation('birds'); break;
        case 'goMINE': await goToLocation('mine'); break;
        case 'goTROPHY': await goToTrophy(); break;
        case 'autoTrophies': await autoTrophies(); break;
        case 'autoMine': await autoMine(); break;
        case 'renewParkDecorations': await renewParkDecorations(); break;
        case 'bonsaiTrim': await bonsaiTrim(); break;
        case 'birdsCollectRewards': await birdsCollectRewards(); break;
        case 'birdsAuto': await birdsAuto(); break;
        case 'showParkCalcOverlay': {
          showParkCalcOverlay();
          sendResponse({ success: true });
          return;
        }
        case 'getParkDecorationInfo': {
          try {
            const infoDiv = document.getElementById('park_info_expand');
            if (!infoDiv || infoDiv.offsetParent === null) {
              sendResponse({ error: 'not_in_park', message: 'Not in park location' });
              return;
            }

            // Extract decoration points
            const pointsLine = infoDiv.querySelector('.line');
            let points = 0;
            if (pointsLine) {
              const match = pointsLine.textContent.match(/(\d[\d.]*)/);
              if (match) points = parseInt(match[1].replace(/\./g, ''));
            }

            // Extract visitors from decorations
            const visitorDecoEl = document.getElementById('park_info_expand_visitor_deco');
            let currentVisitors = 0;
            if (visitorDecoEl) {
              const span = visitorDecoEl.querySelector('span');
              if (span) currentVisitors = parseInt(span.textContent.trim()) || 0;
            }

            // Extract max visitors from paths
            const visitorPathEl = document.getElementById('park_info_expand_visitor_path');
            let maxPathVisitors = 0;
            if (visitorPathEl) {
              const span = visitorPathEl.querySelector('span');
              if (span) maxPathVisitors = parseInt(span.textContent.trim()) || 0;
            }

            // Calculate thresholds using the formula: threshold(n) = 7 + 25 * n * (n - 1)
            function getThreshold(visitors) {
              return 7 + 25 * visitors * (visitors - 1);
            }

            // Build reference table up to 20 visitors
            const referenceTable = [];
            for (let v = 1; v <= 20; v++) {
              referenceTable.push({ visitors: v, pointsNeeded: getThreshold(v) });
            }

            // Find next milestone
            let nextVisitors = currentVisitors + 1;
            while (nextVisitors <= 20 && points >= getThreshold(nextVisitors)) {
              nextVisitors++;
            }
            if (nextVisitors > 20) nextVisitors = 20;

            const nextThreshold = getThreshold(nextVisitors);
            const pointsNeeded = nextThreshold - points;
            const progress = currentVisitors > 0 && nextVisitors > currentVisitors
              ? ((points - getThreshold(currentVisitors)) / (nextThreshold - getThreshold(currentVisitors))) * 100
              : 100;

            // Calculate effective visitors (limited by paths)
            const effectiveVisitors = Math.min(currentVisitors, maxPathVisitors);

            sendResponse({
              success: true,
              points,
              currentVisitors,
              maxPathVisitors,
              effectiveVisitors,
              nextVisitors,
              nextThreshold,
              pointsNeeded,
              progress: Math.min(100, Math.max(0, progress)),
              referenceTable
            });
            return;
          } catch (e) {
            console.error('Error getting park decoration info:', e);
            sendResponse({ error: 'parse_error', message: e.message });
            return;
          }
        }
        case 'getShoppingList': {
          try {
            // Switch to normal garden inventory for water garden
            if (currentGarden === 'water') {
              switchToNormalInventory();
              await humanDelay(500, 800);
            }

            const inventory = await scanInventory();
            const missingItems = await scanRemainingOrders(inventory);

            const items = Object.entries(missingItems).map(([name, data]) => ({
              name,
              needed: data.toBuy
            }));

            console.log('Content script sending shopping list:', { items });
            sendResponse({ items });
            return;
          } catch (e) {
            console.error('Error generating shopping list in content script:', e);
            sendResponse({ items: [] });
            return;
          }
        }
      }
      sendResponse({ success: true });
    } catch (e) {
      console.error('Action failed:', e);
      sendResponse({ success: false });
    }
  })();
  return true;
});

/* ---------- SMART TOOL FINDER – CACHE ONCE ---------- */
async function getWateringTool() {
  if (wateringTool && wateringTool.offsetParent !== null) {
    return wateringTool;
  }

  try {
    const giessen = document.getElementById('giessen')
      || document.querySelector('.menu-button[onclick*="selectMode(2"]');
    if (giessen && giessen.offsetParent !== null) {
      wateringTool = giessen;  // CACHE IT
      return giessen;
    }
  } catch (e) { }

  wateringTool = null;
  return null;
}

async function selectWateringTool() {
  const tool = await getWateringTool();
  if (!tool) return false;

  try {
    tool.click();
    await humanDelay(100, 200);
    return true;
  } catch (e) {
    wateringTool = null; // Invalidate cache
    return false;
  }
}

/* ---------- WATERING – USE CACHED TOOL ---------- */
async function waterCrops() {
  if (wateringActive) return;
  wateringActive = true;
  stopRequested = false;
  activeTasks++; updateTaskCount();
  console.log(`Starting ${currentGarden} watering…`);

  const toolSelected = await selectWateringTool();
  if (!toolSelected) {
    wateringActive = false; activeTasks--; updateTaskCount();
    return;
  }

  const isWaterGarden = currentGarden === 'water';
  const selector = isWaterGarden
    ? '.grid.water:not(.blocked), .grid:not(.blocked):not(.water)'  // Include both water and non-water grids
    : '#gardenDiv .gardenfield.feld';

  let dryTiles = [];
  try {
    const tiles = Array.from(document.querySelectorAll(selector));
    console.log(`Found ${tiles.length} total tiles in water garden`);

    dryTiles = tiles.filter(t => {
      if (stopRequested) return false;
      const img = t.querySelector('.plantImage');
      if (!img) return false;

      const style = isWaterGarden ? img.style.backgroundImage : img.style.background;
      if (!style) return false;

      const url = style.replace(/.*url\(["']?/, '').replace(/["')].*/, '');
      const keyMatch = url.match(/produkte\/([^.?_]+(_\d+)?)/);
      const key = keyMatch ? keyMatch[1] : '';
      if (!key || key === '0') return false;

      const isWatered = isWaterGarden
        ? window.getComputedStyle(t.querySelector('.water') || {}).display !== 'none'
        : t.querySelector('.wasser')?.src?.includes('gegossen.gif');

      return !isWatered;
    });

    console.log(`Dry tiles found: ${dryTiles.length}`);
    if (dryTiles.length === 0) {
      console.log('Debug: Checking first few tiles for water status...');
      tiles.slice(0, 5).forEach((tile, index) => {
        const img = tile.querySelector('.plantImage');
        const style = img ? img.style.backgroundImage : '';
        const keyMatch = style.match(/produkte\/([^.?_]+(_\d+)?)/);
        const key = keyMatch ? keyMatch[1] : '';
        const waterElement = tile.querySelector('.water');
        const isWatered = waterElement ? window.getComputedStyle(waterElement).display !== 'none' : false;
        console.log(`Tile ${index}: key=${key}, isWatered=${isWatered}, waterElement=${!!waterElement}`);
      });
    }
  } catch (e) {
    console.error('Error scanning tiles:', e);
  }

  console.log(`Watering ${dryTiles.length} dry tiles`);

  for (let idx = 0; idx < dryTiles.length; idx++) {
    const tile = dryTiles[idx];
    if (stopRequested) {
      console.log('Watering stopped by user');
      break;
    }

    const reselected = await selectWateringTool();
    if (!reselected) {
      // console.warn('Tool lost – stopping');
      break;
    }

    try {
      tile.click();
    } catch (e) { }

    // Get speed settings dynamically during watering
    const speedSettings = await getSpeedSettings();
    let [minDelay, maxDelay] = getDelayForSpeed(speedSettings.water, 50, 100);

    // Slow down for last 3 tiles to ensure they register
    const tilesLeft = dryTiles.length - idx;
    if (tilesLeft <= 3) {
      minDelay *= 3;
      maxDelay *= 3;
    }

    await humanDelay(minDelay, maxDelay);
  }

  wateringActive = false;
  activeTasks--; updateTaskCount();
  console.log('Watering finished');
  try { chrome.runtime.sendMessage({ action: 'wateringFinished' }); } catch (e) { }
}

function stopWatering() {
  if (!wateringActive) return;
  stopRequested = true;
  console.log('Stop requested – stopping after current tile');
}

/* ---------- RESTRICTED WATER GARDEN PLANTS ---------- */
// Plants that can only be placed on specific grid tiles (1×2 tall, etc.)
const WATER_GARDEN_RESTRICTED_PLANTS = {
  'Pałka szerokolistna': ['wgGrid69', 'wgGrid70', 'wgGrid103', 'wgGrid104', 'wgGrid180', 'wgGrid181', 'wgGrid182']
};

// Get the currently selected item name from the inventory detail panel
function getSelectedItemName() {
  const nameEl = document.getElementById('lager_name');
  if (!nameEl) return '';
  return nameEl.textContent.trim();
}

// Filter empty tiles to only allowed grids for restricted plants
function filterRestrictedWaterTiles(tiles) {
  const selectedItem = getSelectedItemName();
  const allowed = WATER_GARDEN_RESTRICTED_PLANTS[selectedItem];
  
  if (!allowed) {
    // Plant is not restricted — allow all empty tiles
    return tiles;
  }
  
  console.log(`[Farm Assistant] "${selectedItem}" is restricted to ${allowed.length} specific tiles`);
  return tiles.filter(t => allowed.includes(t.id));
}

/* ---------- PLANTING – WATER GARDEN: background-image: none ---------- */
async function plantCrops() {
  const isWaterGarden = currentGarden === 'water';
  const selector = isWaterGarden
    ? '#wgGrid .grid:not(.blocked)'
    : '#gardenDiv .gardenfield.feld';

  let emptyTiles = Array.from(document.querySelectorAll(selector)).filter(t => {
    const img = t.querySelector('.plantImage');
    if (!img) return false;

    const bg = img.style.backgroundImage || img.style.background || '';

    if (isWaterGarden) {
      return bg === 'none' || bg === '' || bg.includes('0.gif');
    } else {
      return bg.includes('0.gif');
    }
  });

  // If in water garden, check if the selected plant has restricted placement
  if (isWaterGarden) {
    emptyTiles = filterRestrictedWaterTiles(emptyTiles);
  }

  console.log(`Planting ${emptyTiles.length} empty tiles (${currentGarden})`);

  // Get speed settings
  const speedSettings = await getSpeedSettings();
  const [minDelay, maxDelay] = getDelayForSpeed(speedSettings.plant, 200, 300);

  for (const tile of emptyTiles) {
    tile.click();
    await humanDelay(minDelay, maxDelay);
  }
  console.log('Planting done');
}

/* ---------- HARVEST – WATER GARDEN SUPPORT ---------- */
async function harvestCrops() {
  const isWaterGarden = currentGarden === 'water';

  if (isWaterGarden) {
    const btn = document.getElementById('wgHarvester');
    if (!btn) return;
    btn.click();
    await humanDelay(200, 300); // faster than 1800–2400

    const closeBtn = document.querySelector('#wgErntelog .link.closeBtn');
    if (closeBtn) closeBtn.click();
  } else {
    const btn = document.querySelector('.link.harvest');
    if (!btn) return;
    btn.click();
    await humanDelay(1400, 2000); // faster than 1400–2000

    const closeBtn = document.querySelector('#ernte_log .link.closeBtn');
    if (closeBtn) closeBtn.click();
  }
}

/* ---------- CONSTANTS ---------- */
const MAX_WIMP_SLOTS = 14;  // i0 to i13
const MAX_BIRD_HOUSES = 2;  // Only first 2 houses are unlocked
const MAX_QUEST_SLOTS = 10;

// Retry configuration
const RETRY = {
  SHORT: 15,    // For quick UI checks
  MEDIUM: 25,   // Standard retry count
  LONG: 30      // For slower operations
};

// Delay configuration (ms)
const DELAY = {
  MICRO: [50, 100],
  SHORT: [100, 150],
  MEDIUM: [500, 800],
  LONG: [800, 1200],
  DIALOG: [1000, 1500]
};

/* ---------- FIND SELLER – FAST + CONTINUE ---------- */
async function findSeller() {
  console.log('Scanning i13 to i0...');
  for (let i = MAX_WIMP_SLOTS - 1; i >= 0; i--) {
    const wimp = document.getElementById(`i${i}`);
    if (!wimp) continue;

    wimp.click(); // instant, no delay before checking buttons

    const yes = document.getElementById('wimpVerkaufYes');
    if (yes && !yes.classList.contains('inactive')) {
      yes.click();
      console.log(`SOLD to i${i}`);
      await humanDelay(800, 1000); // only delay after sale
    } else {
      const later = document.getElementById('wimpVerkaufLater');
      if (later) later.click(); // instant "later" click, no delay
    }
  }
  console.log('Scan complete');
}

async function scanInventory() {
  console.log('Scanning inventory...');

  // Load cache
  const cached = await chrome.storage.local.get(['inventoryCache']);
  inventoryCache = cached.inventoryCache || {};

  const inventory = {};

  // Scan page 1
  await scanInventoryPage(inventory);

  // Go to page 2
  const rightArrow = document.getElementById('lager_arrow_right');
  if (rightArrow && !rightArrow.src.includes('disabled')) {
    rightArrow.click();
    await humanDelay(500, 700);
    await scanInventoryPage(inventory);

    // Back to page 1
    const leftArrow = document.getElementById('lager_arrow_left');
    if (leftArrow) {
      leftArrow.click();
      await humanDelay(500, 700);
    }
  }

  // Save cache
  chrome.storage.local.set({ inventoryCache });

  console.log('Inventory scan complete:', inventory);
  return inventory;
}

async function scanInventoryPage(inventory) {
  const items = document.querySelectorAll('.regalItem');

  for (const item of items) {
    if (item.style.display === 'none') continue;

    const quantityDiv = item.querySelector('.anz');
    const quantity = quantityDiv ? parseInt(quantityDiv.textContent.replace(/\./g, '').replace(/,/g, '')) : 0;

    const classMatch = item.querySelector('.bild')?.className.match(/e(\d+)/);
    const eClass = classMatch ? classMatch[0] : null;

    let itemName = inventoryCache[eClass];

    if (!itemName && eClass) {
      item.click();
      await humanDelay(200, 300);

      const nameDiv = document.getElementById('lager_name');
      if (nameDiv) {
        itemName = nameDiv.textContent.trim();
        inventoryCache[eClass] = itemName;
      }
    }

    if (itemName) {
      inventory[itemName] = (inventory[itemName] || 0) + quantity;
    }
  }
}

async function scanRemainingOrders(inventory) {
  console.log('Scanning remaining orders...');

  const allNeeded = {};

  for (let i = 13; i >= 0; i--) {
    const wimp = document.getElementById(`i${i}`);
    if (!wimp) continue;

    wimp.click();
    await humanDelay(100, 150);

    const productsDiv = document.getElementById('wimpVerkaufProducts');
    if (productsDiv) {
      const items = productsDiv.querySelectorAll('div');

      for (const item of items) {
        const text = item.textContent.trim();
        const match = text.match(/(\d+)\s*x\s*(.+)/);

        if (match) {
          const quantity = parseInt(match[1]);
          const name = match[2].trim();

          allNeeded[name] = (allNeeded[name] || 0) + quantity;
        }
      }
    }

    const later = document.getElementById('wimpVerkaufLater');
    if (later) later.click();
    await humanDelay(50, 100);
  }

  // Calculate missing
  const missing = {};

  for (const [name, needed] of Object.entries(allNeeded)) {
    const have = inventory[name] || 0;
    if (have < needed) {
      missing[name] = {
        need: needed,
        have: have,
        toBuy: needed - have
      };
    }
  }

  console.log('Missing items:', missing);
  return missing;
}

/* ---------- NAWIGACJA PO LOKACJACH + RETRY DETECTION ---------- */
async function goToGarden(gardenNum) {
  const bike = document.getElementById('wimpareaCar') || document.getElementById('wgMap');
  if (!bike) return;
  bike.click();
  await humanDelay(800, 1200);

  const btn = document.getElementById(`citymap_location_garden${gardenNum}`);
  if (btn) {
    btn.click();
    await retryDetectGarden('main');
  }
}

async function goToWaterGarden() {
  const bike = document.getElementById('wimpareaCar') || document.getElementById('wgMap');
  if (!bike) return;
  bike.click();
  await humanDelay(800, 1200);

  const btn = document.getElementById('citymap_location_watergarden');
  if (btn) {
    btn.click();
    await retryDetectGarden('water');
  }
}

async function goToLocation(loc) {
  const bike = document.getElementById('wimpareaCar') || document.getElementById('wgMap');
  if (!bike) return;
  bike.click();
  await humanDelay(800, 1200);

  const btn = document.getElementById(`citymap_location_${loc}`);
  if (btn) {
    btn.click();
    await retryDetectGarden(loc); // Pass 'park', 'bonsai', etc.
  }
}

/* ---------- ERROR HANDLING WRAPPER ---------- */
function safeExecute(fn, errorMessage = 'Operation failed') {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      console.error(`${errorMessage}:`, error);
      showNotification(errorMessage);
      throw error;
    }
  };
}

/* ---------- RETRY DETECTION HELPER ---------- */
async function retryDetectGarden(expectedLocation, maxRetries = 5) {
  const previousLocation = currentGarden;

  for (let i = 0; i < maxRetries; i++) {
    await humanDelay(...DELAY.MEDIUM);
    detectGarden();

    // Success: location changed and is valid
    if (currentGarden !== previousLocation &&
        currentGarden !== 'city' &&
        currentGarden !== 'unknown') {
      debugLog(`Location detected after retry ${i + 1}: ${currentGarden}`);
      return;
    }

    debugLog(`Retry ${i + 1}: still ${currentGarden}, waiting...`);
  }

  //console.warn(`Location detection timeout. Expected: ${expectedLocation}, Got: ${currentGarden}`);
}

// NOTIFICATIONS – DZIAŁA W CONTENT I POPUP
function showNotification(message) {
  // Jeśli jesteśmy w popup → użyj DOM
  if (typeof document !== 'undefined' && document.body) {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);
      background: rgba(255, 251, 72, 0.95); color: #000; padding: 12px 24px;
      border-radius: 8px; font-size: 13px; font-weight: 600; z-index: 10000;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3); animation: fadeInOut 3s forwards;
    `;
    document.body.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 2700);
  }
  // Jeśli nie → wyślij do popup
  else {
    try { chrome.runtime.sendMessage({ action: 'showToast', message }); } catch (e) { }
  }
}

/* ---------- PARK RENEWAL + CASHPOINT + OK – 100% FINAL ---------- */
async function renewParkDecorations() {
  if (currentGarden !== 'park') {
    showNotification('Musisz być w Parku Miejskim!');
    return;
  }

  console.log('Rozpoczynam odnawianie dekoracji...');
  activeTasks++; updateTaskCount();

  let renewed = 0;

  // === ETAP 1: ODNAWIANIE DEKORACJI ===
  while (true) {
    const expiredTile = document.querySelector('.tile.warning');
    if (!expiredTile) break;

    const item = expiredTile.querySelector('.item');
    if (!item) break;

    console.log(`Klikam dekorację #${++renewed}: ${item.className}`);
    item.click();
    await humanDelay(400, 600);

    let renewBtn = null;
    for (let i = 0; i < 25; i++) {
      renewBtn = Array.from(document.querySelectorAll('#baseDialogInner .scalebutton .inner'))
        .find(el => el.textContent.includes('Odnów'));
      if (renewBtn) break;
      await humanDelay(300, 400);
    }

    if (renewBtn) {
      console.log('Klikam "Odnów"...');
      renewBtn.click();
      await humanDelay(160, 220);
    } else {
      // console.warn('Brak "Odnów" – zamykam...');
      const close = document.getElementById('baseDialogClose');
      if (close) close.click();
      await humanDelay(100, 150);
    }

    await humanDelay(100, 300);
  }

  // === ETAP 2: KASA – ODBIERZ + OK ===
  console.log('Dekoracje odnowione. Sprawdzam kasę...');
  const cashButton = document.getElementById('park_cashpointbutton');
  if (cashButton && window.getComputedStyle(cashButton).display !== 'none') {
    console.log('Klikam "Kasa"...');
    cashButton.click();
    await humanDelay(1200, 1600);

    // CZEKAJ NA "Odbierz"
    let odbierzBtn = null;
    for (let i = 0; i < 30; i++) {
      odbierzBtn = document.querySelector('#park_cashpoint_inner .scalebutton .inner');
      if (odbierzBtn && odbierzBtn.textContent.trim() === 'Odbierz') break;
      await humanDelay(100, 150);
    }

    if (odbierzBtn) {
      console.log('Klikam "Odbierz"...');
      odbierzBtn.click();
      await humanDelay(1500, 2000);

      // CZEKAJ NA "OK" W POTWIERDZENIU
      let okBtn = null;
      for (let i = 0; i < 25; i++) {
        okBtn = Array.from(document.querySelectorAll('#baseDialogInner .scalebutton .inner'))
          .find(el => el.textContent.trim() === 'OK');
        if (okBtn) break;
        await humanDelay(100, 150);
      }

      if (okBtn) {
        console.log('Klikam "OK"...');
        okBtn.click();
        await humanDelay(800, 1200);

        // Close cashpoint after OK
        const cashpointClose = document.querySelector('.link2.closeButton[onclick*="park.closeCashpoint"]');
        if (cashpointClose) {
          console.log('Klikam "X" w kasie...');
          cashpointClose.click();
          await humanDelay(300, 500);
        }

        showNotification(`Odnowiono ${renewed} dekoracji + odebrano kasę!`);
      } else {
        // console.warn('Brak "OK" – zamykam...');
        const close = document.getElementById('baseDialogClose');
        if (close) close.click();
      }
    } else {
      console.log('Brak "Odbierz" – kasa pusta.');
      const close = document.querySelector('.link2.closeButton');
      if (close) close.click();
      showNotification(`Odnowiono ${renewed} dekoracji!`);
    }
  } else {
    showNotification(`Odnowiono ${renewed} dekoracji!`);
  }

  activeTasks--; updateTaskCount();
}

/* ---------- BONSAI TRIM – FINAL VERSION ---------- */
async function bonsaiTrim() {
  if (currentGarden !== 'bonsai') {
    showNotification('Musisz być w Bonsai!');
    return;
  }

  console.log('Rozpoczynam przycinanie Bonsai...');
  activeTasks++; updateTaskCount();

  // === KROK 1: SPRAWDŹ NOŻYCE ===
  const scissorAmount = document.querySelector('#bonsai_scissor_link .amount');
  let scissors = 0;
  if (scissorAmount) {
    scissors = parseInt(scissorAmount.textContent) || 0;
    console.log(`Masz ${scissors} nożyc`);
  }

  if (scissors === 0) {
    console.log('Brak nożyc – kupuję...');

    // Kliknij sklep
    const shopBtn = document.getElementById('bonsai_shop_link');
    if (shopBtn) {
      shopBtn.click();
      await humanDelay(800, 1200);
    }

    // Wybierz nożyce
    const scissorItem = document.querySelector('.item.link[onclick*="bonsai.shop(\'scissor\'"]');
    if (scissorItem) {
      scissorItem.click();
      await humanDelay(800, 1200);
    }

    // Kup 10 za 2k (tańsze)
    const buy10Btn = document.querySelector('.scalebutton[onclick*="bonsai.buyItemCommitCommit"][onclick*="10"]');
    if (buy10Btn) {
      buy10Btn.click();
      await humanDelay(800, 1200);

      // Potwierdź
      const confirmBtn = document.querySelector('#bonsai_shop_button21');
      if (confirmBtn) {
        confirmBtn.click();
        await humanDelay(1200, 1600);
        scissors = 10;
        console.log('Kupiono 10 nożyc');
      }
    }
  }

  if (scissors > 0) {
    // === KROK 2: PRZYTNIEJ GAŁĘZIE ===
    console.log('Przycinam gałęzie...');
    const branches = document.querySelectorAll('#bonsai_tree_branches .branch');

    for (let i = 0; i < branches.length && scissors > 0; i++) {
      const branchEl = branches[i];
      if (branchEl) {
        console.log(`Przycinam gałąź ${i + 1}...`);
        branchEl.click();
        await humanDelay(1000, 1400);
        scissors--; // Zużyj nożyce

        // Refresh branch list after each cut to handle dynamic updates
        const remainingBranches = document.querySelectorAll('#bonsai_tree_branches .branch');
        if (remainingBranches.length === 0) break;
      }
    }
  }

  activeTasks--; updateTaskCount();
  showNotification(`Przycięto Bonsai (${scissors} nożyc pozostało)!`);
}

/* ---------- BIRDS FULL AUTO: FINAL – KLIKA PTAKA BEZPOŚREDNIO ---------- */

// SWITCH TO NORMAL GARDEN INVENTORY (FOR WATER GARDEN)
function switchToNormalInventory() {
  // Look for the normal garden inventory button
  const normalButton = document.querySelector('.normal[data-tip*="Regał dla normalnych ogrodów"]');

  if (normalButton) {
    console.log('Found normal garden inventory button, clicking...');
    normalButton.click();
    return true;
  }

  // Alternative selector if the above doesn't work
  const normalButtonAlt = document.querySelector('.normal[onclick*="regal.loadNormal"]');

  if (normalButtonAlt) {
    console.log('Found normal garden inventory button (alt), clicking...');
    normalButtonAlt.click();
    return true;
  }

  console.log('Normal garden inventory button not found');
  return false;
}

async function birdsAuto() {
  if (currentGarden !== 'birds') return showNotification('Musisz być w Ptaszarni!');

  activeTasks++; updateTaskCount();

  let collected = 0, fed = 0, started = 0, bought = 0;

  // === STEP 1: COLLECT REWARDS ===
  console.log('=== STEP 1: Collecting rewards ===');
  const rewardSlots = Array.from(document.querySelectorAll('#birds_jobs .slot .timer'))
    .filter(timer => timer.textContent.includes('Odbierz nagrodę'));

  for (const timer of rewardSlots) {
    const slot = timer.closest('.slot');
    if (!slot) continue;

    slot.click(); await humanDelay(1000, 1400);

    let odbierzBtn = null;
    for (let i = 0; i < 25; i++) {
      odbierzBtn = document.getElementById('birds_job_finishbutton');
      if (odbierzBtn && odbierzBtn.style.display !== 'none') break;
      await humanDelay(100, 150);
    }

    if (odbierzBtn) {
      odbierzBtn.click(); await humanDelay(1400, 1800);

      let okBtn = null;
      for (let i = 0; i < 25; i++) {
        okBtn = Array.from(document.querySelectorAll('#baseDialogInner .scalebutton .inner'))
          .find(el => el.textContent.trim() === 'OK');
        if (okBtn) break;
        await humanDelay(100, 150);
      }

      if (okBtn) okBtn.click();
      collected++;
    }

    await humanDelay(600, 900);
  }
  console.log(`Collected ${collected} rewards`);

  // === STEP 2: FEED BIRDS ===
  console.log('=== STEP 2: Feeding birds ===');
  const houseSlots = document.querySelectorAll('#birds_houses_slots .slot');
  console.log(`Found ${houseSlots.length} house slots`);
  
  for (const slot of houseSlots) {
    const slotId = slot.id.match(/slot(\d+)/)?.[1];
    if (!slotId) {
      console.log('Slot ID not found, skipping');
      continue;
    }

    console.log(`Checking house slot ${slotId}...`);

    // Check if house has a bird
    const birdElement = document.querySelector(`#birds_houses_slot${slotId}_bird`);
    if (!birdElement) {
      console.log(`No bird found in slot ${slotId}, skipping`);
      continue; // Skip empty houses
    }
    console.log(`Found bird in slot ${slotId}`);

    // Step 1: Click on the bird first to select it and show buttons
    console.log(`Clicking bird in slot ${slotId}...`);
    birdElement.click();
    await humanDelay(1000, 1400);

    // Step 2: Check endurance after clicking bird (buttons should be visible now)
    // Try multiple selectors for endurance
    let enduranceEl = slot.querySelector('.endurance .value');
    if (!enduranceEl) {
      enduranceEl = slot.querySelector('.endurance');
    }
    if (!enduranceEl) {
      enduranceEl = document.querySelector(`#birds_houses_slot${slotId}_endurance .value`);
    }
    
    let current = 0, max = 0;
    let needsFeeding = true;
    
    if (enduranceEl) {
      const enduranceText = enduranceEl.textContent.trim();
      console.log(`Endurance text for slot ${slotId}: "${enduranceText}"`);
      
      const enduranceMatch = enduranceText.match(/(\d+)\s*\/\s*(\d+)/);
      if (enduranceMatch) {
        current = parseInt(enduranceMatch[1]) || 0;
        max = parseInt(enduranceMatch[2]) || 0;
        console.log(`Parsed endurance for slot ${slotId}: ${current}/${max}`);
        
        if (current >= max && max > 0) {
          console.log(`Bird in slot ${slotId} already full (${current}/${max}), skipping`);
          needsFeeding = false;
        }
      } else {
        console.log(`Could not parse endurance for slot ${slotId}, assuming needs feeding`);
      }
    } else {
      console.log(`No endurance element found for slot ${slotId}, assuming needs feeding`);
    }

    if (!needsFeeding) {
      continue;
    }

    debugLog(`Bird in slot ${slotId} needs feeding`);

    // Step 3: Find and click the feed button (try multiple selectors)
    const feedBtnSelectors = [
      `#birds_houses_slot${slotId}_buttons .button.feed`,
      `.button.feed[onclick*="birds.feedBirdCommit(${slotId})"]`,
      ...(Array.from(slot.querySelectorAll('.button.feed')).filter(b => 
        b.getAttribute('onclick')?.includes(`feedBirdCommit(${slotId})`)
      ).map(b => b))
    ];
    
    let feedBtn = null;
    for (const sel of feedBtnSelectors) {
      feedBtn = typeof sel === 'string' ? document.querySelector(sel) : sel;
      if (feedBtn) break;
    }

    if (!feedBtn) {
      // console.warn(`Feed button not found for slot ${slotId}`);
      continue;
    }

    debugLog(`Clicking feed button for slot ${slotId}...`);
    feedBtn.click();
    await humanDelay(...DELAY.DIALOG);

    // Step 4: Confirm feeding by clicking "Tak"
    const takBtn = await waitForElement(() => {
      const btn = Array.from(document.querySelectorAll('#baseDialogInner .scalebutton .inner'))
        .find(el => el.textContent.trim() === 'Tak');
      return btn?.closest('.scalebutton')?.style.display !== 'none' ? btn : null;
    }, RETRY.MEDIUM);

    if (takBtn) {
      console.log(`Confirming feed for slot ${slotId}...`);
      takBtn.click();
      await humanDelay(1200, 1600);
      fed++;
      console.log(`Successfully fed bird in slot ${slotId}`);
    } else {
      // console.warn(`No "Tak" button found for slot ${slotId}, closing dialog...`);
      const close = document.getElementById('baseDialogClose');
      if (close) close.click();
    }

    await humanDelay(600, 900);
  }
  console.log(`Fed ${fed} birds`);

  // === STEP 3: DO QUESTS ===
  console.log('=== STEP 3: Starting quests ===');
  let skippedDueToMissingProducts = false;  // Flag to skip bird buying if quests were skipped
  const jobSlots = Array.from(document.querySelectorAll('#birds_job_overview_slot1, #birds_job_overview_slot2, #birds_job_overview_slot3, #birds_job_overview_slot4, #birds_job_overview_slot5, #birds_job_overview_slot6, #birds_job_overview_slot7, #birds_job_overview_slot8, #birds_job_overview_slot9, #birds_job_overview_slot10'))
    .filter(slot => {
      const timer = slot.querySelector('.timer');
      const hasSize = !!slot.querySelector('.size');
      const hasLocked = !!slot.querySelector('.locked');
      const isUnlocked = hasSize && !hasLocked;
      const isEmpty = timer && timer.textContent.trim() === '';
      debugLog('Slot:', slot.id, { isUnlocked, isEmpty });
      return isUnlocked && isEmpty;
    });

  debugLog('Number of empty quest slots:', jobSlots.length);

  for (const slot of jobSlots) {
    const slotNum = slot.id.match(/slot(\d+)/)?.[1];
    debugLog('Clicking quest slot:', slotNum);
    slot.click();
    await humanDelay(1500, 2000);

    let jobOpen = false;
    for (let i = 0; i < 30; i++) {
      if (document.querySelector('#birds_job_birdslot')) {
        jobOpen = true;
        debugLog('Quest dialog open!');
        break;
      }
      await humanDelay(100);
    }
    if (!jobOpen) continue;

    let birdSelected = false;
    for (let i = 1; i <= 10 && !birdSelected; i++) {
      const bird = document.getElementById(`birds_houses_slot${i}_bird`);
      if (!bird) {
        debugLog(`House ${i}: no bird`);
        continue;
      }

      const blocks = bird.closest('.slot')?.querySelectorAll('.endurance .block.full');
      if (!blocks || blocks.length === 0) {
        debugLog(`House ${i}: no endurance`);
        continue;
      }

      const current = blocks.length;
      debugLog(`House ${i}: endurance ${current} blocks`);

      if (current === 0) continue;

      debugLog(`Clicking bird in house ${i}...`);
      bird.click();
      await humanDelay(1200, 1600);

      for (let wait = 0; wait < 25; wait++) {
        if (document.querySelector('#birds_job_birdslot .bird')) {
          debugLog('Bird selected for quest!');
          birdSelected = true;
          break;
        }
        await humanDelay(100);
      }
    }

    if (!birdSelected) {
      debugLog('No bird selected for quest');
      const backBtn = document.querySelector('.link.closeButton[onclick*="setJobSlot(0)"]');
      if (backBtn) backBtn.click();
      await humanDelay(1000);
      continue;
    }

    // === SPRAWDŹ CZY MAMY PRODUKTY ===
    // Poczekaj chwilę na załadowanie produktów
    await humanDelay(500, 800);
    
    const productsContainer = document.querySelector('.products');
    debugLog('Products container:', productsContainer ? 'found' : 'NOT FOUND');
    
    if (productsContainer) {
      const allProductLines = productsContainer.querySelectorAll('.line');
      debugLog('Product lines found:', allProductLines.length);
      
      allProductLines.forEach((line, idx) => {
        const amountEl = line.querySelector('.amount');
        const isImportant = amountEl?.classList.contains('important');
        debugLog(`  Line ${idx}:`, amountEl?.textContent.trim(), '| important:', isImportant);
      });
    }
    
    const missingProducts = document.querySelectorAll('.products .amount.important');
    debugLog('Missing products count:', missingProducts.length);
    
    if (missingProducts.length > 0) {
      debugLog('Brakuje produktów:', Array.from(missingProducts).map(el => el.textContent.trim()));
      skippedDueToMissingProducts = true;  // Mark that we skipped due to missing products
      
      // Kliknij "Usuń zlecenie"
      const removeBtn = document.querySelector('.link.removebutton, .removebutton');
      debugLog('Remove button:', removeBtn ? 'found' : 'NOT FOUND');
      
      if (removeBtn) {
        debugLog('Usuwam zlecenie...');
        removeBtn.click();
        await humanDelay(800, 1200);
        
        // Potwierdź usunięcie - kliknij "Tak"
        let yesBtn = null;
        for (let i = 0; i < 25; i++) {
          yesBtn = document.getElementById('baseDialogButton');
          const innerText = yesBtn?.querySelector('.inner')?.textContent.trim();
          if (yesBtn && innerText === 'Tak') {
            debugLog('Found Tak button');
            break;
          }
          await humanDelay(100, 150);
        }
        
        if (yesBtn) {
          debugLog('Potwierdzam usunięcie (Tak)...');
          yesBtn.click();
          await humanDelay(1000, 1500);
        }
      }
      
      const backBtn = document.querySelector('.link.closeButton[onclick*="setJobSlot(0)"]');
      if (backBtn) backBtn.click();
      await humanDelay(1000);
      continue;
    }

    let startBtn = null;
    for (let i = 0; i < 30; i++) {
      startBtn = document.querySelector('.startbutton.scalebutton:not(.grayscale) .inner');
      if (startBtn && startBtn.textContent.includes('Rozpocznij')) {
        debugLog('Clicking "Start"');
        startBtn.click();
        started++;
        break;
      }
      await humanDelay(100);
    }

    const backBtn = document.querySelector('.link.closeButton[onclick*="setJobSlot(0)"]');
    if (backBtn) backBtn.click();
    await humanDelay(1000);
  }
  console.log(`Started ${started} quests`);

  // === STEP 4: BUY BIRDS FOR EMPTY HOUSES (separate from main flow) ===
  // Skip buying birds if we skipped quests due to missing products or no quests were started
  if (skippedDueToMissingProducts) {
    console.log('=== STEP 4: SKIPPED - Quests were skipped due to missing products ===');
  } else if (started === 0) {
    console.log('=== STEP 4: SKIPPED - No quests were started ===');
  } else {
    console.log('=== STEP 4: Buying birds for empty houses ===');
    await buyBirdsForEmptyHouses();
  }

  activeTasks--; updateTaskCount();
  showNotification(`Birds Auto: ${collected} rewards, ${fed} fed, ${started} quests started, ${bought} birds bought!`);
}

/* ---------- HELPER: BUY BIRDS FOR EMPTY HOUSES ---------- */

// Helper: Wait for element to appear with retry logic
async function waitForElement(selector, maxRetries = RETRY.MEDIUM, delayFn = () => humanDelay(...DELAY.SHORT)) {
  for (let i = 0; i < maxRetries; i++) {
    const el = typeof selector === 'function' ? selector() : document.querySelector(selector);
    if (el) return el;
    await delayFn();
  }
  return null;
}

// Helper: Find and purchase a bird from the shop
async function purchaseBirdFromShop(slotId) {
  // Wait for shop to open
  const shopOpen = await waitForElement('#birds_birdshop_slots', RETRY.SHORT, () => humanDelay(...DELAY.MICRO));
  if (!shopOpen) {
    // console.warn('Shop did not open');
    return false;
  }
  
  await humanDelay(...DELAY.MICRO);
  
  // Find Gołąb slot (bird3)
  const golabSlot = Array.from(document.querySelectorAll('#birds_birdshop_slots > .slot'))
    .find(s => s.querySelector('.bird.bird3'));
  
  if (!golabSlot) {
    // console.warn('Gołąb slot not found');
    return false;
  }
  
  const hasCheckbox = golabSlot.querySelector('.cost .ready');
  
  if (hasCheckbox) {
    // Already unlocked - just click to select
    golabSlot.click();
    await humanDelay(...DELAY.MEDIUM);
  } else {
    // Need to purchase
    const buyBtn = golabSlot.querySelector('.cost .scalebutton[onclick*="birds.buyBirdCommit(1, 3)"]');
    if (!buyBtn) {
      // console.warn('Buy button not found');
      return false;
    }
    
    buyBtn.click();
    await humanDelay(...DELAY.LONG);
    
    // Wait for confirmation dialog
    const dialog = await waitForElement(() => {
      const d = document.querySelector('#baseDialogInner');
      return d?.offsetParent ? d : null;
    }, RETRY.LONG);
    
    if (!dialog) {
      // console.warn('Confirmation dialog did not appear');
      return false;
    }
    
    await humanDelay(...DELAY.MICRO);
    
    // Click "Tak" button
    const confirmBtn = document.querySelector('#baseDialogButton');
    if (!confirmBtn) {
      // console.warn('Confirm button not found');
      return false;
    }
    
    confirmBtn.click();
    await humanDelay(...DELAY.LONG);
  }
  
  // Wait for bird to appear in house
  const birdPlaced = await waitForElement(
    `#birds_houses_slot${slotId}_bird`,
    RETRY.LONG,
    () => humanDelay(...DELAY.SHORT)
  );
  
  if (!birdPlaced) {
    // console.warn('Bird was not placed in house');
    return false;
  }
  
  // Close shop
  const closeBtn = document.querySelector('.link.closeButton[onclick*="hideDiv(\'birds_birdshop\')"]');
  if (closeBtn) {
    closeBtn.click();
    await humanDelay(...DELAY.MICRO);
  }
  
  return true;
}

// Helper: Remove expired bird from house
async function removeExpiredBird(slotId) {
  const removeBtn = document.querySelector(`#birds_houses_slot${slotId}_buttons .button.remove`);
  if (!removeBtn) return false;
  
  removeBtn.click();
  await humanDelay(...DELAY.MEDIUM);
  
  // Confirm removal
  const confirmBtn = await waitForElement(() => {
    const btn = Array.from(document.querySelectorAll('#baseDialogInner .scalebutton .inner'))
      .find(el => el.textContent.trim() === 'Tak');
    return btn?.closest('.scalebutton');
  }, RETRY.SHORT);
  
  if (!confirmBtn) {
    // console.warn('Remove confirmation button not found');
    return false;
  }
  
  confirmBtn.click();
  await humanDelay(...DELAY.LONG);
  return true;
}

// Main function: Buy birds for empty houses
async function buyBirdsForEmptyHouses() {
  let bought = 0;
  const houseSlots = document.querySelectorAll('#birds_houses_slots .slot');
  
  for (const slot of houseSlots) {
    const slotId = slot.id.match(/slot(\d+)/)?.[1];
    if (!slotId) continue;
    
    // Only check first N houses (others are locked)
    const slotNum = parseInt(slotId);
    if (slotNum > MAX_BIRD_HOUSES) {
      debugLog(`House ${slotId} skipped - only first ${MAX_BIRD_HOUSES} houses are unlocked`);
      continue;
    }
    
    const birdElement = document.querySelector(`#birds_houses_slot${slotId}_bird`);
    const enduranceEl = slot.querySelector('.endurance .value');
    const [currentEndurance] = enduranceEl?.textContent.split('/').map(n => parseInt(n) || 0) || [0, 0];
    
    let needsPurchase = false;
    
    if (!birdElement) {
      // Empty house - need to buy
      console.log(`House ${slotId} is empty, buying bird...`);
      needsPurchase = true;
    } else if (currentEndurance === 0) {
      // Expired bird - remove first, then buy
      console.log(`Bird in house ${slotId} expired, removing and buying new...`);
      const removed = await removeExpiredBird(slotId);
      if (!removed) continue;
      needsPurchase = true;
    }
    
    if (needsPurchase) {
      const shopBtn = document.querySelector(`#birds_houses_slot${slotId}_buttons .button.shop`);
      if (!shopBtn) continue;
      
      shopBtn.click();
      await humanDelay(...DELAY.MEDIUM);
      
      const success = await purchaseBirdFromShop(slotId);
      if (success) {
        bought++;
        console.log(`Successfully bought bird for house ${slotId}`);
      }
    }
  }
  
  return bought;
}

/* ---------- GO TO TROPHY ROOM: NAVIGATE TO MAIN GARDEN FIRST IF NEEDED ---------- */
async function goToTrophy() {
  if (currentGarden !== 'main') {
    showNotification('Przechodzę do ogrodu głównego...');
    console.log(`Current location is "${currentGarden}", navigating to main garden first...`);

    // Open the map (same pattern as goToGarden / goToLocation)
    const map = document.getElementById('wimpareaCar') || document.getElementById('wgMap');
    if (!map) {
      showNotification('Nie znaleziono mapy!');
      return;
    }
    map.click();
    await humanDelay(800, 1200);

    // Click Garden 1 on the map
    const gardenBtn = document.getElementById('citymap_location_garden1');
    if (!gardenBtn) {
      showNotification('Nie znaleziono przycisku ogrodu głównego!');
      return;
    }
    gardenBtn.click();

    // Wait for location to change to 'main'
    await retryDetectGarden('main');

    if (currentGarden !== 'main') {
      showNotification('Nie udało się przejść do ogrodu głównego!');
      return;
    }

    showNotification('Jesteś w ogrodzie głównym, otwieram pokój trofeów...');
    await humanDelay(400, 600);
  }

  console.log('Opening house and trophy room...');

  // Click the house icon in the garden
  const house = document.getElementById('wimpareaGardenhouse');
  if (!house) {
    showNotification('Nie znaleziono ikony domu!');
    return;
  }
  house.click();
  await humanDelay(800, 1200);

  // Click the trophy button inside the house
  const achievements = document.getElementById('houseTrophies');
  if (!achievements) {
    showNotification('Nie znaleziono przycisku trofeów!');
    return;
  }
  achievements.click();
  await humanDelay(1000, 1400);

  // The trophy container should now be visible, detected by the MutationObserver
  console.log('Trophy room should now be open');
  showNotification('Pokój trofeów otwarty!');
}

/* ---------- AUTO TROPHIES: CLICK ALL TROPHIES IN TROPHY ROOM ---------- */
async function autoTrophies() {
  if (currentGarden !== 'trophy') return showNotification('Musisz być w Pokoju Trofeów!');

  activeTasks++; updateTaskCount();
  console.log('Starting auto-trophies...');

  let totalClicked = 0;
  const maxPages = 11;

  try {
    for (let page = 1; page <= maxPages; page++) {
      // Select the page using the dropdown
      const select = document.getElementById('trophyHeadlineSelect');
      if (!select) {
        console.log('Trophy page select not found, stopping');
        break;
      }

      // Check if this page option exists
      const option = select.querySelector(`option[value="${page}"]`);
      if (!option) {
        console.log(`Page ${page} not available, stopping`);
        break;
      }

      // Change page via dropdown
      select.value = page;
      select.dispatchEvent(new Event('change'));
      await humanDelay(800, 1200);

      // Find all trophy images on this page
      const trophies = document.querySelectorAll('#trophyImages img.gift');
      console.log(`Page ${page}: Found ${trophies.length} trophies`);

      for (const trophy of trophies) {
        // Extract the trophy click ID from the onclick attribute
        // onclick="trophys.click(128)"
        const onClick = trophy.getAttribute('onclick');
        if (!onClick) continue;

        const match = onClick.match(/trophys\.click\((\d+)\)/);
        if (!match) continue;

        const trophyId = match[1];
        console.log(`Clicking trophy ${trophyId} on page ${page}`);

        // Click the trophy directly
        trophy.click();
        await humanDelay(200, 400);
        totalClicked++;
      }
    }

    console.log(`Auto-trophies completed: ${totalClicked} trophies clicked`);
    showNotification(`Trofea: kliknięto ${totalClicked} trofeów!`);

  } catch (error) {
    console.error('Auto-trophies error:', error);
    showNotification('Auto-trophies failed - check console');
  } finally {
    activeTasks--; updateTaskCount();
  }
}

/* ---------- AUTO MINE: AUTOMATICALLY MINE READY MATERIALS ---------- */
async function autoMine() {
  if (currentGarden !== 'mine') return showNotification('Musisz być w Kopalni!');

  activeTasks++; updateTaskCount();
  console.log('Starting auto-mine...');

  let totalCollected = 0;
  let totalStarted = 0;
  let miningInProgress = false;

  try {
    // First, check all levels for active timers before doing anything else
    let hasActiveTimers = false;
    console.log('Checking for active timers on all levels...');

    for (let level = 1; level <= 4; level++) {
      // Click on the level navigation button
      const levelBtn = document.getElementById(`mine_mini_navi_slot${level}`);
      if (levelBtn) {
        levelBtn.click();
        await humanDelay(500, 800);
      } else {
        // console.warn(`Level ${level} button not found`);
        continue;
      }

      // Find all materials on this level
      const materialsSelector = `#mine_container_minelevel${level} .materials .slot.link`;
      const materials = document.querySelectorAll(materialsSelector);

      for (const material of materials) {
        // Check timer text
        const timerElement = material.querySelector('.timer .amount');
        if (!timerElement) continue;

        const timerText = timerElement.textContent.trim();
        console.log(`Level ${level} - Material timer: "${timerText}"`);

        // If timer shows a countdown (contains :), there's an active mining operation
        if (timerText.includes(':') && timerText !== 'Gotowe!') {
          console.log(`Found active timer: ${timerText} on level ${level}`);
          hasActiveTimers = true;
          break;
        }
      }

      if (hasActiveTimers) break;
    }

    // If there are active timers, do nothing else
    if (hasActiveTimers) {
      console.log('Active timers found - stopping auto-mine process');
      showNotification('Active mining operations found - stopping');
      return;
    }

    // If no active timers, proceed with collection and mining
    console.log('No active timers found - proceeding with auto-mine...');

    // Phase 1: Collect all ready materials (Gotowe!) from all levels
    console.log('Phase 1: Collecting ready materials from all levels...');
    for (let level = 1; level <= 4; level++) {
      console.log(`Checking level ${level} for ready materials...`);

      // Click on the level navigation button
      const levelBtn = document.getElementById(`mine_mini_navi_slot${level}`);
      if (levelBtn) {
        levelBtn.click();
        await humanDelay(500, 800);
      } else {
        // console.warn(`Level ${level} button not found`);
        continue;
      }

      // Find all materials on this level
      const materialsSelector = `#mine_container_minelevel${level} .materials .slot.link`;
      const materials = document.querySelectorAll(materialsSelector);

      console.log(`Found ${materials.length} materials on level ${level}`);

      for (const material of materials) {
        // Check if this material is ready (shows "Gotowe!")
        const timerElement = material.querySelector('.timer .amount');
        if (!timerElement) continue;

        const timerText = timerElement.textContent.trim();
        console.log(`Material timer: "${timerText}"`);

        if (timerText === 'Gotowe!') {
          console.log('Found ready material, clicking...');

          // Click on the material to open the harvester
          material.click();
          await humanDelay(1000, 1400);

          // Look for the "Odbierz materiał" button
          const collectBtn = document.getElementById('mine_harvester_finish');
          if (collectBtn && collectBtn.style.display !== 'none') {
            console.log('Clicking "Odbierz materiał"...');
            collectBtn.click();
            await humanDelay(1200, 1600);

            // Look for the "OK" button to close the dialog
            let okBtn = null;
            for (let i = 0; i < 25; i++) {
              okBtn = document.querySelector('#baseDialogButton .inner');
              if (okBtn && okBtn.textContent.trim() === 'OK') break;
              await humanDelay(100, 150);
            }

            if (okBtn) {
              console.log('Clicking "OK" to close dialog...');
              okBtn.click();
              await humanDelay(800, 1200);
            } else {
              // console.warn('OK button not found, continuing...');
            }

            totalCollected++;
          } else {
            // console.warn('Collect button not found or not visible');
          }

          // Small delay between materials
          await humanDelay(300, 500);
        }
      }
    }

    // Phase 2: Check all levels for gems before starting to mine
    console.log('Phase 2: Checking all levels for gems before mining...');
    let foundGemToMine = false;

    for (let level = 1; level <= 4; level++) {
      console.log(`Scanning level ${level} for gems...`);

      // Click on the level navigation button
      const levelBtn = document.getElementById(`mine_mini_navi_slot${level}`);
      if (levelBtn) {
        levelBtn.click();
        await humanDelay(500, 800);
      } else {
        // console.warn(`Level ${level} button not found`);
        continue;
      }

      // Find all materials on this level
      const materialsSelector = `#mine_container_minelevel${level} .materials .slot.link`;
      const materials = document.querySelectorAll(materialsSelector);

      for (const material of materials) {
        // Check if this material is unmined (no timer text or empty timer)
        const timerElement = material.querySelector('.timer .amount');
        const timerText = timerElement ? timerElement.textContent.trim() : '';

        // If timer is empty or shows countdown, check if it's a gem
        if (!timerText || timerText.includes(':')) {
          const materialImg = material.querySelector('.img');
          if (materialImg) {
            // Check for gem materials (prioritize these over copper)
            const isGem = materialImg.classList.contains('mine_material_tigereye') ||
                         materialImg.classList.contains('mine_material_lapislazuli') ||
                         materialImg.classList.contains('mine_material_amethyst') ||
                         materialImg.classList.contains('mine_material_emerald') ||
                         materialImg.classList.contains('mine_material_diamond');

            if (isGem) {
              console.log(`Found gem to mine on level ${level}: ${getMaterialName(materialImg)}`);

              // Click on the material to open the harvester
              material.click();
              await humanDelay(1000, 1400);

              // Try to start mining operation
              const miningSuccess = await startMiningOperation();
              if (miningSuccess) {
                console.log('Mining operation started successfully on gem');
                totalStarted++;
                foundGemToMine = true;
                miningInProgress = true;
                break; // Exit the loop after starting one mining operation
              } else {
                // console.warn('Failed to start mining operation on gem');
              }

              // Small delay between materials
              await humanDelay(300, 500);
            }
          }
        }
      }

      // If mining is in progress, stop checking other levels
      if (miningInProgress) {
        console.log('Mining operation started on gem, stopping auto-mine process');
        break;
      }
    }

    // Phase 3: If no gems found, check for copper (fallback)
    if (!foundGemToMine && !miningInProgress) {
      console.log('No gems found, checking for copper...');

      for (let level = 1; level <= 4; level++) {
        console.log(`Scanning level ${level} for copper...`);

        // Click on the level navigation button
        const levelBtn = document.getElementById(`mine_mini_navi_slot${level}`);
        if (levelBtn) {
          levelBtn.click();
          await humanDelay(500, 800);
        } else {
          // console.warn(`Level ${level} button not found`);
          continue;
        }

        // Find all materials on this level
        const materialsSelector = `#mine_container_minelevel${level} .materials .slot.link`;
        const materials = document.querySelectorAll(materialsSelector);

        for (const material of materials) {
          // Check if this material is unmined (no timer text or empty timer)
          const timerElement = material.querySelector('.timer .amount');
          const timerText = timerElement ? timerElement.textContent.trim() : '';

          // If timer is empty or shows countdown, check if it's copper
          if (!timerText || timerText.includes(':')) {
            const materialImg = material.querySelector('.img');
            if (materialImg && materialImg.classList.contains('mine_material_copper')) {
              console.log(`Found copper to mine on level ${level}`);

              // Click on the material to open the harvester
              material.click();
              await humanDelay(1000, 1400);

              // Try to start mining operation
              const miningSuccess = await startMiningOperation();
              if (miningSuccess) {
                console.log('Mining operation started successfully on copper');
                totalStarted++;
                miningInProgress = true;
                break; // Exit the loop after starting one mining operation
              } else {
                // console.warn('Failed to start mining operation on copper');
              }

              // Small delay between materials
              await humanDelay(300, 500);
            }
          }
        }

        // If mining is in progress, stop checking other levels
        if (miningInProgress) {
          console.log('Mining operation started on copper, stopping auto-mine process');
          break;
        }
      }
    }

    console.log(`Auto-mine completed: ${totalCollected} collected, ${totalStarted} started`);
    showNotification(`Auto-mine: ${totalCollected} collected, ${totalStarted} started`);

  } catch (error) {
    console.error('Auto-mine error:', error);
    showNotification('Auto-mine failed - check console');
  } finally {
    activeTasks--; updateTaskCount();
  }
}

/* ---------- HELPER FUNCTION: GET MATERIAL NAME ---------- */
function getMaterialName(materialImg) {
  if (materialImg.classList.contains('mine_material_tigereye')) return 'Tiger Eye';
  if (materialImg.classList.contains('mine_material_lapislazuli')) return 'Lapis Lazuli';
  if (materialImg.classList.contains('mine_material_amethyst')) return 'Amethyst';
  if (materialImg.classList.contains('mine_material_emerald')) return 'Emerald';
  if (materialImg.classList.contains('mine_material_diamond')) return 'Diamond';
  if (materialImg.classList.contains('mine_material_copper')) return 'Copper';
  return 'Unknown material';
}

/* ---------- START MINING OPERATION: SELECT PICKAXE, THEN WORKER, THEN START ---------- */
async function startMiningOperation() {
  try {
    // Step 1: Click on item slot (pickaxe slot)
    const itemSlot = document.querySelector('.slot[onclick*="clickItemSlotHarvester(1)"]');
    if (!itemSlot) {
      // console.warn('Item slot not found');
      return false;
    }

    console.log('Clicking item slot (pickaxe)...');
    itemSlot.click();
    await humanDelay(500, 800);

    // Step 2: Select stone pickaxe
    let pickaxe = document.getElementById('mine_shop_item166818');
    if (!pickaxe) {
      // console.warn('Stone pickaxe not found by ID, looking for any pickaxe...');
      // Try to find any pickaxe by onclick attribute
      pickaxe = document.querySelector('.slot[onclick*="setItemSlotHarvester"][onclick*="stonepickaxe"]');
      if (!pickaxe) {
        // Try alternative selector - any slot containing pickaxe image
        pickaxe = document.querySelector('.slot .img[class*="pickaxe"]');
        if (pickaxe) {
          pickaxe = pickaxe.closest('.slot');
        }
      }
    }

    if (!pickaxe) {
      // console.warn('No pickaxe found');
      return false;
    }

    console.log('Selecting pickaxe...');
    pickaxe.click();
    await humanDelay(500, 800);

    // Step 3: Click on worker slot
    const workerSlot = document.querySelector('.slot[onclick*="clickWorkerSlotHarvester(1)"]');
    if (!workerSlot) {
      // console.warn('Worker slot not found');
      return false;
    }

    console.log('Clicking worker slot...');
    workerSlot.click();
    await humanDelay(500, 800);

    // Step 4: Select a worker
    const worker = document.getElementById('mine_worker_slot1');
    if (!worker) {
      // console.warn('Worker not found');
      return false;
    }

    console.log('Selecting worker...');
    worker.click();
    await humanDelay(500, 800);

    // Step 5: Start mining
    const startBtn = document.getElementById('mine_harvester_start');
    if (!startBtn) {
      // console.warn('Start button not found');
      return false;
    }

    console.log('Starting mining operation...');
    startBtn.click();
    await humanDelay(800, 1200);

    return true;
  } catch (error) {
    console.error('Error in startMiningOperation:', error);
    return false;
  }
}

/* ---------- PARK DECORATION CALCULATOR OVERLAY (multilingual) ---------- */
function showParkCalcOverlay() {
  // Remove existing overlay if any
  const existing = document.getElementById('farm-assistant-park-overlay');
  if (existing) existing.remove();

  // Get language preference from storage (async callback)
  chrome.storage.local.get(['language'], (result) => {
    const lang = result.language || 'PL';
    buildParkOverlay(lang);
  });
}

function getParkTranslations(lang) {
  const t = {
    EN: {
      notInPark: 'Not in park location!',
      title: '🌳 Park Decoration Info',
      points: 'Decoration points:',
      visitors: '👥 Visitors:',
      to: 'To',
      guests: 'guests:',
      pts: 'pts',
      pathsMax: 'Paths: max.',
      effective: 'Effective:',
      parkSummary: '📊 Park Summary',
      paths: 'Paths:',
      decorations: 'Decorations:',
      empty: 'Empty:',
      trash: 'Trash:',
      bottleneckPaths: 'Bottleneck: paths!',
      bottleneckPathsDesc: 'To handle',
      bottleneckPathsNeed: 'you need',
      bottleneckPathsMore: 'more paths',
      bottleneckPathsInfo: 'You have',
      bottleneckNeed: 'need',
      bottleneckDeco: 'Bottleneck: decorations!',
      bottleneckDecoDesc: 'To handle',
      bottleneckDecoNeed: 'you need',
      bottleneckDecoMore: 'more decoration pts',
      balanced: 'Decorations and paths are balanced',
      showTable: '📋 Show thresholds table',
      visitorsHeader: 'Visitors',
      pointsHeader: 'Points'
    },
    PL: {
      notInPark: 'Musisz być w Parku Miejskim!',
      title: '🌳 Park Decoration Info',
      points: 'Punkty dekoracji:',
      visitors: '👥 Odwiedzający:',
      to: 'Do',
      guests: 'gości:',
      pts: 'pkt',
      pathsMax: 'Drogi: maks.',
      effective: 'Efektywnie:',
      parkSummary: '📊 Podsumowanie parku',
      paths: 'Ścieżki:',
      decorations: 'Dekoracje:',
      empty: 'Puste:',
      trash: 'Śmieci:',
      bottleneckPaths: 'Wąskie gardło: ścieżki!',
      bottleneckPathsDesc: 'Aby obsłużyć',
      bottleneckPathsNeed: 'potrzebujesz jeszcze',
      bottleneckPathsMore: 'ścieżek',
      bottleneckPathsInfo: 'Masz',
      bottleneckNeed: 'potrzeba',
      bottleneckDeco: 'Wąskie gardło: dekoracje!',
      bottleneckDecoDesc: 'Aby obsłużyć',
      bottleneckDecoNeed: 'potrzebujesz jeszcze',
      bottleneckDecoMore: 'pkt dekoracji',
      balanced: 'Dekoracje i drogi zbalansowane',
      showTable: '📋 Pokaż tabelę progów',
      visitorsHeader: 'Odwiedzający',
      pointsHeader: 'Punkty'
    },
    DE: {
      notInPark: 'Nicht im Stadtpark!',
      title: '🌳 Park Decoration Info',
      points: 'Dekorationspunkte:',
      visitors: '👥 Besucher:',
      to: 'Bis',
      guests: 'Besucher:',
      pts: 'Pkt.',
      pathsMax: 'Wege: max.',
      effective: 'Effektiv:',
      parkSummary: '📊 Park Zusammenfassung',
      paths: 'Wege:',
      decorations: 'Dekorationen:',
      empty: 'Leer:',
      trash: 'Müll:',
      bottleneckPaths: 'Engpass: Wege!',
      bottleneckPathsDesc: 'Um',
      bottleneckPathsNeed: 'benötigst du',
      bottleneckPathsMore: 'mehr Wege',
      bottleneckPathsInfo: 'Du hast',
      bottleneckNeed: 'benötigt',
      bottleneckDeco: 'Engpass: Dekorationen!',
      bottleneckDecoDesc: 'Um',
      bottleneckDecoNeed: 'benötigst du',
      bottleneckDecoMore: 'mehr Dekorationspkt.',
      balanced: 'Dekorationen und Wege sind ausbalanciert',
      showTable: '📋 Schwellenwerttabelle anzeigen',
      visitorsHeader: 'Besucher',
      pointsHeader: 'Punkte'
    }
  };
  return t[lang] || t.PL;
}

function buildParkOverlay(lang) {
  const t = getParkTranslations(lang);

  // Parse park info from DOM
  const infoDiv = document.getElementById('park_info_expand');
  if (!infoDiv || infoDiv.offsetParent === null) {
    showNotification(t.notInPark);
    return;
  }

  const pointsLine = infoDiv.querySelector('.line');
  let points = 0;
  if (pointsLine) {
    const match = pointsLine.textContent.match(/(\d[\d.]*)/);
    if (match) points = parseInt(match[1].replace(/\./g, ''));
  }

  const visitorDecoEl = document.getElementById('park_info_expand_visitor_deco');
  let currentVisitors = 0;
  if (visitorDecoEl) {
    const span = visitorDecoEl.querySelector('span');
    if (span) currentVisitors = parseInt(span.textContent.trim()) || 0;
  }

  const visitorPathEl = document.getElementById('park_info_expand_visitor_path');
  let maxPathVisitors = 0;
  if (visitorPathEl) {
    const span = visitorPathEl.querySelector('span');
    if (span) maxPathVisitors = parseInt(span.textContent.trim()) || 0;
  }

  function getThreshold(v) { return 7 + 25 * v * (v - 1); }

  let nextVisitors = currentVisitors + 1;
  while (nextVisitors <= 20 && points >= getThreshold(nextVisitors)) nextVisitors++;
  if (nextVisitors > 20) nextVisitors = 20;

  const nextThreshold = getThreshold(nextVisitors);
  const pointsNeeded = nextThreshold - points;
  const progress = currentVisitors > 0 && nextVisitors > currentVisitors
    ? ((points - getThreshold(currentVisitors)) / (nextThreshold - getThreshold(currentVisitors))) * 100
    : (points > 0 ? 100 : 0);
  const effectiveVisitors = Math.min(currentVisitors, maxPathVisitors);
  const pct = Math.min(100, Math.max(0, Math.round(progress)));

  // === SCAN PARK TILES ===
  const tiles = document.querySelectorAll('#park_map .tile');
  let pathCount = 0, decoCount = 0, emptyCount = 0, trashCount = 0;
  
  tiles.forEach(tile => {
    const ground = tile.querySelector('.ground');
    if (!ground) return;
    const cls = ground.className;
    const hasItem = !!tile.querySelector('.item');
    
    if (cls.includes('path_')) {
      pathCount++;
    } else if (hasItem) {
      decoCount++;
    } else if (cls.includes('trash')) {
      trashCount++;
    } else {
      emptyCount++;
    }
  });

  // Calculate decoration visitors from points
  let decoVisitors = 0;
  for (let v = 20; v >= 1; v--) {
    if (points >= getThreshold(v)) { decoVisitors = v; break; }
  }

  // Bottleneck analysis
  let bottleneck = '';
  if (maxPathVisitors < decoVisitors) {
    const needed = (decoVisitors - maxPathVisitors) * 5;
    bottleneck = `<div style="background:rgba(239,108,0,0.15);border:1px solid rgba(239,108,0,0.3);border-radius:8px;padding:10px;margin-top:8px;font-size:12px;">
      🛤️ <b>${t.bottleneckPaths}</b><br>
      ${t.bottleneckPathsDesc} <b>${decoVisitors}</b> ${t.guests.replace(':','').trim()}, ${t.bottleneckPathsNeed} <b style="color:#FFB74D;">${needed}</b> ${t.bottleneckPathsMore}<br>
      <span style="color:#aaa;">${t.bottleneckPathsInfo} ${pathCount} ${t.paths.replace(':','').trim()} (max ${maxPathVisitors} ${t.guests.replace(':','').trim()}), ${t.bottleneckNeed} ${decoVisitors * 5}</span>
    </div>`;
  } else if (decoVisitors < maxPathVisitors) {
    const needed = getThreshold(maxPathVisitors) - points;
    bottleneck = `<div style="background:rgba(129,199,132,0.15);border:1px solid rgba(129,199,132,0.3);border-radius:8px;padding:10px;margin-top:8px;font-size:12px;">
      🌸 <b>${t.bottleneckDeco}</b><br>
      ${t.bottleneckDecoDesc} <b>${maxPathVisitors}</b> ${t.guests.replace(':','').trim()}, ${t.bottleneckDecoNeed} <b style="color:#81C784;">${needed}</b> ${t.bottleneckDecoMore}
    </div>`;
  } else {
    bottleneck = `<div style="background:rgba(129,199,132,0.1);border:1px solid rgba(129,199,132,0.2);border-radius:8px;padding:10px;margin-top:8px;font-size:12px;">
      ✅ ${t.balanced}
    </div>`;
  }

  // Build reference table HTML
  let tableRows = '';
  for (let v = 1; v <= 20; v++) {
    const needed = getThreshold(v);
    const isCurrent = v === currentVisitors;
    const isNext = v === nextVisitors;
    const rowStyle = isCurrent ? 'background:rgba(239,108,0,0.15);font-weight:700;color:#e0e0e0;' :
                     isNext ? 'font-weight:600;color:#FFB74D;' : '';
    tableRows += `<tr style="${rowStyle}border-bottom:1px solid rgba(255,255,255,0.1);color:#e0e0e0;">
      <td style="padding:3px 6px;color:inherit;">${v}</td>
      <td style="text-align:right;padding:3px 6px;color:inherit;">${needed.toLocaleString()}</td>
    </tr>`;
  }

  // Create overlay
  const overlay = document.createElement('div');
  overlay.id = 'farm-assistant-park-overlay';
  overlay.innerHTML = `
    <div style="background:#1a1a2e;color:#e0e0e0;border-radius:12px;padding:20px;width:420px;max-height:500px;overflow-y:auto;box-shadow:0 8px 32px rgba(0,0,0,0.5);font-family:Arial,sans-serif;font-size:13px;line-height:1.5;position:relative;">
      <div style="position:sticky;top:0;z-index:1;display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;padding-bottom:10px;border-bottom:2px solid #EF6C00;">
        <span style="font-size:16px;font-weight:700;">${t.title}</span>
        <span id="farm-assistant-park-close" style="cursor:pointer;font-size:22px;color:#aaa;line-height:1;">&times;</span>
      </div>
      
      <div style="display:flex;justify-content:space-between;margin-bottom:10px;">
        <span>${t.points} <b style="color:#FFB74D;">${points.toLocaleString()}</b></span>
        <span>${t.visitors} <b style="color:#81C784;">${currentVisitors}</b></span>
      </div>
      
      <div style="margin-bottom:10px;">
        <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px;">
          <span>${t.to} <b>${nextVisitors}</b> ${t.guests} <b>${Math.max(0,pointsNeeded).toLocaleString()}</b> ${t.pts}</span>
          <span>${pct}%</span>
        </div>
        <div style="height:10px;background:#333;border-radius:5px;overflow:hidden;">
          <div style="height:100%;background:linear-gradient(90deg,#EF6C00,#FFB74D);border-radius:5px;transition:width 0.3s;width:${pct}%;"></div>
        </div>
      </div>
      
      <div style="display:flex;justify-content:space-between;font-size:12px;color:#aaa;margin-bottom:12px;">
        <span>${t.pathsMax} <b style="color:#e0e0e0;">${maxPathVisitors}</b> ${t.guests}</span>
        <span>${t.effective} <b style="color:#e0e0e0;">${effectiveVisitors}</b></span>
      </div>

      <div style="border-top:1px solid rgba(255,255,255,0.1);padding-top:10px;margin-bottom:10px;">
        <div style="font-weight:600;margin-bottom:6px;font-size:12px;color:#aaa;">${t.parkSummary}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:12px;">
          <span>🛤️ ${t.paths} <b style="color:#e0e0e0;">${pathCount}</b></span>
          <span>🌸 ${t.decorations} <b style="color:#e0e0e0;">${decoCount}</b></span>
          <span>🟩 ${t.empty} <b style="color:#e0e0e0;">${emptyCount}</b></span>
          <span>🗑️ ${t.trash} <b style="color:#e0e0e0;">${trashCount}</b></span>
        </div>
      </div>

      ${bottleneck}
      
      <details style="margin-top:10px;">
        <summary style="cursor:pointer;color:#EF6C00;font-size:12px;font-weight:600;">${t.showTable}</summary>
        <div style="margin-top:8px;max-height:200px;overflow-y:auto;">
          <table style="width:100%;border-collapse:collapse;font-size:12px;">
            <tr style="border-bottom:2px solid #444;">
              <th style="text-align:left;padding:3px 6px;color:#aaa;">${t.visitorsHeader}</th>
              <th style="text-align:right;padding:3px 6px;color:#aaa;">${t.pointsHeader}</th>
            </tr>
            ${tableRows}
          </table>
        </div>
      </details>
    </div>
  `;
  overlay.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:999999;';

  document.body.appendChild(overlay);

  // Close handler
  document.getElementById('farm-assistant-park-close').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
}

})();
