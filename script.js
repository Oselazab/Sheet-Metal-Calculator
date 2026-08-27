// Paste your Google Sheet ID here
const SHEET_ID = '1YdjXMeK9PNs8PkA7DPEa2Q9Ib6ue_aoouA3-uop9K8o'; 
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv`;

// Fallback prices in case the Google Sheet fails to load or goes offline
let marketPrices = {
  al5083: 200,
  al6061: 190,
  ss316: 190,
  ss304: 160,
  ss2205: 260,
  ti5: 1800
};

// Fetch live prices from Google Sheets
async function fetchPricesFromSheet() {
  try {
    const response = await fetch(SHEET_URL);
    if (!response.ok) throw new Error("Network response was not ok");
    
    const csvText = await response.text();
    
    // Parse the CSV data
    const rows = csvText.split('\n');
    
    // Start from i=1 to skip the header row
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i].split(',');
      if (row.length >= 2) {
        const key = row[0].trim();
        const price = parseFloat(row[1].trim());
        
        // If the key exists in our system and the price is a valid number, update it
        if (marketPrices[key] !== undefined && !isNaN(price)) {
          marketPrices[key] = price;
        }
      }
    }
    
    console.log("Prices successfully synced with Google Sheets!");
    
    // Refresh the calculator with the newly downloaded prices
    updatePrice();
    calculate();
    
  } catch (error) {
    console.error("Failed to fetch Google Sheet. Using fallback local prices.", error);
  }
}

// Check for ROV material warnings
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

  // Conversion: mm to meters
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
  checkRovWarning();
  updatePrice();
  calculate();
  
  // Call the Google Sheets fetch function in the background
  fetchPricesFromSheet();
});
