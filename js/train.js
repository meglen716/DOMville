const MIN_STATION_DIST = 400; // 10 grid blocks
const TRAIN_SPEED = 0.08; 
const activeTrains = [];
const activePassengers = []; 
const floatingTexts = []; 

function canBuildStation(gridX, gridY, existingStations) {
    for (let s of existingStations) {
        const dist = Math.sqrt(Math.pow(s.x - gridX, 2) + Math.pow(s.y - gridY, 2));
        if (dist < MIN_STATION_DIST) return false;
    }
    return true;
}

function manageTrains(tracks, stations) {
    for (let i = activeTrains.length - 1; i >= 0; i--) {
        if (!tracks[activeTrains[i].lineIndex]) {
            activeTrains.splice(i, 1);
        }
    }
}

// UPGRADE: Now accepts an exact 'count' so trains can track capacity!
function spawnPassengers(startX, startY, endX, endY, count) {
    for (let i = 0; i < count; i++) {
        activePassengers.push({
            x: startX + (Math.random() - 0.5) * 15,
            y: startY + (Math.random() - 0.5) * 15,
            tx: endX + (Math.random() - 0.5) * 15,
            ty: endY + (Math.random() - 0.5) * 15,
            speed: 0.3 + Math.random() * 0.4,
            color: ['#ecf0f1', '#f1c40f', '#3498db', '#e74c3c', '#2ecc71'][Math.floor(Math.random() * 5)]
        });
    }
}

function getTrainCarPos(track, baseIndex, baseProgress, direction, offsetGrids, gridSize) {
    let t = baseIndex + baseProgress + (offsetGrids * direction);
    if (t <= 0) t = 0.01;
    if (t >= track.length - 1) t = track.length - 1.01;

    let i = Math.floor(t);
    let p = t - i;

    let p1 = track[i];
    let p2 = track[i + 1];

    if (!p1 || !p2) return null;

    return {
        x: p1.x + (p2.x - p1.x) * p + gridSize / 2,
        y: p1.y + (p2.y - p1.y) * p + gridSize / 2,
        angle: Math.atan2(p2.y - p1.y, p2.x - p1.x)
    };
}

function drawTrainSystem(ctx, stations, tracks, gridSize, cameraZoom) {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    tracks.forEach(path => {
        if (!path || path.length === 0) return;

        ctx.strokeStyle = '#1a252f'; 
        ctx.lineWidth = 12;
        ctx.beginPath();
        ctx.moveTo(path[0].x + gridSize/2, path[0].y + gridSize/2);
        for (let i = 1; i < path.length; i++) ctx.lineTo(path[i].x + gridSize/2, path[i].y + gridSize/2);
        if (path.length === 1) ctx.lineTo(path[0].x + gridSize/2 + 0.1, path[0].y + gridSize/2);
        ctx.stroke();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(path[0].x + gridSize/2, path[0].y + gridSize/2);
        for (let i = 1; i < path.length; i++) ctx.lineTo(path[i].x + gridSize/2, path[i].y + gridSize/2);
        if (path.length === 1) ctx.lineTo(path[0].x + gridSize/2 + 0.1, path[0].y + gridSize/2);
        ctx.stroke();

        ctx.lineCap = 'butt'; 
        ctx.strokeStyle = '#1a252f';
        ctx.lineWidth = 6;
        ctx.setLineDash([2, 10]); 
        ctx.beginPath();
        ctx.moveTo(path[0].x + gridSize/2, path[0].y + gridSize/2);
        for (let i = 1; i < path.length; i++) ctx.lineTo(path[i].x + gridSize/2, path[i].y + gridSize/2);
        ctx.stroke();
        
        ctx.setLineDash([]); 
        ctx.lineCap = 'round'; 
    });
}

function updateAndDrawTrains(ctx, tracks, gridSize, nightMode) {
    let isOperating = true;
    if (typeof gameClock !== 'undefined') {
        isOperating = (gameClock >= 6 && gameClock < 22);
    }

    // 1. UPDATE TRAIN LOGIC & POSITIONS
    activeTrains.forEach(train => {
        const track = tracks[train.lineIndex];
        if (!track || track.length < 2) return;

        // Initialize passenger array if it's a new train
        if (train.passengers === undefined) train.passengers = 0;

        const headPos = getTrainCarPos(track, train.pathIndex, train.progress, train.direction, 0, gridSize);
        if (headPos) {
            train.x = headPos.x; 
            train.y = headPos.y;
        }

        if (train.state === 'boarding') {
            if (!isOperating) { train.waitTimer = 120; } else { train.waitTimer--; }

            if (headPos) {
                let nearbyStation = typeof trainStations !== 'undefined' ? trainStations.find(s => Math.abs(s.x + gridSize/2 - headPos.x) < gridSize*1.5 && Math.abs(s.y + gridSize/2 - headPos.y) < gridSize*1.5) : null;
                
                if (nearbyStation) {
                    // Disembarking
                    if (train.waitTimer === 119 && isOperating) {
                        let gettingOff = Math.min(train.passengers, Math.floor(Math.random() * 8) + 4);
                        train.passengers -= gettingOff;
                        spawnPassengers(headPos.x, headPos.y, nearbyStation.x + gridSize/2, nearbyStation.y + gridSize/2, gettingOff);
                    }
                    // Boarding
                    if (train.waitTimer === 60 && isOperating) {
                        let gettingOn = Math.floor(Math.random() * 8) + 4;
                        train.passengers += gettingOn;
                        spawnPassengers(nearbyStation.x + gridSize/2, nearbyStation.y + gridSize/2, headPos.x, headPos.y, gettingOn);
                    }
                }
            }

            if (train.waitTimer <= 0) {
                train.state = 'driving';
                if (typeof playSFX === 'function') playSFX('train_horn', 0.5);
            }
        } else {
            train.progress += TRAIN_SPEED * train.direction;
            
            if (train.direction === 1) {
                if (train.pathIndex >= track.length - 2 && train.progress >= 0.5) {
                    train.progress = 0.5; train.pathIndex = track.length - 2;
                    train.direction = -1; train.state = 'boarding'; train.waitTimer = 120;
                    if (headPos && typeof spawnDustParticles === 'function') {
                        spawnDustParticles(headPos.x, headPos.y, 15, '#e67e22', gridSize/2);
                        spawnDustParticles(headPos.x, headPos.y, 10, '#f1c40f', gridSize/2);
                    }
                } else if (train.progress >= 1.0) {
                    train.progress = 0; train.pathIndex++;
                }
            } else {
                if (train.pathIndex === 0 && train.progress <= 0.5) {
                    train.progress = 0.5; train.pathIndex = 0;
                    train.direction = 1; train.state = 'boarding'; train.waitTimer = 120;
                    if (headPos && typeof spawnDustParticles === 'function') {
                        spawnDustParticles(headPos.x, headPos.y, 15, '#e67e22', gridSize/2);
                        spawnDustParticles(headPos.x, headPos.y, 10, '#f1c40f', gridSize/2);
                    }
                } else if (train.progress <= 0) {
                    train.progress = 1.0; train.pathIndex--;
                }
            }
        }
    });

    // 2. DISASTER CHECK: TRAIN COLLISIONS
    for (let i = activeTrains.length - 1; i >= 0; i--) {
        for (let j = i - 1; j >= 0; j--) {
            let t1 = activeTrains[i];
            let t2 = activeTrains[j];
            
            // If on the same track and their engine heads are too close...
            if (t1.lineIndex === t2.lineIndex && t1.x && t2.x && !t1.destroyed && !t2.destroyed) {
                let dist = Math.hypot(t1.x - t2.x, t1.y - t2.y);
                if (dist < gridSize * 0.8) { 
                    t1.destroyed = true;
                    t2.destroyed = true;
                    
                    let casualties = t1.passengers + t2.passengers;
                    if (typeof logActivity === 'function') {
                        logActivity(`FATAL TRAIN CRASH! ${casualties} passengers lost.`, "bad");
                    }
                    if (typeof playSFX === 'function') playSFX('explosion', 0.8);
                    
                    if (typeof spawnDustParticles === 'function') {
                        spawnDustParticles(t1.x, t1.y, 40, '#e74c3c', gridSize); // Fire
                        spawnDustParticles(t1.x, t1.y, 30, '#f1c40f', gridSize); // Explosion
                        spawnDustParticles(t1.x, t1.y, 30, '#111111', gridSize); // Smoke
                    }
                }
            }
        }
    }

    // 3. REMOVE DESTROYED TRAINS
    for (let i = activeTrains.length - 1; i >= 0; i--) {
        if (activeTrains[i].destroyed) activeTrains.splice(i, 1);
    }

    // 4. DRAW REMAINING TRAINS
    activeTrains.forEach(train => {
        const track = tracks[train.lineIndex];
        if (!track || track.length < 2) return;

        const carSpacing = 0.8; 
        const carWidth = gridSize * 0.7;
        const carHeight = gridSize * 0.35;

        for(let i = -0.5; i <= 0.5; i += 1) {
            let pos = getTrainCarPos(track, train.pathIndex, train.progress, train.direction, i * carSpacing, gridSize);
            if (!pos) continue;
            ctx.save(); ctx.translate(pos.x, pos.y); ctx.rotate(pos.angle);
            ctx.fillStyle = '#2c3e50'; ctx.fillRect(-4, -4, 8, 8);
            ctx.restore();
        }

        for(let i = -1; i <= 1; i++) {
            let pos = getTrainCarPos(track, train.pathIndex, train.progress, train.direction, i * carSpacing * -1, gridSize);
            if (!pos) continue;

            ctx.save(); ctx.translate(pos.x, pos.y); ctx.rotate(pos.angle);

            ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(-carWidth/2 + 2, -carHeight/2 + 2, carWidth, carHeight);
            ctx.fillStyle = '#9b59b6'; ctx.fillRect(-carWidth/2, -carHeight/2, carWidth, carHeight);
            if (window.showBuildingOutlines) { ctx.lineWidth = 1; ctx.strokeStyle = '#000'; ctx.strokeRect(-carWidth/2, -carHeight/2, carWidth, carHeight); }
            
            ctx.fillStyle = (nightMode && isOperating) ? '#f1c40f' : '#2c3e50';
            ctx.fillRect(-carWidth/2 + 6, -carHeight/2 + 4, carWidth - 12, carHeight - 8);

            if (nightMode && isOperating && ((train.direction === 1 && i === -1) || (train.direction === -1 && i === 1))) {
                ctx.fillStyle = 'rgba(255, 255, 150, 0.9)';
                const headX = (train.direction === 1) ? carWidth/2 : -carWidth/2 - 3;
                ctx.fillRect(headX, -carHeight/2 + 4, 3, 4);
                ctx.fillRect(headX, carHeight/2 - 8, 3, 4);
            }
            ctx.restore();
        }
    });

    // --- AMBIENT STATION COMMUTERS ---
    // Randomly spawn people walking between the station doors and the street
    if (typeof trainStations !== 'undefined') {
        trainStations.forEach(station => {
            if (station.driveway && isOperating && Math.random() < 0.02) { 
                if (Math.random() > 0.5) {
                    // Walk from station to the street
                    spawnPassengers(station.x + gridSize/2, station.y + gridSize/2, station.driveway.x + gridSize/2, station.driveway.y + gridSize/2, 1);
                } else {
                    // Walk from the street to the station
                    spawnPassengers(station.driveway.x + gridSize/2, station.driveway.y + gridSize/2, station.x + gridSize/2, station.y + gridSize/2, 1);
                }
            }
        });
    }

    for (let i = activePassengers.length - 1; i >= 0; i--) {
        let p = activePassengers[i];
        let dx = p.tx - p.x;
        let dy = p.ty - p.y;
        let dist = Math.sqrt(dx*dx + dy*dy);
        
        if (dist < p.speed) {
            if (typeof addFunds === 'function') addFunds(2); 
            else if (typeof spendFunds === 'function') spendFunds(-2); 
            floatingTexts.push({ x: p.x, y: p.y - 5, text: '+$2', timer: 60 });
            activePassengers.splice(i, 1); 
        } else {
            p.x += (dx / dist) * p.speed;
            p.y += (dy / dist) * p.speed;
            ctx.fillStyle = p.color;
            ctx.fillRect(p.x, p.y, 2, 2);
        }
    }
}

window.setTransitTool = function(tool) {
    window.currentTool = tool;
    document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
    if (typeof logActivity === 'function') {
        const name = tool === 'train' ? 'Train' : 'Train Track';
        logActivity(`Selected ${name} Tool. Click the map to build!`, "info");
    }
};

// UPGRADE: Now accepts the entire activeTrains array to calculate total passengers
window.getTrainStationInfoHTML = function(activeTrainsArr) {
    const activeTrainsCount = activeTrainsArr ? activeTrainsArr.length : 0;
    const totalPassengers = activeTrainsArr ? activeTrainsArr.reduce((sum, t) => sum + (t.passengers || 0), 0) : 0;
    
    let html = `<div class="info-stat">🚆 Active Trains: ${activeTrainsCount}</div>`;
    html += `<div class="info-stat">👥 Riders in Transit: <span style="color:#2ecc71; font-weight:bold;">${totalPassengers}</span></div>`;
    html += `<div class="info-stat">🎫 Ticket Rev: +$2 / passenger</div>`;
    
    const trackCost = typeof BUILDING_COSTS !== 'undefined' ? BUILDING_COSTS['trainTrack'] : 25;
    const trainCost = typeof BUILDING_COSTS !== 'undefined' ? BUILDING_COSTS['train'] : 500;
    
    html += `<div style="margin-top: 15px; display: flex; gap: 8px; justify-content: center;">`;
    html += `  <button onclick="setTransitTool('trainTrack')" title="Cost: $${trackCost}" style="padding: 8px; background: #2c3e50; color: white; border: 2px solid #5c4033; border-radius: 4px; cursor: pointer; flex: 1; font-weight: bold;">Build Tracks</button>`;
    html += `  <button onclick="setTransitTool('train')" title="Cost: $${trainCost}" style="padding: 8px; background: #2c3e50; color: white; border: 2px solid #9b59b6; border-radius: 4px; cursor: pointer; flex: 1; font-weight: bold;">Buy Train</button>`;
    html += `</div>`;
    
    return html;
};

window.renderTrainStations = function(ctx, trainStations, gridSize, nightMode, isRoadFunc) {
    trainStations.forEach(station => {
        station.type = 'trainStation'; 
        
        if (station.driveway && (!isRoadFunc(station.driveway.x, station.driveway.y))) { station.driveway = null; station.hasRoad = false; }
        if (!station.driveway) {
            const dirs = [{dx:0, dy:-gridSize}, {dx:gridSize, dy:0}, {dx:0, dy:gridSize}, {dx:-gridSize, dy:0}];
            for(let d of dirs) { if(isRoadFunc(station.x + d.dx, station.y + d.dy)) { station.driveway = {x: station.x + d.dx, y: station.y + d.dy}; station.hasRoad = true; break; } }
        }
        if (!station.driveway) station.hasRoad = false;

        if (station.driveway) { 
            let startX = station.x + gridSize / 2; let startY = station.y + gridSize / 2;
            let endX = startX; let endY = startY;
            let direction = ''; 
            const floorOffset = gridSize - 8; 

            if (station.driveway.y < station.y) { endY = station.y; direction = 'N'; } 
            else if (station.driveway.y > station.y) { endY = station.y + gridSize; direction = 'S'; } 
            else if (station.driveway.x < station.x) { endX = station.x; direction = 'W'; startY = station.y + floorOffset; endY = station.driveway.y + floorOffset; } 
            else if (station.driveway.x > station.x) { endX = station.x + gridSize; direction = 'E'; startY = station.y + floorOffset; endY = station.driveway.y + floorOffset; }

            ctx.save();
            ctx.beginPath(); ctx.moveTo(startX, startY); ctx.lineTo(endX, endY);
            ctx.strokeStyle = '#7f8c8d'; ctx.lineWidth = 14; ctx.stroke(); 
            ctx.strokeStyle = '#bdc3c7'; ctx.lineWidth = 10; ctx.stroke(); 
            ctx.restore();

            if (direction === 'E' || direction === 'W') {
                ctx.save();
                ctx.strokeStyle = '#2c3e50'; ctx.lineWidth = 2;
                ctx.beginPath(); ctx.moveTo(startX, startY - 6); ctx.lineTo(endX, startY - 6); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(startX, startY + 6); ctx.lineTo(endX, startY + 6); ctx.stroke();
                ctx.restore();
            }
        }

        if (typeof drawBuilding === 'function') drawBuilding(ctx, station, gridSize, nightMode);
    });
};

window.canBuildTrack = function(gridX, gridY, gridSize) {
    const terrainType = typeof getTerrainAt === 'function' ? getTerrainAt(gridX, gridY) : null;
    if (terrainType !== 'ocean') return true;

    const dirs = [{dx: 0, dy: -gridSize}, {dx: gridSize, dy: 0}, {dx: 0, dy: gridSize}, {dx: -gridSize, dy: 0}];
    for (let d of dirs) {
        let neighborTerrain = typeof getTerrainAt === 'function' ? getTerrainAt(gridX + d.dx, gridY + d.dy) : 'ocean';
        if (neighborTerrain !== 'ocean') return true;
    }
    return false;
};