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