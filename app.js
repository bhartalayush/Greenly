/*
========================================================================
   GREENLY CONTROL LOGIC & DYNAMIC INTERACTION ENGINE
========================================================================
*/

// Safe LocalStorage Wrapper for non-browser/restricted environments
const storage = {
  getItem: (key) => {
    try {
      return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
    } catch (e) {
      return null;
    }
  },
  setItem: (key, val) => {
    try {
      if (typeof localStorage !== 'undefined') localStorage.setItem(key, val);
    } catch (e) {}
  },
  removeItem: (key) => {
    try {
      if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
    } catch (e) {}
  }
};

// Application State (Initialized to Zero Presets)
const state = {
  // Transport Inputs
  carKm: 0,
  engineType: 'gasoline',
  transitKm: 0,
  flightsHours: 0,

  // Energy Inputs
  electricityKwh: 0,
  cleanEnergyPct: 0,
  heatingSource: 'gas',

  // Diet Inputs
  dietType: 'meat-heavy',
  foodSource: 'balanced',

  // Lifestyle Inputs
  lifestyle: 'high',
  recycling: 'some',

  // Daily offset in kg
  dailyOffsetKg: 0,

  // State tracker to control Pristine vs Active foot shape
  hasInteracted: false
};

// Emission Coefficients (kg CO2e per unit)
const EMISSION_FACTORS = {
  car: {
    gasoline: 0.20,
    hybrid: 0.11,
    electric: 0.04
  },
  transit: 0.04,
  flight: 90,
  electricity: 0.40
};

// Target Constants for Score Assessment
const TARGETS = {
  ecoThreshold: 3.5,
  heavyThreshold: 9.0
};

// Category status limits (in tonnes CO2e / year)
const SECTOR_LIMITS = {
  transport: { critical: 2.5, moderate: 1.0 },
  energy: { critical: 2.0, moderate: 0.8 },
  diet: { critical: 2.0, moderate: 1.2 },
  waste: { critical: 1.8, moderate: 0.8 }
};

// Daily Challenges Database (Changes dynamically by getDay())
const DAILY_CHALLENGES = [
  {
    day: 0, // Sunday
    name: "Zero-Waste Sunday",
    desc: "Avoid buying or using any single-use plastics today.",
    co2: 0.50,
    id: "challenge-sun"
  },
  {
    day: 1, // Monday
    name: "Meat-Free Monday",
    desc: "Prepare and eat only plant-based meals today.",
    co2: 0.40,
    id: "challenge-mon"
  },
  {
    day: 2, // Tuesday
    name: "Cold Laundry Wash",
    desc: "Wash a load of laundry using cold water only.",
    co2: 0.30,
    id: "challenge-tue"
  },
  {
    day: 3, // Wednesday
    name: "Active Transit Commute",
    desc: "Walk, cycle, or use public transit for all travel today.",
    co2: 0.80,
    id: "challenge-wed"
  },
  {
    day: 4, // Thursday
    name: "Unplug Chargers Night",
    desc: "Unplug all electronics and standby chargers before sleeping.",
    co2: 0.20,
    id: "challenge-thu"
  },
  {
    day: 5, // Friday
    name: "Eco-Shower Challenge",
    desc: "Limit your shower to under 4 minutes today.",
    co2: 0.35,
    id: "challenge-fri"
  },
  {
    day: 6, // Saturday
    name: "Local Sourcing Day",
    desc: "Purchase food ingredients strictly from local shops or farmers markets.",
    co2: 0.45,
    id: "challenge-sat"
  }
];

// Keep track of active visual effects
let smokeEmitterInterval = null;
let sproutSpawnTimeout = null;

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  setupPageTransitions();
  
  // Page-specific routing logic
  if (document.getElementById('calc-form')) {
    setupWizard();
    setupCalculatorEventListeners();
    loadCalculatorState();
    calculateFootprint(); 
  } else if (document.body.classList.contains('page-tasks') || document.getElementById('base-score')) {
    setupDailyActionsPage();
  }
});

/*
========================================================================
   NATURE-THEMED PAGE TRANSITIONS
========================================================================
*/
function setupPageTransitions() {
  const curtain = document.getElementById('transition-curtain');
  
  if (curtain) {
    // Inject the organic growing tree SVG structure dynamically
    curtain.innerHTML = `
      <div class="growing-tree-container">
        <svg class="growing-tree-svg" viewBox="0 0 100 100" fill="none" stroke="#1D3325" stroke-linecap="round" stroke-linejoin="round">
          <!-- Trunk (Thick curving base and vertical stem - shifted down by 8 units) -->
          <path class="tree-branch trunk" d="M48,106 C50,93 53,80 50,64" />
          
          <!-- Primary branches (Medium thickness, curving up and out - shifted down) -->
          <path class="tree-branch branch-1" d="M50,70 C40,70 26,66 20,56 C16,50 16,44 16,40" />
          <path class="tree-branch branch-2" d="M50,66 C60,66 74,63 80,56 C84,50 84,44 84,40" />
          <path class="tree-branch branch-3" d="M50,64 C46,54 43,46 43,34" />
          <path class="tree-branch branch-4" d="M50,64 C54,54 57,46 57,34" />
          
          <!-- Secondary/Sub branches (Thin twigs - shifted down) -->
          <path class="tree-branch sub-1" d="M32,62 C24,62 16,58 12,53" />
          <path class="tree-branch sub-2" d="M25,56 C26,50 28,44 29,40" />
          <path class="tree-branch sub-3" d="M68,62 C76,62 84,58 88,53" />
          <path class="tree-branch sub-4" d="M75,56 C74,50 72,44 71,40" />
          <path class="tree-branch sub-5" d="M45,54 C41,50 38,47 35,44" />
          <path class="tree-branch sub-6" d="M55,54 C59,50 62,47 65,44" />
          
          <!-- Circular leaves (Blooming at branch tips and clustered in canopy - shifted down) -->
          <!-- Left Lower Canopy -->
          <circle class="tree-leaf leaf-1" cx="12" cy="53" r="4.5" fill="#A2D149" stroke="none" />
          <circle class="tree-leaf leaf-2" cx="8" cy="58" r="3" fill="#99D5B1" stroke="none" />
          <circle class="tree-leaf leaf-3" cx="18" cy="40" r="4" fill="#A2D149" stroke="none" />
          <circle class="tree-leaf leaf-4" cx="29" cy="40" r="3.5" fill="#A2D149" stroke="none" />
          <circle class="tree-leaf leaf-5" cx="23" cy="48" r="4.2" fill="#A2D149" stroke="none" />
          <circle class="tree-leaf leaf-6" cx="16" cy="66" r="3" fill="#99D5B1" stroke="none" />
          <circle class="tree-leaf leaf-7" cx="10" cy="66" r="2.5" fill="#A2D149" stroke="none" />
          <circle class="tree-leaf leaf-8" cx="17" cy="56" r="1.2" fill="#E81C2E" stroke="none" />
          
          <!-- Right Lower Canopy -->
          <circle class="tree-leaf leaf-9" cx="88" cy="53" r="4.5" fill="#99D5B1" stroke="none" />
          <circle class="tree-leaf leaf-10" cx="92" cy="58" r="3" fill="#A2D149" stroke="none" />
          <circle class="tree-leaf leaf-11" cx="82" cy="40" r="4" fill="#A2D149" stroke="none" />
          <circle class="tree-leaf leaf-12" cx="71" cy="40" r="3.5" fill="#A2D149" stroke="none" />
          <circle class="tree-leaf leaf-13" cx="77" cy="48" r="4.2" fill="#A2D149" stroke="none" />
          <circle class="tree-leaf leaf-14" cx="84" cy="66" r="3" fill="#99D5B1" stroke="none" />
          <circle class="tree-leaf leaf-15" cx="90" cy="66" r="2.5" fill="#A2D149" stroke="none" />
          <circle class="tree-leaf leaf-16" cx="83" cy="56" r="1.2" fill="#E81C2E" stroke="none" />
          
          <!-- Center-Left Canopy -->
          <circle class="tree-leaf leaf-17" cx="35" cy="44" r="4" fill="#139C49" stroke="none" />
          <circle class="tree-leaf leaf-18" cx="43" cy="34" r="4" fill="#139C49" stroke="none" />
          <circle class="tree-leaf leaf-19" cx="30" cy="32" r="3.5" fill="#A2D149" stroke="none" />
          <circle class="tree-leaf leaf-20" cx="35" cy="24" r="5.5" fill="#A2D149" stroke="none" />
          <circle class="tree-leaf leaf-21" cx="24" cy="28" r="4.5" fill="#99D5B1" stroke="none" />
          <circle class="tree-leaf leaf-22" cx="16" cy="30" r="6" fill="#A2D149" stroke="none" />
          <circle class="tree-leaf leaf-23" cx="7" cy="40" r="7" fill="#A2D149" stroke="none" />
          <circle class="tree-leaf leaf-24" cx="37" cy="52" r="2.2" fill="#E09F26" stroke="none" />
          <circle class="tree-leaf leaf-25" cx="41" cy="30" r="1.2" fill="#E81C2E" stroke="none" />
          
          <!-- Center-Right Canopy -->
          <circle class="tree-leaf leaf-26" cx="65" cy="44" r="4" fill="#99D5B1" stroke="none" />
          <circle class="tree-leaf leaf-27" cx="57" cy="34" r="4" fill="#A2D149" stroke="none" />
          <circle class="tree-leaf leaf-28" cx="70" cy="32" r="3.5" fill="#139C49" stroke="none" />
          <circle class="tree-leaf leaf-29" cx="65" cy="24" r="5.5" fill="#A2D149" stroke="none" />
          <circle class="tree-leaf leaf-30" cx="76" cy="28" r="4.5" fill="#99D5B1" stroke="none" />
          <circle class="tree-leaf leaf-31" cx="84" cy="30" r="6" fill="#A2D149" stroke="none" />
          <circle class="tree-leaf leaf-32" cx="93" cy="40" r="7" fill="#A2D149" stroke="none" />
          <circle class="tree-leaf leaf-33" cx="63" cy="52" r="2.2" fill="#E491B7" stroke="none" />
          <circle class="tree-leaf leaf-34" cx="59" cy="30" r="1.2" fill="#E81C2E" stroke="none" />
          
          <!-- Top Crown Canopy -->
          <circle class="tree-leaf leaf-35" cx="50" cy="18" r="6" fill="#A2D149" stroke="none" />
          <circle class="tree-leaf leaf-36" cx="40" cy="16" r="5.5" fill="#A2D149" stroke="none" />
          <circle class="tree-leaf leaf-37" cx="60" cy="16" r="5.5" fill="#A2D149" stroke="none" />
          <circle class="tree-leaf leaf-38" cx="50" cy="28" r="4.5" fill="#A2D149" stroke="none" />
          <circle class="tree-leaf leaf-39" cx="33" cy="15" r="3.5" fill="#D2DF3F" stroke="none" />
          <circle class="tree-leaf leaf-40" cx="67" cy="15" r="3.5" fill="#E09F26" stroke="none" />
          <circle class="tree-leaf leaf-41" cx="44" cy="10" r="4.5" fill="#A2D149" stroke="none" />
          <circle class="tree-leaf leaf-42" cx="56" cy="10" r="4.5" fill="#A2D149" stroke="none" />
          <circle class="tree-leaf leaf-43" cx="27" cy="18" r="3" fill="#D2DF3F" stroke="none" />
          <circle class="tree-leaf leaf-44" cx="73" cy="18" r="3" fill="#99D5B1" stroke="none" />
        </svg>
      </div>
    `;

    // Reveal page on load by fading out the curtain
    setTimeout(() => {
      curtain.classList.add('slide-out');
      curtain.classList.remove('slide-in');
    }, 50);
  }

  // Intercept navigation links
  const transitionLinks = document.querySelectorAll('.nav-transition');
  transitionLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      const targetUrl = link.getAttribute('href');
      
      if (!targetUrl || targetUrl.startsWith('#') || targetUrl === window.location.pathname) {
        return;
      }
      
      e.preventDefault();

      if (curtain) {
        curtain.classList.remove('slide-out');
        curtain.classList.add('slide-in');

        // Allow tree growing and blooming animation to complete + hold (1500ms)
        setTimeout(() => {
          window.location.href = targetUrl;
        }, 1500);
      } else {
        window.location.href = targetUrl;
      }
    });
  });
}

/*
========================================================================
   DEDICATED CALCULATOR - STEP-BY-STEP WIZARD
========================================================================
*/
function setupWizard() {
  let currentStep = 1;
  const panels = document.querySelectorAll('.wizard-panel');
  const indicators = document.querySelectorAll('.step-indicator');
  const nextBtns = document.querySelectorAll('.next-step-btn');
  const prevBtns = document.querySelectorAll('.prev-step-btn');
  const finishBtn = document.querySelector('.finish-wizard-btn');

  // Check URL query parameters to jump to specific steps (e.g. ?step=3)
  const urlParams = new URLSearchParams(window.location.search);
  const stepParam = urlParams.get('step');
  if (stepParam) {
    const stepNum = parseInt(stepParam);
    if (stepNum >= 1 && stepNum <= 4) {
      currentStep = stepNum;
      state.hasInteracted = true; 
    }
  }

  const showPanel = (step) => {
    panels.forEach((p, idx) => {
      if (idx + 1 === step) {
        p.classList.add('active');
      } else {
        p.classList.remove('active');
      }
    });

    indicators.forEach((ind, idx) => {
      const stepNum = idx + 1;
      ind.classList.remove('active', 'completed');
      
      if (stepNum === step) {
        ind.classList.add('active');
      } else if (stepNum < step) {
        ind.classList.add('completed');
      }
    });

    currentStep = step;
  };

  showPanel(currentStep);

  nextBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      state.hasInteracted = true;
      if (currentStep < 4) {
        showPanel(currentStep + 1);
        calculateFootprint();
      }
    });
  });

  prevBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      if (currentStep > 1) {
        showPanel(currentStep - 1);
        calculateFootprint();
      }
    });
  });

  if (finishBtn) {
    finishBtn.addEventListener('click', () => {
      state.hasInteracted = true;
      calculateFootprint();
      
      // Populate and Open the footprint summary modal
      const modal = document.getElementById('summary-modal');
      if (modal) {
        populateSummaryModal();
        modal.classList.add('active');
        modal.setAttribute('aria-hidden', 'false');
      }
      
      // Scroll to the foot result card on completion
      const visualizerCard = document.querySelector('.visualizer-card');
      if (visualizerCard) {
        visualizerCard.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }

  // Bind close buttons for summary modal
  const closeBtn = document.getElementById('close-summary-btn');
  const summaryModal = document.getElementById('summary-modal');
  if (closeBtn && summaryModal) {
    closeBtn.addEventListener('click', () => {
      summaryModal.classList.remove('active');
      summaryModal.setAttribute('aria-hidden', 'true');
    });
    
    const backdrop = summaryModal.querySelector('.summary-modal-backdrop');
    if (backdrop) {
      backdrop.addEventListener('click', () => {
        summaryModal.classList.remove('active');
        summaryModal.setAttribute('aria-hidden', 'true');
      });
    }
  }

  indicators.forEach(ind => {
    ind.addEventListener('click', () => {
      const targetStep = parseInt(ind.getAttribute('data-step'));
      if (targetStep <= currentStep || ind.classList.contains('completed') || targetStep === currentStep + 1) {
        state.hasInteracted = true;
        showPanel(targetStep);
        calculateFootprint();
      }
    });
  });
}

function populateSummaryModal() {
  const resultsStr = storage.getItem('greenly_calculatorResults');
  if (!resultsStr) return;
  const results = JSON.parse(resultsStr);
  
  const totalScore = results.totalScore;
  const sectors = results.sectors;
  
  const summaryScoreEl = document.getElementById('summary-total-score');
  const summaryBadgeEl = document.getElementById('summary-status-badge');
  const summaryComparisonEl = document.getElementById('summary-comparison-text');
  
  if (summaryScoreEl) summaryScoreEl.textContent = totalScore.toFixed(2);
  
  if (summaryBadgeEl && summaryComparisonEl) {
    const mainBadge = document.getElementById('status-badge');
    const mainComparison = document.getElementById('comparison-text');
    if (mainBadge) {
      summaryBadgeEl.className = mainBadge.className;
      summaryBadgeEl.textContent = mainBadge.textContent;
    }
    if (mainComparison) {
      summaryComparisonEl.textContent = mainComparison.textContent;
    }
  }
  
  const syncSectorRow = (sectorKey, score, limitKey) => {
    const scoreValEl = document.getElementById(`summary-val-${sectorKey}`);
    const barEl = document.getElementById(`summary-bar-${sectorKey}`);
    const tipEl = document.getElementById(`summary-tip-${sectorKey}`);
    if (!scoreValEl || !barEl) return;
    
    scoreValEl.textContent = score.toFixed(2);
    
    const limits = SECTOR_LIMITS[limitKey];
    const pct = Math.min(100, (score / limits.critical) * 100);
    barEl.style.width = `${pct}%`;
    
    barEl.className = 'summary-progress-bar';
    if (score >= limits.critical) {
      barEl.classList.add('bar-critical');
      if (tipEl) {
        if (sectorKey === 'transport') {
          tipEl.textContent = "Action Required: Swap fossil driving for public transit; aim for a 50% driving reduction.";
        } else if (sectorKey === 'energy') {
          tipEl.textContent = "Action Required: Upgrade to a heat pump, insulate walls, and switch to green electricity.";
        } else if (sectorKey === 'diet') {
          tipEl.textContent = "Action Required: Minimize beef/dairy consumption. Eat plant-based meals 3-4 days/week.";
        } else {
          tipEl.textContent = "Action Required: Restrict buying new goods. Prioritize second-hand clothing and electronics.";
        }
      }
    } else if (score >= limits.moderate) {
      barEl.classList.add('bar-moderate');
      if (tipEl) {
        if (sectorKey === 'transport') {
          tipEl.textContent = "Suggestion: Group commutes, check train schedules, and cycle/walk short trips.";
        } else if (sectorKey === 'energy') {
          tipEl.textContent = "Suggestion: Swap old bulbs for LEDs, adjust your thermostat, and unplug standby devices.";
        } else if (sectorKey === 'diet') {
          tipEl.textContent = "Suggestion: Prioritize local farm produce and reduce weekly processed foods.";
        } else {
          tipEl.textContent = "Suggestion: Set up organic composting and diligently separate recyclable goods.";
        }
      }
    } else {
      barEl.classList.add('bar-good');
      if (tipEl) {
        if (sectorKey === 'transport') {
          tipEl.textContent = "Well Done! Excellent job maintaining a highly minimal travel footprint.";
        } else if (sectorKey === 'energy') {
          tipEl.textContent = "Well Done! Superb practice keeping low household power and heating emissions.";
        } else if (sectorKey === 'diet') {
          tipEl.textContent = "Well Done! Fantastic job supporting a highly ecological diet profile.";
        } else {
          tipEl.textContent = "Well Done! Exemplary practice practicing circular shopping and zero-waste.";
        }
      }
    }
  };
  
  syncSectorRow('transport', sectors.transport, 'transport');
  syncSectorRow('energy', sectors.energy, 'energy');
  syncSectorRow('diet', sectors.diet, 'diet');
  syncSectorRow('waste', sectors.waste, 'waste');
}

/*
========================================================================
   INPUT BINDINGS & LOCALSTORAGE SAVING
========================================================================
*/
function setupCalculatorEventListeners() {
  bindSlider('car-km', 'carKm', ' km');
  bindSlider('transit-km', 'transitKm', ' km');
  bindSlider('flights-hours', 'flightsHours', ' hours');
  bindSlider('electricity-kwh', 'electricityKwh', ' kWh');
  bindSlider('clean-energy-pct', 'cleanEnergyPct', '%');

  bindInputSelectors();

  const printBtn = document.getElementById('download-report-btn');
  if (printBtn) {
    printBtn.addEventListener('click', triggerPrintReport);
  }
}

function bindSlider(elementId, stateProperty, unitText) {
  const slider = document.getElementById(elementId);
  const display = document.getElementById(`${elementId}-val`);
  
  if (slider && display) {
    slider.addEventListener('input', (e) => {
      const val = parseInt(e.target.value);
      state[stateProperty] = val;
      state.hasInteracted = true;
      
      display.textContent = `${val}${unitText}`;
      display.classList.remove('zero-state');
      slider.classList.remove('zero-preset');
      
      calculateFootprint();
    });
  }
}

function bindInputSelectors() {
  const queryAndBind = (selector, stateField) => {
    const inputs = document.querySelectorAll(selector);
    inputs.forEach(input => {
      input.addEventListener('change', (e) => {
        state[stateField] = e.target.value;
        state.hasInteracted = true;
        calculateFootprint();
      });
    });
  };

  queryAndBind('input[name="engine-type"]', 'engineType');
  queryAndBind('input[name="heating-source"]', 'heatingSource');
  queryAndBind('input[name="diet-type"]', 'dietType');
  queryAndBind('input[name="lifestyle"]', 'lifestyle');
  queryAndBind('input[name="recycling"]', 'recycling');

  const foodSelect = document.getElementById('food-source');
  if (foodSelect) {
    foodSelect.addEventListener('change', (e) => {
      state.foodSource = e.target.value;
      state.hasInteracted = true;
      calculateFootprint();
    });
  }
}

// Save inputs to localStorage safely
function saveCalculatorState() {
  storage.setItem('greenly_calculatorState', JSON.stringify(state));
}

// Load inputs from localStorage safely
function loadCalculatorState() {
  const savedState = storage.getItem('greenly_calculatorState');
  if (!savedState) return;

  try {
    const parsed = JSON.parse(savedState);
    Object.assign(state, parsed);

    // Sync input visual states
    restoreSliderValue('car-km', 'carKm', ' km');
    restoreSliderValue('transit-km', 'transitKm', ' km');
    restoreSliderValue('flights-hours', 'flightsHours', ' hours');
    restoreSliderValue('electricity-kwh', 'electricityKwh', ' kWh');
    restoreSliderValue('clean-energy-pct', 'cleanEnergyPct', '%');

    restoreRadioValue('input[name="engine-type"]', state.engineType);
    restoreRadioValue('input[name="heating-source"]', state.heatingSource);
    restoreRadioValue('input[name="diet-type"]', state.dietType);
    restoreRadioValue('input[name="lifestyle"]', state.lifestyle);
    restoreRadioValue('input[name="recycling"]', state.recycling);

    const foodSelect = document.getElementById('food-source');
    if (foodSelect) foodSelect.value = state.foodSource;

  } catch (e) {
    console.error("Failed to restore calculator inputs", e);
  }
}

function restoreSliderValue(elementId, stateProperty, unitText) {
  const slider = document.getElementById(elementId);
  const display = document.getElementById(`${elementId}-val`);
  if (slider && display && state[stateProperty] > 0) {
    slider.value = state[stateProperty];
    display.textContent = `${state[stateProperty]}${unitText}`;
    display.classList.remove('zero-state');
    slider.classList.remove('zero-preset');
  }
}

function restoreRadioValue(selector, value) {
  const radio = document.querySelector(`${selector}[value="${value}"]`);
  if (radio) radio.checked = true;
}

/*
========================================================================
   MATHEMATICAL CALCULATOR CORE
========================================================================
*/
function calculateFootprint() {
  const isPristine = !state.hasInteracted && 
                      state.carKm === 0 && 
                      state.transitKm === 0 && 
                      state.flightsHours === 0 && 
                      state.electricityKwh === 0;

  if (isPristine) {
    renderPristineUI();
    // Reset stored results
    storage.removeItem('greenly_calculatorResults');
    return;
  }

  // 1. TRANSPORT SECTOR
  const carCommuteAnnual = (state.carKm * 52) * EMISSION_FACTORS.car[state.engineType];
  const transitAnnual = (state.transitKm * 52) * EMISSION_FACTORS.transit;
  const flightAnnual = state.flightsHours * EMISSION_FACTORS.flight;
  const transportScore = (carCommuteAnnual + transitAnnual + flightAnnual) / 1000;

  // 2. ENERGY SECTOR
  const gridElectricityAnnual = (state.electricityKwh * 12) * EMISSION_FACTORS.electricity * (1 - state.cleanEnergyPct / 100);
  
  let heatingAnnual = 1800; // natural gas
  if (state.heatingSource === 'electric') heatingAnnual = 600;
  else if (state.heatingSource === 'biomass') heatingAnnual = 100;
  
  const energyScore = (gridElectricityAnnual + heatingAnnual) / 1000;

  // 3. DIET SECTOR
  let dietScore = 3.3;
  if (state.dietType === 'meat-light') dietScore = 2.4;
  else if (state.dietType === 'vegetarian') dietScore = 1.6;
  else if (state.dietType === 'vegan') dietScore = 1.1;

  if (state.foodSource === 'mostly-global') dietScore += 0.3;
  else if (state.foodSource === 'mostly-local') dietScore -= 0.2;

  // 4. LIFESTYLE & WASTE SECTOR
  let lifestyleScore = 2.2;
  if (state.lifestyle === 'moderate') lifestyleScore = 1.2;
  else if (state.lifestyle === 'minimal') lifestyleScore = 0.6;

  if (state.recycling === 'none') lifestyleScore += 0.2;
  else if (state.recycling === 'full') lifestyleScore -= 0.3;

  const totalScoreRaw = transportScore + energyScore + dietScore + lifestyleScore;
  const totalScore = Math.max(0.1, totalScoreRaw);

  const sectorScores = {
    transport: transportScore,
    energy: energyScore,
    diet: dietScore,
    waste: lifestyleScore
  };

  // Save base results for other pages safely
  const results = {
    totalScore: totalScore,
    sectors: sectorScores,
    hasInteracted: true
  };
  storage.setItem('greenly_calculatorResults', JSON.stringify(results));
  saveCalculatorState();

  updateUI(totalScore, sectorScores);
}

/*
========================================================================
   UI VISUALIZER GRAPHICS
========================================================================
*/
function renderPristineUI() {
  const badge = document.getElementById('status-badge');
  const footGroup = document.getElementById('footprint-group');
  const comparisonText = document.getElementById('comparison-text');
  
  const scoreNumEl = document.getElementById('score-num');
  if (scoreNumEl) scoreNumEl.textContent = "0.00";

  if (badge) {
    badge.textContent = 'PRISTINE';
    badge.className = 'status-indicator-badge badge-pristine';
  }
  
  if (footGroup) {
    footGroup.className = 'state-pristine';
    footGroup.style.opacity = '0.15';
    footGroup.style.transform = 'scale(0.8)';
  }
  
  if (comparisonText) {
    comparisonText.textContent = 'Begin your audit! Adjust the questionnaire sliders to measure your footprint.';
  }
  
  const overlay = document.getElementById('visual-overlay');
  if (overlay) overlay.innerHTML = '';
  
  clearInterval(smokeEmitterInterval);
  clearTimeout(sproutSpawnTimeout);
}

function updateUI(totalScore, sectors) {
  const scoreNumEl = document.getElementById('score-num');
  if (scoreNumEl) scoreNumEl.textContent = totalScore.toFixed(2);

  const badge = document.getElementById('status-badge');
  const footGroup = document.getElementById('footprint-group');
  const comparisonText = document.getElementById('comparison-text');
  
  if (badge) badge.className = 'status-indicator-badge';
  if (footGroup) {
    footGroup.className = '';
    footGroup.removeAttribute('style'); // Clear scale
  }
  
  clearInterval(smokeEmitterInterval);
  clearTimeout(sproutSpawnTimeout);

  if (totalScore < TARGETS.ecoThreshold) {
    if (badge) {
      badge.textContent = 'Eco-Guardian';
      badge.classList.add('badge-eco');
    }
    if (footGroup) footGroup.classList.add('state-eco');
    
    const pctLower = Math.round(((9.0 - totalScore) / 9.0) * 100);
    if (comparisonText) {
      comparisonText.textContent = `Excellent! Your footprint is ${pctLower}% lower than the global target of 9 tonnes.`;
    }
    
    triggerSprouts();
  } else if (totalScore <= TARGETS.heavyThreshold) {
    if (badge) {
      badge.textContent = 'Earthy';
      badge.classList.add('badge-warning');
    }
    if (footGroup) footGroup.classList.add('state-average');
    
    const pctLower = Math.round(((9.0 - totalScore) / 9.0) * 100);
    if (comparisonText) {
      if (pctLower >= 0) {
        comparisonText.textContent = `Earthy! Your footprint is ${pctLower}% lower than the global target of 9 tonnes.`;
      } else {
        comparisonText.textContent = `Your footprint is ${Math.abs(pctLower)}% higher than the global target of 9 tonnes.`;
      }
    }
    
    const overlay = document.getElementById('visual-overlay');
    if (overlay) overlay.innerHTML = '';
  } else {
    if (badge) {
      badge.textContent = 'Carbon Heavy';
      badge.classList.add('badge-heavy');
    }
    if (footGroup) footGroup.classList.add('state-heavy');
    
    const pctHigher = Math.round(((totalScore - 9.0) / 9.0) * 100);
    if (comparisonText) {
      comparisonText.textContent = `Warning. Your footprint is ${pctHigher}% higher than the global target of 9 tonnes.`;
    }
    
    triggerSmoke();
  }
}

/*
========================================================================
   INTERACTIVE SVG EFFECTS (SMOKE & SPROUT BUDS)
========================================================================
*/
function triggerSmoke() {
  const overlay = document.getElementById('visual-overlay');
  if (!overlay) return;
  overlay.innerHTML = '';

  smokeEmitterInterval = setInterval(() => {
    const footGroup = document.getElementById('footprint-group');
    if (!footGroup || !footGroup.classList.contains('state-heavy')) return;

    const smoke = document.createElement('div');
    smoke.className = 'smoke-particle';
    
    const randomX = Math.random() * 110 + 40;
    const randomY = Math.random() * 110 + 70;
    
    smoke.style.left = `${randomX}px`;
    smoke.style.top = `${randomY}px`;
    
    overlay.appendChild(smoke);
    
    setTimeout(() => smoke.remove(), 1800);
  }, 180);
}

function triggerSprouts() {
  const overlay = document.getElementById('visual-overlay');
  if (!overlay) return;
  overlay.innerHTML = '';

  const spawnSprout = () => {
    const footGroup = document.getElementById('footprint-group');
    if (!footGroup || !footGroup.classList.contains('state-eco')) return;
    
    if (overlay.children.length > 8) {
      overlay.firstElementChild.remove();
    }

    const sprout = document.createElement('div');
    sprout.className = 'sprout-item';
    
    const randomX = Math.random() * 100 + 45;
    const randomY = Math.random() * 90 + 55;
    
    sprout.style.left = `${randomX}px`;
    sprout.style.top = `${randomY}px`;
    
    overlay.appendChild(sprout);
    
    sproutSpawnTimeout = setTimeout(spawnSprout, 2500);
  };

  spawnSprout();
}

/*
========================================================================
   DAILY ACTIONS PAGE LOGIC (localStorage Subtractor)
========================================================================
*/
function setupDailyActionsPage() {
  const baseScoreEl = document.getElementById('base-score');
  const offsetAmountEl = document.getElementById('offset-amount');
  const netScoreEl = document.getElementById('net-score');
  const badge = document.getElementById('status-badge');
  const comparisonText = document.getElementById('comparison-text');

  // Load calculator results
  const savedResults = storage.getItem('greenly_calculatorResults');
  if (!savedResults) {
    // Locked / No calculator baseline exists
    if (baseScoreEl) baseScoreEl.textContent = "0.00 tonnes / year";
    if (offsetAmountEl) offsetAmountEl.textContent = "0.00 kg CO2";
    if (netScoreEl) netScoreEl.textContent = "0.00 tonnes / year";
    if (badge) {
      badge.textContent = "PRISTINE";
      badge.className = "status-indicator-badge badge-pristine";
    }
    if (comparisonText) {
      comparisonText.innerHTML = 'Baseline not set. Please complete your audit on the <a href="calculator.html">Carbon Calculator</a> page first.';
    }
    // Disable checklist interaction visually
    document.querySelectorAll('.eco-checkbox').forEach(box => box.disabled = true);
    return;
  }

  const results = JSON.parse(savedResults);
  const baseScore = results.totalScore;

  if (baseScoreEl) baseScoreEl.innerHTML = `${baseScore.toFixed(2)} <span class="standing-unit">tonnes / year</span>`;

  // Render the dynamic daily challenge
  const challenge = renderDailyChallenge();

  // Load previously checked items
  const savedChecks = storage.getItem('greenly_checkedTasks');
  if (savedChecks) {
    try {
      const checkedIds = JSON.parse(savedChecks);
      checkedIds.forEach(id => {
        const box = document.getElementById(id);
        if (box) box.checked = true;
      });
    } catch (e) {
      console.error(e);
    }
  }

  // Load previously checked challenge
  const challengeChecked = storage.getItem('greenly_challengeChecked');
  if (challengeChecked === "true" && challenge) {
    const box = document.getElementById(challenge.id);
    if (box) box.checked = true;
  }

  // Bind change events to all checkboxes on the page
  const checkboxes = document.querySelectorAll('.eco-checkbox');
  checkboxes.forEach(box => {
    box.addEventListener('change', () => {
      updateStanding(baseScore, challenge);
    });
  });

  // Calculate and render standing details
  updateStanding(baseScore, challenge);
}

function renderDailyChallenge() {
  const container = document.getElementById('daily-challenge-container');
  if (!container) return null;

  const currentDay = new Date().getDay();
  const challenge = DAILY_CHALLENGES.find(c => c.day === currentDay) || DAILY_CHALLENGES[1];

  container.innerHTML = `
    <div class="daily-challenge-card">
      <div class="challenge-badge">Today's Eco Challenge</div>
      <label class="action-item challenge-item">
        <input type="checkbox" class="eco-checkbox" data-co2="${challenge.co2}" id="${challenge.id}">
        <span class="checkbox-custom"></span>
        <span class="action-details">
          <span class="action-name">${challenge.name}</span>
          <span class="action-desc" style="font-size: 0.82rem; color: var(--text-muted); display: block; margin-top: 2px;">${challenge.desc}</span>
          <span class="action-reward">Special Reward: Offsets ~${challenge.co2.toFixed(2)} kg CO2</span>
        </span>
      </label>
    </div>
  `;

  return challenge;
}

function updateStanding(baseScore, challenge) {
  const offsetAmountEl = document.getElementById('offset-amount');
  const netScoreEl = document.getElementById('net-score');
  const badge = document.getElementById('status-badge');
  const comparisonText = document.getElementById('comparison-text');

  // Sum up all offsets
  let totalSavedKg = 0;
  const checkedIds = [];
  let isChallengeChecked = false;

  const checkboxes = document.querySelectorAll('.eco-checkbox:checked');
  checkboxes.forEach(box => {
    totalSavedKg += parseFloat(box.getAttribute('data-co2')) || 0;
    if (challenge && box.id === challenge.id) {
      isChallengeChecked = true;
    } else {
      checkedIds.push(box.id);
    }
  });

  // Save checked states safely
  storage.setItem('greenly_checkedTasks', JSON.stringify(checkedIds));
  storage.setItem('greenly_challengeChecked', isChallengeChecked ? "true" : "false");

  // Convert saved kg CO2 back to annual tonnes
  const annualOffsetTonnes = (totalSavedKg * 365) / 1000;
  const netScore = Math.max(0.1, baseScore - annualOffsetTonnes);

  if (offsetAmountEl) offsetAmountEl.innerHTML = `${totalSavedKg.toFixed(2)} <span class="standing-unit">kg CO2</span>`;
  if (netScoreEl) netScoreEl.innerHTML = `${netScore.toFixed(2)} <span class="standing-unit">tonnes / year</span>`;

  // Update standing badge and comparison texts
  if (badge) {
    badge.className = 'status-indicator-badge';
    if (netScore < TARGETS.ecoThreshold) {
      badge.textContent = 'Eco-Guardian';
      badge.classList.add('badge-eco');
      if (comparisonText) {
        comparisonText.textContent = "Green standard: Amazing! Your daily choices combined with low baseline emissions make you an Eco-Guardian.";
      }
    } else if (netScore <= TARGETS.heavyThreshold) {
      badge.textContent = 'Earthy';
      badge.classList.add('badge-warning');
      if (comparisonText) {
        comparisonText.textContent = "Moderate standing: You are on the right track! Completing daily actions helps bring your net score closer to the green zone.";
      }
    } else {
      badge.textContent = 'Carbon Heavy';
      badge.classList.add('badge-heavy');
      if (comparisonText) {
        comparisonText.textContent = "Red alert: Your net score is still high. Try to complete more daily actions or adjust your long-term energy and transport habits.";
      }
    }
  }
}

/*
========================================================================
   PDF REPORT GENERATOR MODULE (COLOR-CODED STATUSES & SOLUTIONS)
========================================================================
*/


function triggerPrintReport() {
  const scoreText = document.getElementById('score-num').textContent;
  const ratingText = document.getElementById('status-badge').textContent;
  
  const now = new Date();
  const dateOptions = { year: 'numeric', month: 'long', day: 'numeric' };
  document.getElementById('print-date').textContent = now.toLocaleDateString('en-US', dateOptions);

  document.getElementById('print-score-num').textContent = scoreText;
  
  const ratingBadge = document.getElementById('print-rating');
  ratingBadge.textContent = ratingText;
  ratingBadge.className = 'badge';
  if (ratingText === 'Eco-Guardian') ratingBadge.classList.add('badge-eco');
  else if (ratingText === 'Earthy') ratingBadge.classList.add('badge-warning');
  else if (ratingText === 'PRISTINE') ratingBadge.classList.add('badge-pristine');
  else ratingBadge.classList.add('badge-heavy');

  document.getElementById('print-comparison-text').textContent = document.getElementById('comparison-text').textContent;

  // Sector calculations
  const carCommuteAnnual = (state.carKm * 52) * EMISSION_FACTORS.car[state.engineType];
  const transitAnnual = (state.transitKm * 52) * EMISSION_FACTORS.transit;
  const flightAnnual = state.flightsHours * EMISSION_FACTORS.flight;
  const transportScore = (carCommuteAnnual + transitAnnual + flightAnnual) / 1000;

  const gridElectricityAnnual = (state.electricityKwh * 12) * EMISSION_FACTORS.electricity * (1 - state.cleanEnergyPct / 100);
  let heatingAnnual = 1800;
  if (state.heatingSource === 'electric') heatingAnnual = 600;
  else if (state.heatingSource === 'biomass') heatingAnnual = 100;
  const energyScore = (gridElectricityAnnual + heatingAnnual) / 1000;

  let dietScore = 3.3;
  if (state.dietType === 'meat-light') dietScore = 2.4;
  else if (state.dietType === 'vegetarian') dietScore = 1.6;
  else if (state.dietType === 'vegan') dietScore = 1.1;
  if (state.foodSource === 'mostly-global') dietScore += 0.3;
  else if (state.foodSource === 'mostly-local') dietScore -= 0.2;

  let lifestyleScore = 2.2;
  if (state.lifestyle === 'moderate') lifestyleScore = 1.2;
  else if (state.lifestyle === 'minimal') lifestyleScore = 0.6;
  if (state.recycling === 'none') lifestyleScore += 0.2;
  else if (state.recycling === 'full') lifestyleScore -= 0.3;

  const sectors = {
    transport: transportScore,
    energy: energyScore,
    diet: dietScore,
    waste: lifestyleScore
  };

  // Sync Category visual frames (Borders and text status color codes)
  syncPrintCategory('transport', transportScore, 'transport');
  syncPrintCategory('energy', energyScore, 'energy');
  syncPrintCategory('diet', dietScore, 'diet');
  syncPrintCategory('waste', lifestyleScore, 'waste');

  window.print();
}

// Helper to evaluate sector limits and color code report cards
function syncPrintCategory(sectorId, score, limitKey) {
  const card = document.getElementById(`print-card-${sectorId}`);
  const badge = document.getElementById(`print-badge-${sectorId}`);
  const solutionText = document.getElementById(`print-solution-${sectorId}`);
  const valueField = document.getElementById(`print-${sectorId}-val`);

  if (!card || !badge || !solutionText || !valueField) return;

  valueField.textContent = score.toFixed(2);
  card.className = 'print-category-card';
  badge.className = 'print-category-status-badge';

  const limits = SECTOR_LIMITS[limitKey];

  if (score >= limits.critical) {
    // CRITICAL (Red)
    card.classList.add('print-card-critical');
    badge.classList.add('print-badge-critical');
    badge.textContent = 'CRITICAL';

    if (limitKey === 'transport') {
      solutionText.innerHTML = '<strong>Action Required:</strong> Swap gas commutes for cycling/trains immediately. Target a 50% driving reduction.';
    } else if (limitKey === 'energy') {
      solutionText.innerHTML = '<strong>Action Required:</strong> Retrofit insulation, install a heat pump, and switch power lines to a green supplier.';
    } else if (limitKey === 'diet') {
      solutionText.innerHTML = '<strong>Action Required:</strong> Minimize red meat intake. Incorporate vegan recipes 3-4 days a week.';
    } else {
      solutionText.innerHTML = '<strong>Action Required:</strong> Restrict new purchases. Commit to recycled/repaired clothing and electronics.';
    }
  } else if (score >= limits.moderate) {
    // MODERATE (Yellow)
    card.classList.add('print-card-moderate');
    badge.classList.add('print-badge-moderate');
    badge.textContent = 'MODERATE';

    if (limitKey === 'transport') {
      solutionText.innerHTML = '<strong>Suggestion:</strong> Group car commutes, maintain tire pressures, and check public transit alternatives.';
    } else if (limitKey === 'energy') {
      solutionText.innerHTML = '<strong>Suggestion:</strong> Install LED lighting, adjust cooling/heating points, and unplug standby devices.';
    } else if (limitKey === 'diet') {
      solutionText.innerHTML = '<strong>Suggestion:</strong> Buy local market produce and reduce weekly dairy consumption.';
    } else {
      solutionText.innerHTML = '<strong>Suggestion:</strong> Set up organic compost bins and recycle paper, tins, and plastics.';
    }
  } else {
    // GOOD (Green)
    card.classList.add('print-card-good');
    badge.classList.add('print-badge-good');
    badge.textContent = 'GOOD';

    if (limitKey === 'transport') {
      solutionText.innerHTML = '<strong>Well Done:</strong> Excellent work keeping travel mileage and flight emissions highly minimal.';
    } else if (limitKey === 'energy') {
      solutionText.innerHTML = '<strong>Well Done:</strong> Great job maintaining low home electrical consumption and clean power levels.';
    } else if (limitKey === 'diet') {
      solutionText.innerHTML = '<strong>Well Done:</strong> Excellent choice maintaining a highly ecological plant-based diet structure.';
    } else {
      solutionText.innerHTML = '<strong>Well Done:</strong> Superb practice minimizing waste and supporting circular consumption.';
    }
  }
}
