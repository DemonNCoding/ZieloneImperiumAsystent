// popup.js – FINAL
let watering = false;

// Language toggle functionality
let languageToggle, languageText;
let currentLanguage = 'PL'; // Default language is Polish

// Language translations
const translations = {
  EN: {
    title: 'Zielone Imperium',
    subtitle: 'Smart Farming Assistant',
    extensionStatus: 'Status',
    activeTasks: 'Tasks',
    currentLocation: 'Location',
    selectedPlant: 'Plant',
    inactive: 'Inactive',
    speedControls: 'Speed',
    wateringSpeed: 'Watering',
    plantingSpeed: 'Planting',
    fast: 'Fast',
    slow: 'Slow',
    farmingTasks: 'Tasks',
    waterCrops: 'Water',
    plantCrops: 'Plant',
    harvestCrops: 'Harvest',
    shopping: 'Shopping',
    shoppingTitle: 'Shopping',
    sellItems: 'Sell',
    calculateItems: 'Calc',
    shoppingList: 'List',
    enhancedList: 'Details',
    scan: 'Scan',
    gardens: 'Gardens',
    gardensTitle: 'Gardens',
    garden1: 'Garden 1',
    garden2: 'Garden 2',
    waterGarden: 'Water Garden',
    park: 'Park',
    parkTitle: 'City Park',
    renew: 'Renew',
    bonsai: 'Bonsai',
    bonsaiTitle: 'Bonsai School',
    trim: 'Trim',
    birds: 'Birds',
    birdsTitle: 'Bird Post',
    auto: 'Auto',
    mine: 'Mine',
    mineTitle: 'Mine',
    footer: 'Crafted with ❤️ for dedicated farmers'
  },
  PL: {
    title: 'Zielone Imperium',
    subtitle: 'Asystent Rolniczy',
    extensionStatus: 'Status',
    activeTasks: 'Zadania',
    currentLocation: 'Lokalizacja',
    selectedPlant: 'Roślina',
    inactive: 'Nieaktywne',
    speedControls: 'Prędkość',
    wateringSpeed: 'Podlewanie',
    plantingSpeed: 'Sianie',
    fast: 'Szybko',
    slow: 'Wolno',
    farmingTasks: 'Zadania',
    waterCrops: 'Podlej',
    plantCrops: 'Zasiej',
    harvestCrops: 'Zbierz',
    shopping: 'Zakupy',
    shoppingTitle: 'Zakupy',
    sellItems: 'Sprzedaj',
    calculateItems: 'Kalkuluj',
    shoppingList: 'Lista',
    enhancedList: 'Szczegóły',
    scan: 'Skanuj',
    gardens: 'Ogrody',
    gardensTitle: 'Ogrody',
    garden1: 'Ogród 1',
    garden2: 'Ogród 2',
    waterGarden: 'Ogród Wodny',
    park: 'Park',
    parkTitle: 'Park Miejski',
    renew: 'Odnów',
    bonsai: 'Bonsai',
    bonsaiTitle: 'Szkoła Bonsai',
    trim: 'Przytnij',
    birds: 'Ptaki',
    birdsTitle: 'Ptasia Poczta',
    auto: 'Auto',
    mine: 'Kopalnia',
    mineTitle: 'Kopalnia',
    footer: 'Stworzone z ❤️ dla wytrwałych rolników',
    shoppingListCleared: 'Lista zakupów została wyczyszczona.',
    noActiveTab: 'Brak aktywnej karty.',
    communicationError: 'Błąd komunikacji z grą.',
    noResponse: 'Brak odpowiedzi od gry.',
    noShoppingData: 'Brak listy zakupów lub nie jesteś w grze.',
    shoppingListEmpty: 'Lista zakupów jest pusta.',
    newGardenDetected: 'Wykryto nowy ogród',
    mergedWithExisting: 'Połączono z istniejącą listą',
    needed: 'Potrzeba:',
    mainGarden: 'Ogród Główny',
    waterGarden: 'Ogród Wodny',
    park: 'Park Miejski',
    bonsai: 'Szkoła Bonsai',
    birds: 'Ptasia Poczta',
    mine: 'Kopalnia',
    city: 'Miasto',
    unknown: 'Nieznana',
    active: 'Aktywne',
    clearShoppingList: '🗑️ Wyczyść',
    markAll: '✅ Zaznacz wszystko',
    unmarkAll: '❌ Odznacz wszystko'
  },
  DE: {
    title: 'Zielone Imperium',
    subtitle: 'Landwirtschaftsassistent',
    extensionStatus: 'Status',
    activeTasks: 'Aufgaben',
    currentLocation: 'Standort',
    selectedPlant: 'Pflanze',
    inactive: 'Inaktiv',
    speedControls: 'Geschwindigkeit',
    wateringSpeed: 'Bewässerung',
    plantingSpeed: 'Pflanzen',
    fast: 'Schnell',
    slow: 'Langsam',
    farmingTasks: 'Aufgaben',
    waterCrops: 'Gießen',
    plantCrops: 'Anbauen',
    harvestCrops: 'Ernten',
    shopping: 'Einkaufen',
    shoppingTitle: 'Einkaufen',
    sellItems: 'Verkaufen',
    calculateItems: 'Kalkulieren',
    shoppingList: 'Liste',
    enhancedList: 'Details',
    scan: 'Scan',
    gardens: 'Gärten',
    gardensTitle: 'Gärten',
    garden1: 'Garten 1',
    garden2: 'Garten 2',
    waterGarden: 'Wassergarten',
    park: 'Park',
    parkTitle: 'Stadtpark',
    renew: 'Erneuern',
    bonsai: 'Bonsai',
    bonsaiTitle: 'Bonsai Schule',
    trim: 'Beschneiden',
    birds: 'Vögel',
    birdsTitle: 'Vogel Post',
    auto: 'Auto',
    mine: 'Mine',
    mineTitle: 'Mine',
    footer: 'Hergestellt mit ❤️ für engagierte Landwirte',
    shoppingListCleared: 'Einkaufsliste wurde geleert.',
    noActiveTab: 'Keine aktive Registerkarte gefunden.',
    communicationError: 'Fehler: Kommunikation mit Spiel fehlgeschlagen.',
    noResponse: 'Fehler: Keine Antwort vom Spiel.',
    noShoppingData: 'Fehler: Keine Einkaufsliste oder nicht im Spiel.',
    shoppingListEmpty: 'Einkaufsliste ist leer.',
    newGardenDetected: 'Neuer Garten erkannt',
    mergedWithExisting: 'Mit bestehender Liste zusammengeführt',
    needed: 'Benötigt:',
    mainGarden: 'Hauptgarten',
    city: 'Stadt',
    unknown: 'Unbekannt',
    active: 'Aktiv',
    clearShoppingList: '🗑️ Leeren',
    markAll: '✅ Alle markieren',
    unmarkAll: '❌ Alle demarkieren'
  }
};

// DOM Elements
const elements = {};

// Initialize DOM elements after DOM is loaded
function initializeDOMElements() {
  elements.findSeller = document.getElementById('find-seller');
  elements.showShoppingList = document.getElementById('show-shopping-list');
  elements.waterCrops = document.getElementById('water-crops');
  elements.plantCrops = document.getElementById('plant-crops');
  elements.harvestCrops = document.getElementById('harvest-crops');
  elements.toggleWater = document.getElementById('toggle-water');
  elements.togglePlant = document.getElementById('toggle-plant');
  elements.toggleHarvest = document.getElementById('toggle-harvest');
  elements.tasksCount = document.getElementById('tasks-count');
  elements.statusIndicator = document.querySelector('.status-indicator');
  elements.statusValue = document.querySelector('.status-value');
  elements.gardenStatus = document.getElementById('garden-status');
  elements.refreshShoppingList = document.getElementById('refresh-shopping-list');
  elements.shoppingList = document.getElementById('shopping-list');
  elements.shoppingListContent = document.getElementById('shopping-list-content');
  elements.clearShoppingList = document.getElementById('clear-shopping-list');
  elements.markAllShoppingList = document.getElementById('mark-all-shopping-list');
  elements.unmarkAllShoppingList = document.getElementById('unmark-all-shopping-list');
  
  // Enhanced Shopping Modal Elements
  elements.shoppingModal = document.getElementById('shopping-modal');
  elements.shoppingModalContent = document.getElementById('shopping-modal-content');
  elements.closeShoppingModal = document.getElementById('close-shopping-modal');
  elements.clearShoppingModal = document.getElementById('clear-shopping-modal');
  elements.markAllShoppingModal = document.getElementById('mark-all-shopping-modal');
  elements.unmarkAllShoppingModal = document.getElementById('unmark-all-shopping-modal');
  
  // Enhanced Shopping List Button
  elements.showEnhancedShoppingList = document.getElementById('show-enhanced-shopping-list');
}

// BUTTON HANDLERS - Will be set up in DOMContentLoaded
// MESSAGING
function sendMessageToContent(action, data = {}) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]) return;
    const tabId = tabs[0].id;

    chrome.tabs.sendMessage(tabId, { action: 'ping' }, (pingResponse) => {
      if (chrome.runtime.lastError || !pingResponse?.ready) {
        showNotification('Open Zielone Imperium first!');
        return;
      }

      const garden = pingResponse.location === 'main' ? 'Main Garden'
        : pingResponse.location === 'water' ? 'Water Garden'
          : 'Unknown';
      if (elements.gardenStatus) elements.gardenStatus.textContent = garden;

      chrome.tabs.sendMessage(tabId, { action, ...data }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('Error:', chrome.runtime.lastError.message);
          showNotification('Error: Reload game');
          return;
        }
        if (response?.success) showNotification(response.message || 'Action completed!');
      });
    });
  });
}

// NOTIFICATIONS
function showNotification(message) {
  const toast = document.createElement('div');
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(255, 251, 72, 0.95);
    color: #000;
    padding: 12px 24px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 600;
    z-index: 10000;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    animation: fadeInOut 3s forwards;
  `;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 2700);
}

const style = document.createElement('style');
style.textContent = `
  @keyframes fadeInOut {
    0%, 100% { opacity: 0; transform: translateX(-50%) translateY(10px); }
    15%, 85% { opacity: 1; transform: translateX(-50%) translateY(0); }
  }
`;
document.head.appendChild(style);

// TASK COUNT – started inside DOMContentLoaded after elements are initialised

function checkConnection() {
  const t = translations[currentLanguage];
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]) {
      updateStatus(false, t.noActiveTab || 'No active tab');
      return;
    }
    const tabId = tabs[0].id;

    chrome.tabs.sendMessage(tabId, { action: 'ping' }, (response) => {
      const indicator = elements.statusIndicator;
      const statusText = document.getElementById('status-text');
      const locationEl = document.getElementById('current-location');

      if (chrome.runtime.lastError || !response?.ready) {
        indicator.classList.remove('active');
        indicator.classList.add('inactive');
        statusText.textContent = t.inactive;
        locationEl.textContent = '—';
        return;
      }

      indicator.classList.remove('inactive');
      indicator.classList.add('active');
      statusText.textContent = t.active || 'Active';

      // Map location
      const locMap = {
        main: t.mainGarden || 'Main Garden',
        water: t.waterGarden || 'Water Garden',
        park: t.park || 'Park',
        bonsai: t.bonsai || 'Bonsai',
        birds: t.birds || 'Birds',
        mine: t.mine || 'Mine',
        city: t.city || 'City'
      };
      locationEl.textContent = locMap[response.location] || response.location || t.unknown || 'Unknown';
    });
  });
}
// Real-time location updates
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === 'locationChanged') {
    const t = translations[currentLanguage];
    const locMap = {
      main: t.mainGarden || 'Main Garden',
      water: t.waterGarden || 'Water Garden',
      park: t.park || 'Park',
      bonsai: t.bonsai || 'Bonsai',
      birds: t.birds || 'Birds',
      mine: t.mine || 'Mine',
      city: t.city || 'City'
    };
    const el = document.getElementById('current-location');
    if (el) el.textContent = locMap[msg.location] || msg.location || t.unknown || 'Unknown';
  }
  if (msg.action === 'wateringFinished') {
    watering = false;
    const t = translations[currentLanguage];
    elements.waterCrops.textContent = t.waterCrops || 'Water Crops';
  }
});
// SHOPPING LIST TOGGLE
function toggleShoppingList() {
  elements.shoppingList.classList.toggle('visible');
}

// CALCULATE SHOPPING LIST (NEW FUNCTION)
function calculateShoppingList() {
  const t = translations[currentLanguage];
  // Request shopping list data from content script
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]) {
      console.error('No active tab found');
      showNotification('No active tab found');
      return;
    }
    const tabId = tabs[0].id;
    console.log('Calculating shopping list from tab:', tabId);

    chrome.tabs.sendMessage(tabId, { action: 'getShoppingList' }, (response) => {
      console.log('Shopping list response:', response);
      
      if (chrome.runtime.lastError) {
        console.error('Error getting shopping list:', chrome.runtime.lastError.message);
        showNotification('Error: Communication with game failed');
        return;
      }
      
      if (!response) {
        console.error('No response received');
        showNotification('Error: No response from game');
        return;
      }
      
      if (!response.items) {
        console.error('Response missing items:', response);
        showNotification('Error: No shopping list data or not in game');
        return;
      }
      
      if (response.items.length === 0) {
        showNotification('Shopping list is empty');
        return;
      }

      console.log('Items to calculate:', response.items);
      
      // Get current items from shopping list to merge with new ones
      const currentItems = getCurrentShoppingListItems();
      
      // Always merge items from different gardens to create a cumulative list
      const mergedItems = mergeShoppingListItems(currentItems, response.items);
      showNotification(`List updated - total ${mergedItems.length} items`);
      
      // Update the shopping list content using proper CSS classes
      const listHtml = mergedItems.map(item => {
        const safeName = item.name.replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ');
        const itemId = safeName.toLowerCase().replace(/\s+/g, '-');
        return `
          <div class="shopping-item" data-item-name="${item.name}">
            <input type="checkbox" id="item-${itemId}" class="shopping-checkbox">
            <div class="shopping-item-content">
              <div class="shopping-item-name">${item.name}</div>
              <div class="shopping-item-quantity">${t.needed || 'Needed:'} ${item.needed}</div>
            </div>
          </div>
        `;
      }).join('');
      
      console.log('Generated HTML:', listHtml);
      elements.shoppingListContent.innerHTML = listHtml;
      console.log('Shopping list calculated successfully');
    });
  });
}

// CHECK IF SHOPPING LIST SHOULD BE WIPED
function shouldWipeShoppingList(currentItems, newItems) {
  if (currentItems.length === 0) {
    // No current items, don't wipe
    return false;
  }
  
  // Check if any new items are completely different from current items
  const currentNames = new Set(currentItems.map(item => item.name.toLowerCase()));
  const newNames = new Set(newItems.map(item => item.name.toLowerCase()));
  
  // If there's no overlap at all, it's likely a different garden
  const hasOverlap = [...newNames].some(name => currentNames.has(name));
  
  // If no overlap and we have items in both lists, wipe
  return !hasOverlap && currentItems.length > 0 && newItems.length > 0;
}

// LOAD SHOPPING LIST DATA
function loadShoppingList() {
  const t = translations[currentLanguage];
  // Request shopping list data from content script
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]) {
      console.error('No active tab found');
      elements.shoppingListContent.innerHTML = `<p style="color: #ff5252;">${t.noActiveTab || 'No active tab found.'}</p>`;
      return;
    }
    const tabId = tabs[0].id;
    console.log('Requesting shopping list from tab:', tabId);

    chrome.tabs.sendMessage(tabId, { action: 'getShoppingList' }, (response) => {
      console.log('Shopping list response:', response);
      
      if (chrome.runtime.lastError) {
        console.error('Error getting shopping list:', chrome.runtime.lastError.message);
        elements.shoppingListContent.innerHTML = `<p style="color: #ff5252;">${t.communicationError || 'Error: Communication with game failed.'}</p>`;
        return;
      }
      
      if (!response) {
        console.error('No response received');
        elements.shoppingListContent.innerHTML = `<p style="color: #ff5252;">${t.noResponse || 'Error: No response from game.'}</p>`;
        return;
      }
      
      if (!response.items) {
        console.error('Response missing items:', response);
        elements.shoppingListContent.innerHTML = `<p style="color: #ff5252;">${t.noShoppingData || 'Error: No shopping list data or not in game.'}</p>`;
        return;
      }
      
      if (response.items.length === 0) {
        elements.shoppingListContent.innerHTML = `<p style="color: #fffb48;">${t.shoppingListEmpty || 'Shopping list is empty.'}</p>`;
        return;
      }

      console.log('Items to display:', response.items);
      
      // Get current items from shopping list to merge with new ones
      const currentItems = getCurrentShoppingListItems();
      
      // Merge current items with new items from this garden
      const mergedItems = mergeShoppingListItems(currentItems, response.items);
      
      const listHtml = mergedItems.map(item => {
        const safeName = item.name.replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ');
        const itemId = safeName.toLowerCase().replace(/\s+/g, '-');
        return `
          <div class="shopping-item" data-item-name="${item.name}">
            <input type="checkbox" id="item-${itemId}" class="shopping-checkbox">
            <div class="shopping-item-content">
              <div class="shopping-item-name">${item.name}</div>
              <div class="shopping-item-quantity">${t.needed || 'Needed:'} ${item.needed}</div>
            </div>
          </div>
        `;
      }).join('');
      
      console.log('Generated HTML:', listHtml);
      elements.shoppingListContent.innerHTML = listHtml;
      console.log('Shopping list content set successfully');
    });
  });
}

// GET CURRENT SHOPPING LIST ITEMS
function getCurrentShoppingListItems() {
  const items = [];
  const itemElements = elements.shoppingListContent.querySelectorAll('.shopping-item');
  
  itemElements.forEach(element => {
    const nameElement = element.querySelector('.shopping-item-name');
    const neededElement = element.querySelector('.shopping-item-quantity');
    
    if (nameElement && neededElement) {
      const name = nameElement.textContent.trim();
      const neededText = neededElement.textContent.trim();
      const neededMatch = neededText.match(/(Potrzeba|Needed):\s*(\d+)/i);
      const needed = neededMatch ? parseInt(neededMatch[2]) : 0;
      
      items.push({ name, needed });
    }
  });
  
  return items;
}

// MERGE SHOPPING LIST ITEMS
function mergeShoppingListItems(currentItems, newItems) {
  const merged = [...currentItems];
  
  newItems.forEach(newItem => {
    const existingIndex = merged.findIndex(item => item.name === newItem.name);
    
    if (existingIndex !== -1) {
      // Item exists, add the needed amounts
      merged[existingIndex].needed += newItem.needed;
    } else {
      // Item doesn't exist, add it
      merged.push({ name: newItem.name, needed: newItem.needed });
    }
  });
  
  return merged;
}

// ENHANCED SHOPPING LIST WITH PRODUCT IMAGES
function showEnhancedShoppingList() {
  // Get current items from shopping list (no calculations, just display existing list)
  const currentItems = getCurrentShoppingListItems();
  
  if (currentItems.length === 0) {
    showNotification('No items in shopping list');
    return;
  }
  
  // Get translation for current language
  const t = translations[currentLanguage];
  
  // Group items by shop categories
  const groupedItems = groupItemsByShop(currentItems);
  
  // Generate enhanced modal content with product images, grouped by shops
  let modalHtml = '';
  
  // Shop 1: Fruits
  if (groupedItems.fruits.length > 0) {
    modalHtml += `
      <div class="shopping-shop-group">
        <div class="shopping-shop-header">
          <span class="shopping-shop-icon">🍎</span>
          <span class="shopping-shop-title">Fruit Shop</span>
        </div>
        <div class="shopping-shop-items">
    `;
    modalHtml += groupedItems.fruits.map(item => {
      const safeName = item.name.replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ');
      const itemId = safeName.toLowerCase().replace(/\s+/g, '-');
      const productImage = getProductImageClass(item.name);
      
      return `
        <div class="shopping-modal-item" data-item-name="${item.name}">
          <input type="checkbox" id="modal-item-${itemId}" class="shopping-checkbox">
          <div class="shopping-modal-item-image">
            <span class="${productImage}">${getFallbackEmoji(item.name)}</span>
          </div>
          <div class="shopping-modal-item-content">
            <div class="shopping-modal-item-name">${item.name}</div>
            <div class="shopping-modal-item-quantity">${t.needed || 'Needed:'} ${item.needed}</div>
          </div>
        </div>
      `;
    }).join('');
    modalHtml += '</div></div>';
  }
  
  // Shop 2: Vegetables
  if (groupedItems.vegetables.length > 0) {
    modalHtml += `
      <div class="shopping-shop-group">
        <div class="shopping-shop-header">
          <span class="shopping-shop-icon">🥕</span>
          <span class="shopping-shop-title">Vegetable Shop</span>
        </div>
        <div class="shopping-shop-items">
    `;
    modalHtml += groupedItems.vegetables.map(item => {
      const safeName = item.name.replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ');
      const itemId = safeName.toLowerCase().replace(/\s+/g, '-');
      const productImage = getProductImageClass(item.name);
      
      return `
        <div class="shopping-modal-item" data-item-name="${item.name}">
          <input type="checkbox" id="modal-item-${itemId}" class="shopping-checkbox">
          <div class="shopping-modal-item-image">
            <span class="${productImage}">${getFallbackEmoji(item.name)}</span>
          </div>
          <div class="shopping-modal-item-content">
            <div class="shopping-modal-item-name">${item.name}</div>
            <div class="shopping-modal-item-quantity">${t.needed || 'Needed:'} ${item.needed}</div>
          </div>
        </div>
      `;
    }).join('');
    modalHtml += '</div></div>';
  }
  
  // Shop 3: Herbs
  if (groupedItems.herbs.length > 0) {
    modalHtml += `
      <div class="shopping-shop-group">
        <div class="shopping-shop-header">
          <span class="shopping-shop-icon">🌿</span>
          <span class="shopping-shop-title">Herb Shop</span>
        </div>
        <div class="shopping-shop-items">
    `;
    modalHtml += groupedItems.herbs.map(item => {
      const safeName = item.name.replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ');
      const itemId = safeName.toLowerCase().replace(/\s+/g, '-');
      const productImage = getProductImageClass(item.name);
      
      return `
        <div class="shopping-modal-item" data-item-name="${item.name}">
          <input type="checkbox" id="modal-item-${itemId}" class="shopping-checkbox">
          <div class="shopping-modal-item-image">
            <span class="${productImage}">${getFallbackEmoji(item.name)}</span>
          </div>
          <div class="shopping-modal-item-content">
            <div class="shopping-modal-item-name">${item.name}</div>
            <div class="shopping-modal-item-quantity">${t.needed || 'Needed:'} ${item.needed}</div>
          </div>
        </div>
      `;
    }).join('');
    modalHtml += '</div></div>';
  }
  
  // Shop 4: Flowers
  if (groupedItems.flowers.length > 0) {
    modalHtml += `
      <div class="shopping-shop-group">
        <div class="shopping-shop-header">
          <span class="shopping-shop-icon">🌷</span>
          <span class="shopping-shop-title">Flower Shop</span>
        </div>
        <div class="shopping-shop-items">
    `;
    modalHtml += groupedItems.flowers.map(item => {
      const safeName = item.name.replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ');
      const itemId = safeName.toLowerCase().replace(/\s+/g, '-');
      const productImage = getProductImageClass(item.name);
      
      return `
        <div class="shopping-modal-item" data-item-name="${item.name}">
          <input type="checkbox" id="modal-item-${itemId}" class="shopping-checkbox">
          <div class="shopping-modal-item-image">
            <span class="${productImage}">${getFallbackEmoji(item.name)}</span>
          </div>
          <div class="shopping-modal-item-content">
            <div class="shopping-modal-item-name">${item.name}</div>
            <div class="shopping-modal-item-quantity">${t.needed || 'Needed:'} ${item.needed}</div>
          </div>
        </div>
      `;
    }).join('');
    modalHtml += '</div></div>';
  }
  
  // Shop 5: Other/Unknown
  if (groupedItems.other.length > 0) {
    modalHtml += `
      <div class="shopping-shop-group">
        <div class="shopping-shop-header">
          <span class="shopping-shop-icon">🛒</span>
          <span class="shopping-shop-title">Other Shop</span>
        </div>
        <div class="shopping-shop-items">
    `;
    modalHtml += groupedItems.other.map(item => {
      const safeName = item.name.replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ');
      const itemId = safeName.toLowerCase().replace(/\s+/g, '-');
      const productImage = getProductImageClass(item.name);
      
      return `
        <div class="shopping-modal-item" data-item-name="${item.name}">
          <input type="checkbox" id="modal-item-${itemId}" class="shopping-checkbox">
          <div class="shopping-modal-item-image">
            <span class="${productImage}">${getFallbackEmoji(item.name)}</span>
          </div>
          <div class="shopping-modal-item-content">
            <div class="shopping-modal-item-name">${item.name}</div>
            <div class="shopping-modal-item-quantity">${t.needed || 'Needed:'} ${item.needed}</div>
          </div>
        </div>
      `;
    }).join('');
    modalHtml += '</div></div>';
  }
  
  elements.shoppingModalContent.innerHTML = modalHtml;
  elements.shoppingModal.classList.add('visible');
}

// GROUP ITEMS BY SHOP CATEGORIES
function groupItemsByShop(items) {
  const grouped = {
    fruits: [],
    vegetables: [],
    herbs: [],
    flowers: [],
    other: []
  };
  
  items.forEach(item => {
    const lowerName = item.name.toLowerCase();
    
    // Fruits
    if (lowerName.includes('jabł') || lowerName.includes('grusz') || lowerName.includes('śliwk') || 
        lowerName.includes('wiśn') || lowerName.includes('morel') || lowerName.includes('brzoskw') || 
        lowerName.includes('agrest') || lowerName.includes('malin') || lowerName.includes('jeżyn') || 
        lowerName.includes('porzeczk') || lowerName.includes('truskawk') || lowerName.includes('jagod') || 
        lowerName.includes('borówk') || lowerName.includes('czereśn') || lowerName.includes('czarny') || 
        lowerName.includes('dzika') || lowerName.includes('owoce') || lowerName.includes('owoc')) {
      grouped.fruits.push(item);
    }
    // Vegetables
    else if (lowerName.includes('sałat') || lowerName.includes('marchew') || lowerName.includes('ziemniak') || 
             lowerName.includes('pomidor') || lowerName.includes('ogórek') || lowerName.includes('cebula') || 
             lowerName.includes('czosnek') || lowerName.includes('rzodkiew') || lowerName.includes('szczypiorek') || 
             lowerName.includes('papryk') || lowerName.includes('rzep') || lowerName.includes('burak') || 
             lowerName.includes('kalafior') || lowerName.includes('kapust') || lowerName.includes('fasola') || 
             lowerName.includes('groch') || lowerName.includes('szparagi') || lowerName.includes('kukurydza') || 
             lowerName.includes('dynia') || lowerName.includes('bataty') || lowerName.includes('warzywa') || 
             lowerName.includes('warzyw')) {
      grouped.vegetables.push(item);
    }
    // Herbs
    else if (lowerName.includes('mięta') || lowerName.includes('bazylia') || lowerName.includes('oregano') || 
             lowerName.includes('rozmaryn') || lowerName.includes('tymianek') || lowerName.includes('szalotka') || 
             lowerName.includes('pietruszka') || lowerName.includes('koper') || lowerName.includes('ziola') || 
             lowerName.includes('ziół')) {
      grouped.herbs.push(item);
    }
    // Flowers
    else if (lowerName.includes('róża') || lowerName.includes('stokrotka') || lowerName.includes('tulipan') || 
             lowerName.includes('stulista') || lowerName.includes('hiacynt') || lowerName.includes('fiołek') || 
             lowerName.includes('niezapominajka') || lowerName.includes('magnolia') || lowerName.includes('kwiat') || 
             lowerName.includes('kwiaty')) {
      grouped.flowers.push(item);
    }
    // Other/Unknown
    else {
      grouped.other.push(item);
    }
  });
  
  return grouped;
}

// GET PRODUCT IMAGE CLASS BASED ON ITEM NAME
function getProductImageClass(itemName) {
  // Map item names to Zielone Imperium CSS classes
  const itemMap = {
    // Vegetables
    'sałaty': 'e2',
    'marchewki': 'e3',
    'ziemniaki': 'e4',
    'pomidory': 'e5',
    'ogórki': 'e6',
    'cebula': 'e7',
    'czosnek': 'e8',
    'rzodkiewka': 'e9',
    'szczypiorek': 'e10',
    'papryka': 'e11',
    'rzepa': 'e12',
    'buraki': 'e13',
    'kalafior': 'e16',
    'kapusta': 'e17',
    'fasola': 'e18',
    'groch': 'e20',
    'szparagi': 'e21',
    'kukurydza': 'e22',
    'dynia': 'e32',
    'bataty': 'e33',
    'rzepa': 'e34',
    'rzepa': 'e35',
    'rzepa': 'e48',
    'rzepa': 'e49',
    'rzepa': 'e50',
    'rzepa': 'e51',
    'rzepa': 'e52',
    'rzepa': 'e54',
    'rzepa': 'e58',
    'rzepa': 'e59',
    'rzepa': 'e60',
    'rzepa': 'e64',
    'rzepa': 'e67',
    'rzepa': 'e68',
    'rzepa': 'e69',
    'rzepa': 'e70',
    
    // Herbs
    'mięta': 'e400',
    'bazylia': 'e401',
    'oregano': 'e402',
    'rozmaryn': 'e403',
    'tymianek': 'e404',
    'szalotka': 'e405',
    'pietruszka': 'e406',
    'koper': 'e407',
    
    // Fruits
    'jabłka': 'e100',
    'gruszki': 'e101',
    'śliwki': 'e102',
    'wiśnie': 'e103',
    'morele': 'e104',
    'brzoskwinie': 'e105',
    'agrest': 'e106',
    'maliny': 'e107',
    'jeżyny': 'e108',
    'porzeczki': 'e109',
    'truskawki': 'e110',
    'jagody': 'e111',
    'borówki': 'e112',
    'czereśnie': 'e113',
    'czarny bez': 'e114',
    'dzika róza': 'e115',
    'dziki czereśnia': 'e116',
    'dziki czarny bez': 'e117',
    'dzika dzika róza': 'e118',
    'dzika dzika dzika róza': 'e119',
    
    // Flowers
    'róża': 'e200',
    'stokrotka': 'e201',
    'tulipan': 'e202',
    'stulista': 'e203',
    'hiacynt': 'e204',
    'fiołek': 'e205',
    'niezapominajka': 'e206',
    'magnolia': 'e207'
  };
  
  // Convert to lowercase for case-insensitive matching
  const lowerItemName = itemName.toLowerCase();
  
  // Check for exact match
  if (itemMap[lowerItemName]) {
    return itemMap[lowerItemName];
  }
  
  // Check for partial matches
  for (const [key, value] of Object.entries(itemMap)) {
    if (lowerItemName.includes(key)) {
      return value;
    }
  }
  
  // Return default if no match found
  return 'e2'; // Default to salad image
}

// GET FALLBACK EMOJI FOR ITEMS WITHOUT CSS CLASSES
function getFallbackEmoji(itemName) {
  const emojiMap = {
    'sałaty': '🥬',
    'marchewki': '🥕',
    'ziemniaki': '🥔',
    'pomidory': '🍅',
    'ogórki': '🥒',
    'cebula': '🧅',
    'czosnek': '🧄',
    'rzodkiewka': '🫒',
    'szczypiorek': '🌿',
    'papryka': '🫑',
    'rzepa': '🍠',
    'buraki': ' beetroot',
    'kalafior': '🥦',
    'kapusta': '🥬',
    'fasola': '🌱',
    'groch': '🌱',
    'szparagi': '🥦',
    'kukurydza': '🌽',
    'dynia': '🎃',
    'bataty': '🍠',
    'mięta': '🌿',
    'bazylia': '🌿',
    'oregano': '🌿',
    'rozmaryn': '🌿',
    'tymianek': '🌿',
    'szalotka': '🧅',
    'pietruszka': '🌿',
    'koper': '🌿',
    'jabłka': '🍎',
    'gruszki': '🍐',
    'śliwki': '🍑',
    'wiśnie': '🍒',
    'morele': '🍑',
    'brzoskwinie': '🍑',
    'agrest': '🍇',
    'maliny': '🫐',
    'jeżyny': '🫐',
    'porzeczki': '🫐',
    'truskawki': '🍓',
    'jagody': '🫐',
    'borówki': '🫐',
    'czereśnie': '🍒',
    'czarny bez': '🍇',
    'dzika róza': '🌹',
    'róża': '🌹',
    'stokrotka': '🌼',
    'tulipan': '🌷',
    'stulista': '🌸',
    'hiacynt': '🌷',
    'fiołek': '💜',
    'niezapominajka': '💙',
    'magnolia': '🌸'
  };
  
  const lowerItemName = itemName.toLowerCase();
  
  // Check for exact match
  if (emojiMap[lowerItemName]) {
    return emojiMap[lowerItemName];
  }
  
  // Check for partial matches
  for (const [key, value] of Object.entries(emojiMap)) {
    if (lowerItemName.includes(key)) {
      return value;
    }
  }
  
  // Return default emoji based on item type
  if (lowerItemName.includes('owoce') || lowerItemName.includes('owoc') || lowerItemName.includes('jabł') || lowerItemName.includes('grusz') || lowerItemName.includes('śliwk') || lowerItemName.includes('wiśn') || lowerItemName.includes('morel') || lowerItemName.includes('brzoskw') || lowerItemName.includes('agrest') || lowerItemName.includes('malin') || lowerItemName.includes('jeżyn') || lowerItemName.includes('porzeczk') || lowerItemName.includes('truskawk') || lowerItemName.includes('jagod') || lowerItemName.includes('borówk') || lowerItemName.includes('czereśn') || lowerItemName.includes('czarny') || lowerItemName.includes('dzika')) {
    return '🍎';
  } else if (lowerItemName.includes('warzywa') || lowerItemName.includes('warzyw') || lowerItemName.includes('sałat') || lowerItemName.includes('marchew') || lowerItemName.includes('ziemniak') || lowerItemName.includes('pomidor') || lowerItemName.includes('ogórek') || lowerItemName.includes('cebula') || lowerItemName.includes('czosnek') || lowerItemName.includes('rzodkiew') || lowerItemName.includes('szczypiorek') || lowerItemName.includes('papryk') || lowerItemName.includes('rzep') || lowerItemName.includes('burak') || lowerItemName.includes('kalafior') || lowerItemName.includes('kapust') || lowerItemName.includes('fasola') || lowerItemName.includes('groch') || lowerItemName.includes('szparagi') || lowerItemName.includes('kukurydza') || lowerItemName.includes('dynia') || lowerItemName.includes('bataty')) {
    return '🥕';
  } else if (lowerItemName.includes('ziola') || lowerItemName.includes('ziół') || lowerItemName.includes('mięta') || lowerItemName.includes('bazylia') || lowerItemName.includes('oregano') || lowerItemName.includes('rozmaryn') || lowerItemName.includes('tymianek') || lowerItemName.includes('szalotka') || lowerItemName.includes('pietruszka') || lowerItemName.includes('koper')) {
    return '🌿';
  } else if (lowerItemName.includes('kwiat') || lowerItemName.includes('kwiaty') || lowerItemName.includes('róża') || lowerItemName.includes('stokrotka') || lowerItemName.includes('tulipan') || lowerItemName.includes('stulista') || lowerItemName.includes('hiacynt') || lowerItemName.includes('fiołek') || lowerItemName.includes('niezapominajka') || lowerItemName.includes('magnolia')) {
    return '🌷';
  }
  
  // Return generic plant emoji for unknown items
  return '🌱';
}

// INITIAL + INTERVAL – moved inside DOMContentLoaded below

// Initialize speed controls and shopping list
document.addEventListener('DOMContentLoaded', () => {
  // Initialize DOM elements first
  initializeDOMElements();
  
  // Set up all button event listeners after DOM is loaded
  setupButtonListeners();
  
  initializeSpeedControls();
  initializeLanguageToggle();
  
  // Initialize shopping list visibility state

  // Task count polling – must run after initializeDOMElements
  setInterval(() => {
    chrome.storage.local.get(['activeTasks'], (result) => {
      if (elements.tasksCount) elements.tasksCount.textContent = result.activeTasks || 0;
    });
  }, 1000);

  // Connection status polling – must run after initializeDOMElements
  checkConnection();
  setInterval(checkConnection, 2000);
});

// Set up all button event listeners after DOM is loaded
function setupButtonListeners() {
  // BUTTON HANDLERS
  elements.findSeller.addEventListener('click', () => {
    sendMessageToContent('findSeller');
  });

  elements.waterCrops.addEventListener('click', () => {
    watering = !watering;

    if (watering) {
      elements.waterCrops.textContent = 'Stop Watering';
      showNotification('Watering started');
      sendMessageToContent('start_watering');
    } else {
      elements.waterCrops.textContent = 'Water Crops';
      showNotification('Watering stopped');
      sendMessageToContent('stop_watering');
    }
  });

  elements.plantCrops.addEventListener('click', () => {
    sendMessageToContent('plantCrops');
  });

  elements.harvestCrops.addEventListener('click', () => {
    sendMessageToContent('harvestCrops');
  });


  elements.showShoppingList.addEventListener('click', () => {
    toggleShoppingList();
  });

  if (elements.refreshShoppingList) {
    elements.refreshShoppingList.addEventListener('click', () => {
      calculateShoppingList();
    });
  }

  if (elements.showEnhancedShoppingList) {
    elements.showEnhancedShoppingList.addEventListener('click', () => {
      showEnhancedShoppingList();
    });
  }

  // Enhanced Shopping Modal Event Listeners
  elements.closeShoppingModal.addEventListener('click', () => {
    elements.shoppingModal.classList.remove('visible');
  });

  elements.clearShoppingModal.addEventListener('click', () => {
    const t = translations[currentLanguage];
    elements.shoppingModalContent.innerHTML = `<p style="color: #fffb48; text-align: center; padding: 20px;">${t.shoppingListCleared || 'Shopping list cleared.'}</p>`;
  });

  elements.markAllShoppingModal.addEventListener('click', () => {
    const checkboxes = elements.shoppingModalContent.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(cb => cb.checked = true);
  });

  elements.unmarkAllShoppingModal.addEventListener('click', () => {
    const checkboxes = elements.shoppingModalContent.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(cb => cb.checked = false);
  });

  // Close modal when clicking outside
  elements.shoppingModal.addEventListener('click', (e) => {
    if (e.target === elements.shoppingModal) {
      elements.shoppingModal.classList.remove('visible');
    }
  });

  // SHOPPING LIST MANAGEMENT BUTTONS
  elements.clearShoppingList.addEventListener('click', () => {
    const t = translations[currentLanguage];
    elements.shoppingListContent.innerHTML = `<p style="color: #fffb48;">${t.shoppingListCleared || 'Shopping list cleared.'}</p>`;
  });

  elements.markAllShoppingList.addEventListener('click', () => {
    const checkboxes = elements.shoppingListContent.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(cb => cb.checked = true);
  });

  elements.unmarkAllShoppingList.addEventListener('click', () => {
    const checkboxes = elements.shoppingListContent.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(cb => cb.checked = false);
  });

  // PRZEŁĄCZANIE OGRODÓW, LOKACJI I FUNKCJI
  [
    'go-garden1', 'go-garden2', 'go-water', 'go-park', 
    'go-bonsai', 'go-birds', 'go-mine', 'auto-mine',
    'renew-park', 'bonsai-trim', 'birds-auto'
  ].forEach(id => {
    const btn = document.getElementById(id);
    if (!btn) return;

    // === FUNKCJE SPECJALNE ===
    if (id === 'renew-park') {
      btn.addEventListener('click', () => {
        sendMessageToContent('renewParkDecorations');
      });
    } 
    else if (id === 'bonsai-trim') {
      btn.addEventListener('click', () => {
        sendMessageToContent('bonsaiTrim');
      });
    }
    else if (id === 'birds-auto') {
      btn.addEventListener('click', () => {
        sendMessageToContent('birdsAuto');
      });
    }
    else if (id === 'auto-mine') {
      btn.addEventListener('click', () => {
        sendMessageToContent('autoMine');
      });
    }
    // === PRZEŁĄCZANIE OGRODÓW (go-...) ===
    else if (id.startsWith('go-')) {
      const action = id.replace('go-', '').replace(/([a-z])([A-Z])/g, '$1$2').toUpperCase();
      btn.addEventListener('click', () => {
        sendMessageToContent(`go${action}`);
      });
    }
  });
}

// Initialize speed controls
function initializeSpeedControls() {
  // Set default speeds
  setDefaultSpeeds();
  
  // Add event listeners for speed buttons
  const speedButtons = document.querySelectorAll('.speed-btn');
  speedButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const speed = btn.dataset.speed;
      const action = btn.dataset.action;
      
      // Update active state
      const actionButtons = document.querySelectorAll(`.speed-btn[data-action="${action}"]`);
      actionButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      // Save speed preference
      const speedSettings = {};
      speedSettings[action] = speed;
      chrome.storage.local.set(speedSettings);
      
      // Show feedback
      showSpeedFeedback(action, speed);
    });
  });
}

// Set default speeds
function setDefaultSpeeds() {
  chrome.storage.local.get(['water', 'plant'], (result) => {
    const waterSpeed = result.water || 'normal';
    const plantSpeed = result.plant || 'normal';
    
    // Activate default buttons
    const waterBtn = document.querySelector(`.speed-btn[data-speed="${waterSpeed}"][data-action="water"]`);
    const plantBtn = document.querySelector(`.speed-btn[data-speed="${plantSpeed}"][data-action="plant"]`);
    
    if (waterBtn) waterBtn.classList.add('active');
    if (plantBtn) plantBtn.classList.add('active');
  });
}

// Show speed feedback
function showSpeedFeedback(action, speed) {
  const actionText = action === 'water' ? 'Watering' : 'Planting';
  const speedText = speed === 'fast' ? 'Fast' : speed === 'normal' ? 'Normal' : 'Slow';
  
  showToast(`${actionText} speed set to ${speedText}`);
}

// Show toast notification
function showToast(message) {
  const toast = document.createElement('div');
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);
    background: rgba(255, 251, 72, 0.95); color: #000; padding: 12px 24px;
    border-radius: 8px; font-size: 13px; font-weight: 600; z-index: 10000;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3); animation: fadeInOut 2s forwards;
  `;
  document.body.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 1700);
}

function updateLanguage() {
  const t = translations[currentLanguage];
  if (!t) return;
  
  // Helper to safely set text content
  const setText = (selector, text) => {
    const el = document.querySelector(selector);
    if (el) el.textContent = text;
  };
  
  // Helper to safely set text by ID
  const setIdText = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  };
  
  // Update header text
  setText('.header h1', t.title);
  setText('.header p', t.subtitle);
  
  // Update status labels
  const statusLabels = document.querySelectorAll('.status-label');
  if (statusLabels.length >= 4) {
    statusLabels[0].textContent = t.extensionStatus;
    statusLabels[1].textContent = t.activeTasks;
    statusLabels[2].textContent = t.currentLocation;
    statusLabels[3].textContent = t.selectedPlant;
  }
  setIdText('status-text', t.inactive);
  
  // Update speed labels
  const speedLabels = document.querySelectorAll('.speed-label');
  if (speedLabels.length >= 2) {
    speedLabels[0].textContent = '💧 ' + t.wateringSpeed;
    speedLabels[1].textContent = '🌱 ' + t.plantingSpeed;
  }
  
  const speedBtns = document.querySelectorAll('.speed-btn');
  if (speedBtns.length >= 4) {
    speedBtns[0].textContent = t.fast;
    speedBtns[1].textContent = t.slow;
    speedBtns[2].textContent = t.fast;
    speedBtns[3].textContent = t.slow;
  }
  
  // Update task buttons (structure: icon span + text span)
  const updateTaskBtn = (id, text) => {
    const btn = document.getElementById(id);
    if (btn) {
      const textSpan = btn.querySelector('span:last-child');
      if (textSpan) textSpan.textContent = text;
    }
  };
  
  updateTaskBtn('water-crops', t.waterCrops);
  updateTaskBtn('plant-crops', t.plantCrops);
  updateTaskBtn('harvest-crops', t.harvestCrops);
  updateTaskBtn('find-seller', t.sellItems);
  updateTaskBtn('show-shopping-list', t.shoppingList);
  
  // Update current shopping list items labels (Potrzeba/Needed)
  const itemQuantities = document.querySelectorAll('.shopping-item-quantity, .shopping-modal-item-quantity');
  itemQuantities.forEach(el => {
    const text = el.textContent;
    const match = text.match(/\d+/);
    if (match) {
      el.textContent = `${t.needed || 'Needed:'} ${match[0]}`;
    }
  });
  
  // Update location card headers (structure: icon + text)
  const updateLocationHeader = (selector, icon, text) => {
    const header = document.querySelector(selector);
    if (header) header.textContent = icon + ' ' + text;
  };
  
  updateLocationHeader('.location-card.park .location-header', '🌳', t.parkTitle);
  updateLocationHeader('.location-card.bonsai .location-header', '🎋', t.bonsaiTitle);
  updateLocationHeader('.location-card.birds .location-header', '🐦', t.birdsTitle);
  updateLocationHeader('.location-card.mine .location-header', '⛏️', t.mineTitle);
  
  // Update gardens section - navigation buttons
  const navButtons = [
    ['go-garden1', t.garden1],
    ['go-garden2', t.garden2],
    ['go-water', t.waterGarden],
    ['go-park', t.park],
    ['renew-park', t.renew],
    ['go-bonsai', t.bonsai],
    ['bonsai-trim', t.trim],
    ['go-birds', t.birds],
    ['birds-auto', t.auto],
    ['go-mine', t.mine],
    ['auto-mine', t.auto]
  ];
  
  navButtons.forEach(([id, text]) => {
    const btn = document.getElementById(id);
    if (btn) {
      // Button has icon span + text node
      const span = btn.querySelector('span');
      if (span) {
        // Keep the span, update the text after it
        btn.childNodes.forEach(node => {
          if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
            node.textContent = ' ' + text;
          }
        });
      } else {
        btn.textContent = text;
      }
    }
  });
  
  // Update shopping list
  setText('.shopping-title', t.shoppingList);
  setIdText('mark-all-shopping-list', '✅');
  setIdText('unmark-all-shopping-list', '❌');
  setIdText('clear-shopping-list', '🗑️');
  setIdText('show-enhanced-shopping-list', '📊 ' + (t.enhancedList || 'Details'));
  setIdText('refresh-shopping-list', '🔄 ' + (t.scan || 'Scan'));
  
  // Update footer
  setText('.footer', t.footer);
}

function toggleLanguage() {
  // Cycle: PL -> EN -> DE -> PL
  if (currentLanguage === 'PL') {
    currentLanguage = 'EN';
  } else if (currentLanguage === 'EN') {
    currentLanguage = 'DE';
  } else {
    currentLanguage = 'PL';
  }
  
  if (languageText) languageText.textContent = currentLanguage;
  updateLanguage();
  saveLanguagePreference();
}

// Load saved language preference
function loadLanguagePreference() {
  chrome.storage.local.get(['language'], (result) => {
    if (result.language && translations[result.language]) {
      currentLanguage = result.language;
    }
    // Update UI after loading preference
    const langText = document.getElementById('language-text');
    if (langText) langText.textContent = currentLanguage;
    updateLanguage();
  });
}

// Save language preference
function saveLanguagePreference() {
  chrome.storage.local.set({ language: currentLanguage });
}

// Initialize language toggle after DOM is loaded
function initializeLanguageToggle() {
  languageToggle = document.getElementById('language-toggle');
  languageText = document.getElementById('language-text');
  
  if (languageToggle && languageText) {
    languageToggle.addEventListener('click', toggleLanguage);
  }
  
  // Load saved preference
  loadLanguagePreference();
}
