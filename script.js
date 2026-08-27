// Paste your exact Google Sheet ID here
const SHEET_ID = '1YdjXMeK9PNs8PkA7DPEa2Q9Ib6ue_aoouA3-uop9K8o'; 
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv`;

// Fallback prices (Min and Max)
let marketPrices = {
  al5083: { min: 190, max: 210 },
  al6061: { min: 180, max: 200 },
  ss316:  { min: 180, max: 200 },
  ss304:  { min: 150, max: 170 },
  ss2205: { min: 250, max: 270 },
  ti5:    { min: 1700, max: 1900 },
  pa6:    { min: 120, max: 150 } // Polyamide
};

// Fetch live prices from Google Sheets
async function fetchPricesFromSheet() {
  try {
    const response = await fetch(SHEET_URL);
    if (!response.ok) throw new Error("Network response was not ok");
    
    const csvText = await response.text();
    const rows = csvText.split('\n');
    
    // Start from i=1 to skip the header row
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i].split(',');
      if (row.length >= 3) {
        const key = row[0].trim();
        const minP = parseFloat(row[1].trim());
        const maxP = parseFloat(row[2].trim());
        
        if (marketPrices[key] !== undefined && !isNaN(minP) && !isNaN(maxP)) {
          marketPrices[key] = { min: minP, max: maxP };
        }
      }
    }
    
    console.log("Price ranges successfully synced with Google Sheets!");
    updatePrice();
    calculate();
    
  } catch (error) {
    console.error("Failed to fetch Google Sheet. Using fallback prices.", error);
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

// Update Price Fields based on toggle state
function updatePrice() {
  const isLocalPriceActive = document.getElementById('useAlexPrice').checked;
  const priceMinInput = document.getElementById('priceMin');
  const priceMaxInput = document.getElementById('priceMax');
  const selectedMaterialKey = document.getElementById('material').value;

  if (isLocalPriceActive) {
    const range = marketPrices[selectedMaterialKey] || { min: 0, max: 0 };
    priceMinInput.value = range.min;
    priceMaxInput.value = range.max;
    priceMinInput.readOnly = true;
    priceMaxInput.readOnly = true;
  } else {
    priceMinInput.readOnly = false;
    priceMaxInput.readOnly = false;
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
  
  const priceMin = parseFloat(document.getElementById('priceMin').value) || 0;
  const priceMax = parseFloat(document.getElementById('priceMax').value) || 0;
  const isLocalPriceActive = document.getElementById('useAlexPrice').checked;

  // Conversion: mm to meters
  const volumeM3 = (length / 1000) * (width / 1000) * (thickness / 1000);
  const weightKg = volumeM3 * density;
  
  const totalMinPrice = weightKg * priceMin;
  const totalMaxPrice = weightKg * priceMax;

  // DOM Updates
  document.getElementById('outVolume').innerHTML = `${volumeM3.toFixed(4)} <small>m³</small>`;
  document.getElementById('outWeight').innerHTML = `${weightKg.toFixed(2)} <small>kg</small>`;

  const formatOptions = { minimumFractionDigits: 2, maximumFractionDigits: 2 };
  const formattedMin = totalMinPrice.toLocaleString(undefined, formatOptions);
  const formattedMax = totalMaxPrice.toLocaleString(undefined, formatOptions);

  const currencyUnit = isLocalPriceActive ? ' EGP' : ' $';
  
  // Display the range logic
  if (totalMinPrice === totalMaxPrice || priceMax === 0) {
    // If only one price is entered or they match, display a single price
    document.getElementById('outPrice').textContent = isLocalPriceActive 
      ? `${formattedMin}${currencyUnit}` 
      : `${currencyUnit}${formattedMin}`;
  } else {
    // Display the range
    document.getElementById('outPrice').textContent = isLocalPriceActive 
      ? `${formattedMin} - ${formattedMax}${currencyUnit}` 
      : `${currencyUnit}${formattedMin} - ${currencyUnit}${formattedMax}`;
  }
}

// Initial state setup on page load
document.addEventListener('DOMContentLoaded', () => {
  checkRovWarning();
  updatePrice();
  calculate();
  fetchPricesFromSheet();
});
