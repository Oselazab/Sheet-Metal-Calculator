// Google Sheet Live Sync Configuration
const SHEET_ID = '1YdjXMeK9PNs8PkA7DPEa2Q9Ib6ue_aoouA3-uop9K8o';
// FIX 1: Using the gviz endpoint which natively supports CORS and CSV formatting
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv`;

// Fallback price ranges (Abo Al Dardar & El Labban Market Rates in EGP/kg)
let marketPrices = {
  pa6:      { min: 120, max: 150 },
  pa66:     { min: 140, max: 170 },
  pa6_mos2: { min: 160, max: 190 },
  pa12:     { min: 220, max: 260 },
  al5083:   { min: 190, max: 210 },
  al6061:   { min: 180, max: 200 },
  ss316:    { min: 180, max: 200 },
  ss304:    { min: 150, max: 170 },
  ss2205:   { min: 250, max: 270 },
  ti5:      { min: 1700, max: 1900 }
};

// Fetch live prices from Google Sheets
async function fetchPricesFromSheet() {
  try {
    const response = await fetch(SHEET_URL);
    if (!response.ok) throw new Error('Failed to fetch Google Sheet CSV');
    
    const csvText = await response.text();
    const rows = csvText.trim().split('\n');
    
    for (let i = 1; i < rows.length; i++) { // Start at 1 to skip headers
      // FIX 2: Google Sheets wraps CSV values in quotes (e.g., "190"). We must strip them out.
      const cleanRow = rows[i].replace(/['"]+/g, '');
      const cols = cleanRow.split(',').map(c => c.trim());
      
      if (cols.length >= 3) {
        const key = cols[0];
        const min = parseFloat(cols[1]);
        const max = parseFloat(cols[2]);
        
        if (!isNaN(min) && !isNaN(max)) {
          marketPrices[key] = { min, max };
        }
      }
    }
    
    console.log('Prices successfully synced with Google Sheets.');
    updatePrice();
    calculate();
  } catch (error) {
    console.error('Using offline fallback price ranges.', error);
  }
}

// Adjust visible input fields based on selected geometry
function onShapeChange() {
  const shape = document.getElementById('shapeType').value;
  
  const widthField = document.getElementById('field_width');
  const thicknessField = document.getElementById('field_thickness');
  const odField = document.getElementById('field_outerDiameter');
  const wallField = document.getElementById('field_wallThickness');
  const rodDiaField = document.getElementById('field_rodDiameter');

  // Hide all shape-specific fields first
  [widthField, thicknessField, odField, wallField, rodDiaField].forEach(f => f.classList.add('hidden'));

  if (shape === 'sheet') {
    widthField.classList.remove('hidden');
    thicknessField.classList.remove('hidden');
  } else if (shape === 'tube') {
    odField.classList.remove('hidden');
    wallField.classList.remove('hidden');
  } else if (shape === 'rod') {
    rodDiaField.classList.remove('hidden');
  }
}

// Check for marine ROV engineering warnings
function checkRovWarning() {
  const selectedMaterial = document.getElementById('material').value;
  const warningBox = document.getElementById('rovWarning');
  const warningText = document.getElementById('warningText');
  
  if (selectedMaterial === 'ss304') {
    warningText.textContent = '⚠️ 304 SS is susceptible to crevice and pitting corrosion in marine environments. Consider 316L, 2205 Duplex, or Al 5083.';
    warningBox.classList.remove('hidden');
  } else if (selectedMaterial === 'pa6' || selectedMaterial === 'pa66') {
    warningText.textContent = 'ℹ️ Standard PA6 and PA66 absorb 3–8% water when submerged, causing slight swelling. For tight-tolerance subsea bushings, use PA6+MoS2 or PA12.';
    warningBox.classList.remove('hidden');
  } else {
    warningBox.classList.add('hidden');
  }
}

// Update the price field based on market toggle
function updatePrice() {
  const isLocalPriceActive = document.getElementById('useAlexPrice').checked;
  const priceInput = document.getElementById('pricePerKg');
  const selectedMaterialKey = document.getElementById('material').value;
  const rates = marketPrices[selectedMaterialKey] || { min: 0, max: 0 };

  if (isLocalPriceActive) {
    priceInput.value = `${rates.min} - ${rates.max}`;
    priceInput.readOnly = true;
  } else {
    if (priceInput.readOnly) priceInput.value = '';
    priceInput.readOnly = false;
  }
}

// Primary calculation function supporting sheets, tubes, and rods
function calculate() {
  const materialSelect = document.getElementById('material');
  const selectedOption = materialSelect.options[materialSelect.selectedIndex];
  const density = parseFloat(selectedOption.getAttribute('data-density')) || 0; // kg/m³
  
  const shape = document.getElementById('shapeType').value;
  const length = parseFloat(document.getElementById('length').value) || 0; // mm
  let volumeM3 = 0;

  if (shape === 'sheet') {
    const width = parseFloat(document.getElementById('width').value) || 0;
    const thickness = parseFloat(document.getElementById('thickness').value) || 0;
    volumeM3 = (length / 1000) * (width / 1000) * (thickness / 1000);
  } else if (shape === 'tube') {
    const od = parseFloat(document.getElementById('outerDiameter').value) || 0;
    const wall = parseFloat(document.getElementById('wallThickness').value) || 0;
    if (od > 0 && wall > 0 && od > (2 * wall)) {
      const id = od - (2 * wall);
      const crossSectionMm2 = (Math.PI / 4) * (Math.pow(od, 2) - Math.pow(id, 2));
      volumeM3 = (crossSectionMm2 * length) / 1e9;
    }
  } else if (shape === 'rod') {
    const dia = parseFloat(document.getElementById('rodDiameter').value) || 0;
    if (dia > 0) {
      const crossSectionMm2 = (Math.PI / 4) * Math.pow(dia, 2);
      volumeM3 = (crossSectionMm2 * length) / 1e9;
    }
  }

  const weightKg = volumeM3 * density;
  const isLocalPriceActive = document.getElementById('useAlexPrice').checked;
  const selectedMaterialKey = document.getElementById('material').value;

  let minPrice = 0;
  let maxPrice = 0;

  if (isLocalPriceActive) {
    const rates = marketPrices[selectedMaterialKey] || { min: 0, max: 0 };
    minPrice = rates.min;
    maxPrice = rates.max;
  } else {
    // FIX 3: Allow users to type custom ranges (e.g., "150 - 170")
    const customPriceText = document.getElementById('pricePerKg').value || '';
    if (customPriceText.includes('-')) {
      const parts = customPriceText.split('-');
      minPrice = parseFloat(parts[0]) || 0;
      maxPrice = parseFloat(parts[1]) || 0;
    } else {
      const customPrice = parseFloat(customPriceText) || 0;
      minPrice = customPrice;
      maxPrice = customPrice;
    }
  }

  const minTotal = weightKg * minPrice;
  const maxTotal = weightKg * maxPrice;

  // DOM Updates
  document.getElementById('outVolume').innerHTML = `${volumeM3.toFixed(5)} <small>m³</small>`;
  document.getElementById('outWeight').innerHTML = `${weightKg.toFixed(2)} <small>kg</small>`;

  const format = (n) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const unit = isLocalPriceActive ? ' EGP' : ' $';

  if (minTotal === maxTotal || maxTotal === 0) {
    document.getElementById('outPrice').textContent = `${format(minTotal)}${unit}`;
  } else {
    document.getElementById('outPrice').textContent = `${format(minTotal)} – ${format(maxTotal)}${unit}`;
  }
}

// Initial setup on load
document.addEventListener('DOMContentLoaded', () => {
  onShapeChange();
  checkRovWarning();
  updatePrice();
  calculate();
  fetchPricesFromSheet();
});