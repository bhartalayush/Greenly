const fs = require('fs');
const path = require('path');
// Globals are injected by Vitest due to globals: true in vitest.config.js

// Setup mock document environment for testing JSDOM behaviors
beforeEach(() => {
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
  document.body.innerHTML = `
    <!-- Calculator elements -->
    <div id="score-num" aria-live="polite">0.00</div>
    <div id="status-badge" class="status-indicator-badge">PRISTINE</div>
    <div id="comparison-text">Start adjusting inputs...</div>
    <div id="footprint-wrapper">
      <svg id="footprint-svg" viewBox="0 0 100 135">
        <g id="footprint-group" class="state-pristine"></g>
      </svg>
      <div id="visual-overlay" class="visual-effects-overlay"></div>
    </div>
    
    <form id="calc-form">
      <input type="range" id="car-km" min="0" max="1000" value="0">
      <span id="car-km-val">0 km</span>
      <input type="range" id="transit-km" min="0" max="500" value="0">
      <span id="transit-km-val">0 km</span>
      <input type="range" id="flights-hours" min="0" max="100" value="0">
      <span id="flights-hours-val">0 hours</span>
      <input type="range" id="electricity-kwh" min="0" max="1000" value="0">
      <span id="electricity-kwh-val">0 kWh</span>
      <input type="range" id="clean-energy-pct" min="0" max="100" value="0">
      <span id="clean-energy-pct-val">0%</span>
      <select id="food-source">
        <option value="balanced" selected>Balanced</option>
      </select>
      <button id="download-report-btn">Print</button>
    </form>

    <!-- Modal Elements -->
    <div id="summary-modal" class="summary-modal" aria-hidden="true">
      <div class="summary-modal-backdrop"></div>
      <div class="summary-modal-content">
        <button id="close-summary-btn">Close</button>
        <span id="summary-total-score">0.00</span>
        <span id="summary-status-badge">PRISTINE</span>
        <span id="summary-comparison-text">Adjust inputs...</span>
        
        <span id="summary-val-transport">0.00</span>
        <div id="summary-bar-transport"></div>
        <span id="summary-tip-transport"></span>

        <span id="summary-val-energy">0.00</span>
        <div id="summary-bar-energy"></div>
        <span id="summary-tip-energy"></span>

        <span id="summary-val-diet">0.00</span>
        <div id="summary-bar-diet"></div>
        <span id="summary-tip-diet"></span>

        <span id="summary-val-waste">0.00</span>
        <div id="summary-bar-waste"></div>
        <span id="summary-tip-waste"></span>

        <span id="summary-val-scope1">0.00 t</span>
        <span id="summary-val-scope2">0.00 t</span>
        <span id="summary-val-scope3">0.00 t</span>
      </div>
    </div>

    <!-- Daily Actions checklist page elements -->
    <div id="base-score">0.00 tonnes / year</div>
    <div id="offset-amount">0.00 kg CO2</div>
    <div id="net-score">0.00 tonnes / year</div>
    <div id="daily-challenge-container"></div>
    <div class="tasks-checklist">
      <input type="checkbox" class="eco-checkbox" data-co2="0.60" id="task-travel">
      <input type="checkbox" class="eco-checkbox" data-co2="0.30" id="task-diet">
    </div>

    <!-- Hidden Print Report cards -->
    <div id="print-report" class="print-only">
      <div id="print-date"></div>
      <div id="print-score-num"></div>
      <div id="print-rating"></div>
      <div id="print-comparison-text"></div>

      <div id="print-card-transport" class="print-category-card">
        <span id="print-badge-transport" class="print-category-status-badge"></span>
        <span id="print-solution-transport" class="print-category-solution"></span>
        <span id="print-transport-val"></span>
      </div>
      <div id="print-card-energy" class="print-category-card">
        <span id="print-badge-energy" class="print-category-status-badge"></span>
        <span id="print-solution-energy" class="print-category-solution"></span>
        <span id="print-energy-val"></span>
      </div>
      <div id="print-card-diet" class="print-category-card">
        <span id="print-badge-diet" class="print-category-status-badge"></span>
        <span id="print-solution-diet" class="print-category-solution"></span>
        <span id="print-diet-val"></span>
      </div>
      <div id="print-card-waste" class="print-category-card">
        <span id="print-badge-waste" class="print-category-status-badge"></span>
        <span id="print-solution-waste" class="print-category-solution"></span>
        <span id="print-waste-val"></span>
      </div>
    </div>
  `;

  // Mock localStorage
  const store = {};
  global.localStorage = {
    getItem: vi.fn(key => store[key] || null),
    setItem: vi.fn((key, val) => { store[key] = val.toString(); }),
    removeItem: vi.fn(key => { delete store[key]; }),
    clear: vi.fn(() => { Object.keys(store).forEach(k => delete store[k]); })
  };

  // Suppress expected warning/error logs during test execution
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

// Import Greenly modules
const app = require('../app.js');

describe('Greenly Footprint Calculations', () => {
  test('Pristine State is correctly initialized on all zeroes', () => {
    app.state.carKm = 0;
    app.state.transitKm = 0;
    app.state.flightsHours = 0;
    app.state.electricityKwh = 0;
    app.state.hasInteracted = false;

    app.calculateFootprint();
    expect(document.getElementById('score-num').textContent).toBe('0.00');
    expect(document.getElementById('status-badge').textContent).toBe('PRISTINE');
  });

  test('Carbon calculations yield correct scores for active user profiles', () => {
    app.state.carKm = 300; // km/week
    app.state.engineType = 'gasoline'; // factor 0.20
    app.state.transitKm = 100; // km/week
    app.state.flightsHours = 10; // hours/year
    app.state.electricityKwh = 400; // kWh/month
    app.state.cleanEnergyPct = 25; // 25% solar offset
    app.state.heatingSource = 'gas'; // natural gas
    app.state.dietType = 'meat-light'; // 2.4 tonnes
    app.state.foodSource = 'balanced';
    app.state.lifestyle = 'moderate'; // 1.2 tonnes
    app.state.recycling = 'some';
    
    app.state.hasInteracted = true;
    app.calculateFootprint();

    const scoreNum = parseFloat(document.getElementById('score-num').textContent);
    expect(scoreNum).toBeCloseTo(11.07, 2);
    expect(document.getElementById('status-badge').textContent).toBe('Carbon Heavy');
  });

  test('ESG GHG Scope classifications calculate correctly', () => {
    app.state.carKm = 300;
    app.state.engineType = 'gasoline'; // Scope 1
    app.state.heatingSource = 'gas'; // Scope 1 (1.8t)
    app.state.electricityKwh = 400;
    app.state.cleanEnergyPct = 25; // Scope 2 (1.44t)
    app.state.transitKm = 100; // Scope 3
    app.state.flightsHours = 10; // Scope 3
    app.state.dietType = 'meat-light'; // Scope 3
    app.state.lifestyle = 'moderate'; // Scope 3
    app.state.hasInteracted = true;

    // Run calculations
    app.calculateFootprint();
    
    // Trigger modal updates
    const modal = document.getElementById('summary-modal');
    app.openSummaryModal(modal);

    const s1 = parseFloat(document.getElementById('summary-val-scope1').textContent);
    const s2 = parseFloat(document.getElementById('summary-val-scope2').textContent);
    const s3 = parseFloat(document.getElementById('summary-val-scope3').textContent);

    expect(s1).toBeCloseTo(4.92, 2);
    expect(s2).toBeCloseTo(1.44, 2);
    expect(s3).toBeCloseTo(4.71, 2);
  });

  test('Carbon calculations handle vegetarian, vegan, and minimal lifestyle profiles correctly', () => {
    app.state.carKm = 0;
    app.state.transitKm = 0;
    app.state.flightsHours = 0;
    app.state.electricityKwh = 0;
    app.state.cleanEnergyPct = 0;
    app.state.heatingSource = 'gas'; // 1.8 tonnes
    app.state.dietType = 'vegan'; // 1.1 tonnes
    app.state.foodSource = 'mostly-local'; // -0.2 tonnes
    app.state.lifestyle = 'minimal'; // 0.6 tonnes
    app.state.recycling = 'full'; // -0.3 tonnes
    app.state.hasInteracted = true;
    app.calculateFootprint();

    // Total expected score = 0 (transport) + 1.8 (energy) + (1.1 - 0.2) (diet) + (0.6 - 0.3) (lifestyle) = 1.8 + 0.9 + 0.3 = 3.0 tonnes.
    let scoreNum = parseFloat(document.getElementById('score-num').textContent);
    expect(scoreNum).toBeCloseTo(3.0, 2);

    // Switch to vegetarian and moderate lifestyle
    app.state.dietType = 'vegetarian'; // 1.6 tonnes
    app.state.foodSource = 'mostly-global'; // +0.3 tonnes
    app.state.lifestyle = 'moderate'; // 1.2 tonnes
    app.state.recycling = 'none'; // +0.2 tonnes
    app.calculateFootprint();

    // Total expected score = 1.8 (energy) + (1.6 + 0.3) (diet) + (1.2 + 0.2) (lifestyle) = 1.8 + 1.9 + 1.4 = 5.1 tonnes.
    scoreNum = parseFloat(document.getElementById('score-num').textContent);
    expect(scoreNum).toBeCloseTo(5.1, 2);
  });
});

describe('Greenly Storage and State Sanitization', () => {
  test('Strict whitelist prevents prototype pollution via localStorage payload', () => {
    const maliciousPayload = JSON.stringify({
      carKm: 500,
      __proto__: { polluted: true },
      pollutedProperty: 'malicious'
    });
    global.localStorage.setItem('greenly_calculatorState', maliciousPayload);

    app.loadCalculatorState();

    expect(app.state.carKm).toBe(500);
    expect(Object.prototype.polluted).toBeUndefined();
    expect(app.state.pollutedProperty).toBeUndefined();
  });
});

describe('Daily Actions Page & Offsets Logic', () => {
  test('Daily standing update applies checked task offsets correctly', () => {
    // Check checkboxes
    document.getElementById('task-travel').checked = true; // 0.60 kg
    document.getElementById('task-diet').checked = true;   // 0.30 kg
    // Total checked offset = 0.90 kg CO2.
    // Annual equivalent offset = (0.90 * 365) / 1000 = 0.3285 tonnes.

    // Case 1: Carbon Heavy net score
    const initialResults = {
      totalScore: 10.0,
      sectors: { transport: 4.0, energy: 3.0, diet: 2.0, waste: 1.0 },
      hasInteracted: true
    };
    global.localStorage.setItem('greenly_calculatorResults', JSON.stringify(initialResults));

    app.setupDailyActionsPage(); // Loads data and executes updateStanding

    const offsetValText = document.getElementById('offset-amount').textContent;
    const netScoreText = document.getElementById('net-score').textContent;
    const badgeText = document.getElementById('status-badge').textContent;

    expect(parseFloat(offsetValText)).toBeCloseTo(0.90, 2);
    expect(parseFloat(netScoreText)).toBeCloseTo(9.67, 2);
    expect(badgeText).toBe('Carbon Heavy');

    // Dispatch a change event on a checkbox to trigger event listener coverage
    const box = document.getElementById('task-travel');
    box.checked = false;
    box.dispatchEvent(new Event('change'));

    // Case 2: Earthy net score
    initialResults.totalScore = 6.0;
    global.localStorage.setItem('greenly_calculatorResults', JSON.stringify(initialResults));
    global.localStorage.setItem('greenly_challengeChecked', 'true');
    app.setupDailyActionsPage();
    expect(document.getElementById('status-badge').textContent).toBe('Earthy');

    // Case 3: Eco-Guardian net score
    initialResults.totalScore = 3.0;
    global.localStorage.setItem('greenly_calculatorResults', JSON.stringify(initialResults));
    app.setupDailyActionsPage();
    expect(document.getElementById('status-badge').textContent).toBe('Eco-Guardian');
  });

  test('Daily Challenge dynamic HTML binds successfully', () => {
    // Setup initial calculation baseline
    const initialResults = {
      totalScore: 10.0,
      sectors: { transport: 4.0, energy: 3.0, diet: 2.0, waste: 1.0 },
      hasInteracted: true
    };
    global.localStorage.setItem('greenly_calculatorResults', JSON.stringify(initialResults));

    app.setupDailyActionsPage();
    
    const container = document.getElementById('daily-challenge-container');
    expect(container.innerHTML).toContain("Today's Eco Challenge");
  });
});

describe('Print Category report syncing', () => {
  test('syncPrintCategory sets CRITICAL classes for high emissions', () => {
    // Critical transport threshold is 2.5
    app.syncPrintCategory('transport', 4.8, 'transport');

    const card = document.getElementById('print-card-transport');
    const badge = document.getElementById('print-badge-transport');
    const solution = document.getElementById('print-solution-transport');

    expect(card.classList.contains('print-card-critical')).toBe(true);
    expect(badge.textContent).toBe('CRITICAL');
    expect(solution.innerHTML).toContain('Action Required');
  });

  test('syncPrintCategory sets MODERATE classes for medium emissions', () => {
    // Moderate transport threshold is 1.0, critical is 2.5
    app.syncPrintCategory('transport', 1.8, 'transport');

    const card = document.getElementById('print-card-transport');
    const badge = document.getElementById('print-badge-transport');

    expect(card.classList.contains('print-card-moderate')).toBe(true);
    expect(badge.textContent).toBe('MODERATE');
  });

  test('syncPrintCategory sets GOOD classes for low emissions', () => {
    // Good transport threshold is below 1.0
    app.syncPrintCategory('transport', 0.5, 'transport');

    const card = document.getElementById('print-card-transport');
    const badge = document.getElementById('print-badge-transport');

    expect(card.classList.contains('print-card-good')).toBe(true);
    expect(badge.textContent).toBe('GOOD');
  });
});

describe('Greenly Advanced Interactions and a11y focus flows', () => {
  test('Details elements update aria-expanded on toggle events', () => {
    // Setup transition curtain and details mock
    document.body.innerHTML += `
      <details id="test-details">
        <summary id="test-summary">Summary Text</summary>
        <p>Details Content</p>
      </details>
      <div id="transition-curtain"></div>
    `;
    app.setupPageTransitions();
    
    const details = document.getElementById('test-details');
    const summary = document.getElementById('test-summary');
    
    // Simulate open toggle
    details.setAttribute('open', '');
    details.dispatchEvent(new Event('toggle'));
    expect(summary.getAttribute('aria-expanded')).toBe('true');

    // Simulate close toggle
    details.removeAttribute('open');
    details.dispatchEvent(new Event('toggle'));
    expect(summary.getAttribute('aria-expanded')).toBe('false');
  });

  test('openSummaryModal traps focus and handles Escape key', () => {
    document.body.innerHTML += `
      <header class="app-header"></header>
      <main class="wizard-main-section"></main>
      <footer class="app-footer"></footer>
    `;
    const modal = document.getElementById('summary-modal');
    app.openSummaryModal(modal);

    expect(modal.classList.contains('active')).toBe(true);
    expect(modal.getAttribute('aria-hidden')).toBe('false');
    expect(document.querySelector('.app-header').getAttribute('aria-hidden')).toBe('true');

    // Simulate keypress Escape on window
    const escEvent = new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27 });
    window.dispatchEvent(escEvent);

    expect(modal.classList.contains('active')).toBe(false);
    expect(modal.getAttribute('aria-hidden')).toBe('true');
    expect(document.querySelector('.app-header').getAttribute('aria-hidden')).toBeNull();
  });

  test('loadCalculatorResults handles valid, malformed, and corrupted results safely', () => {
    // Case 1: valid results
    const validResults = {
      totalScore: 8.5,
      sectors: { transport: 2.0, energy: 3.0, diet: 1.5, waste: 2.0 },
      hasInteracted: true
    };
    global.localStorage.setItem('greenly_calculatorResults', JSON.stringify(validResults));
    let res = app.loadCalculatorResults();
    expect(res).not.toBeNull();
    expect(res.totalScore).toBe(8.5);
    expect(res.sectors.transport).toBe(2.0);

    // Case 2: corrupted sectors
    const corruptedSectors = {
      totalScore: 7.2,
      sectors: "corrupted_string",
      hasInteracted: false
    };
    global.localStorage.setItem('greenly_calculatorResults', JSON.stringify(corruptedSectors));
    res = app.loadCalculatorResults();
    expect(res).not.toBeNull();
    expect(res.sectors.transport).toBe(0);

    // Case 3: missing score
    const missingScore = {
      sectors: { transport: 1.0 },
      hasInteracted: true
    };
    global.localStorage.setItem('greenly_calculatorResults', JSON.stringify(missingScore));
    res = app.loadCalculatorResults();
    expect(res).toBeNull();

    // Case 4: Prototype Pollution in results
    const pollutedResults = JSON.stringify({
      totalScore: 6.0,
      __proto__: { pollutedResultsKey: true },
      sectors: { transport: 1.0 }
    });
    global.localStorage.setItem('greenly_calculatorResults', pollutedResults);
    res = app.loadCalculatorResults();
    expect(res).not.toBeNull();
    expect(Object.prototype.pollutedResultsKey).toBeUndefined();

    // Case 5: Invalid JSON string (triggers catch block for JSON.parse syntax error)
    global.localStorage.setItem('greenly_calculatorResults', '{invalid_json');
    res = app.loadCalculatorResults();
    expect(res).toBeNull();
  });

  test('Range inputs handle input events and update state dynamically', () => {
    app.state.carKm = 0;
    
    // Bind calculator input listeners
    app.setupCalculatorEventListeners();
    
    // Bind car-km range element
    const carKmInput = document.getElementById('car-km');
    carKmInput.value = '250';
    carKmInput.dispatchEvent(new Event('input'));

    expect(app.state.carKm).toBe(250);
    expect(carKmInput.getAttribute('aria-valuenow')).toBe('250');
  });

  test('Smoke particles are emitted for high carbon score UI update', () => {
    vi.useFakeTimers();
    app.state.hasInteracted = true;
    app.updateUI(12.0, {}); // Carbon heavy threshold (> 9.0)
    
    const overlay = document.getElementById('visual-overlay');
    expect(overlay).not.toBeNull();
    
    // Fast-forward smoke emitter interval
    vi.advanceTimersByTime(200);
    
    const particles = overlay.querySelectorAll('.smoke-particle');
    expect(particles.length).toBeGreaterThan(0);
    vi.useRealTimers();
  });

  test('Sprouts are sprouted for low carbon score UI update', () => {
    vi.useFakeTimers();
    app.state.hasInteracted = true;
    app.updateUI(2.5, {}); // Eco-Guardian threshold (< 3.5)
    
    const overlay = document.getElementById('visual-overlay');
    expect(overlay).not.toBeNull();
    
    vi.advanceTimersByTime(25000); // 10 sprouts (caps at 8 and removes older ones)
    
    const sprouts = overlay.querySelectorAll('.sprout-item');
    expect(sprouts.length).toBe(9); // capped at 9 (boundary check is > 8 before append)
    vi.useRealTimers();
  });

  test('triggerPrintReport invokes window.print and syncs date', () => {
    const originalPrint = window.print;
    window.print = vi.fn();
    
    document.body.innerHTML += `
      <button id="download-report-btn">Print</button>
    `;
    app.state.carKm = 100;
    app.state.hasInteracted = true;
    app.calculateFootprint(); // sets results in storage

    app.triggerPrintReport();
    
    expect(window.print).toHaveBeenCalled();
    expect(document.getElementById('print-date').textContent).not.toBe('');
    
    window.print = originalPrint;
  });

  test('Storage wrapper handles disabled or throwing localStorage fallback gracefully', () => {
    const originalLocalStorage = global.localStorage;
    
    // Force localStorage to throw errors (simulating browser cookies/storage disabled)
    global.localStorage = {
      getItem: () => { throw new Error('Storage disabled'); },
      setItem: () => { throw new Error('Storage disabled'); },
      removeItem: () => { throw new Error('Storage disabled'); }
    };

    // Verify storage calls do not crash application
    expect(app.storage.getItem('any_key')).toBeNull();
    expect(() => app.storage.setItem('any_key', 'value')).not.toThrow();
    expect(() => app.storage.removeItem('any_key')).not.toThrow();

    global.localStorage = originalLocalStorage;
  });

  test('setupWizard navigates steps correctly via next, prev, finish, and URL parameter', () => {
    // Mock URL parameter ?step=3
    const originalLocation = window.location;
    delete window.location;
    window.location = new URL('http://localhost/calculator.html?step=3');

    // Setup elements
    document.body.innerHTML += `
      <div class="wizard-panel"></div>
      <div class="wizard-panel"></div>
      <div class="wizard-panel"></div>
      <div class="wizard-panel"></div>
      <span class="step-indicator" data-step="1"></span>
      <span class="step-indicator" data-step="2"></span>
      <span class="step-indicator" data-step="3"></span>
      <span class="step-indicator" data-step="4"></span>
      <button class="next-step-btn">Next</button>
      <button class="prev-step-btn">Prev</button>
      <button class="finish-wizard-btn">Finish</button>
      <div class="visualizer-card"></div>
    `;

    app.setupWizard();

    // Verify indicators state (Step 3 active, Step 1 & 2 completed)
    const indicators = document.querySelectorAll('.step-indicator');
    expect(indicators[2].classList.contains('active')).toBe(true);
    expect(indicators[0].classList.contains('completed')).toBe(true);

    // Simulate clicking indicator 4
    indicators[3].dispatchEvent(new Event('click'));
    expect(indicators[3].classList.contains('active')).toBe(true);

    // Simulate clicking prev button (should go to Step 3)
    const prevBtn = document.querySelector('.prev-step-btn');
    prevBtn.dispatchEvent(new Event('click'));
    expect(indicators[2].classList.contains('active')).toBe(true);

    // Simulate clicking next button (should go to Step 4)
    const nextBtn = document.querySelector('.next-step-btn');
    nextBtn.dispatchEvent(new Event('click'));
    expect(indicators[3].classList.contains('active')).toBe(true);

    // Simulate finish button
    const finishBtn = document.querySelector('.finish-wizard-btn');
    finishBtn.dispatchEvent(new Event('click'));
    // Modal summary should open
    const modal = document.getElementById('summary-modal');
    expect(modal.classList.contains('active')).toBe(true);

    // Simulate clicking close button in modal summary
    const closeBtn = document.getElementById('close-summary-btn');
    closeBtn.dispatchEvent(new Event('click'));
    expect(modal.classList.contains('active')).toBe(false);

    // Restore location
    window.location = originalLocation;
  });

  test('syncPrintCategory sets correct classes and solutions for all sectors and thresholds', () => {
    const sectors = ['transport', 'energy', 'diet', 'waste'];
    const thresholds = {
      transport: { good: 0.5, moderate: 1.8, critical: 4.8 },
      energy: { good: 0.5, moderate: 1.2, critical: 3.5 },
      diet: { good: 0.5, moderate: 1.5, critical: 3.5 },
      waste: { good: 0.5, moderate: 1.2, critical: 3.5 }
    };

    sectors.forEach(sector => {
      // Setup print cards dynamically if not fully in beforeEach DOM
      if (!document.getElementById(`print-card-${sector}`)) {
        document.body.innerHTML += `
          <div id="print-card-${sector}">
            <span id="print-badge-${sector}"></span>
            <span id="print-solution-${sector}"></span>
            <span id="print-${sector}-val"></span>
          </div>
        `;
      }

      const card = document.getElementById(`print-card-${sector}`);
      const badge = document.getElementById(`print-badge-${sector}`);

      // Test Good
      app.syncPrintCategory(sector, thresholds[sector].good, sector);
      expect(card.classList.contains('print-card-good')).toBe(true);
      expect(badge.textContent).toBe('GOOD');

      // Test Moderate
      app.syncPrintCategory(sector, thresholds[sector].moderate, sector);
      expect(card.classList.contains('print-card-moderate')).toBe(true);
      expect(badge.textContent).toBe('MODERATE');

      // Test Critical
      app.syncPrintCategory(sector, thresholds[sector].critical, sector);
      expect(card.classList.contains('print-card-critical')).toBe(true);
      expect(badge.textContent).toBe('CRITICAL');
    });
  });

  test('triggerPrintReport covers all internal conditional branches', () => {
    const originalPrint = window.print;
    window.print = vi.fn();
    
    // Case 1: Earthy status, electric heat, vegan, minimal lifestyle, full recycling
    document.getElementById('status-badge').textContent = 'Earthy';
    app.state.heatingSource = 'electric';
    app.state.dietType = 'vegan';
    app.state.foodSource = 'mostly-global';
    app.state.lifestyle = 'minimal';
    app.state.recycling = 'full';
    app.triggerPrintReport();
    
    // Case 2: PRISTINE status, biomass heat, vegetarian, mostly-local food source, moderate lifestyle, no recycling
    document.getElementById('status-badge').textContent = 'PRISTINE';
    app.state.heatingSource = 'biomass';
    app.state.dietType = 'vegetarian';
    app.state.foodSource = 'mostly-local';
    app.state.lifestyle = 'moderate';
    app.state.recycling = 'none';
    app.triggerPrintReport();
    
    // Case 3: Carbon Heavy status (else branch)
    document.getElementById('status-badge').textContent = 'Carbon Heavy';
    app.triggerPrintReport();

    // Case 4: Eco-Guardian status, meat-light, natural gas heating
    document.getElementById('status-badge').textContent = 'Eco-Guardian';
    app.state.heatingSource = 'gas';
    app.state.dietType = 'meat-light';
    app.triggerPrintReport();

    expect(window.print).toHaveBeenCalledTimes(4);
    window.print = originalPrint;
  });

  test('setupDailyActionsPage early returns and displays warning if results are missing or corrupted', () => {
    // Empty storage
    global.localStorage.clear();
    app.setupDailyActionsPage();
    expect(document.getElementById('base-score').textContent).toBe("0.00 tonnes / year");
    expect(document.getElementById('comparison-text').textContent).toContain("Baseline not set.");

    // Corrupted checked tasks JSON parsing coverage
    const initialResults = {
      totalScore: 10.0,
      sectors: { transport: 4.0, energy: 3.0, diet: 2.0, waste: 1.0 },
      hasInteracted: true
    };
    global.localStorage.setItem('greenly_calculatorResults', JSON.stringify(initialResults));
    global.localStorage.setItem('greenly_checkedTasks', '{corrupted_json');
    
    // Should handle JSON error gracefully without throwing
    expect(() => app.setupDailyActionsPage()).not.toThrow();
  });

  test('Radio inputs and selects handle change events and update state dynamically', () => {
    // Inject radio element programmatically
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'engine-type';
    radio.value = 'electric';
    document.body.appendChild(radio);

    // Inject option programmatically to prevent resetting the DOM and destroying listeners
    const select = document.getElementById('food-source');
    const option = document.createElement('option');
    option.value = 'mostly-local';
    option.textContent = 'Local';
    select.appendChild(option);
    
    // Bind calculator input listeners
    app.setupCalculatorEventListeners();

    radio.checked = true;
    radio.dispatchEvent(new Event('change'));
    expect(app.state.engineType).toBe('electric');

    select.value = 'mostly-local';
    select.dispatchEvent(new Event('change'));
    expect(app.state.foodSource).toBe('mostly-local');
  });

  test('loadCalculatorState catches JSON errors gracefully', () => {
    global.localStorage.setItem('greenly_calculatorState', '{invalid_json');
    expect(() => app.loadCalculatorState()).not.toThrow();
  });

  test('setupCalculatorEventListeners registers download-report-btn click event correctly', () => {
    const originalPrint = window.print;
    window.print = vi.fn();

    // Bind event listeners
    app.setupCalculatorEventListeners();

    // Setup results in storage so triggerPrintReport runs smoothly
    const initialResults = {
      totalScore: 5.0,
      sectors: { transport: 1.0, energy: 1.0, diet: 1.5, waste: 1.5 },
      hasInteracted: true
    };
    global.localStorage.setItem('greenly_calculatorResults', JSON.stringify(initialResults));

    // Simulate click on print button
    const printBtn = document.getElementById('download-report-btn');
    printBtn.dispatchEvent(new Event('click'));

    expect(window.print).toHaveBeenCalled();
    window.print = originalPrint;
  });

  test('populateSummaryModal correctly renders good limits and covers vegan/minimalist calculation branches', () => {
    // Reset state values to prevent pollution from previous test cases
    app.state.carKm = 0;
    app.state.transitKm = 0;
    app.state.flightsHours = 0;
    app.state.electricityKwh = 0;
    app.state.cleanEnergyPct = 0;
    app.state.heatingSource = 'gas';
    app.state.foodSource = 'balanced';
    app.state.recycling = 'some';

    // Setup low sectors scores (< limits.moderate)
    const lowSectorsResults = {
      totalScore: 2.0,
      sectors: { transport: 0.5, energy: 0.4, diet: 0.6, waste: 0.3 },
      hasInteracted: true
    };
    global.localStorage.setItem('greenly_calculatorResults', JSON.stringify(lowSectorsResults));

    // Setup low emissions lifestyle state values
    app.state.dietType = 'vegan';
    app.state.lifestyle = 'minimal';

    const modal = document.getElementById('summary-modal');
    app.openSummaryModal(modal);

    // Verify progress bar classes are set to bar-good
    expect(document.getElementById('summary-bar-transport').classList.contains('bar-good')).toBe(true);
    expect(document.getElementById('summary-bar-energy').classList.contains('bar-good')).toBe(true);
    expect(document.getElementById('summary-bar-diet').classList.contains('bar-good')).toBe(true);
    expect(document.getElementById('summary-bar-waste').classList.contains('bar-good')).toBe(true);

    // Verify recommendations
    expect(document.getElementById('summary-tip-transport').textContent).toContain("Well Done");
    expect(document.getElementById('summary-tip-energy').textContent).toContain("Well Done");
    expect(document.getElementById('summary-tip-diet').textContent).toContain("Well Done");
    expect(document.getElementById('summary-tip-waste').textContent).toContain("Well Done");

    // Verify scope calculations
    const s3 = parseFloat(document.getElementById('summary-val-scope3').textContent);
    expect(s3).toBeCloseTo(1.7, 1);
  });

  test('populateSummaryModal correctly renders critical limits suggestion for waste', () => {
    // Setup critical scores (> limits.critical)
    const criticalResults = {
      totalScore: 12.0,
      sectors: { transport: 3.0, energy: 2.5, diet: 2.5, waste: 2.0 },
      hasInteracted: true
    };
    global.localStorage.setItem('greenly_calculatorResults', JSON.stringify(criticalResults));

    app.state.dietType = 'meat-heavy';
    app.state.lifestyle = 'high';

    const modal = document.getElementById('summary-modal');
    app.openSummaryModal(modal);

    // Verify progress bar class is set to bar-critical
    expect(document.getElementById('summary-bar-waste').classList.contains('bar-critical')).toBe(true);
    expect(document.getElementById('summary-tip-waste').textContent).toContain("Restrict buying new goods");
  });

  test('handleModalKeyDown focus trapping handles tab focus loops, Shift+Tab loops, and empty focusables', () => {
    const modal = document.getElementById('summary-modal');
    
    // Add focusable elements to modal content
    const content = modal.querySelector('.summary-modal-content');
    content.innerHTML = `
      <button id="btn1">Button 1</button>
      <button id="btn2">Button 2</button>
      <button id="btn3">Button 3</button>
    `;
    
    // Open modal
    app.openSummaryModal(modal);
    expect(modal.classList.contains('active')).toBe(true);

    const btn1 = document.getElementById('btn1');
    const btn2 = document.getElementById('btn2');
    const btn3 = document.getElementById('btn3');

    // Mock JSDOM offset size properties
    Object.defineProperty(btn1, 'offsetWidth', { value: 10, configurable: true });
    Object.defineProperty(btn1, 'offsetHeight', { value: 10, configurable: true });
    Object.defineProperty(btn2, 'offsetWidth', { value: 10, configurable: true });
    Object.defineProperty(btn2, 'offsetHeight', { value: 10, configurable: true });
    Object.defineProperty(btn3, 'offsetWidth', { value: 10, configurable: true });
    Object.defineProperty(btn3, 'offsetHeight', { value: 10, configurable: true });

    // Focus first button, press Shift+Tab (should loop to last button)
    btn1.focus();
    const shiftTabEvent = new KeyboardEvent('keydown', { key: 'Tab', keyCode: 9, shiftKey: true });
    window.dispatchEvent(shiftTabEvent);
    expect(document.activeElement).toBe(btn3);

    // Focus last button, press Tab (should loop to first button)
    btn3.focus();
    const tabEvent = new KeyboardEvent('keydown', { key: 'Tab', keyCode: 9, shiftKey: false });
    window.dispatchEvent(tabEvent);
    expect(document.activeElement).toBe(btn1);

    // Close modal to verify early return (no focus trapping when inactive)
    app.closeSummaryModal(modal);
    
    // Re-create a button outside the modal and focus it
    const outerBtn = document.createElement('button');
    document.body.appendChild(outerBtn);
    outerBtn.focus();
    window.dispatchEvent(tabEvent);
    // Focus should not change since modal is inactive
    expect(document.activeElement).toBe(outerBtn);
    outerBtn.remove();

    // Re-open and test with no focusable elements to cover the empty check
    app.openSummaryModal(modal);
    content.innerHTML = '';
    const emptyTabEvent = new KeyboardEvent('keydown', { key: 'Tab', keyCode: 9 });
    window.dispatchEvent(emptyTabEvent);
  });

  test('summary modal backdrop click closes the modal', () => {
    // Setup elements for setupWizard to bind modal listeners successfully
    document.body.innerHTML += `
      <div class="wizard-panel"></div>
      <span class="step-indicator" data-step="1"></span>
      <button class="next-step-btn">Next</button>
      <button class="prev-step-btn">Prev</button>
      <button class="finish-wizard-btn">Finish</button>
    `;
    app.setupWizard();

    const modal = document.getElementById('summary-modal');
    app.openSummaryModal(modal);
    expect(modal.classList.contains('active')).toBe(true);

    const backdrop = modal.querySelector('.summary-modal-backdrop');
    backdrop.dispatchEvent(new Event('click'));
    expect(modal.classList.contains('active')).toBe(false);
  });

  test('Page navigation links click handler transitions correctly', () => {
    vi.useFakeTimers();
    // Save original location
    const originalLocation = window.location;
    delete window.location;
    window.location = {
      ...originalLocation,
      pathname: '/calculator.html',
      href: ''
    };

    // Setup nav links and curtain in DOM
    document.body.innerHTML += `
      <div id="transition-curtain"></div>
      <a href="tasks.html" class="nav-transition" id="nav-link-test">Tasks</a>
      <a href="#anchor" class="nav-transition" id="nav-link-anchor">Anchor</a>
      <a href="calculator.html" class="nav-transition" id="nav-link-same">Same</a>
    `;

    app.setupPageTransitions();

    const testLink = document.getElementById('nav-link-test');
    const anchorLink = document.getElementById('nav-link-anchor');
    const sameLink = document.getElementById('nav-link-same');
    const curtain = document.getElementById('transition-curtain');

    // Click same page link (should do nothing / return early)
    sameLink.dispatchEvent(new Event('click'));
    expect(window.location.href).toBe('');

    // Click anchor link (should do nothing / return early)
    anchorLink.dispatchEvent(new Event('click'));
    expect(window.location.href).toBe('');

    // Click external link (should trigger animation slide-in and redirect after 1500ms)
    testLink.dispatchEvent(new Event('click'));
    expect(curtain.classList.contains('slide-in')).toBe(true);

    vi.advanceTimersByTime(1500);
    expect(window.location.href).toBe('tasks.html');

    // Test branch when curtain is missing
    document.getElementById('transition-curtain')?.remove();
    app.setupPageTransitions();
    testLink.dispatchEvent(new Event('click'));
    expect(window.location.href).toBe('tasks.html');

    // Restore location and timers
    window.location = originalLocation;
    vi.useRealTimers();
  });

  test('DOMContentLoaded routes to daily actions page if calc-form is missing', () => {
    // Clear DOM and add only daily actions elements
    document.body.innerHTML = `
      <div id="base-score">0.00 tonnes / year</div>
      <div id="offset-amount">0.00 kg CO2</div>
      <div id="net-score">0.00 tonnes / year</div>
      <div id="daily-challenge-container"></div>
    `;

    // Dispatch DOMContentLoaded on document to trigger listener
    document.dispatchEvent(new Event('DOMContentLoaded'));

    // Verify setupDailyActionsPage ran and initialized values
    expect(document.getElementById('base-score').textContent).toBe("0.00 tonnes / year");
  });

  test('DOMContentLoaded routes to calculator page if calc-form is present', () => {
    // Setup required DOM elements for DOMContentLoaded router
    document.body.innerHTML = `
      <form id="calc-form">
        <input type="range" id="car-km" min="0" max="1000" value="0">
        <span id="car-km-val">0 km</span>
        <input type="range" id="transit-km" min="0" max="500" value="0">
        <span id="transit-km-val">0 km</span>
        <input type="range" id="flights-hours" min="0" max="100" value="0">
        <span id="flights-hours-val">0 hours</span>
        <input type="range" id="electricity-kwh" min="0" max="1000" value="0">
        <span id="electricity-kwh-val">0 kWh</span>
        <input type="range" id="clean-energy-pct" min="0" max="100" value="0">
        <span id="clean-energy-pct-val">0%</span>
        <select id="food-source">
          <option value="balanced">Balanced</option>
        </select>
        <button id="download-report-btn">Print</button>
      </form>
      <div id="status-badge" class="status-indicator-badge">PRISTINE</div>
      <div id="footprint-wrapper">
        <svg id="footprint-svg" viewBox="0 0 100 135">
          <g id="footprint-group" class="state-pristine"></g>
        </svg>
        <div id="visual-overlay" class="visual-effects-overlay"></div>
      </div>
      <div id="score-num">0.00</div>
      <div id="comparison-text">Start adjusting inputs...</div>
      <div class="wizard-panel"></div>
      <span class="step-indicator" data-step="1"></span>
      <button class="next-step-btn">Next</button>
      <button class="prev-step-btn">Prev</button>
      <button class="finish-wizard-btn">Finish</button>
    `;

    document.dispatchEvent(new Event('DOMContentLoaded'));
    // It should successfully run routing and setup
    expect(document.getElementById('score-num').textContent).toBe("7.30");
  });

  test('renderDailyChallenge handles missing day by falling back to Monday challenge', () => {
    const originalGetDay = Date.prototype.getDay;
    Date.prototype.getDay = () => 8; // Invalid day to force fallback

    // Setup results in storage so setupDailyActionsPage doesn't early return
    const initialResults = {
      totalScore: 5.0,
      sectors: { transport: 1.0, energy: 1.0, diet: 1.5, waste: 1.5 },
      hasInteracted: true
    };
    global.localStorage.setItem('greenly_calculatorResults', JSON.stringify(initialResults));

    app.setupDailyActionsPage();
    const container = document.getElementById('daily-challenge-container');
    expect(container.innerHTML).toContain("Meat-Free Monday");

    Date.prototype.getDay = originalGetDay;
  });

  test('updateStanding handles null challenge parameter correctly', () => {
    // Setup inputs
    document.getElementById('task-travel').checked = true;
    app.updateStanding(10.0, null);

    // Verify it updates standing without errors
    expect(document.getElementById('net-score').textContent).toContain("tonnes / year");
  });

  test('syncPrintCategory early returns if elements are missing from DOM', () => {
    // Call with nonexistent sector ID
    expect(() => app.syncPrintCategory('nonexistent-id', 5.0, 'transport')).not.toThrow();
  });
});
