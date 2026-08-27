// Default local market pricing database (El Labban, Alexandria)
const defaultPrices = {
  al5083: 200,
  al6061: 190,
  ss316: 190,
  ss304: 160,
  ss2205: 260,
  ti5: 1800
};

// Retrieve saved rates from browser LocalStorage or fallback to defaults
let marketPrices = JSON.parse(localStorage.getItem('rovMarketPrices')) || defaultPrices;

// Initialize inputs in the price editor drawer
function initEditorInputs() {
  for (const key in marketPrices) {
    const field = document.getElementById('edit_' + key);
    if (field) {
      field.value = marketPrices[key];
    }
  }
}

// Toggle visibility of the database drawer
function togglePriceEditor() {
  const drawer = document.getElementById('priceEditor');
  drawer.classList.toggle('hidden');
  if (!drawer.classList.contains('hidden')) {
    initEditorInputs();
  }
}

// Save modified prices to LocalStorage
function savePrices() {
  for (const key in marketPrices) {
    const field = document.getElementById('edit_' + key);
    if (field) {
      marketPrices[key] = parseFloat(field.value) || 0;
    }
  }
  localStorage.setItem('rovMarketPrices', JSON.stringify(marketPrices));
  togglePriceEditor();
  updatePrice();
  calculate();
}

// Check for ROV material warnings (e.g., 304 SS in marine environments)
function checkRovWarning() {
  const selectedMaterial = document.getElementById('material').value;
  const warningBox = document.getElementById('rovWarning');
  
  if (selectedMaterial === 'ss304') {
    warningBox.classList.remove('hidden');
  } else {
    warningBox.classList.add('hidden');
  }
}

// Update Price Field based on toggle state
function updatePrice() {
  const isLocalPriceActive = document.getElementById('useAlexPrice').checked;
  const priceInput = document.getElementById('pricePerKg');
  const selectedMaterialKey = document.getElementById('material').value;

  if (isLocalPriceActive) {
    priceInput.value = marketPrices[selectedMaterialKey] || 0;
    priceInput.readOnly = true;
  } else {
    priceInput.readOnly = false;
  }
}

// Primary calculation function
function calculate() {
  const materialSelect = document.getElementById('material');
  const selectedOption = materialSelect.options[materialSelect.selectedIndex];
  const density = parseFloat(selectedOption.getAttribute('data-density')) || 0;

  const length = parseFloat(document.getElementById('length').value) || 0;
  const width = parseFloat(document.getElementById('width').value) || 0;
  const thickness = parseFloat(document.getElementById('thickness').value) || 0;
  const pricePerKg = parseFloat(document.getElementById('pricePerKg').value) || 0;
  const isLocalPriceActive = document.getElementById('useAlexPrice').checked;

  // Conversion: mm to meters (mm / 1000)
  const volumeM3 = (length / 1000) * (width / 1000) * (thickness / 1000);
  const weightKg = volumeM3 * density;
  const totalPrice = weightKg * pricePerKg;

  // DOM Updates
  document.getElementById('outVolume').innerHTML = `${volumeM3.toFixed(4)} <small>m³</small>`;
  document.getElementById('outWeight').innerHTML = `${weightKg.toFixed(2)} <small>kg</small>`;

  const formattedPrice = totalPrice.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  const currencyUnit = isLocalPriceActive ? ' EGP' : ' $';
  document.getElementById('outPrice').textContent = isLocalPriceActive 
    ? `${formattedPrice}${currencyUnit}` 
    : `${currencyUnit}${formattedPrice}`;
}

// Initial state setup on page load
document.addEventListener('DOMContentLoaded', () => {
  initEditorInputs();
  checkRovWarning();
  updatePrice();
  calculate();
});