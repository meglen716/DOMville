// ==========================================
// LRT / TRAIN SYSTEM LOGIC & RENDERING
// ==========================================

const MIN_STATION_DIST = 400; // 10 grid blocks
const TRAIN_SPEED = 0.08; 
const activeTrains = [];
const activePassengers = []; // Tracks the tiny people boarding/exiting

function canBuildStation(gridX, gridY, existingStations) {
    for (let s of existingStations) {
        const dist = Math.sqrt(Math.pow(s.x - gridX, 2) + Math.pow(s.y - gridY, 2));
        if (dist < MIN_STATION_DIST) return false;
    }
    return true;
}

function manageTrains(tracks, stations) {
    // We no longer auto-spawn trains. They are bought manually!
    // We only clean up trains if their track was destroyed by the demolish tool.
    for (let i = activeTrains.length - 1; i >= 0; i--) {
        if (!tracks[activeTrains[i].lineIndex]) {
            activeTrains.splice(i, 1);
        }
    }
}

// Spawns tiny dots that walk between the train and the station
function spawnPassengers(startX, startY, endX, endY) {
    const count = Math.floor(Math.random() * 8) + 4; // 4 to 11 people
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

// Helper: Calculates the exact position and angle for an articulated train car
function getTrainCarPos(track, baseIndex, baseProgress, direction, offsetGrids, gridSize) {
    let t = baseIndex + baseProgress + (offsetGrids * direction);
    
    // Clamp to track ends so cars bunch up instead of flying off
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
    ctx.lineCap = 'butt';
    ctx.lineJoin = 'miter';

    // 1. Draw Tracks
    tracks.forEach(path => {
        if (!path || path.length === 0) return;

        ctx.strokeStyle = '#5c4033'; 
        ctx.lineWidth = 14;
        ctx.setLineDash([4, 6]); 
        ctx.beginPath();
        ctx.moveTo(path[0].x + gridSize/2, path[0].y + gridSize/2);
        for (let i = 1; i < path.length; i++) {
            ctx.lineTo(path[i].x + gridSize/2, path[i].y + gridSize/2);
        }
        if (path.length === 1) ctx.lineTo(path[0].x + gridSize/2 + 1, path[0].y + gridSize/2);
        ctx.stroke();
        ctx.setLineDash([]); 

        ctx.strokeStyle = '#bdc3c7';
        ctx.lineWidth = 2;
        
        ctx.beginPath();
        ctx.moveTo(path[0].x + gridSize/2 - 4, path[0].y + gridSize/2 - 4);
        for (let i = 1; i < path.length; i++) ctx.lineTo(path[i].x + gridSize/2 - 4, path[i].y + gridSize/2 - 4);
        if (path.length === 1) ctx.lineTo(path[0].x + gridSize/2 - 3, path[0].y + gridSize/2 - 4);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(path[0].x + gridSize/2 + 4, path[0].y + gridSize/2 + 4);
        for (let i = 1; i < path.length; i++) ctx.lineTo(path[i].x + gridSize/2 + 4, path[i].y + gridSize/2 + 4);
        if (path.length === 1) ctx.lineTo(path[0].x + gridSize/2 + 5, path[0].y + gridSize/2 + 4);
        ctx.stroke();
    });

    // 2. Draw Stations is now handled by blueprints.js!
    // If you are calling this function, make sure your game loop also passes stations 
    // to the `drawBuilding` function so they get the beautiful new art and outlines.
}

function updateAndDrawTrains(ctx, tracks, gridSize, nightMode) {
    // Check Operating Hours (6 AM to 10 PM)
    let isOperating = true;
    if (typeof gameClock !== 'undefined') {
        isOperating = (gameClock >= 6 && gameClock < 22);
    }

    activeTrains.forEach(train => {
        const track = tracks[train.lineIndex];
        if (!track || track.length < 2) return;

        if (train.state === 'boarding') {
            // Stay parked if the transit system is closed for the night
            if (!isOperating) {
                train.waitTimer = 120; // Locks the timer so it won't leave
            } else {
                train.waitTimer--;
            }

            // Passenger Visuals!
            const headPos = getTrainCarPos(track, train.pathIndex, train.progress, train.direction, 0, gridSize);
            if (headPos) {
                // Find a nearby station
                let nearbyStation = typeof trainStations !== 'undefined' ? trainStations.find(s => Math.abs(s.x + gridSize/2 - headPos.x) < gridSize*1.5 && Math.abs(s.y + gridSize/2 - headPos.y) < gridSize*1.5) : null;
                
                if (nearbyStation) {
                    // Passengers getting off (Right when the train stops)
                    if (train.waitTimer === 119 && isOperating) {
                        spawnPassengers(headPos.x, headPos.y, nearbyStation.x + gridSize/2, nearbyStation.y + gridSize/2);
                    }
                    // Passengers getting on (Halfway through wait time)
                    if (train.waitTimer === 60 && isOperating) {
                        spawnPassengers(nearbyStation.x + gridSize/2, nearbyStation.y + gridSize/2, headPos.x, headPos.y);
                    }
                }
            }

            if (train.waitTimer <= 0) train.state = 'driving';
        } else {
            train.progress += TRAIN_SPEED * train.direction;
            
            // Turn around when reaching track ends
            if (train.direction === 1) {
                if (train.pathIndex >= track.length - 2 && train.progress >= 0.5) {
                    train.progress = 0.5; train.pathIndex = track.length - 2;
                    train.direction = -1; train.state = 'boarding'; train.waitTimer = 120;
                } else if (train.progress >= 1.0) {
                    train.progress = 0; train.pathIndex++;
                }
            } else {
                if (train.pathIndex === 0 && train.progress <= 0.5) {
                    train.progress = 0.5; train.pathIndex = 0;
                    train.direction = 1; train.state = 'boarding'; train.waitTimer = 120;
                } else if (train.progress <= 0) {
                    train.progress = 1.0; train.pathIndex--;
                }
            }
        }

        // --- ARTICULATED CAR RENDERING ---
        const carSpacing = 0.8; // Grids between cars
        const carWidth = gridSize * 0.7;
        const carHeight = gridSize * 0.35;

        // Draw connectors first
        for(let i = -0.5; i <= 0.5; i += 1) {
            let pos = getTrainCarPos(track, train.pathIndex, train.progress, train.direction, i * carSpacing, gridSize);
            if (!pos) continue;
            ctx.save();
            ctx.translate(pos.x, pos.y);
            ctx.rotate(pos.angle);
            ctx.fillStyle = '#2c3e50';
            ctx.fillRect(-4, -4, 8, 8);
            ctx.restore();
        }

        // Draw the 3 cars individually so they bend on curves!
        for(let i = -1; i <= 1; i++) {
            let pos = getTrainCarPos(track, train.pathIndex, train.progress, train.direction, i * carSpacing * -1, gridSize);
            if (!pos) continue;

            ctx.save();
            ctx.translate(pos.x, pos.y);
            ctx.rotate(pos.angle);

            // Drop Shadow
            ctx.fillStyle = 'rgba(0,0,0,0.4)';
            ctx.fillRect(-carWidth/2 + 2, -carHeight/2 + 2, carWidth, carHeight);
            
            // Purple Train Body
            ctx.fillStyle = '#9b59b6'; 
            ctx.fillRect(-carWidth/2, -carHeight/2, carWidth, carHeight);
            if (window.showBuildingOutlines) {
                ctx.lineWidth = 1; ctx.strokeStyle = '#000'; ctx.strokeRect(-carWidth/2, -carHeight/2, carWidth, carHeight);
            }
            
            // Sleek dark windows
            ctx.fillStyle = (nightMode && isOperating) ? '#f1c40f' : '#2c3e50';
            ctx.fillRect(-carWidth/2 + 6, -carHeight/2 + 4, carWidth - 12, carHeight - 8);

            // Headlights (Only on the front car in the direction of travel)
            if (nightMode && isOperating && ((train.direction === 1 && i === -1) || (train.direction === -1 && i === 1))) {
                ctx.fillStyle = 'rgba(255, 255, 150, 0.9)';
                const headX = (train.direction === 1) ? carWidth/2 : -carWidth/2 - 3;
                ctx.fillRect(headX, -carHeight/2 + 4, 3, 4);
                ctx.fillRect(headX, carHeight/2 - 8, 3, 4);
            }
            ctx.restore();
        }
    });

    // Update & Draw Passengers
    for (let i = activePassengers.length - 1; i >= 0; i--) {
        let p = activePassengers[i];
        let dx = p.tx - p.x;
        let dy = p.ty - p.y;
        let dist = Math.sqrt(dx*dx + dy*dy);
        
        if (dist < p.speed) {
            activePassengers.splice(i, 1); // Passenger reached destination!
        } else {
            p.x += (dx / dist) * p.speed;
            p.y += (dy / dist) * p.speed;
            ctx.fillStyle = p.color;
            ctx.fillRect(p.x, p.y, 2, 2);
        }
    }
}