DOMville 
Mini City Web Builder
Created by Meglen (© 2026)

A lightweight, fully-featured city-building simulation built entirely from scratch using vanilla HTML5 Canvas, CSS, and JavaScript.

🌟 Key Features
Dynamic Zoning & Growth: Zone residential, commercial, industrial, and agricultural areas. Watch houses level up based on land value and access to utilities.

Deep Traffic Simulation: A functioning road network featuring pathfinding, traffic lights, roundabouts, and right-of-way logic. Watch citizens drive to work, buses run routes, and delivery trucks restock supermarkets.

City Services & Economy: Manage your budget through a dynamic tax slider while balancing maintenance costs for power plants, water pumps, police, fire, and medical services.

Disasters & Emergencies: Face random events including spreading fires, viral plagues, high-tax riots, earthquakes, and tornadoes. Emergency vehicles actively dispatch to solve crises.

Environment Systems: Features a day/night cycle and dynamic weather (Clear, Rain, Storms, Snow) that impacts traffic speeds and visual rendering.

Audio Engine: Custom Web Audio API implementation with background handling and a user-friendly toggle switch.

🎮 How to Play
Build Power Plants and Water Pumps to supply your city.

Lay down Roads to connect your zones.

Place Houses, Offices, and Supermarkets to attract population.

Keep citizens happy and healthy with Parks, Schools, and Hospitals.

Adjust the Tax Rate to balance your income against building upkeep.

⌨️ Controls
Left Click: Place building / Build road / Inspect structure

Right Click: Deselect current tool

Middle Mouse / Right-Drag: Pan the camera

Scroll Wheel: Zoom in and out

D Key: Toggle Demolish mode

Escape Key: Clear tool selection

📁 File Structure
index.html - The main game interface and canvas container.

style.css - UI styling, animations, and layout control.

game.js - Core rendering, input handling, and the main game loop.

traffic.js - Vehicle pathfinding, AI behavior, and emergency dispatch logic.

disasters.js - Disaster triggers, fire spread, and emergency timeout logic.

audio.js - SFX loading, browser-autoplay unlocking, and mute handling.

/sfx/ - Folder containing game audio files.