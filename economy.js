const COSTS = {
    road: 10,
    bridge: 50,
    tunnel: 80,
    trafficLight: 100,
    house: 200,
    busStop: 300,
    supermarket: 400, // Cheaper commercial
    office: 600,      // Expensive commercial
    school: 800,       // Heavy investment for neighborhoods
    policeStation: 1000,
    hospital: 1500,
    roundabout: 300,
    fireStation: 1200
};

// 1. Set the correct New Game bonus!
let cityFunds = 20000;

// 2. Immediately check if a save file exists so we don't overwrite it on refresh!
const savedCityStr = localStorage.getItem('miniCitySave');
if (savedCityStr) {
    try {
        const parsedSave = JSON.parse(savedCityStr);
        if (parsedSave.funds !== undefined) {
            cityFunds = parsedSave.funds;
        }
    } catch (e) {
        console.error("Could not read saved funds in resources.js");
    }
}

function getCost(type) { return COSTS[type] || 0; }
function canAfford(amount) { return cityFunds >= amount; }

function spendFunds(amount) {
    if (canAfford(amount)) { cityFunds -= amount; return true; }
    return false;
}

function earnFunds(amount) { cityFunds += amount; }
function refund(type) { earnFunds(Math.floor(getCost(type) * 0.5)); }

function processTaxes(population) { earnFunds(population * 5); }

function drawEconomyUI(ctx) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.beginPath(); ctx.roundRect(220, 20, 160, 50, 10); ctx.fill();
    ctx.strokeStyle = '#e0e0e0'; ctx.lineWidth = 2; ctx.stroke();

    ctx.fillStyle = cityFunds < 100 ? '#FF4757' : '#2ecc71'; 
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText(`💰 $${cityFunds}`, 235, 52);
}

// ==========================================
// ECONOMY & SUPPLY CHAIN SYSTEM
// ==========================================

function processLandValueAndGrowth(entities, gridSize, currentTaxRate, trainStations) {
    const parks = entities.filter(e => e.type === 'park'); 
    const powerPlants = entities.filter(e => e.type === 'powerPlant');
    const factories = entities.filter(e => e.type === 'factory'); // NEW: Pollution sources

    entities.forEach(ent => {
        // Initialize Supermarket stock
        if (ent.type === 'supermarket' && ent.stockLevel === undefined) ent.stockLevel = 100;

        if (ent.type === 'house' && !ent.isAbandoned && !ent.isBurned) {
            let lv = 30; let density = 1.0; 
            if (typeof isNearWater === 'function' && isNearWater(ent.x, ent.y, gridSize)) lv += 25;

            parks.forEach(park => {
                const dist = Math.abs(park.x - ent.x) + Math.abs(park.y - ent.y);
                if (dist <= gridSize * 8) lv += ((gridSize * 8 - dist) / gridSize) * 6; 
                if (dist <= gridSize * 3) density += 0.5; 
            });

            powerPlants.forEach(pp => { const dist = Math.abs(pp.x - ent.x) + Math.abs(pp.y - ent.y); if (dist <= gridSize * 12) lv -= ((gridSize * 12 - dist) / gridSize) * 8; });
            trainStations.forEach(station => { const dist = Math.abs(station.x - ent.x) + Math.abs(station.y - ent.y); if (dist <= gridSize * 8) lv += ((gridSize * 8 - dist) / gridSize) * 15; });

            // --- NEW: Factory Pollution lowers land value drastically in a wide radius ---
            factories.forEach(factory => { 
                const dist = Math.abs(factory.x - ent.x) + Math.abs(factory.y - ent.y); 
                if (dist <= gridSize * 15) lv -= ((gridSize * 15 - dist) / gridSize) * 12; 
            });

            ent.landValue = Math.max(1, Math.min(100, lv)); ent.densityMult = density;

            if (ent.hasPower && ent.hasWater && ent.hasRoad) {
                if (!ent.growth) ent.growth = 0; const taxPenalty = (1.0 - currentTaxRate) * 0.5;
                ent.growth += Math.max(0.05, (ent.landValue / 100) + taxPenalty) * (1 + (density - 1) * 0.2); 
                if (!ent.level) ent.level = 1;

                if (ent.level === 1 && ent.growth > 300 && ent.landValue > 45) { 
                    ent.level = 2; ent.growth = 0; 
                    if (typeof spawnDustParticles === 'function') spawnDustParticles(ent.x, ent.y, 20, '#f1c40f', gridSize); 
                    if (typeof logActivity === 'function') logActivity("A residence upgraded to Level 2!", "upgrade"); // <-- NEW
                } 
                else if (ent.level === 2 && ent.growth > 600 && ent.landValue > 80) { 
                    ent.level = 3; ent.growth = 0; 
                    if (typeof spawnDustParticles === 'function') spawnDustParticles(ent.x, ent.y, 30, '#f1c40f', gridSize); 
                    if (typeof logActivity === 'function') logActivity("A residence reached max Level 3!", "upgrade"); // <-- NEW
                }
            }
            else { ent.growth = 0; }
        }
    });
}

// Replaces the manual tax calculation at the bottom of your gameLoop
function collectTaxes(entities, currentTaxRate, MAINTENANCE_COSTS, busStops, trainStations) {
    const livingEntities = entities.filter(ent => !ent.isAbandoned && !ent.isBurned && ent.hasPower !== false && ent.hasWater !== false && ent.hasRoad !== false);
    let population = 0; let grossIncome = 0;
    
    livingEntities.forEach(ent => { 
        if (ent.type === 'house') { 
            const lvl = ent.level || 1; const mult = ent.densityMult || 1.0; 
            population += Math.floor((lvl * 2) * mult); 
            grossIncome += Math.floor((lvl * 12) * mult) * currentTaxRate; 
        }
        // --- NEW: Supermarkets generate tax based on Stock Level! ---
        else if (ent.type === 'supermarket') {
            const stock = ent.stockLevel || 0;
            grossIncome += Math.floor(50 * (stock / 100)) * currentTaxRate; // Full stock = huge bonus, empty = $0
        }
        // --- NEW: Industry Base Tax ---
        else if (ent.type === 'factory') { grossIncome += 80 * currentTaxRate; }
        else if (ent.type === 'farm') { grossIncome += 30 * currentTaxRate; }
    });

    let totalMaintenance = 0;
    entities.forEach(e => { if (MAINTENANCE_COSTS[e.type] && !e.isBurned && !e.isAbandoned) totalMaintenance += MAINTENANCE_COSTS[e.type]; });
    busStops.forEach(b => totalMaintenance += MAINTENANCE_COSTS['busStop']); 
    trainStations.forEach(s => totalMaintenance += MAINTENANCE_COSTS['trainStation']); 

    return { netIncome: grossIncome - totalMaintenance, population: population };
}

// Runs periodically to drain supermarket stock
function updateEconomyTick(entities, gridSize) {
    entities.forEach(ent => {
        if (ent.type === 'supermarket' && !ent.isAbandoned && !ent.isBurned) {
            if (ent.stockLevel === undefined) ent.stockLevel = 100;
            
            ent.stockLevel -= 0.2; // Slowly drain stock as citizens buy goods
            if (ent.stockLevel <= 0) {
                ent.stockLevel = 0;
                // If the store is empty for too long, it goes out of business
                if (Math.random() < 0.002) {
                    ent.isAbandoned = true;
                    ent.color = '#bdc3c7'; 
                    if (typeof spawnDustParticles === 'function') spawnDustParticles(ent.x, ent.y, 20, '#7f8c8d', gridSize);
                }
            }
        }
    });
}

// --- NEW: Minimalistic Building Renderers ---
function drawEconomyBuildings(ctx, ent, gridSize, nightMode) {
    ctx.save();
    ctx.translate(ent.x, ent.y);

    if (ent.type === 'factory') {
        // Concrete Base
        ctx.fillStyle = '#34495e';
        ctx.fillRect(4, 4, gridSize - 8, gridSize - 8);
        
        // Corrugated Roof Ridges
        ctx.fillStyle = '#2c3e50';
        ctx.fillRect(6, 4, (gridSize/2) - 8, gridSize - 8);
        ctx.fillRect(gridSize/2 + 2, 4, (gridSize/2) - 8, gridSize - 8);
        
        // Dual Smokestacks
        ctx.fillStyle = '#7f8c8d';
        ctx.beginPath(); ctx.arc(gridSize - 10, 12, 4, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(gridSize - 10, 24, 4, 0, Math.PI*2); ctx.fill();
        
        // Animated Smoke Particles (Only if it has power)
        if (ent.hasPower !== false && !ent.isAbandoned && !ent.isBurned) {
            const time = Date.now();
            ctx.fillStyle = 'rgba(189, 195, 199, 0.4)';
            ctx.beginPath(); ctx.arc(gridSize - 10 + Math.sin(time/200)*3, 6 - (time/50)%10, 5, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.arc(gridSize - 10 + Math.cos(time/250)*3, 18 - (time/60)%10, 5, 0, Math.PI*2); ctx.fill();
        }
        
        // Glowing night shift windows
        if (nightMode && ent.hasPower !== false) {
            ctx.fillStyle = '#f1c40f';
            ctx.fillRect(8, gridSize - 12, 6, 4);
            ctx.fillRect(18, gridSize - 12, 6, 4);
        }
    }
    else if (ent.type === 'farm') {
        // Rich Dirt Base
        ctx.fillStyle = '#d35400';
        ctx.fillRect(2, 2, gridSize - 4, gridSize - 4);
        
        // Geometric Crop Rows
        ctx.fillStyle = '#27ae60';
        for (let i = 0; i < 4; i++) {
            ctx.fillRect(4, 6 + i*8, gridSize - 18, 4);
        }
        
        // Storage Silo
        ctx.fillStyle = '#bdc3c7';
        ctx.beginPath(); ctx.arc(gridSize - 8, gridSize - 8, 6, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#95a5a6';
        ctx.beginPath(); ctx.arc(gridSize - 8, gridSize - 8, 3, 0, Math.PI*2); ctx.fill();
    }

    ctx.restore();
}