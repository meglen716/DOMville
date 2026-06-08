const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// ==========================================
// 1. GAME STATE & CONSTANTS
// ==========================================
window.currentTool = 'house';
let selectedEntity = null; 
let currentHover = { x: null, y: null }; 

// Rebuild State
let isDraggingRebuild = false;
let rebuildStart = { x: null, y: null };
let rebuildCurrent = { x: null, y: null };

// Settings State
window.showBuildingOutlines = false; 
window.gameIsMuted = false;

const gridSize = 40;
const WORLD_SIZE = 4000; 
const REBUILD_DURATION = 1440; // ~24 real seconds (Approx 24 in-game hours)

const entities = []; 
const roads = []; 
const cars = [];
const trafficLights = []; 
const roundabouts = []; 
const busStops = []; 
const trainStations = [];
const trainTracks = [];

const camera = { x: 0, y: 0, zoom: 1 };
let isPanning = false; let startPan = { x: 0, y: 0 };
let isDrawingRoad = false; let currentRoadPath = [];
let isDrawingTrack = false; let currentTrackPath = []; 
let isDeleting = false; let carIdCounter = 0; 

let taxTimer = 0; const TAX_INTERVAL = 600; 
let isFirstFrame = true; let isNewGame = false;   
let currentTaxRate = 1.0; 

const BUILDING_COSTS = {
    powerPlant: 2000, waterPump: 1500, house: 50, road: 10, bridge: 50, tunnel: 80, trafficLight: 100, roundabout: 300, busStop: 200,
    office: 500, supermarket: 400, school: 800, policeStation: 1000, hospital: 1500, fireStation: 1200, park: 250, 
    trainStation: 2000, trainTrack: 25, train: 500,
    factory: 1200, farm: 600
};

const MAINTENANCE_COSTS = {
    powerPlant: 150, waterPump: 100, policeStation: 80, hospital: 120, fireStation: 90, school: 60, busStop: 10, park: 15, trainStation: 200,
    factory: 100, farm: 30
};

// --- ECONOMY FUNCTIONS ---
function spendFunds(amount) {
    if (typeof cityFunds !== 'undefined') { cityFunds -= amount; }
    else { window.cityFunds = (window.cityFunds || 20000) - amount; }
    updateHUD(); 
}

function refund(type) {
    const cost = BUILDING_COSTS[type] || 0;
    if (cost > 0) {
        const refundAmount = Math.floor(cost / 2);
        if (typeof cityFunds !== 'undefined') { cityFunds += refundAmount; }
        else { window.cityFunds = (window.cityFunds || 20000) + refundAmount; }
        if (typeof logActivity === 'function') logActivity(`Refunded $${refundAmount} for demolished ${type}.`, "info");
        updateHUD();
    }
}

// --- ACTIVITY LOGGER ---
function logActivity(message, type = 'info') {
    const list = document.getElementById('activity-list');
    if (!list) return;

    const li = document.createElement('li');
    li.className = `log-${type}`;
    let timeStr = "00:00";
    if (typeof gameClock !== 'undefined') {
        let hrs = Math.floor(gameClock); let mins = Math.floor((gameClock - hrs) * 60);
        timeStr = `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    }
    li.innerHTML = `<span class="log-time">[${timeStr}]</span> ${message}`;
    list.insertBefore(li, list.firstChild);
    if (list.children.length > 50) list.removeChild(list.lastChild); 
}

const logHeader = document.getElementById('activity-log-header');
if (logHeader) {
    logHeader.addEventListener('click', () => {
        const content = document.getElementById('activity-log-content');
        const btn = document.getElementById('toggle-log-btn');
        if (content && btn) {
            content.classList.toggle('collapsed');
            btn.innerText = content.classList.contains('collapsed') ? '▲' : '▼';
        }
    });
}

function isRoad(gridX, gridY) {
    const isNormalRoad = roads.some(path => path.some(node => node.x === gridX && node.y === gridY));
    const isLiveDrawing = isDrawingRoad && currentRoadPath.some(node => node.x === gridX && node.y === gridY);
    const isRoundabout = roundabouts.some(r => r.x === gridX && r.y === gridY);
    return isNormalRoad || isLiveDrawing || isRoundabout;
}

// ==========================================
// 2. SETUP, AUTO-SAVE, UI & SHORTCUTS
// ==========================================
function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; clampCamera(); }
window.addEventListener('resize', resize); resize();

if (typeof generateTerrain === 'function') {
    generateTerrain(WORLD_SIZE, WORLD_SIZE, gridSize);
    camera.x = (window.innerWidth - WORLD_SIZE) / 2; camera.y = (window.innerHeight - WORLD_SIZE) / 2;
    clampCamera(); 
}

function clampCamera() {
    const scaledWorldW = WORLD_SIZE * camera.zoom; const scaledWorldH = WORLD_SIZE * camera.zoom;
    if (scaledWorldW < canvas.width) camera.x = (canvas.width - scaledWorldW) / 2; else camera.x = Math.max(canvas.width - scaledWorldW, Math.min(0, camera.x));
    if (scaledWorldH < canvas.height) camera.y = (canvas.height - scaledWorldH) / 2; else camera.y = Math.max(canvas.height - scaledWorldH, Math.min(0, camera.y));
}
function screenToWorld(x, y) { return { x: (x - camera.x) / camera.zoom, y: (y - camera.y) / camera.zoom }; }
function getGridCoords(clientX, clientY) {
    const worldPos = screenToWorld(clientX, clientY);
    return { gridX: Math.floor(worldPos.x / gridSize) * gridSize, gridY: Math.floor(worldPos.y / gridSize) * gridSize };
}

function saveGame() {
    try {
        const terrainData = typeof terrainMap !== 'undefined' ? Array.from(terrainMap.entries()) : [];
        const currentFunds = typeof cityFunds !== 'undefined' ? cityFunds : window.cityFunds;
        const saveData = { 
            terrain: terrainData, entities: entities, roads: roads, 
            trafficLights: trafficLights, roundabouts: roundabouts, 
            funds: currentFunds, busStops: busStops, taxRate: currentTaxRate,
            trainStations: trainStations, trainTracks: trainTracks,
            clock: typeof gameClock !== 'undefined' ? gameClock : 8,
            day: typeof gameDay !== 'undefined' ? gameDay : 0,
            weather: typeof currentWeather !== 'undefined' ? currentWeather : 'CLEAR',
            isMuted: window.gameIsMuted,
            showOutlines: window.showBuildingOutlines,
            trains: typeof activeTrains !== 'undefined' ? activeTrains : []
        };
        localStorage.setItem('miniCitySave', JSON.stringify(saveData));
    } catch (error) { console.error("Auto-save failed:", error); }
}

function loadGame() {
    const saved = localStorage.getItem('miniCitySave');
    if (saved) {
        try {
            const saveData = JSON.parse(saved);
            
            if (typeof terrainMap !== 'undefined' && saveData.terrain) { 
                terrainMap.clear(); 
                saveData.terrain.forEach(([key, value]) => terrainMap.set(key, value)); 
            }
            if (typeof renderTerrainCache === 'function') renderTerrainCache(WORLD_SIZE, WORLD_SIZE, gridSize);

            entities.length = 0;
            if (saveData.entities) { saveData.entities.forEach(e => { if (e.type === 'house' && !e.level && typeof initHouseStats === 'function') initHouseStats(e); if (e.type === 'building') e.type = 'office'; entities.push(e); }); }

            roads.length = 0; saveData.roads?.forEach(r => roads.push(r));
            trafficLights.length = 0; saveData.trafficLights?.forEach(t => { if (t.state === 'H') t.state = 'H_G'; if (t.state === 'V') t.state = 'V_G'; trafficLights.push(t); });
            roundabouts.length = 0; saveData.roundabouts?.forEach(r => roundabouts.push(r));
            busStops.length = 0; saveData.busStops?.forEach(b => busStops.push(b));
            trainStations.length = 0; saveData.trainStations?.forEach(s => trainStations.push(s));
            trainTracks.length = 0; saveData.trainTracks?.forEach(t => trainTracks.push(t));

            cars.length = 0; carIdCounter = 0;
            if (typeof activeTrains !== 'undefined') {
                activeTrains.length = 0; 
                if (saveData.trains) saveData.trains.forEach(t => activeTrains.push(t));
            }
            
            if (saveData.funds !== undefined) { 
                if (typeof cityFunds !== 'undefined') cityFunds = saveData.funds; 
                else window.cityFunds = saveData.funds; 
            }
            if (saveData.taxRate !== undefined) { currentTaxRate = saveData.taxRate; const slider = document.getElementById('tax-slider'); const display = document.getElementById('tax-val-display'); if (slider && display) { slider.value = currentTaxRate * 10; display.innerText = `${slider.value}%`; } }
            
            if (saveData.clock !== undefined && typeof gameClock !== 'undefined') gameClock = saveData.clock;
            if (saveData.day !== undefined && typeof gameDay !== 'undefined') gameDay = saveData.day;
            if (saveData.weather !== undefined) { if (typeof currentWeather !== 'undefined') currentWeather = saveData.weather; else window.currentWeather = saveData.weather; }

            if (saveData.isMuted !== undefined) {
                window.gameIsMuted = saveData.isMuted;
                const soundToggle = document.getElementById('sound-toggle');
                if (soundToggle) soundToggle.checked = !window.gameIsMuted;
            }

            if (saveData.showOutlines !== undefined) {
                window.showBuildingOutlines = saveData.showOutlines;
                const outlineToggle = document.getElementById('outline-toggle');
                if (outlineToggle) outlineToggle.checked = window.showBuildingOutlines;
            }

            camera.x = (window.innerWidth - WORLD_SIZE) / 2; camera.y = (window.innerHeight - WORLD_SIZE) / 2;
            camera.zoom = 1; clampCamera(); 
            logActivity("City loaded successfully.", "info");
        } catch (error) { console.error("Save file corrupted! Starting new game.", error); isNewGame = true; }
    } else { isNewGame = true; }
}

loadGame();

window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (e.key.toLowerCase() === 'd') { const demToggle = document.getElementById('demolish-toggle'); if (demToggle) demToggle.click(); }
    if (e.key.toLowerCase() === 'r') { const rebToggle = document.getElementById('rebuild-toggle'); if (rebToggle) rebToggle.click(); }
    if (e.key === 'Escape') {
        window.currentTool = null;
        document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
        const demToggle = document.getElementById('demolish-toggle'); const rebToggle = document.getElementById('rebuild-toggle');
        if (demToggle) demToggle.checked = false; if (rebToggle) rebToggle.checked = false;
    }
});

function updateTooltips() {
    const currentFunds = typeof cityFunds !== 'undefined' ? cityFunds : (window.cityFunds || 0);

    document.querySelectorAll('.tool-btn').forEach(btn => {
        const toolName = btn.dataset.tool; 
        if (toolName === 'delete' || toolName === 'inspect' || toolName === 'rebuild') return;
        
        const cost = BUILDING_COSTS[toolName] || 0; 
        
        if (currentFunds < cost) {
            btn.classList.add('locked-tool');
            btn.setAttribute('data-tooltip', `Not enough funds! ($${cost})`);
            if (btn.classList.contains('active')) { btn.classList.remove('active'); window.currentTool = null; }
            return;
        }

        btn.classList.remove('locked-tool');
        const upkeep = MAINTENANCE_COSTS[toolName];
        let tooltipText = `Cost: $${cost}`; 
        if (upkeep) tooltipText += ` | Upkeep: $${upkeep}/mo`; 
        
        if (['house', 'office', 'supermarket', 'school', 'factory', 'farm'].includes(toolName)) {
            let estIncome = 0;
            if (toolName === 'house') estIncome = Math.floor(10 * currentTaxRate);
            else if (toolName === 'office') estIncome = Math.floor(20 * currentTaxRate);
            else if (toolName === 'supermarket') estIncome = Math.floor(15 * currentTaxRate);
            else if (toolName === 'factory') estIncome = Math.floor(25 * currentTaxRate);
            else if (toolName === 'farm') estIncome = Math.floor(10 * currentTaxRate);
            if (estIncome > 0) tooltipText += ` | Est. Yield: +$${estIncome}`;
        }
        btn.setAttribute('data-tooltip', tooltipText); 
    });
}

if (typeof updateHUD === 'function') updateHUD(); 
updateTooltips();

document.querySelectorAll('.tool-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        if (btn.classList.contains('locked-tool')) return;
        const demToggle = document.getElementById('demolish-toggle'); const rebToggle = document.getElementById('rebuild-toggle');
        if (demToggle) demToggle.checked = false; if (rebToggle) rebToggle.checked = false;

        const clickedTool = e.target.dataset.tool;
        document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active'); 
        window.currentTool = clickedTool;
    });
});

document.querySelectorAll('.category-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const isActive = e.target.classList.contains('active-category');
        document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active-category'));
        document.querySelectorAll('.tool-panel').forEach(p => p.classList.remove('active-panel'));
        
        if (!isActive) {
            e.target.classList.add('active-category'); 
            const panel = document.getElementById(e.target.dataset.target); if (panel) panel.classList.add('active-panel');
        } else {
            window.currentTool = null;
            document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
        }
    });
});

const firstCategory = document.querySelector('[data-target="panel-zones"]'); if (firstCategory) firstCategory.classList.add('active-category');
const taxSlider = document.getElementById('tax-slider'); const taxValDisplay = document.getElementById('tax-val-display');
if (taxSlider && taxValDisplay) { 
    taxSlider.addEventListener('input', (e) => { currentTaxRate = e.target.value / 10; taxValDisplay.innerText = `${e.target.value}%`; updateTooltips(); }); 
}

const closeInfoBtn = document.getElementById('close-info'); 
if (closeInfoBtn) { 
    closeInfoBtn.style.display = 'none'; // Programmatically hide 'X'
    closeInfoBtn.addEventListener('click', () => { const panel = document.getElementById('info-panel'); if (panel) panel.classList.add('hidden'); selectedEntity = null; }); 
}

function updateInfoPanel() {
    if (!selectedEntity) return;
    const panel = document.getElementById('info-panel'); const content = document.getElementById('info-content'); const title = document.getElementById('info-title');
    if (!panel || !content || !title) return;
    title.innerText = selectedEntity.type.toUpperCase();
    let html = '';
    
    let yieldAmount = 0; let upkeepAmount = MAINTENANCE_COSTS[selectedEntity.type] || 0;

    if (selectedEntity.type === 'house') {
        html += `<div class="info-stat">🏠 Level: ${selectedEntity.level || 1}</div>`;
        html += `<div class="info-stat">👥 Density: x${(selectedEntity.densityMult || 1.0).toFixed(1)}</div>`;
        html += `<div class="info-stat">💎 Value: ${selectedEntity.landValue ? Math.floor(selectedEntity.landValue) : 30}%</div>`;
        html += `<div class="info-stat">📈 Growth: ${selectedEntity.growth ? Math.floor(selectedEntity.growth) : 0} pts</div>`;
        yieldAmount = Math.floor((10 * (selectedEntity.level || 1) * (selectedEntity.densityMult || 1.0)) * currentTaxRate);
    } else if (['office', 'supermarket', 'school', 'factory', 'farm'].includes(selectedEntity.type)) {
        const occ = typeof getOccupancy === 'function' ? getOccupancy(selectedEntity) : 0;
        const cap = typeof ZONE_PROPS !== 'undefined' && ZONE_PROPS[selectedEntity.type] ? ZONE_PROPS[selectedEntity.type].capacity : 10;
        html += `<div class="info-stat">👥 Usage: ${occ}/${cap}</div>`;
        if (selectedEntity.type === 'supermarket') {
            const stock = selectedEntity.stockLevel || 0;
            const stockColor = stock > 50 ? '#2ecc71' : (stock > 20 ? '#f1c40f' : '#e74c3c');
            html += `<div class="info-stat">📦 Stock: <span style="color:${stockColor}; font-weight:bold;">${Math.floor(stock)}%</span></div>`;
        }
        if (selectedEntity.type !== 'school') {
            const multiplier = selectedEntity.type === 'factory' ? 2.5 : (selectedEntity.type === 'office' ? 2.0 : 1.5);
            yieldAmount = Math.floor(occ * multiplier * currentTaxRate);
        }
    } else if (selectedEntity.type === 'trainStation') {
        if (typeof getTrainStationInfoHTML === 'function') {
            html += getTrainStationInfoHTML(typeof activeTrains !== 'undefined' ? activeTrains : []);
        }
    }

    html += `<hr style="border-color:#444; margin: 10px 0;">`;
    
    if (yieldAmount > 0 && !selectedEntity.isAbandoned && !selectedEntity.isBurned && !selectedEntity.isRebuilding) {
        html += `<div class="info-stat">💰 Tax Yield: <span class="good" style="color:#2ecc71; font-weight:bold;">+$${yieldAmount}</span></div>`;
    }
    if (upkeepAmount > 0 && !selectedEntity.isBurned && !selectedEntity.isRebuilding) {
        html += `<div class="info-stat">💸 Upkeep: <span class="bad" style="color:#e74c3c; font-weight:bold;">-$${upkeepAmount}</span></div>`;
    }

    if (selectedEntity.type !== 'trainStation') {
        html += `<div class="info-stat">⚡ Power: ${selectedEntity.hasPower === false ? '<span class="bad">NONE</span>' : '<span class="good">OK</span>'}</div>`;
        html += `<div class="info-stat">💧 Water: ${selectedEntity.hasWater === false ? '<span class="bad">NONE</span>' : '<span class="good">OK</span>'}</div>`;
        html += `<div class="info-stat">🛣️ Roads: ${selectedEntity.hasRoad === false ? '<span class="bad">NONE</span>' : '<span class="good">OK</span>'}</div>`;
    }

    if (selectedEntity.fireLevel > 0) html += `<div class="info-stat bad">🔥 ON FIRE! (${Math.floor(selectedEntity.fireLevel)})</div>`;
    if (selectedEntity.isAbandoned) html += `<div class="info-stat bad">👻 ABANDONED</div>`;
    if (selectedEntity.isBurned) html += `<div class="info-stat bad">☠️ DESTROYED</div>`;
    if (selectedEntity.isRebuilding) html += `<div class="info-stat" style="color:#f1c40f;">🚧 UNDER CONSTRUCTION</div>`;
    content.innerHTML = html;
}

function getWeatherEmoji(status) {
    switch(status.toUpperCase()) {
        case 'CLEAR': return '☀️'; case 'RAIN': return '🌧️'; case 'STORM': return '⛈️';
        case 'CLOUDY': return '☁️'; case 'SNOW': return '❄️'; default: return '🌡️';
    }
}

function updateHUD() {
    const popDisplay = document.getElementById('hud-pop'); const fundsDisplay = document.getElementById('hud-funds'); const incomeDisplay = document.getElementById('hud-income'); const timeDisplay = document.getElementById('hud-time'); const weatherDisplay = document.getElementById('hud-weather'); 
    if (!popDisplay) return;

    const currentFunds = typeof cityFunds !== 'undefined' ? cityFunds : (window.cityFunds || 0);

    if (typeof collectTaxes === 'function') {
        const economyResult = collectTaxes(entities, currentTaxRate, MAINTENANCE_COSTS, busStops, trainStations);
        let incomePerSec = (economyResult.netIncome / 10).toFixed(1);
        popDisplay.innerText = economyResult.population; fundsDisplay.innerText = Math.floor(currentFunds).toLocaleString();
        if (incomePerSec >= 0) { incomeDisplay.innerText = `(+$${incomePerSec}/s)`; incomeDisplay.className = 'income-rate positive'; } 
        else { incomeDisplay.innerText = `(-$${Math.abs(incomePerSec).toFixed(1)}/s)`; incomeDisplay.className = 'income-rate negative'; }
    }

    if (typeof gameClock !== 'undefined') {
        let hrs = Math.floor(gameClock); let mins = Math.floor((gameClock - hrs) * 60);
        let dayStr = typeof getDayName === 'function' ? getDayName() : 'MON';
        timeDisplay.innerText = `${dayStr} ${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    }

    if (typeof getWeatherState === 'function' && weatherDisplay) { 
        let status = getWeatherState().toUpperCase(); 
        weatherDisplay.innerText = `${getWeatherEmoji(status)} ${status}`; 
        if (status === 'STORM') { weatherDisplay.style.color = '#f1c40f'; weatherDisplay.style.fontWeight = 'bold'; } 
        else { weatherDisplay.style.color = '#ecf0f1'; weatherDisplay.style.fontWeight = 'normal'; } 
    }
    updateTooltips();
}

// ==========================================
// 3. CORE LOGIC: ERASER & REBUILD
// ==========================================
function performDeletion(clientX, clientY) {
    const { gridX, gridY } = getGridCoords(clientX, clientY);
    let deletedSomething = false;

    const entityIndex = entities.findIndex(ent => ent.x === gridX && ent.y === gridY);
    if (entityIndex > -1) {
        const deletedEntity = entities.splice(entityIndex, 1)[0]; deletedSomething = true;
        if (selectedEntity === deletedEntity) { selectedEntity = null; const panel = document.getElementById('info-panel'); if (panel) panel.classList.add('hidden'); }
        if (typeof spawnDustParticles === 'function') { const dustColor = deletedEntity.color || (typeof ZONE_PROPS !== 'undefined' && ZONE_PROPS[deletedEntity.type] ? ZONE_PROPS[deletedEntity.type].color : '#bdc3c7'); spawnDustParticles(gridX, gridY, 25, dustColor, gridSize); }
        refund(deletedEntity.type); 
        for (let i = cars.length - 1; i >= 0; i--) { if (cars[i].home === deletedEntity || cars[i].target === deletedEntity) cars.splice(i, 1); }
    }

    if (!deletedSomething) {
        const lightIndex = trafficLights.findIndex(l => l.x === gridX && l.y === gridY);
        if (lightIndex > -1) { trafficLights.splice(lightIndex, 1); deletedSomething = true; if (typeof spawnDustParticles === 'function') spawnDustParticles(gridX, gridY, 10, '#f1c40f', gridSize); refund('trafficLight'); }
    }
    if (!deletedSomething) {
        const rbIndex = roundabouts.findIndex(r => r.x === gridX && r.y === gridY);
        if (rbIndex > -1) { roundabouts.splice(rbIndex, 1); deletedSomething = true; if (typeof spawnDustParticles === 'function') spawnDustParticles(gridX, gridY, 15, '#7f8c8d', gridSize); refund('roundabout'); }
    }
    if (!deletedSomething) {
        const busStopIndex = busStops.findIndex(b => b.x === gridX && b.y === gridY);
        if (busStopIndex > -1) { busStops.splice(busStopIndex, 1); deletedSomething = true; if (typeof spawnDustParticles === 'function') spawnDustParticles(gridX, gridY, 15, '#00d2d3', gridSize); refund('busStop'); for (let i = cars.length - 1; i >= 0; i--) { if (cars[i].type === 'bus') cars.splice(i, 1); } }
    }
    if (!deletedSomething) {
        const stationIndex = trainStations.findIndex(s => s.x === gridX && s.y === gridY);
        if (stationIndex > -1) { trainStations.splice(stationIndex, 1); deletedSomething = true; if (typeof spawnDustParticles === 'function') spawnDustParticles(gridX, gridY, 20, '#7f8c8d', gridSize); refund('trainStation'); }
    }
    if (!deletedSomething) {
        for (let i = trainTracks.length - 1; i >= 0; i--) {
            const nodeIndex = trainTracks[i].findIndex(node => node.x === gridX && node.y === gridY);
            if (nodeIndex > -1) { 
                const track = trainTracks[i];
                
                // 1. Refund just the single track tile and spawn dust
                refund('trainTrack');
                if (typeof spawnDustParticles === 'function') spawnDustParticles(gridX, gridY, 20, '#5c4033', gridSize); 
                
                // 2. Slice the track into two halves (before the click, and after the click)
                const before = track.slice(0, nodeIndex);
                const after = track.slice(nodeIndex + 1);
                
                // 3. Remove the old long track, and save the remaining pieces
                trainTracks.splice(i, 1);
                if (after.length > 0) trainTracks.push(after);
                if (before.length > 0) trainTracks.push(before);
                
                deletedSomething = true; 
                break; 
            }
        }
    }
    
    if (!deletedSomething) {
        for (let i = roads.length - 1; i >= 0; i--) {
            const nodeIndex = roads[i].findIndex(node => node.x === gridX && node.y === gridY);
            if (nodeIndex > -1) { 
                const roadPath = roads[i];
                const deletedNode = roadPath[nodeIndex];
                
                // 1. Refund just the single road tile and spawn dust
                refund(deletedNode.type || 'road');
                if (typeof spawnDustParticles === 'function') spawnDustParticles(gridX, gridY, 20, '#505050', gridSize); 
                
                // 2. Slice the road into two halves
                const before = roadPath.slice(0, nodeIndex);
                const after = roadPath.slice(nodeIndex + 1);
                
                // 3. Remove the old long road, and save the remaining pieces
                roads.splice(i, 1);
                if (after.length > 0) roads.push(after);
                if (before.length > 0) roads.push(before);
                
                deletedSomething = true; 
                break; 
            }
        }
    }
    
    if (deletedSomething) {
        for (let i = cars.length - 1; i >= 0; i--) {
            const car = cars[i];
            if (car.state === 'driving_work' || car.state === 'driving_home' || car.state === 'driving_shop' || car.state === 'driving_delivery') {
                const currentDest = car.target || car.home; const newPath = typeof findPath === 'function' ? findPath(car, currentDest) : null;
                if (newPath === null) cars.splice(i, 1); else { car.path = newPath; car.pathIndex = 0; car.progress = 0; }
            }
        }
    }
}

// --- REBUILD LOGIC ---
function processRebuildArea(start, end, gridSize, entities) {
    const minGridX = Math.min(start.x, end.x); const maxGridX = Math.max(start.x, end.x);
    const minGridY = Math.min(start.y, end.y); const maxGridY = Math.max(start.y, end.y);
    let totalCost = 0; let rebuiltCount = 0;

    for (let i = 0; i < entities.length; i++) {
        let ent = entities[i];
        if (ent.x >= minGridX && ent.x <= maxGridX && ent.y >= minGridY && ent.y <= maxGridY) {
            if (ent.isBurned || ent.isAbandoned) {
                let cost = BUILDING_COSTS[ent.type] || 100;
                let currentFunds = typeof cityFunds !== 'undefined' ? cityFunds : window.cityFunds;
                
                if (currentFunds >= cost) {
                    spendFunds(cost); 
                    ent.isBurned = false; ent.isAbandoned = false; ent.fireLevel = 0; ent.hasEmergency = false;
                    ent.isRebuilding = true; ent.rebuildProgress = 0.0;
                    if (ent.type === 'house') { ent.level = 1; ent.growth = 0; ent.densityMult = 1.0; }
                    if (typeof spawnDustParticles === 'function') spawnDustParticles(ent.x, ent.y, 20, '#f1c40f', gridSize);
                    totalCost += cost; rebuiltCount++;
                } else {
                    if (typeof logActivity === 'function') logActivity(`Rebuild halted! Not enough funds for ${ent.type}.`, "bad");
                    break; 
                }
            }
        }
    }
    if (rebuiltCount > 0 && typeof logActivity === 'function') logActivity(`Started construction on ${rebuiltCount} structure(s) for $${totalCost}.`, "info");
}

// ==========================================
// 4. UNIFIED INPUT HANDLER (MOUSE & TOUCH)
// ==========================================
canvas.addEventListener('contextmenu', e => e.preventDefault());

function handleInputStart(e, clientX, clientY, isRightClick) {
    if (isRightClick) {
        window.currentTool = null; document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
        const demToggle = document.getElementById('demolish-toggle'); const rebToggle = document.getElementById('rebuild-toggle');
        if (demToggle) demToggle.checked = false; if (rebToggle) rebToggle.checked = false;
        isPanning = true; startPan = { x: clientX - camera.x, y: clientY - camera.y }; return;
    }

    const minimapSize = 200; const padding = 20; const mapX = padding; const mapY = canvas.height - minimapSize - padding - 80;
    if (clientX >= mapX && clientX <= mapX + minimapSize && clientY >= mapY && clientY <= mapY + minimapSize) {
        const clickRatioX = (clientX - mapX) / minimapSize; const clickRatioY = (clientY - mapY) / minimapSize;
        camera.x = (canvas.width / 2) - ((clickRatioX * WORLD_SIZE) * camera.zoom); camera.y = (canvas.height / 2) - ((clickRatioY * WORLD_SIZE) * camera.zoom); clampCamera(); return; 
    }

    if (e.button === 1) { isPanning = true; startPan = { x: clientX - camera.x, y: clientY - camera.y }; return; }

    const { gridX, gridY } = getGridCoords(clientX, clientY); 
    const terrainType = typeof getTerrainAt === 'function' ? getTerrainAt(gridX, gridY) : null;
    
    const entityIndex = entities.findIndex(ent => ent.x === gridX && ent.y === gridY); 
    const stationIndex = trainStations.findIndex(s => s.x === gridX && s.y === gridY);
    const panel = document.getElementById('info-panel');

    if (window.currentTool === 'rebuild') { isDraggingRebuild = true; rebuildStart = { x: gridX, y: gridY }; rebuildCurrent = { x: gridX, y: gridY }; return; }
    if (window.currentTool === 'delete') { isDeleting = true; performDeletion(clientX, clientY); return; }

    // Define which tools need to drag starting from inside buildings
    const isPathTool = ['road', 'bridge', 'tunnel', 'trainTrack'].includes(window.currentTool);

    if (!isPathTool) {
        // Normal Click to Inspect / Click-Away to close
        if (entityIndex > -1) { 
            selectedEntity = entities[entityIndex]; 
            updateInfoPanel(); 
            if (panel) panel.classList.remove('hidden'); 
            return; 
        } else if (stationIndex > -1) {
            selectedEntity = trainStations[stationIndex];
            selectedEntity.type = 'trainStation';
            updateInfoPanel();
            if (panel) panel.classList.remove('hidden');
            return;
        } else { 
            selectedEntity = null; 
            if (panel) panel.classList.add('hidden'); 
        }
    } else {
        // If holding a track/road tool, close the panel if clicking empty land, but DO NOT stop the code!
        if (entityIndex === -1 && stationIndex === -1) {
            selectedEntity = null; 
            if (panel) panel.classList.add('hidden'); 
        }
    }

    if (!window.currentTool) return; 

    const currentFunds = typeof cityFunds !== 'undefined' ? cityFunds : (window.cityFunds || 0);

    if (['road', 'bridge', 'tunnel'].includes(window.currentTool)) {
        if (terrainType === 'ocean') return; 
        const alreadyExists = isRoad(gridX, gridY);
        let dynamicType = 'road'; if (terrainType === 'water') dynamicType = 'bridge'; if (terrainType === 'mountain') dynamicType = 'tunnel';
        let cost = alreadyExists ? 0 : (BUILDING_COSTS[dynamicType] || 10);
        if (currentFunds >= cost) { isDrawingRoad = true; currentRoadPath = [{ x: gridX, y: gridY, type: dynamicType }]; if (cost > 0) spendFunds(cost); }
    } else if (window.currentTool === 'trainTrack') {
        // --- NEW COASTAL TRACK RULE APPLIED HERE ---
        if (typeof canBuildTrack === 'function' && !canBuildTrack(gridX, gridY, gridSize)) {
            if (typeof logActivity === 'function') logActivity("Ocean tracks must be built next to land!", "bad");
            return; 
        }
        const alreadyExists = trainTracks.some(path => path.some(n => n.x === gridX && n.y === gridY));
        let cost = alreadyExists ? 0 : BUILDING_COSTS['trainTrack'];
        if (currentFunds >= cost) { isDrawingTrack = true; currentTrackPath = [{ x: gridX, y: gridY }]; if (cost > 0) spendFunds(cost); }
    } else if (window.currentTool === 'trainStation') {
        // Allow building on flat land (null) OR on mountains ('mountain')
        if (terrainType !== null && terrainType !== 'mountain') return; 
        if (isRoad(gridX, gridY)) return; 
        
        if (!trainStations.some(s => s.x === gridX && s.y === gridY)) {
            if (typeof canBuildStation === 'function' && !canBuildStation(gridX, gridY, trainStations)) { 
                alert("Train stations must be built further apart!"); 
                return; 
            }
            let cost = BUILDING_COSTS['trainStation']; 
            if (currentFunds >= cost) { 
                trainStations.push({ x: gridX, y: gridY }); 
                spendFunds(cost); 
            }
        }
    } else if (window.currentTool === 'train') {
        let clickedTrackIndex = -1;
        trainTracks.forEach((track, idx) => { if (track.some(n => n.x === gridX && n.y === gridY)) clickedTrackIndex = idx; });
        if (clickedTrackIndex !== -1) {
            if (trainStations.length === 0) { alert("You must build at least one Train Station before you can buy a Train!"); return; }
            let cost = BUILDING_COSTS['train'];
            if (currentFunds >= cost) { if (typeof activeTrains !== 'undefined') { activeTrains.push({ id: Math.random(), lineIndex: clickedTrackIndex, pathIndex: 0, progress: 0.5, direction: 1, state: 'boarding', waitTimer: 120 }); } spendFunds(cost); }
        } else { alert("Trains must be placed directly on a Train Track!"); }
    } else if (window.currentTool === 'waterPump') {
        if (terrainType !== null) return; if (isRoad(gridX, gridY)) return; 
        if (typeof isNearWater === 'function' && !isNearWater(gridX, gridY, gridSize)) { alert("Water Pumps must be built directly adjacent to water!"); return; }
        let cost = BUILDING_COSTS['waterPump'] || 1500; if (currentFunds >= cost) { entities.push({ type: 'waterPump', x: gridX, y: gridY }); spendFunds(cost); }
    } else if (window.currentTool === 'trafficLight') {
        if (isRoad(gridX, gridY) && !trafficLights.some(l => l.x === gridX && l.y === gridY)) {
            if (!roundabouts.some(r => r.x === gridX && r.y === gridY)) { let cost = BUILDING_COSTS['trafficLight'] || 100; if (currentFunds >= cost) { trafficLights.push({ x: gridX, y: gridY, state: 'H_G', timer: 0 }); spendFunds(cost); } }
        }
    } else if (window.currentTool === 'roundabout') { 
        if (isRoad(gridX, gridY) && !roundabouts.some(r => r.x === gridX && r.y === gridY)) {
            let cost = BUILDING_COSTS['roundabout'] || 300;
            if (currentFunds >= cost) { const tlIndex = trafficLights.findIndex(l => l.x === gridX && l.y === gridY); if (tlIndex > -1) { trafficLights.splice(tlIndex, 1); if (typeof spawnDustParticles === 'function') spawnDustParticles(gridX, gridY, 10, '#f1c40f', gridSize); } roundabouts.push({ x: gridX, y: gridY }); spendFunds(cost); }
        }
    } else if (window.currentTool === 'busStop') {
        if (isRoad(gridX, gridY) && !busStops.some(b => b.x === gridX && b.y === gridY)) { let cost = BUILDING_COSTS['busStop'] || 200; if (currentFunds >= cost) { busStops.push({ x: gridX, y: gridY }); spendFunds(cost); } }
    } else if (window.currentTool === 'farm') {
        if (terrainType !== null) return; if (isRoad(gridX, gridY)) return; 
        if (typeof isNearWater === 'function' && !isNearWater(gridX, gridY, gridSize)) { alert("Farms require irrigation! Build them next to a water tile."); return; }
        let cost = BUILDING_COSTS['farm']; if (currentFunds >= cost) { entities.push({ type: 'farm', x: gridX, y: gridY }); spendFunds(cost); }
    } else {
        if (terrainType !== null) return; if (isRoad(gridX, gridY)) return; 
        let cost = BUILDING_COSTS[window.currentTool] || 100;
        if (currentFunds >= cost) {
            const newEntity = { type: window.currentTool, x: gridX, y: gridY, color: window.currentTool === 'house' ? '#FF6B6B' : null };
            if (window.currentTool === 'house') { newEntity.level = 1; newEntity.growth = 0; }
            entities.push(newEntity); spendFunds(cost);
        }
    }
}

canvas.addEventListener('mousedown', (e) => handleInputStart(e, e.clientX, e.clientY, e.button === 2));
canvas.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) { handleInputStart(e, e.touches[0].clientX, e.touches[0].clientY, false); } 
    else if (e.touches.length === 2) { isPanning = true; startPan = { x: e.touches[0].clientX - camera.x, y: e.touches[0].clientY - camera.y }; }
}, {passive: false});

canvas.addEventListener('mousemove', (e) => {
    if (isPanning) { camera.x = e.clientX - startPan.x; camera.y = e.clientY - startPan.y; clampCamera(); return; }
    
    const { gridX, gridY } = getGridCoords(e.clientX, e.clientY);
    currentHover.x = gridX; currentHover.y = gridY;

    if (isDraggingRebuild && window.currentTool === 'rebuild') { rebuildCurrent = { x: gridX, y: gridY }; return; }
    if (isDeleting && window.currentTool === 'delete') { performDeletion(e.clientX, e.clientY); return; }

    const currentFunds = typeof cityFunds !== 'undefined' ? cityFunds : (window.cityFunds || 0);
    
    if (isDrawingRoad && ['road', 'bridge', 'tunnel'].includes(window.currentTool)) {
        const lastNode = currentRoadPath[currentRoadPath.length - 1]; const dx = Math.abs(gridX - lastNode.x); const dy = Math.abs(gridY - lastNode.y);
        if ((dx === gridSize && dy === 0) || (dx === 0 && dy === gridSize)) {
            if (currentRoadPath.some(n => n.x === gridX && n.y === gridY)) return;
            const terrainType = typeof getTerrainAt === 'function' ? getTerrainAt(gridX, gridY) : null; if (terrainType === 'ocean') return;
            const alreadyExists = isRoad(gridX, gridY);
            let dynamicType = 'road'; if (terrainType === 'water') dynamicType = 'bridge'; if (terrainType === 'mountain') dynamicType = 'tunnel';
            let cost = alreadyExists ? 0 : (BUILDING_COSTS[dynamicType] || 10);
            if (currentFunds >= cost) { currentRoadPath.push({ x: gridX, y: gridY, type: dynamicType }); if (cost > 0) spendFunds(cost); }
        }
    }
    if (isDrawingTrack && window.currentTool === 'trainTrack') {
        const lastNode = currentTrackPath[currentTrackPath.length - 1]; const dx = Math.abs(gridX - lastNode.x); const dy = Math.abs(gridY - lastNode.y);
        if ((dx === gridSize && dy === 0) || (dx === 0 && dy === gridSize)) {
            if (currentTrackPath.some(n => n.x === gridX && n.y === gridY)) return;
            // --- NEW COASTAL TRACK RULE APPLIED HERE ---
            if (typeof canBuildTrack === 'function' && !canBuildTrack(gridX, gridY, gridSize)) return;
            const alreadyExists = trainTracks.some(path => path.some(n => n.x === gridX && n.y === gridY));
            let cost = alreadyExists ? 0 : BUILDING_COSTS['trainTrack']; 
            if (currentFunds >= cost) { currentTrackPath.push({ x: gridX, y: gridY }); if (cost > 0) spendFunds(cost); }
        }
    }
});

canvas.addEventListener('touchmove', (e) => {
    e.preventDefault(); 
    if (isPanning && e.touches.length > 0) { camera.x = e.touches[0].clientX - startPan.x; camera.y = e.touches[0].clientY - startPan.y; clampCamera(); return; }
    
    const { gridX, gridY } = getGridCoords(e.touches[0].clientX, e.touches[0].clientY);
    if (isDraggingRebuild && window.currentTool === 'rebuild') { rebuildCurrent = { x: gridX, y: gridY }; }
    if (isDeleting && window.currentTool === 'delete') performDeletion(e.touches[0].clientX, e.touches[0].clientY);
}, {passive: false});

canvas.addEventListener('mouseleave', () => { currentHover.x = null; currentHover.y = null; });

// --- PATH AUTO-MERGE LOGIC ---
function finishDrawingPaths() {
    // 1. ROAD MERGING
    if (isDrawingRoad) { 
        isDrawingRoad = false; 
        
        if (currentRoadPath.length > 1) {
            let merged = false;
            const firstNew = currentRoadPath[0];
            const lastNew = currentRoadPath[currentRoadPath.length - 1];

            // Auto-merge with existing roads so dashed lines connect seamlessly!
            for (let i = 0; i < roads.length; i++) {
                const road = roads[i];
                if (road.length === 0) continue;
                
                const firstOld = road[0];
                const lastOld = road[road.length - 1];

                // A. New road continues from the END of an old road
                if (firstNew.x === lastOld.x && firstNew.y === lastOld.y) {
                    road.push(...currentRoadPath.slice(1));
                    merged = true; break;
                }
                // B. New road continues from the START of an old road
                else if (firstNew.x === firstOld.x && firstNew.y === firstOld.y) {
                    const reversedNew = currentRoadPath.slice(1).reverse();
                    roads[i] = reversedNew.concat(road);
                    merged = true; break;
                }
                // C. New road drawn BACKWARDS into the END of an old road
                else if (lastNew.x === lastOld.x && lastNew.y === lastOld.y) {
                    const reversedNew = currentRoadPath.slice(0, -1).reverse();
                    road.push(...reversedNew);
                    merged = true; break;
                }
                // D. New road drawn BACKWARDS into the START of an old road
                else if (lastNew.x === firstOld.x && lastNew.y === firstOld.y) {
                    const newPrefix = currentRoadPath.slice(0, -1);
                    roads[i] = newPrefix.concat(road);
                    merged = true; break;
                }
            }
            
            // If it didn't touch an existing road, it forms a brand new line
            if (!merged) {
                roads.push([...currentRoadPath]);
            }
        }
        currentRoadPath = []; 
    }
    
    // 2. TRAIN TRACK MERGING
    if (isDrawingTrack) { 
        isDrawingTrack = false; 
        
        if (currentTrackPath.length > 1) {
            let merged = false;
            const firstNew = currentTrackPath[0];
            const lastNew = currentTrackPath[currentTrackPath.length - 1];

            // Auto-merge with existing tracks so trains can drive seamlessly
            for (let i = 0; i < trainTracks.length; i++) {
                const track = trainTracks[i];
                if (track.length === 0) continue;
                
                const firstOld = track[0];
                const lastOld = track[track.length - 1];

                if (firstNew.x === lastOld.x && firstNew.y === lastOld.y) {
                    track.push(...currentTrackPath.slice(1));
                    merged = true; break;
                }
                else if (firstNew.x === firstOld.x && firstNew.y === firstOld.y) {
                    const reversedNew = currentTrackPath.slice(1).reverse();
                    trainTracks[i] = reversedNew.concat(track);
                    if (typeof activeTrains !== 'undefined') activeTrains.forEach(t => { if (t.lineIndex === i) t.pathIndex += reversedNew.length; });
                    merged = true; break;
                }
                else if (lastNew.x === lastOld.x && lastNew.y === lastOld.y) {
                    const reversedNew = currentTrackPath.slice(0, -1).reverse();
                    track.push(...reversedNew);
                    merged = true; break;
                }
                else if (lastNew.x === firstOld.x && lastNew.y === firstOld.y) {
                    const newPrefix = currentTrackPath.slice(0, -1);
                    trainTracks[i] = newPrefix.concat(track);
                    if (typeof activeTrains !== 'undefined') activeTrains.forEach(t => { if (t.lineIndex === i) t.pathIndex += newPrefix.length; });
                    merged = true; break;
                }
            }
            
            if (!merged) {
                trainTracks.push([...currentTrackPath]);
            }
        }
        currentTrackPath = []; 
    }
}

canvas.addEventListener('mouseup', (e) => {
    if (e.button === 1 || e.button === 2) { isPanning = false; return; }
    finishDrawingPaths();
    if (isDeleting) isDeleting = false;
    if (isDraggingRebuild && window.currentTool === 'rebuild') { isDraggingRebuild = false; processRebuildArea(rebuildStart, rebuildCurrent, gridSize, entities); }
});

canvas.addEventListener('touchend', () => {
    isPanning = false; 
    finishDrawingPaths();
    isDeleting = false;
    if (isDraggingRebuild && window.currentTool === 'rebuild') { isDraggingRebuild = false; processRebuildArea(rebuildStart, rebuildCurrent, gridSize, entities); }
});

canvas.addEventListener('wheel', (e) => {
    e.preventDefault(); 
    const worldPointerBefore = screenToWorld(e.clientX, e.clientY);
    if (e.deltaY < 0) camera.zoom *= 1.1; else camera.zoom /= 1.1; camera.zoom = Math.max(0.3, Math.min(camera.zoom, 3.0));
    const worldPointerAfter = screenToWorld(e.clientX, e.clientY);
    camera.x += (worldPointerAfter.x - worldPointerBefore.x) * camera.zoom; camera.y += (worldPointerAfter.y - worldPointerBefore.y) * camera.zoom; clampCamera(); 
}, { passive: false });

// ==========================================
// 5. RENDER HELPERS
// ==========================================
function drawMinimap(ctx) {
    // Hide the minimap on mobile screens to keep the UI clean
    if (window.innerWidth < 768) return;

    const minimapSize = 200; 
    const padding = 20; 
    const mapX = padding; 
    const mapY = canvas.height - minimapSize - padding - 80; 
    const scale = minimapSize / WORLD_SIZE;
    
    ctx.fillStyle = 'rgba(15, 25, 40, 0.85)'; ctx.fillRect(mapX, mapY, minimapSize, minimapSize);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)'; ctx.lineWidth = 2; ctx.strokeRect(mapX, mapY, minimapSize, minimapSize);

    ctx.save(); ctx.translate(mapX, mapY);

    ctx.fillStyle = '#7f8c8d'; roads.forEach(path => { path.forEach(node => { ctx.fillRect(node.x * scale, node.y * scale, Math.max(2, gridSize * scale), Math.max(2, gridSize * scale)); }); });
    ctx.fillStyle = '#5c4033'; trainTracks.forEach(path => { path.forEach(node => { ctx.fillRect(node.x * scale, node.y * scale, Math.max(2, gridSize * scale), Math.max(2, gridSize * scale)); }); });

    entities.forEach(ent => {
        let color = '#FF6B6B'; 
        if (ent.type === 'office') color = '#3498db'; if (ent.type === 'supermarket') color = '#f1c40f'; if (ent.type === 'school') color = '#9b59b6';
        if (ent.type === 'factory') color = '#8e44ad'; if (ent.type === 'farm') color = '#d35400';
        if (ent.type === 'policeStation') color = '#2c3e50'; if (ent.type === 'hospital') color = '#e74c3c'; if (ent.type === 'fireStation') color = '#d35400';
        if (ent.type === 'powerPlant') color = '#f39c12'; if (ent.type === 'waterPump') color = '#2980b9'; if (ent.type === 'park') color = '#2ecc71';
        if (ent.fireLevel > 0) color = '#e67e22'; 
        ctx.fillStyle = color; ctx.fillRect(ent.x * scale, ent.y * scale, Math.max(3, gridSize * scale), Math.max(3, gridSize * scale));
    });

    roundabouts.forEach(rb => { ctx.fillStyle = '#16a085'; ctx.fillRect(rb.x * scale, rb.y * scale, Math.max(2, gridSize * scale), Math.max(2, gridSize * scale)); });
    trainStations.forEach(s => { ctx.fillStyle = '#2980b9'; ctx.fillRect(s.x * scale, s.y * scale, Math.max(4, gridSize * scale), Math.max(4, gridSize * scale)); });
    
    // Only draw cars on the minimap if the array exists
    if (typeof cars !== 'undefined') {
        cars.forEach(car => { ctx.fillStyle = car.color; ctx.fillRect(car.realX * scale, car.realY * scale, 2, 2); });
    }

    const viewX = (-camera.x / camera.zoom) * scale; const viewY = (-camera.y / camera.zoom) * scale; const viewW = (canvas.width / camera.zoom) * scale; const viewH = (canvas.height / camera.zoom) * scale;
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1;
    const clampedX = Math.max(0, viewX); const clampedY = Math.max(0, viewY);
    const clampedW = Math.min(minimapSize - clampedX, viewW - (clampedX - viewX)); const clampedH = Math.min(minimapSize - clampedY, viewH - (clampedY - viewY));
    ctx.strokeRect(clampedX, clampedY, clampedW, clampedH);
    ctx.restore();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)'; 
    ctx.font = '10px sans-serif'; ctx.textAlign = 'left';
    ctx.fillText('Right-Click: Deselect Tool  •  D: Toggle Demolish', mapX, mapY + minimapSize + 16);
    ctx.fillText('Drag: Pan Camera  •  Scroll/Pinch: Zoom', mapX, mapY + minimapSize + 28);
}

function drawRuin(ctx, ent, gridSize) {
    const cx = ent.x + gridSize / 2; const cy = ent.y + gridSize / 2;
    const w = gridSize * 0.7; const h = gridSize * 0.6;
    ctx.save(); ctx.translate(cx, cy);

    ctx.fillStyle = '#2c3e50'; 
    ctx.beginPath(); ctx.moveTo(-w/2, h/2); ctx.lineTo(w/2, h/2); ctx.lineTo(w/2, 0); ctx.lineTo(w/4, -h/4); 
    ctx.lineTo(0, 0); ctx.lineTo(-w/4, -h/3); ctx.lineTo(-w/2, 0); ctx.closePath(); ctx.fill();
    if (window.showBuildingOutlines) { ctx.strokeStyle = '#1a252f'; ctx.lineWidth = 1; ctx.stroke(); }

    ctx.strokeStyle = '#111111'; ctx.lineWidth = 2; ctx.beginPath();
    ctx.moveTo(-w/4, 0); ctx.lineTo(-w/3, -h/1.5); 
    ctx.moveTo(0, h/4);  ctx.lineTo(w/4, -h/2);    
    ctx.moveTo(w/3, 0);  ctx.lineTo(w/2.5, -h/1.2); ctx.stroke();

    ctx.fillStyle = '#7f8c8d'; ctx.fillRect(-w/2 + 2, h/2 - 4, 6, 4); ctx.fillRect(w/4, h/2 - 6, 5, 6);
    ctx.beginPath(); ctx.moveTo(0, h/2); ctx.lineTo(-5, h/2 - 5); ctx.lineTo(5, h/2 - 5); ctx.fill();
    ctx.restore();
}

function drawAbandonedDetails(ctx, ent, gridSize) {
    const cx = ent.x + gridSize / 2; const cy = ent.y + gridSize / 2;
    ctx.save(); ctx.translate(cx, cy);

    ctx.strokeStyle = '#5c4033'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-6, -6); ctx.lineTo(6, 6); ctx.moveTo(6, -6);  ctx.lineTo(-6, 6); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-8, 0);  ctx.lineTo(8, 0); ctx.stroke();

    ctx.strokeStyle = '#27ae60'; ctx.lineWidth = 1.5; ctx.beginPath();
    ctx.moveTo(-gridSize/3, gridSize/3); ctx.quadraticCurveTo(-gridSize/4, 0, -gridSize/3, -gridSize/4);
    ctx.moveTo(gridSize/4, gridSize/3); ctx.quadraticCurveTo(gridSize/3, 0, gridSize/5, -gridSize/5); ctx.stroke();
    ctx.restore();
}

// ==========================================
// 6. MAIN GAME LOOP
// ==========================================
function gameLoop() {
    if (isFirstFrame) { if (isNewGame) { if (typeof cityFunds !== 'undefined') cityFunds = 20000; else window.cityFunds = 20000; } isFirstFrame = false; }

    ctx.fillStyle = '#2B5E8A'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.save(); 
    let quakeOffset = { x: 0, y: 0 };
    if (typeof getEarthquakeOffset === 'function') quakeOffset = getEarthquakeOffset();
    ctx.translate(camera.x + quakeOffset.x, camera.y + quakeOffset.y); 
    ctx.scale(camera.zoom, camera.zoom);

    if (typeof drawTerrain === 'function') drawTerrain(ctx, gridSize);

    ctx.strokeStyle = 'rgba(229, 229, 229, 0.5)'; ctx.lineWidth = 1 / camera.zoom; 
    const startX = Math.floor(-camera.x / camera.zoom / gridSize) * gridSize; const endX = startX + (canvas.width / camera.zoom) + gridSize;
    const startY = Math.floor(-camera.y / camera.zoom / gridSize) * gridSize; const endY = startY + (canvas.height / camera.zoom) + gridSize;
    const clampStartX = Math.max(0, startX); const clampEndX = Math.min(WORLD_SIZE, endX);
    const clampStartY = Math.max(0, startY); const clampEndY = Math.min(WORLD_SIZE, endY);

    for (let i = clampStartX; i <= clampEndX; i += gridSize) { ctx.beginPath(); ctx.moveTo(i, clampStartY); ctx.lineTo(i, clampEndY); ctx.stroke(); }
    for (let i = clampStartY; i <= clampEndY; i += gridSize) { ctx.beginPath(); ctx.moveTo(clampStartX, i); ctx.lineTo(clampEndX, i); ctx.stroke(); }

    if (typeof drawAllRoadsAndBridges === 'function') drawAllRoadsAndBridges();
    
    if (typeof drawTrainSystem === 'function') {
        const tracksToDraw = [...trainTracks]; if (isDrawingTrack && currentTrackPath.length > 0) { tracksToDraw.push(currentTrackPath); }
        drawTrainSystem(ctx, trainStations, tracksToDraw, gridSize, camera.zoom);
    }
    
    roundabouts.forEach(rb => {
        ctx.fillStyle = '#404040'; ctx.beginPath(); ctx.arc(rb.x + gridSize/2, rb.y + gridSize/2, gridSize/2 - 2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#2ecc71'; ctx.beginPath(); ctx.arc(rb.x + gridSize/2, rb.y + gridSize/2, gridSize/6, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#ffffff'; ctx.setLineDash([4, 4]); ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(rb.x + gridSize/2, rb.y + gridSize/2, gridSize/2 - 6, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    });

    busStops.forEach(stop => { ctx.fillStyle = '#00d2d3'; ctx.fillRect(stop.x + 2, stop.y + 2, 14, 14); ctx.fillStyle = 'white'; ctx.font = 'bold 11px sans-serif'; ctx.fillText('B', stop.x + 4, stop.y + 12); });

    if (typeof updateAndDrawTrafficLights === 'function') updateAndDrawTrafficLights(ctx);

    const nightMode = typeof isNightTime === 'function' && isNightTime();

    entities.forEach(ent => {
        
        // --- DRIVEWAY CONNECTOR LOGIC (Excluded for Parks) ---
        if (ent.type !== 'park') {
            if (ent.driveway && (!isRoad(ent.driveway.x, ent.driveway.y))) { ent.driveway = null; ent.hasRoad = false; }
            if (!ent.driveway) {
                const dirs = [{dx:0, dy:-gridSize}, {dx:gridSize, dy:0}, {dx:0, dy:gridSize}, {dx:-gridSize, dy:0}];
                for(let d of dirs) { if(isRoad(ent.x + d.dx, ent.y + d.dy)) { ent.driveway = {x: ent.x + d.dx, y: ent.y + d.dy}; ent.hasRoad = true; break; } }
            }
            if (!ent.driveway) ent.hasRoad = false;

            if (ent.driveway) { 
                let startX = ent.x + gridSize / 2; let startY = ent.y + gridSize / 2;
                let endX = startX; let endY = startY;
                let direction = ''; 
                const floorOffset = gridSize - 8; 

                if (ent.driveway.y < ent.y) { 
                    endY = ent.y; direction = 'N'; 
                } else if (ent.driveway.y > ent.y) { 
                    endY = ent.y + gridSize; direction = 'S'; 
                } else if (ent.driveway.x < ent.x) { 
                    endX = ent.x; direction = 'W'; 
                    startY = ent.y + floorOffset; endY = ent.driveway.y + floorOffset; 
                } else if (ent.driveway.x > ent.x) { 
                    endX = ent.x + gridSize; direction = 'E'; 
                    startY = ent.y + floorOffset; endY = ent.driveway.y + floorOffset; 
                }

                ctx.save();
                ctx.beginPath(); ctx.moveTo(startX, startY); ctx.lineTo(endX, endY);
                
                if (ent.type === 'house') {
                    ctx.strokeStyle = '#34495e'; ctx.lineWidth = 10; ctx.stroke(); 
                    ctx.strokeStyle = '#7f8c8d'; ctx.lineWidth = 6; ctx.stroke();  
                } else if (ent.type === 'farm') {
                    ctx.strokeStyle = 'rgba(62, 39, 35, 0.9)'; ctx.lineWidth = 6; ctx.setLineDash([4, 4]); ctx.stroke();
                } else if (ent.type === 'factory' || ent.type === 'powerPlant') {
                    ctx.strokeStyle = '#000000'; ctx.lineWidth = 10; ctx.stroke();
                    ctx.strokeStyle = '#e67e22'; ctx.lineWidth = 2; ctx.setLineDash([4, 4]); ctx.stroke();
                } else if (ent.type === 'policeStation' || ent.type === 'fireStation') {
                    ctx.strokeStyle = '#1a252f'; ctx.lineWidth = 12; ctx.stroke();
                    ctx.strokeStyle = '#c0392b'; ctx.lineWidth = 2; ctx.stroke(); 
                } else {
                    ctx.strokeStyle = '#7f8c8d'; ctx.lineWidth = 14; ctx.stroke(); 
                    ctx.strokeStyle = '#bdc3c7'; ctx.lineWidth = 10; ctx.stroke(); 
                }
                ctx.restore();

                if (direction === 'E' || direction === 'W') {
                    ctx.save();
                    const minX = Math.min(startX, endX);
                    const maxX = Math.max(startX, endX);
                    
                    if (ent.type === 'house') {
                        ctx.strokeStyle = '#2c3e50'; 
                        ctx.lineWidth = 2;
                        for (let px = minX + 4; px < maxX; px += 4) {
                            ctx.beginPath(); ctx.moveTo(px, startY - 4); ctx.lineTo(px, startY + 4); ctx.stroke();
                        }
                    } else if (ent.type !== 'farm') {
                        ctx.strokeStyle = '#2c3e50'; 
                        ctx.lineWidth = 2;
                        ctx.beginPath(); ctx.moveTo(startX, startY - 6); ctx.lineTo(endX, startY - 6); ctx.stroke();
                        ctx.beginPath(); ctx.moveTo(startX, startY + 6); ctx.lineTo(endX, startY + 6); ctx.stroke();
                    }
                    ctx.restore();
                }
            }
        }

        const hasBlueprint = typeof BLUEPRINTS !== 'undefined' && BLUEPRINTS[ent.type];

        // --- CONSTRUCTION TENT LOGIC ---
        if (ent.isRebuilding) {
            ent.rebuildProgress += (1 / REBUILD_DURATION);
            
            if (ent.rebuildProgress >= 1) {
                ent.isRebuilding = false; ent.rebuildProgress = 1;
                if (typeof spawnDustParticles === 'function') spawnDustParticles(ent.x, ent.y, 40, '#ecf0f1', gridSize);
                if (typeof logActivity === 'function') logActivity(`${ent.type} construction completed!`, "good");
            } else {
                const tX = ent.x; const tY = ent.y;
                ctx.fillStyle = '#3498db'; ctx.fillRect(tX + 2, tY + gridSize * 0.4, gridSize - 4, gridSize * 0.6 - 2);
                ctx.fillStyle = '#2980b9'; ctx.beginPath(); ctx.moveTo(tX + 2, tY + gridSize * 0.4); ctx.lineTo(tX + gridSize / 2, tY + 4); ctx.lineTo(tX + gridSize - 2, tY + gridSize * 0.4); ctx.closePath(); ctx.fill();

                if (window.showBuildingOutlines) {
                    ctx.strokeStyle = '#154360'; ctx.lineWidth = 1;
                    ctx.strokeRect(tX + 2, tY + gridSize * 0.4, gridSize - 4, gridSize * 0.6 - 2);
                    ctx.beginPath(); ctx.moveTo(tX + 2, tY + gridSize * 0.4); ctx.lineTo(tX + gridSize / 2, tY + 4); ctx.lineTo(tX + gridSize - 2, tY + gridSize * 0.4); ctx.stroke();
                    ctx.beginPath(); ctx.moveTo(tX + gridSize / 2, tY + 4); ctx.lineTo(tX + gridSize / 2, tY + gridSize - 2); ctx.stroke();
                }

                ctx.fillStyle = '#154360'; ctx.beginPath(); ctx.moveTo(tX + gridSize / 2, tY + gridSize - 2); ctx.lineTo(tX + gridSize / 2 - 4, tY + gridSize * 0.6); ctx.lineTo(tX + gridSize / 2 + 4, tY + gridSize * 0.6); ctx.closePath(); ctx.fill();

                if (Math.random() < 0.15 && typeof spawnDustParticles === 'function') spawnDustParticles(ent.x, ent.y + gridSize - 4, 2, '#bdc3c7', gridSize);
                
                ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(ent.x + 5, ent.y - 10, gridSize - 10, 6);
                ctx.fillStyle = '#f1c40f'; ctx.fillRect(ent.x + 6, ent.y - 9, (gridSize - 12) * ent.rebuildProgress, 4);
            }
        } 
        else if (ent.isBurned) { drawRuin(ctx, ent, gridSize); }
        else {
            if (ent.isAbandoned) { ctx.save(); ctx.filter = 'grayscale(80%) brightness(70%) sepia(30%)'; }
            if (hasBlueprint && typeof drawBuilding === 'function') { drawBuilding(ctx, ent, gridSize, nightMode); } 
            else if (typeof drawZone === 'function') { drawZone(ctx, ent, gridSize, nightMode, typeof getOccupancy === 'function' ? getOccupancy(ent) : 0); }
            if (ent.isAbandoned) { ctx.restore(); drawAbandonedDetails(ctx, ent, gridSize); }
        }

        // --- STATE MONITOR: LOG DEATHS & ABANDONMENT ---
        let currentState = 'operational';
        if (ent.isBurned) currentState = 'burned'; else if (ent.isAbandoned) currentState = 'abandoned'; else if (ent.isRebuilding) currentState = 'rebuilding';

        if (ent._previousState === undefined) { ent._previousState = currentState; } 
        else if (ent._previousState !== currentState) {
            if (ent.type === 'house' && ent._previousState === 'operational') {
                let popAffected = Math.floor(10 * (ent.level || 1) * (ent.densityMult || 1.0));
                if (currentState === 'burned' && typeof logActivity === 'function') logActivity(`Tragedy! ${popAffected} residents died in a ruined house.`, "bad");
                else if (currentState === 'abandoned' && typeof logActivity === 'function') logActivity(`Poor conditions! ${popAffected} residents moved out.`, "bad");
            }
            ent._previousState = currentState;
        }

        // --- ALERTS & OVERLAYS ---
        if (ent.isCrimeScene) {
            ctx.save(); ctx.translate(ent.x, ent.y);
            ctx.lineWidth = 4; ctx.strokeStyle = '#f1c40f'; 
            ctx.beginPath(); ctx.moveTo(-5, gridSize * 0.8); ctx.lineTo(gridSize + 5, gridSize * 0.2); ctx.stroke();
            ctx.strokeStyle = '#111111'; ctx.setLineDash([8, 8]); ctx.lineDashOffset = -(Date.now() / 50); 
            ctx.beginPath(); ctx.moveTo(-5, gridSize * 0.8); ctx.lineTo(gridSize + 5, gridSize * 0.2); ctx.stroke();
            ctx.restore();
        }

        if (ent.type === 'house') {
            if (ent.densityMult > 1.0 && !ent.isAbandoned && !ent.isBurned && !ent.isRebuilding) { 
                const cx = ent.x + gridSize / 2; const cy = ent.y + gridSize / 2;
                ctx.save(); ctx.translate(cx, cy);

                const drawParkStyleBush = (bx, by) => {
                    ctx.lineWidth = 1; ctx.strokeStyle = '#111111';
                    ctx.fillStyle = '#1e8449'; ctx.beginPath(); ctx.arc(bx - 2.5, by + 1, 3.5, 0, Math.PI * 2); ctx.fill(); if (window.showBuildingOutlines) ctx.stroke();
                    ctx.fillStyle = '#27ae60'; ctx.beginPath(); ctx.arc(bx + 2.5, by + 1, 3, 0, Math.PI * 2); ctx.fill(); if (window.showBuildingOutlines) ctx.stroke();
                    ctx.fillStyle = '#2ecc71'; ctx.beginPath(); ctx.arc(bx, by - 2, 3.5, 0, Math.PI * 2); ctx.fill(); if (window.showBuildingOutlines) ctx.stroke();
                };

                drawParkStyleBush(-11, 14); drawParkStyleBush(11, 14);
                ctx.restore();
            }
        }

        if (['house', 'office', 'supermarket', 'school', 'policeStation', 'hospital', 'fireStation', 'powerPlant', 'waterPump', 'factory', 'farm'].includes(ent.type) && !ent.isAbandoned && !ent.isBurned && !ent.isRebuilding) {
            const time = Date.now();
            if (time % 1000 < 500) {
                if (ent.hasRoad === false) { ctx.fillStyle = '#34495e'; ctx.beginPath(); ctx.arc(ent.x + gridSize/2, ent.y - 5, 10, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#fff'; ctx.fillRect(ent.x + gridSize/2 - 1, ent.y - 10, 2, 4); ctx.fillRect(ent.x + gridSize/2 - 1, ent.y - 4, 2, 4); }
                else if (ent.hasPower === false) { ctx.fillStyle = '#f1c40f'; ctx.beginPath(); ctx.arc(ent.x + gridSize/2, ent.y - 5, 10, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#000'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('⚡', ent.x + gridSize/2, ent.y - 1); } 
                else if (ent.hasWater === false) { ctx.fillStyle = '#3498db'; ctx.beginPath(); ctx.arc(ent.x + gridSize/2, ent.y - 5, 10, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#fff'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('💧', ent.x + gridSize/2, ent.y - 1); }
            }
        }
        if (ent.hasEmergency && !ent.isRebuilding) { const time = Date.now(); if (time % 500 < 250) { ctx.fillStyle = '#e74c3c'; ctx.beginPath(); ctx.arc(ent.x + gridSize/2, ent.y - 10, 8, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = 'white'; ctx.fillRect(ent.x + gridSize/2 - 1, ent.y - 14, 2, 8); ctx.fillRect(ent.x + gridSize/2 - 4, ent.y - 11, 8, 2); } }
        if (typeof drawFireAnimation === 'function') drawFireAnimation(ctx, ent, gridSize);
    });

    if (typeof manageTrains === 'function') manageTrains(trainTracks, trainStations);
    if (typeof updateAndDrawTrains === 'function') updateAndDrawTrains(ctx, trainTracks, gridSize, nightMode);

    // Delegate train station drawing to train.js
    if (typeof renderTrainStations === 'function') {
        renderTrainStations(ctx, trainStations, gridSize, nightMode, isRoad);
    }

    if (typeof updateAndDrawCars === 'function') updateAndDrawCars(ctx);
    if (typeof updateAndDrawParticles === 'function') updateAndDrawParticles(ctx);
    if (typeof drawNightOverlay === 'function') drawNightOverlay(ctx, WORLD_SIZE, WORLD_SIZE);
    if (typeof updateAndDrawTornadoes === 'function') updateAndDrawTornadoes(ctx, entities, cars, gridSize);

    // Rebuild Drag Box
    if (isDraggingRebuild && window.currentTool === 'rebuild') {
        ctx.save();
        const minX = Math.min(rebuildStart.x, rebuildCurrent.x); const maxX = Math.max(rebuildStart.x, rebuildCurrent.x) + gridSize;
        const minY = Math.min(rebuildStart.y, rebuildCurrent.y); const maxY = Math.max(rebuildStart.y, rebuildCurrent.y) + gridSize;
        ctx.fillStyle = 'rgba(52, 152, 219, 0.4)'; ctx.fillRect(minX, minY, maxX - minX, maxY - minY);
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2 / camera.zoom; ctx.setLineDash([4, 4]); ctx.lineDashOffset = -Date.now() / 30;
        ctx.strokeRect(minX, minY, maxX - minX, maxY - minY);
        ctx.restore();
    }

    // Demolish Hover
    if (window.currentTool === 'delete' && currentHover.x !== null) {
        ctx.save(); ctx.beginPath(); ctx.arc(currentHover.x + gridSize / 2, currentHover.y + gridSize / 2, gridSize / 2, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(231, 76, 60, 0.4)'; ctx.fill();
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2 / camera.zoom; ctx.setLineDash([4, 4]); ctx.lineDashOffset = -Date.now() / 30; ctx.stroke(); ctx.restore();
    }

    if (selectedEntity) {
        ctx.save(); ctx.strokeStyle = '#f1c40f'; ctx.lineWidth = 3 / camera.zoom; ctx.setLineDash([8, 8]); ctx.lineDashOffset = -Date.now() / 30; ctx.strokeRect(selectedEntity.x, selectedEntity.y, gridSize, gridSize); ctx.restore();
        if (taxTimer % 30 === 0) updateInfoPanel(); 
    }

    ctx.restore(); 

    if (typeof updateAndDrawWeather === 'function') updateAndDrawWeather(ctx, canvas.width, canvas.height, entities, gridSize);
    if (typeof updateTime === 'function') updateTime();
    if (taxTimer % 10 === 0) updateHUD();
    if (typeof manageTraffic === 'function') manageTraffic();
    if (typeof manageDisasters === 'function') manageDisasters(entities, gridSize, cars);

    taxTimer++;

    // --- ECONOMY HIDING TRICK ---
    entities.forEach(ent => {
        if (ent.isBurned || ent.isAbandoned || ent.isRebuilding || ent.isCrimeScene) {
            ent._tempType = ent.type; ent.type = 'disabled_structure'; 
        }
    });

    if (taxTimer >= TAX_INTERVAL) {
        if (typeof collectTaxes === 'function') {
            const economyResult = collectTaxes(entities, currentTaxRate, MAINTENANCE_COSTS, busStops, trainStations);
            if (typeof cityFunds !== 'undefined') cityFunds += economyResult.netIncome;
            else window.cityFunds = (window.cityFunds || 20000) + economyResult.netIncome;
            if (typeof processTaxes === 'function') processTaxes(economyResult.population); 
        }
        taxTimer = 0;
    }

    entities.forEach(ent => {
        if (ent._tempType) { ent.type = ent._tempType; delete ent._tempType; }
    });

    drawMinimap(ctx);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'; ctx.font = '12px sans-serif'; ctx.fillText('© Meglen 2026', canvas.width - 100, canvas.height - 5);
    requestAnimationFrame(gameLoop);
}

// ==========================================
// IMPORT & EXPORT FILE LOGIC (.txt)
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
    const exportBtn = document.getElementById('export-game-btn');
    const importBtn = document.getElementById('import-game-btn');

    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            if (typeof saveGame === 'function') saveGame(); 
            const savedData = localStorage.getItem('miniCitySave');
            if (savedData) {
                const encodedData = btoa(encodeURIComponent(savedData));
                const blob = new Blob([encodedData], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const dateStr = new Date().toISOString().split('T')[0];
                const fileName = `MiniCity_Save_${dateStr}.txt`;
                
                const a = document.createElement('a'); a.href = url; a.download = fileName; document.body.appendChild(a); a.click();
                document.body.removeChild(a); URL.revokeObjectURL(url);
                if (typeof logActivity === 'function') logActivity(`City exported as ${fileName}`, "info");
            } else { alert("No save data found to export."); }
        });
    }

    if (importBtn) {
        importBtn.addEventListener('click', () => {
            const fileInput = document.createElement('input'); fileInput.type = 'file'; fileInput.accept = '.txt';
            fileInput.onchange = (e) => {
                const file = e.target.files[0]; if (!file) return;
                const reader = new FileReader();
                reader.onload = (event) => {
                    const inputData = event.target.result.trim(); if (!inputData) return;
                    try {
                        const decodedData = decodeURIComponent(atob(inputData));
                        let saveData = JSON.parse(decodedData); 

                        let minInterval = Infinity;
                        if (saveData.terrain && saveData.terrain.length > 0) {
                            saveData.terrain.forEach(([key]) => {
                                const coords = key.split(',');
                                if (coords.length === 2) {
                                    const x = Number(coords[0]); const y = Number(coords[1]);
                                    if (x > 0 && x < minInterval) minInterval = x; if (y > 0 && y < minInterval) minInterval = y;
                                }
                            });
                        }
                        if (minInterval > 0 && minInterval !== Infinity && minInterval !== gridSize) {
                            const scale = gridSize / minInterval; const offset = Math.floor(((WORLD_SIZE - (WORLD_SIZE * scale)) / 2) / gridSize) * gridSize;
                            if (saveData.terrain) { saveData.terrain = saveData.terrain.map(([key, value]) => { const parts = key.split(','); if (parts.length === 2) return [`${(Number(parts[0]) * scale) + offset},${(Number(parts[1]) * scale) + offset}`, value]; return [key, value]; }); }
                            const scaleItems = (arr) => { if (!arr) return; arr.forEach(item => { if (item.x !== undefined) item.x = (item.x * scale) + offset; if (item.y !== undefined) item.y = (item.y * scale) + offset; if (item.driveway) { item.driveway.x = (item.driveway.x * scale) + offset; item.driveway.y = (item.driveway.y * scale) + offset; } }); };
                            const scalePaths = (arr) => { if (arr) arr.forEach(path => scaleItems(path)); };
                            scaleItems(saveData.entities); scaleItems(saveData.trafficLights); scaleItems(saveData.roundabouts); scaleItems(saveData.busStops); scaleItems(saveData.trainStations); scalePaths(saveData.roads); scalePaths(saveData.trainTracks);
                        }
                        localStorage.setItem('miniCitySave', JSON.stringify(saveData)); location.reload();
                    } catch (error) { console.error(error); alert("Invalid or corrupted save file."); }
                };
                reader.readAsText(file);
            };
            fileInput.click();
        });
    }
});

// Auto-save the city to LocalStorage every 5 seconds
setInterval(saveGame, 5000);
requestAnimationFrame(gameLoop);