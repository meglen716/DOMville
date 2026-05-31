# DOMville

DOMville is a lightweight, browser-based city-building simulation game developed using vanilla JavaScript and the HTML5 Canvas API. The project focuses on modular architecture and deep simulation mechanics, featuring procedural terrain generation, dynamic traffic AI, and a fully integrated mass transit system.

## Features

### Advanced Transit and Infrastructure

* **Smart Pathing:** Roads and train tracks utilize an auto-merge algorithm to seamlessly stitch arrays together during construction, ensuring continuous visual rendering and perfect AI navigation.
* **Coastal and Alpine Engineering:** Bypasses standard grid restrictions to allow train tracks to hug ocean coastlines and stations to be constructed directly into mountain terrain.
* **Precision Tools:** Demolition and rebuild tools allow for single-tile surgical alterations without disrupting entire transit lines.

### Traffic and Citizen AI

* **Park and Ride Commuting:** Citizens actively calculate commute options during rush hours. A significant percentage of the population will drive to local train stations, park, and commute via train, physically reducing vehicular traffic on the road network.
* **Supply Chain Logistics:** Factories autonomously dispatch delivery trucks to restock supermarkets based on dynamic inventory levels.
* **Emergency Dispatch:** The city monitors for emergencies (fires, crime, medical events) and automatically paths firetrucks, police, and ambulances from their respective stations to the affected zones.

### Simulation Systems

* **Disaster Mechanics:** Trains track individual passenger capacities dynamically. Unsafe transit loops with multiple trains feature collision detection, resulting in service disruptions, casualties, and visual explosion effects.
* **Procedural Terrain:** Generates a randomized island layout upon initialization, complete with organic coastlines, rivers, lakes, and mountain elevations using smoothed boundary mathematics.

### User Interface

* **Responsive Rendering:** Features a linear-interpolated (lerped) visual grid cursor for smooth tool tracking.
* **Adaptive Viewport:** Minimap and UI elements automatically scale or hide based on the user's screen resolution to support both desktop and mobile environments.

## Installation and Setup

Because DOMville is built entirely with vanilla JavaScript, HTML, and CSS, it requires no build steps, bundlers, or dependencies.

1. Clone the repository to your local machine:
```bash
git clone https://github.com/yourusername/DOMville.git

```


2. Navigate into the project directory:
```bash
cd DOMville

```


3. Open the project using a local development server to ensure module loading and canvas cross-origin policies function correctly.
* If using VS Code, you can use the **Live Server** extension.
* If using Python, you can run: `python -m http.server 8000`


4. Open your browser and navigate to `http://localhost:8000`.

## Controls

* **Left Click:** Build, zone, or interact with UI panels.
* **Right Click:** Deselect current tool / Close contextual panels.
* **Click and Drag (Middle Mouse / Right Click):** Pan the camera across the map.
* **Scroll Wheel:** Zoom in and out.
* **Pinch-to-Zoom:** Supported on touch devices.
* **D Key:** Toggle the Demolish tool.

## Project Architecture

The game logic is strictly divided into modular files for maintainability:

* `index.html`: The main entry point housing the Canvas element and UI overlay.
* `game.js`: The core engine loop. Handles input processing, camera math, game state, auto-saving, and unified rendering.
* `terrain.js`: Contains the procedural generation logic for islands, water bodies, and elevation.
* `traffic.js`: Manages the pathfinding algorithm, vehicular states, intersection logic, and supply/emergency dispatching.
* `train.js`: Controls the mass transit network, train logic, passenger capacity tracking, and collision detection.

## Contributing

Contributions, issues, and feature requests are welcome. Feel free to check the issues page if you want to contribute.

## License

This project is open source and available under the [MIT License](https://www.google.com/search?q=LICENSE).
