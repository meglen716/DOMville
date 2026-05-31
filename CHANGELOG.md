Phase 1: The Foundation
Grid & Rendering: Established the HTML5 Canvas grid environment with panning and zooming functionality.
Zoning System: Added core placement logic for Houses, Offices, Supermarkets, Schools, Factories, and Farms.
Utility Networks: Implemented proximity-based checking for Power and Water grids.
Road Drawing Tool: Built a drag-to-draw system for laying down asphalt, bridges, and tunnels based on underlying terrain.
Phase 2: Traffic & Agent AI
Pathfinding: Implemented algorithms allowing entities to find the shortest road path to a destination.
Commuter Logic: Added citizen routines (driving from home to work in the morning, shopping in the afternoon).
Traffic Control: Built functional traffic lights with timed red/green/yellow cycles and custom roundabouts to ease congestion.
Supply Chains: Added delivery trucks that spawn from factories/farms to restock empty supermarkets.
Phase 3: The Economy & Growth
City Funds: Added an overarching economy system with building costs and monthly maintenance overhead.
Taxation: Built an interactive City Hall slider to manage tax rates and simulate income ticks.
Land Value: Created an area-of-effect system where Parks and Services boost nearby land value.
Visual Upgrades: Houses now dynamically upgrade (Levels 1-3) based on local land value, increasing population density.
Phase 4: Disasters & Emergencies
Fire & Health: Buildings can now catch fire or become infected. If ignored, they turn to ruins or become abandoned.
Active Dispatching: Firetrucks and Ambulances physically spawn and drive to emergencies. Validated dispatch logic ensures they only deploy if a clear road path exists.
Natural Disasters: Added logic and visuals for screen-shaking Earthquakes and path-destroying Tornadoes.
Civil Unrest: Pushing taxes too high triggers riots, spawning rioter vehicles that set fire to nearby neighborhoods.
Death Timers: Added a timeout system; if ambulances get stuck in traffic and fail to arrive, the emergency ends in building abandonment.
Phase 5: Environment & UI Overhaul
Interface Redesign: Moved tools to a bottom-docked, collapsible category menu to save screen space.
Top HUD: Added real-time tracking for Population, Funds, Net Income, Game Clock, and Weather conditions with dynamic emojis.
Auto-Inspect: Removed the clunky inspect tool; clicking existing buildings now automatically opens their stat panel.
Mini-Map: Built a live-rendering minimap in the bottom left corner with a draggable camera view box.
Weather & Lighting: Added a day/night cycle overlay and weather states that actively modify vehicle speeds.
Phase 6: Audio & Quality of Life (Current)
Web Audio API: Built an independent audio manager (audio.js) that safely unlocks browser audio on the first click.
Sound Effects: Added spatial and looping audio for upgrades, sirens, tornadoes, and riots.
Modern Toggles: Replaced standard buttons with animated CSS toggle switches for both Demolish Mode and the Sound System.
Smart Drawing: Road drawing now ignores overlapping nodes to prevent duplicate billing and pathfinding loops.
Subtle Controls: Painted minimal keyboard/mouse instructions below the minimap.
Polished Logs: Made the Activity Log vertically resizable with a custom, minimalist scrollbar.

===================================
+		Version 2.0 Patch Notes			  +
+		Major Features & Mechanics		+
===================================

The "Park & Ride" AI: Citizens now actively calculate commutes, driving their cars to train stations and walking onto the platform to take the train to work.

Mass Transit Traffic Relief: Train stations now project a massive 12-grid radius that significantly reduces the number of cars spawned by nearby houses, physically clearing up your road networks.

Disaster Mechanics: Trains now hold dynamic passenger counts. If two trains collide on the same track, they will trigger a fatal crash, spawn explosions, calculate casualties, and log the disaster.

Coastal & Alpine Engineering: The terrain validation logic was rewritten to allow train tracks to perfectly hug the ocean coastline and train stations to be constructed directly on top of mountains.

Quality of Life & Controls

Precision Demolition: Deleting a road or track now precisely slices the array and removes only the single tile you clicked, rather than wiping out the entire transit line.

Smart Path Merging: Drawing a new road or track that touches an existing one will now automatically stitch the two arrays together, ensuring perfect dashed lines and seamless navigation for cars and trains.

Auto-Save System: The city state is now silently backed up to LocalStorage every 5 seconds to prevent accidental data loss.

Visual Upgrades

Smooth UI Tracking: The grid selector now uses a fluid, lerped animation to glide toward the mouse pointer, featuring a crisp white box for building and a minimalist red 'X' for demolition.

Modern Track Rendering: Train lines were redesigned with a solid dark border, a crisp white center, and flat-capped cross-ties for a clean, minimalist transit-map aesthetic.

Ambient Station Life: Tiny citizen particles now autonomously walk up and down the station driveways during operating hours.

Responsive UI: The minimap now automatically hides itself on screens smaller than 768px to keep the interface uncluttered for mobile players.
