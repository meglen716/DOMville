
const FIRE_CHANCE_BASE = 0.000005;   
const FIRE_GROWTH_TICK = 1200;       
const FIRE_BURN_DOWN_TICK = 2400;   
const SPREAD_CHANCE = 0.001;         

const PLAGUE_INCUBATION_TICK = 4800; 
const PLAGUE_SPREAD_CHANCE = 0.01;   

let disasterTimer = 0;
const tornadoes = []; 


let earthquakeTimer = 0; 
let earthquakeMagnitude = 0;
const EARTHQUAKE_CHANCE = 0.000001; 


let highTaxTimer = 0;
let isRioting = false;
const RIOT_THRESHOLD = 2700; 

function getEarthquakeOffset() {
    if (earthquakeTimer > 0) return { x: (Math.random() - 0.5) * earthquakeMagnitude, y: (Math.random() - 0.5) * earthquakeMagnitude };
    return { x: 0, y: 0 };
}

function manageDisasters(entities, gridSize, cars) {
    disasterTimer++;
    
    const fireStations = entities.filter(e => e.type === 'fireStation');
    const hasFireStation = fireStations.length > 0;

    
    entities.forEach(ent => {
        
        
        if (ent.hasEmergency && !ent.isAbandoned && !ent.isBurned) {
            if (ent.emergencyTimer === undefined || ent.emergencyTimer <= 0) {
                ent.emergencyTimer = 2700; 
            }
            ent.emergencyTimer--;

            if (ent.emergencyTimer <= 0) {
                ent.hasEmergency = false;
                ent.ambulanceDispatched = false;
                ent.isAbandoned = true;
                ent.color = '#bdc3c7'; 
                if (typeof logActivity === 'function') logActivity("Medical emergency failed: Patient deceased.", "info");
                if (typeof spawnDustParticles === 'function') spawnDustParticles(ent.x, ent.y, 20, '#7f8c8d', gridSize);
            }
        }

        
        if ((ent.isAbandoned || ent.isBurned) && ['house', 'office', 'supermarket', 'school'].includes(ent.type)) {
            ent.deadTimer = (ent.deadTimer || 0) + 1;
            
            if (ent.deadTimer > PLAGUE_INCUBATION_TICK) {
                if (disasterTimer % 60 === 0 && typeof spawnDustParticles === 'function') {
                    spawnDustParticles(ent.x, ent.y, 2, '#27ae60', gridSize);
                }
                if (disasterTimer % 120 === 0) {
                    entities.forEach(neighbor => {
                        if (neighbor.type === 'house' && neighbor !== ent && !neighbor.isAbandoned && !neighbor.isBurned && !neighbor.hasEmergency) {
                            const dist = Math.abs(neighbor.x - ent.x) + Math.abs(neighbor.y - ent.y);
                            if (dist <= gridSize * 3) { 
                                if (Math.random() < PLAGUE_SPREAD_CHANCE) {
                                    neighbor.hasEmergency = true; 
                                    neighbor.emergencyTimer = 1800; 
                                    neighbor.ambulanceDispatched = false;
                                    if (typeof spawnDustParticles === 'function') spawnDustParticles(neighbor.x, neighbor.y, 15, '#2ecc71', gridSize);
                                    if (typeof logActivity === 'function') logActivity("Biohazard! A plague is spreading!", "emergency");
                                }
                            }
                        }
                    });
                }
            }
        }
        
        
        else if (['house', 'office', 'supermarket', 'school', 'factory'].includes(ent.type) && !ent.isAbandoned && !ent.isBurned && ent.hasRoad !== false) {
            
            if (!ent.fireLevel && hasFireStation) {
                let fireChance = FIRE_CHANCE_BASE / (ent.level || 1); 
                
                let minStationDist = Infinity;
                fireStations.forEach(station => {
                    const dist = Math.abs(station.x - ent.x) + Math.abs(station.y - ent.y);
                    if (dist < minStationDist) minStationDist = dist;
                });

                const PROTECTION_RADIUS = gridSize * 15;
                if (minStationDist < PROTECTION_RADIUS) {
                    const protectionMultiplier = minStationDist / PROTECTION_RADIUS;
                    fireChance *= protectionMultiplier; 
                }

                if (Math.random() < fireChance) { 
                    ent.fireLevel = 1; ent.fireTimer = 0; 
                    if (typeof playSFX === 'function') playSFX('fire', 0.5);
                    if (typeof logActivity === 'function') logActivity("Fire reported in the city!", "emergency");
                }
            }

            if (ent.fireLevel > 0) {
                ent.fireTimer++;
                
                if (ent.fireTimer > FIRE_GROWTH_TICK) { 
                    if (ent.fireLevel < 3) { 
                        ent.fireLevel++; ent.fireTimer = 0; 
                        if (typeof spawnDustParticles === 'function') spawnDustParticles(ent.x, ent.y, 10, '#e67e22', gridSize); 
                    } 
                    else if (ent.fireTimer > FIRE_BURN_DOWN_TICK) { 
                        
                        ent.isBurned = true; ent.fireLevel = 0; ent.color = '#34495e'; 
                        if (typeof spawnDustParticles === 'function') spawnDustParticles(ent.x, ent.y, 30, '#2c3e50', gridSize); 
                        for (let i = cars.length - 1; i >= 0; i--) { if (cars[i].home === ent) cars.splice(i, 1); } 
                    }
                }

                if (ent.fireLevel >= 2 && disasterTimer % 60 === 0) {
                    entities.forEach(neighbor => {
                        if (neighbor !== ent && !neighbor.fireLevel && !neighbor.isBurned && !neighbor.isAbandoned) {
                            if (['house', 'office', 'supermarket', 'school', 'factory'].includes(neighbor.type)) {
                                const dx = Math.abs(neighbor.x - ent.x); const dy = Math.abs(neighbor.y - ent.y);
                                if (dx <= gridSize && dy <= gridSize) {
                                    if (Math.random() < (SPREAD_CHANCE * ent.fireLevel)) {
                                        neighbor.fireLevel = 1; neighbor.fireTimer = 0;
                                        if (typeof spawnDustParticles === 'function') spawnDustParticles(neighbor.x, neighbor.y, 15, '#e74c3c', gridSize);
                                    }
                                }
                            }
                        }
                    });
                }
            }
        }
    });

    
    if (typeof currentTaxRate !== 'undefined') {
        if (currentTaxRate >= 1.5) {
            highTaxTimer++;
            if (highTaxTimer > RIOT_THRESHOLD && !isRioting) {
                isRioting = true;
                if (typeof playSFX === 'function') playSFX('riot', 0.4);
                if (typeof logActivity === 'function') logActivity("High taxes have caused an Angry Mob!", "emergency");
            }
        } else {
            highTaxTimer = Math.max(0, highTaxTimer - 2); 
            if (highTaxTimer === 0 && isRioting) {
                isRioting = false;
                if (typeof stopSFX === 'function') stopSFX('riot');
            }
        }
    }

    if (isRioting) {
        let rioters = cars.filter(c => c.type === 'rioter');
        
        
        if (rioters.length < 15 && Math.random() < 0.05 && typeof roads !== 'undefined' && roads.length > 0) {
            let startPath = roads[Math.floor(Math.random() * roads.length)];
            if (startPath && startPath.length > 0) {
                let startNode = startPath[Math.floor(Math.random() * startPath.length)];
                
                
                let targets = entities.filter(e => ['house', 'office', 'supermarket', 'school', 'factory'].includes(e.type) && !e.isBurned && !e.fireLevel);
                let targetBuilding = targets.length > 0 ? targets[Math.floor(Math.random() * targets.length)] : null;
                
                if (targetBuilding) {
                    cars.push({
                        id: carIdCounter++, type: 'rioter', color: '#c0392b',
                        realX: startNode.x + gridSize/2, realY: startNode.y + gridSize/2,
                        targetEnt: targetBuilding, 
                        state: 'rioting_foot',     
                        currentSpeed: 0.5 + Math.random() * 0.8, 
                        path: null
                    });
                }
            }
        }

        
        rioters.forEach(r => {
            
            if (!r.targetEnt || r.targetEnt.isBurned || r.targetEnt.fireLevel > 0) {
                let targets = entities.filter(e => ['house', 'office', 'supermarket', 'school', 'factory'].includes(e.type) && !e.isBurned && !e.fireLevel);
                if (targets.length > 0) r.targetEnt = targets[Math.floor(Math.random() * targets.length)];
                else r.targetEnt = null;
            }

            if (r.targetEnt) {
                
                let dx = (r.targetEnt.x + gridSize/2) - r.realX;
                let dy = (r.targetEnt.y + gridSize/2) - r.realY;
                let dist = Math.sqrt(dx*dx + dy*dy);

                if (dist < gridSize / 2) {
                    
                    r.targetEnt.fireLevel = 1; 
                    r.targetEnt.fireTimer = 0;
                    if (typeof spawnDustParticles === 'function') spawnDustParticles(r.targetEnt.x, r.targetEnt.y, 25, '#e74c3c', gridSize);
                    if (typeof playSFX === 'function') playSFX('fire', 0.5);
                    r.targetEnt = null; 
                } else {
                    
                    r.realX += (dx / dist) * r.currentSpeed;
                    r.realY += (dy / dist) * r.currentSpeed;
                }
            } else {
                
                r.realX += (Math.random() - 0.5) * 2;
                r.realY += (Math.random() - 0.5) * 2;
            }
        });
    } else {
        
        for (let i = cars.length - 1; i >= 0; i--) {
            if (cars[i].type === 'rioter') {
                if (typeof spawnDustParticles === 'function') spawnDustParticles(cars[i].realX, cars[i].realY, 15, '#ecf0f1', gridSize/2);
                cars.splice(i, 1);
            }
        }
    }

    
    let isStorming = typeof getWeatherState === 'function' && getWeatherState().toUpperCase() === 'STORM';
    let tornadoChance = isStorming ? 0.0005 : 0.000005; 
    
    if (Math.random() < tornadoChance && tornadoes.length < 1) {
        const startLeft = Math.random() > 0.5;
        tornadoes.push({ x: startLeft ? -200 : 4200, y: Math.random() * 4000, vx: startLeft ? (Math.random() * 1.5 + 0.5) : -(Math.random() * 1.5 + 0.5), vy: (Math.random() - 0.5) * 2, radius: gridSize * 1.5, angle: 0 });
        if (typeof playSFX === 'function') playSFX('tornado', 0.6);
        if (typeof logActivity === 'function') logActivity("TORNADO WARNING: Funnel cloud spotted!", "emergency");
    }

    if (earthquakeTimer === 0 && Math.random() < EARTHQUAKE_CHANCE) { 
        earthquakeTimer = 400; 
        earthquakeMagnitude = Math.random() * 8 + 6; 
        if (typeof playSFX === 'function') playSFX('earthquake', 0.8);
        if (typeof logActivity === 'function') logActivity("EARTHQUAKE DETECTED! Brace yourself!", "emergency");
    }

    if (earthquakeTimer > 0) {
        earthquakeTimer--;
        
        
        if (earthquakeTimer % 100 === 0 && Math.random() < 0.4) {
            let activeBldgs = entities.filter(e => !e.isBurned && e.type !== 'park' && e.type !== 'waterPump');
            if (activeBldgs.length > 0) { 
                let target = activeBldgs[Math.floor(Math.random() * activeBldgs.length)]; 
                target.isBurned = true; target.fireLevel = 0; target.color = '#34495e'; 
                if (typeof spawnDustParticles === 'function') spawnDustParticles(target.x, target.y, 40, '#2c3e50', gridSize); 
                for (let i = cars.length - 1; i >= 0; i--) { if (cars[i].home === target) cars.splice(i, 1); } 
            }
            
            
            if (Math.random() < 0.3) {
                let unburned = entities.filter(e => !e.fireLevel && !e.isBurned && ['house', 'office', 'supermarket', 'school', 'factory'].includes(e.type));
                if (unburned.length > 0) { 
                    let target = unburned[Math.floor(Math.random() * unburned.length)]; 
                    target.fireLevel = 1; target.fireTimer = 0; 
                    if (typeof spawnDustParticles === 'function') spawnDustParticles(target.x, target.y, 20, '#e67e22', gridSize); 
                }
            }
        }
    }
}

function updateAndDrawTornadoes(ctx, entities, cars, gridSize) {
    for (let i = tornadoes.length - 1; i >= 0; i--) {
        let t = tornadoes[i];
        t.vx += (Math.random() - 0.5) * 0.1; t.vy += (Math.random() - 0.5) * 0.1; const speed = Math.sqrt(t.vx*t.vx + t.vy*t.vy); if (speed > 2.5) { t.vx = (t.vx/speed)*2.5; t.vy = (t.vy/speed)*2.5; }
        t.x += t.vx; t.y += t.vy; t.angle += 0.2;

        entities.forEach(ent => {
            if (!ent.isBurned && ent.type !== 'waterPump') { 
                const dist = Math.sqrt(Math.pow((ent.x + gridSize/2) - t.x, 2) + Math.pow((ent.y + gridSize/2) - t.y, 2));
                
                if (dist < t.radius) { 
                    ent.isBurned = true; ent.fireLevel = 0; ent.color = '#34495e'; 
                    if (typeof spawnDustParticles === 'function') spawnDustParticles(ent.x, ent.y, 40, '#2c3e50', gridSize); 
                }
            }
        });

        for (let c = cars.length - 1; c >= 0; c--) {
            let car = cars[c];
            if (car.state === 'tornado_sucked') { car.angle += 0.3; car.spinRadius *= 0.95; car.spinHeight = (car.spinHeight || 0) + 3; car.realX = t.x + Math.cos(car.angle) * car.spinRadius; car.realY = t.y + Math.sin(car.angle) * car.spinRadius - car.spinHeight; if (car.spinRadius < 5) cars.splice(c, 1); } 
            else { const dist = Math.sqrt(Math.pow(car.realX - t.x, 2) + Math.pow(car.realY - t.y, 2)); if (dist < t.radius * 2.0) { car.state = 'tornado_sucked'; car.path = null; car.spinRadius = dist; car.spinHeight = 0; } }
        }

        ctx.save(); ctx.translate(t.x, t.y); ctx.fillStyle = 'rgba(30, 35, 40, 0.6)'; ctx.beginPath(); if (ctx.ellipse) ctx.ellipse(0, 0, t.radius * 1.2, t.radius * 0.4, 0, 0, Math.PI * 2); else ctx.arc(0, 0, t.radius * 1.2, 0, Math.PI * 2); ctx.fill();
        for(let j = 0; j < 18; j++) { let h = j * 12; let w = t.radius * (0.2 + j * 0.08); let offset = Math.sin(t.angle + j * 0.4) * (8 + j * 0.5); ctx.fillStyle = `rgba(50, 55, 60, ${0.9 - j*0.04})`; ctx.beginPath(); if (ctx.ellipse) ctx.ellipse(offset, -h, w, w * 0.3, 0, 0, Math.PI * 2); else ctx.arc(offset, -h, w, 0, Math.PI * 2); ctx.fill(); }
        ctx.restore();
        
        if (t.x < -1000 || t.x > 5000 || t.y < -1000 || t.y > 5000) {
            tornadoes.splice(i, 1);
            if (typeof stopSFX === 'function') stopSFX('tornado');
        }
    }
}