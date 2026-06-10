# Greenly — Carbon Footprint Audit & Action Tracker

**Greenly** is a premium, nature-themed web experience that enables users to measure, analyze, and offset their carbon footprint through daily habits and sustainable actions. Designed with an elegant, editorial aesthetic featuring warm cream tones, deep forest green accents, and rich typography, Greenly combines mathematical precision with delightful micro-animations to drive climate awareness.

Live Demo: **

---

## Key Features

*   **Interactive Zero-Preset Wizard:** A step-by-step questionnaire spanning four sectors:
    *   **Transportation:** Commutes, engine types (gasoline, hybrid, electric), public transit, and flight metrics.
    *   **Household Energy:** Monthly electricity usage, heating source transitions (gas, heat pump, biomass), and green energy percentages.
    *   **Diet & Sourcing:** Food choices (heavy meat to vegan) and food travel sourcing (global vs. local).
    *   **Goods & Waste:** Buying frequency and waste processing (recycling and composting ratios).
*   **Live Footprint Visualizer:** An interactive SVG footprint that morphs dynamically based on your rating:
    *   *Pristine Mode:* Seeds waiting to sprout.
    *   *Eco-Guardian:* Vibrant green footprint with dynamically spawning organic bud sprouts.
    *   *Earthy:* Stable yellow footprint representing a moderate standing.
    *   *Carbon Heavy:* Red footprint emitting dynamic carbon smoke particles.
*   **Daily Actions & Checklist:** An interactive checklist with real-time `localStorage` synchronization. Includes a **Daily Eco Challenge** that changes according to the day of the week, allowing users to subtract offsets from their baseline score.
*   **Color-Coded PDF Reports:** A printable, formatted audit breakdown complete with color-coded warning frames (Green/Yellow/Red) and sector progress bars. Completely optimized for a single-page printout.

---

## Technology Stack

Greenly is lightweight, performant, and has zero external package dependencies:
*   **Frontend:** Vanilla Semantic HTML5, CSS3 Custom Properties (Variables), and Modern ES6 JavaScript.
*   **Graphics & Animation:** Inline vector SVGs and CSS Keyframes.
*   **State Management:** Native `localStorage` sync engine.

---

## How to Host & Deploy Locally

### Run Locally
To run the server locally, you can use any static server. For example, using Python:
```bash
python -m http.server 8000
```
Open `http://localhost:8000` in your web browser.
