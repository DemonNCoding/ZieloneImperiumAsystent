/* content.js – v4.6 – Birds Product Check */
console.log('Farm Assistant v4.6 – Birds Product Check');
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
      { id: 'park', value: 'park' },          // CHECK PARK FIRST!
      { id: 'bonsai', value: 'bonsai' },
      { id: 'birds', value: 'birds' },
      { id: 'mine', value: 'mine' },
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

const observer = new MutationObserver(() => {
  try {
    // Throttle location detection to reduce console spam
    const now = Date.now();
    if (now - lastLocationCheck > 500) { // Check location every 0.5 seconds (very fast)
      detectGarden();
      lastLocationCheck = now;
    }

    const harvestClose = document.querySelector('#wgErntelog .link.closeBtn, #ernte_log .link.closeBtn');
    if (harvestClose && Date.now() - lastHarvestClose > 1500) {
      harvestClose.click();
      lastHarvestClose = Date.now();
      lastPopupClosed = Date.now();
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
    return false; // Don't handle it here, let the game frame handle it
  }

  console.log('Action:', req.action);
  (async () => {
    try {
      switch (req.action) {
        case 'findSeller': await findSeller(); break;
        case 'start_watering': case 'waterCrops': await waterCrops(); break;
        case 'stop_watering': stopWatering(); break;
        case 'plantCrops': await plantCrops(); break;
        case 'harvestCrops': await harvestCrops(); break;
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
        case 'autoMine': await autoMine(); break;
        case 'renewParkDecorations': await renewParkDecorations(); break;
        case 'bonsaiTrim': await bonsaiTrim(); break;
        case 'birdsCollectRewards': await birdsCollectRewards(); break;
        case 'birdsAuto': await birdsAuto(); break;
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

  for (const tile of dryTiles) {
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
    const [minDelay, maxDelay] = getDelayForSpeed(speedSettings.water, 50, 100);
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

/* ---------- PLANTING – WATER GARDEN: background-image: none ---------- */
async function plantCrops() {
  const isWaterGarden = currentGarden === 'water';
  const selector = isWaterGarden
    ? '#wgGrid .grid:not(.blocked)'
    : '#gardenDiv .gardenfield.feld';

  const emptyTiles = Array.from(document.querySelectorAll(selector)).filter(t => {
    const img = t.querySelector('.plantImage');
    if (!img) return false;

    const bg = img.style.backgroundImage || img.style.background || '';

    if (isWaterGarden) {
      return bg === 'none' || bg === '' || bg.includes('0.gif');
    } else {
      return bg.includes('0.gif');
    }
  });

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
