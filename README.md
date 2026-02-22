# Cyanobacteria Metabolic Pathway Simulator

An interactive, accurate, and visually polished HTML5 Canvas simulation of cyanobacterial carbon metabolism and electron transport chains.

## Overview
This project visualizes the interconnected nature of 7 major biochemical systems within a photosynthetic cell. It allows users to actively trace the flow of carbon, electrons, and energy (ATP/NADP(H)) by clicking on enzymatic reactions to advance the simulation step-by-step. 

Rather than treating pathways as isolated diagrams, this simulator uses **shared metabolite nodes** (e.g., Fructose-6-Phosphate) in a beautifully structured orthogonal grid, demonstrating how pathways like Glycolysis, the Calvin Cycle, and the Pentose Phosphate Pathway naturally intersect.

## Key Features
* **Interactive Click-to-React**: Manually advance the metabolic flux by clicking on enzymatic arrows. The simulator dynamically highlights available reactions based on your current stockpile of metabolites, ATP, and redox coenzymes.
* **Biochemical Accuracy**: Reversible enzymes (like Aldolase or PGI) calculate substrate/product availability dynamically. Clicking an enzyme in reverse naturally consumes its product and returns its substrate.
* **Orthogonal Grid Layout**: The entire cytoplasmic carbon architecture (Glycolysis, Calvin, PPP, Krebs) is mapped to a strict, easy-to-read column and row system.
* **Unrolled Krebs Block**: The Citric Acid cycle is seamlessly integrated as a 3x3 logical circuit beneath Glycolysis.
* **Dynamic Shared Reactions**: Enzymes shared between multiple pathways (like the TKT/TAL and TK/SBP sugar rearrangements) visually adapt their colors based on which pathways are currently active in the sidebar.
* **Live Bioenergetic Tracking**: Monitor global cellular pools of ATP/ADP and NADH/NAD⁺ through live percentage bars that calculate energy states in real-time.
* **Light / Dark Canvas Themes**: A "Sunlight" toggle that automatically shifts the entire application and canvas aesthetic between dark-mode glassmorphism and light-mode vibrancy.

## Included Metabolic Pathways
1. **Glycolysis**
2. **Pentose Phosphate Pathway (PPP)**
3. **Calvin Cycle** (Carbon Fixation)
4. **Krebs Cycle** (Citric Acid Cycle)
5. **Linear Light-Dependent Reactions** (Z-scheme)
6. **Cyclic Light-Dependent Reactions** (PSI cyclic flow)
7. **Oxidative Phosphorylation** (Respiratory ETC)
8. **Fermentation** (Ethanol pathway when anoxic)

## Tech Stack
* **HTML5 Canvas**: Completely custom 2D rendering pipeline (`renderer.js` and `enzymes.js`).
* **Vanilla JavaScript**: State tracking and bio-logic handled without frameworks (`sim.js`).
* **Pure CSS**: Glassmorphism UI, sidebar controls, and responsive styling (`style.css`).
* No external libraries or NPM dependencies required.

## How to Run Locally

You only need a basic local web server to run the simulation.

1. Clone or download the repository.
2. Open a terminal in the project directory.
3. Serve the directory using `npx`:
   ```bash
   npx serve .
   ```
   *(Or use Python: `python -m http.server 3000`)*
4. Open the provided localhost URL in your browser (usually `http://localhost:3000`).

## File Structure
- `index.html` - The application shell, DOM controls, and dashboard UI.
- `style.css` - Visual styling for the HTML interface.
- `sim.js` - The simulation engine. Holds the `store` object (metabolite counts) and validation logic for every enzymatic reaction.
- `renderer.js` - The WebGL/Canvas 2D drawing engine. Handles zooming, panning, layout coordinate math, and hit-detection for mouse clicks.
- `enzymes.js` - Specialized drawing routines for complex membrane proteins, shared nodes, and text labels.
