const fs = require('fs');
const path = require('path');
// Globals are injected by Vitest due to globals: true in vitest.config.js

// Setup mock document environment for testing JSDOM behaviors
beforeEach(() => {
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
    
    vi.advanceTimersByTime(2600);
    
    const sprouts = overlay.querySelectorAll('.sprout-item');
    expect(sprouts.length).toBeGreaterThan(0);
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

    expect(window.print).toHaveBeenCalledTimes(3);
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
});
