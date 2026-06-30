
const FIRE_CHANCE_BASE = 0.000005;   
const FIRE_GROWTH_TICK = 1200;       
const FIRE_BURN_DOWN_TICK = 2400;   
const SPREAD_CHANCE = 0.001;         

const PLAGUE_INCUBATION_TICK = 4800; 
const PLAGUE_SPREAD_CHANCE = 0.01;   

let disasterTimer = 0;
const tornadoes = []; 


let earthquakeTimer = 0; 
let earthquakeMagnitude = 2;
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
    const policeStations = entities.filter(e => e.type === 'policeStation' && !e.isBurned && !e.isAbandoned && !e.isRebuilding);

    // --- 1. FIRE, PLAGUE & TIMEOUT LOGIC ---
    entities.forEach(ent => {
        if (ent.hasEmergency && !ent.isAbandoned && !ent.isBurned) {
            if (ent.emergencyTimer === undefined || ent.emergencyTimer <= 0) ent.emergencyTimer = 2700; 
            ent.emergencyTimer--;
            if (ent.emergencyTimer <= 0) {
                ent.hasEmergency = false; ent.ambulanceDispatched = false; ent.isAbandoned = true; ent.color = '#bdc3c7'; 
                if (typeof logActivity === 'function') logActivity("Medical emergency failed: Patient deceased.", "info");
                if (typeof spawnDustParticles === 'function') spawnDustParticles(ent.x, ent.y, 20, '#7f8c8d', gridSize);
            }
        }

        if ((ent.isAbandoned || ent.isBurned) && ['house', 'office', 'supermarket', 'school'].includes(ent.type)) {
            ent.deadTimer = (ent.deadTimer || 0) + 1;
            if (ent.deadTimer > PLAGUE_INCUBATION_TICK) {
                if (disasterTimer % 60 === 0 && typeof spawnDustParticles === 'function') spawnDustParticles(ent.x, ent.y, 2, '#27ae60', gridSize);
                if (disasterTimer % 120 === 0) {
                    entities.forEach(neighbor => {
                        if (neighbor.type === 'house' && neighbor !== ent && !neighbor.isAbandoned && !neighbor.isBurned && !neighbor.hasEmergency) {
                            const dist = Math.abs(neighbor.x - ent.x) + Math.abs(neighbor.y - ent.y);
                            if (dist <= gridSize * 3 && Math.random() < PLAGUE_SPREAD_CHANCE) { 
                                neighbor.hasEmergency = true; neighbor.emergencyTimer = 1800; neighbor.ambulanceDispatched = false;
                                if (typeof spawnDustParticles === 'function') spawnDustParticles(neighbor.x, neighbor.y, 15, '#2ecc71', gridSize);
                                if (typeof logActivity === 'function') logActivity("Biohazard! A plague is spreading!", "emergency");
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
                fireStations.forEach(station => { const dist = Math.abs(station.x - ent.x) + Math.abs(station.y - ent.y); if (dist < minStationDist) minStationDist = dist; });
                const PROTECTION_RADIUS = gridSize * 15;
                if (minStationDist < PROTECTION_RADIUS) fireChance *= (minStationDist / PROTECTION_RADIUS); 

                if (Math.random() < fireChance) { 
                    ent.fireLevel = 1; ent.fireTimer = 0; 
                    if (typeof playSFX === 'function') playSFX('fire', 0.5);
                    if (typeof logActivity === 'function') logActivity("Fire reported in the city!", "emergency");
                }
            }

            if (ent.fireLevel > 0) {
                ent.fireTimer++;
                if (ent.fireTimer > FIRE_GROWTH_TICK) { 
                    if (ent.fireLevel < 3) { ent.fireLevel++; ent.fireTimer = 0; if (typeof spawnDustParticles === 'function') spawnDustParticles(ent.x, ent.y, 10, '#e67e22', gridSize); } 
                    else if (ent.fireTimer > FIRE_BURN_DOWN_TICK) { ent.isBurned = true; ent.fireLevel = 0; ent.color = '#34495e'; if (typeof spawnDustParticles === 'function') spawnDustParticles(ent.x, ent.y, 30, '#2c3e50', gridSize); for (let i = cars.length - 1; i >= 0; i--) { if (cars[i].home === ent) cars.splice(i, 1); } }
                }
                if (ent.fireLevel >= 2 && disasterTimer % 60 === 0) {
                    entities.forEach(neighbor => {
                        if (neighbor !== ent && !neighbor.fireLevel && !neighbor.isBurned && !neighbor.isAbandoned && ['house', 'office', 'supermarket', 'school', 'factory'].includes(neighbor.type)) {
                            if (Math.abs(neighbor.x - ent.x) <= gridSize && Math.abs(neighbor.y - ent.y) <= gridSize && Math.random() < (SPREAD_CHANCE * ent.fireLevel)) {
                                neighbor.fireLevel = 1; neighbor.fireTimer = 0;
                                if (typeof spawnDustParticles === 'function') spawnDustParticles(neighbor.x, neighbor.y, 15, '#e74c3c', gridSize);
                            }
                        }
                    });
                }
            }
        }
    });

    // --- 2. THE ANGRY MOB & SWAT VAN LOGIC ---
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
                if (typeof logActivity === 'function') logActivity("The angry mob has dispersed. Peace restored.", "good");
            }
        }
    }

    if (isRioting) {
        let rioters = cars.filter(c => c.type === 'rioter');
        
        // Spawn Rioters
        if (rioters.length < 15 && Math.random() < 0.05 && typeof roads !== 'undefined' && roads.length > 0) {
            let startPath = roads[Math.floor(Math.random() * roads.length)];
            if (startPath && startPath.length > 0) {
                let startNode = startPath[Math.floor(Math.random() * startPath.length)];
                let targets = entities.filter(e => ['house', 'office', 'supermarket', 'school', 'factory'].includes(e.type) && !e.isBurned && !e.fireLevel);
                let targetBuilding = targets.length > 0 ? targets[Math.floor(Math.random() * targets.length)] : null;
                if (targetBuilding) { cars.push({ id: carIdCounter++, type: 'rioter', color: '#c0392b', realX: startNode.x + gridSize/2, realY: startNode.y + gridSize/2, targetEnt: targetBuilding, currentSpeed: 0.5 + Math.random() * 0.8 }); }
            }
        }

        // SWAT Vans Deploy!
        if (policeStations.length > 0) {
            let swatVans = cars.filter(c => c.type === 'swat_van');
            if (swatVans.length < policeStations.length * 2 && Math.random() < 0.05) {
                let station = policeStations[Math.floor(Math.random() * policeStations.length)];
                // Fixed: Explicitly match #111111 police color and start with angle 0
                cars.push({ id: carIdCounter++, type: 'swat_van', color: '#111111', realX: station.x + gridSize/2, realY: station.y + gridSize/2, currentSpeed: 1.4, angle: 0 });
            }
        }

        rioters.forEach(r => {
            if (!r.targetEnt || r.targetEnt.isBurned || r.targetEnt.fireLevel > 0) {
                let targets = entities.filter(e => ['house', 'office', 'supermarket', 'school', 'factory'].includes(e.type) && !e.isBurned && !e.fireLevel);
                r.targetEnt = targets.length > 0 ? targets[Math.floor(Math.random() * targets.length)] : null;
            }
            if (r.targetEnt) {
                let dx = (r.targetEnt.x + gridSize/2) - r.realX; let dy = (r.targetEnt.y + gridSize/2) - r.realY; let dist = Math.sqrt(dx*dx + dy*dy);
                if (dist < gridSize / 2) {
                    r.targetEnt.fireLevel = 1; r.targetEnt.fireTimer = 0;
                    if (typeof spawnDustParticles === 'function') spawnDustParticles(r.targetEnt.x, r.targetEnt.y, 25, '#e74c3c', gridSize);
                    if (typeof playSFX === 'function') playSFX('fire', 0.5);
                    r.targetEnt = null; 
                } else { r.realX += (dx / dist) * r.currentSpeed; r.realY += (dy / dist) * r.currentSpeed; }
            } else { r.realX += (Math.random() - 0.5) * 2; r.realY += (Math.random() - 0.5) * 2; }
        });
    } else {
        for (let i = cars.length - 1; i >= 0; i--) {
            if (cars[i].type === 'rioter' || cars[i].type === 'swat_van') {
                if (typeof spawnDustParticles === 'function') spawnDustParticles(cars[i].realX, cars[i].realY, 15, '#ecf0f1', gridSize/2);
                cars.splice(i, 1);
            }
        }
    }

    // --- 3. TORNADO & EARTHQUAKE LOGIC ---
    let isStorming = typeof getWeatherState === 'function' && getWeatherState().toUpperCase() === 'STORM';
    if (Math.random() < (isStorming ? 0.0005 : 0.000005) && tornadoes.length < 1) {
        const startLeft = Math.random() > 0.5;
        tornadoes.push({ x: startLeft ? -200 : 4200, y: Math.random() * 4000, vx: startLeft ? (Math.random() * 1.5 + 0.5) : -(Math.random() * 1.5 + 0.5), vy: (Math.random() - 0.5) * 2, radius: gridSize * 1.5, angle: 0 });
        if (typeof playSFX === 'function') playSFX('tornado', 0.6);
        if (typeof logActivity === 'function') logActivity("TORNADO WARNING: Funnel cloud spotted!", "emergency");
    }

    if (earthquakeTimer === 0 && Math.random() < EARTHQUAKE_CHANCE) { 
        earthquakeTimer = 400; earthquakeMagnitude = Math.random() * 8 + 6; 
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
            }
        }
    }

    // --- 4. RANDOM CRIMES & GETAWAY CARS ---
    if (disasterTimer % 60 === 0) {
        let crimeChance = isRioting ? 0.20 : 0.01; 
        let potentialTargets = entities.filter(e => ['house', 'office', 'supermarket', 'school'].includes(e.type) && !e.isBurned && !e.isAbandoned && !e.isRebuilding && !e.isCrimeScene);
        
        if (potentialTargets.length > 0 && Math.random() < crimeChance) {
            let target = potentialTargets[Math.floor(Math.random() * potentialTargets.length)];
            let patrolNearby = cars.some(c => c.type === 'police_patrol' && Math.abs(c.realX - target.x) < gridSize * 10 && Math.abs(c.realY - target.y) < gridSize * 10);
            
            if (patrolNearby) {
                if (typeof logActivity === 'function') logActivity("Police patrol thwarted a robbery in progress!", "good");
            } else {
                target.isCrimeScene = true;
                const crimes = [
                    { msg: `Bank Robbery at a local ${target.type}!`, cost: 500 },
                    { msg: `Vandalism reported at a ${target.type}!`, cost: 50 },
                    { msg: `Burglary at a ${target.type}!`, cost: 250 }
                ];
                const crime = crimes[Math.floor(Math.random() * crimes.length)];
                
                // Major Crime Chase!
                if (crime.cost >= 200 && policeStations.length > 0) {
                    let getaway = { id: carIdCounter++, type: 'getaway', color: '#111111', realX: target.x + gridSize/2, realY: target.y + gridSize/2, currentSpeed: 1.1, stolenCash: crime.cost, escapeTimer: 800, escapeAngle: Math.random() * Math.PI * 2, angle: 0 };
                    cars.push(getaway);
                    
                    let station = policeStations[Math.floor(Math.random() * policeStations.length)];
                    cars.push({ id: carIdCounter++, type: 'police_pursuit', color: '#111111', realX: station.x + gridSize/2, realY: station.y + gridSize/2, currentSpeed: 1.5, targetCar: getaway, angle: 0 });
                    
                    if (typeof logActivity === 'function') logActivity(`${crime.msg} Suspects fleeing! Pursuit started!`, "emergency");
                } 
                else {
                    // Standard Minor Crime
                    if (typeof spendFunds === 'function') spendFunds(crime.cost);
                    if (typeof logActivity === 'function') logActivity(`${crime.msg} (-$${crime.cost})`, "crime");
                    
                    if (policeStations.length > 0 && typeof roads !== 'undefined' && roads.length > 0 && typeof findPath === 'function') {
                        let station = policeStations[Math.floor(Math.random() * policeStations.length)];
                        let startNode = null, endNode = null;
                        for(let r of roads) { for(let n of r) { if(Math.abs(n.x - station.x) <= gridSize && Math.abs(n.y - station.y) <= gridSize) { startNode = n; break; } } if(startNode) break; }
                        for(let r of roads) { for(let n of r) { if(Math.abs(n.x - target.x) <= gridSize && Math.abs(n.y - target.y) <= gridSize) { endNode = n; break; } } if(endNode) break; }
                        
                        if (startNode && endNode) {
                            let route = findPath(startNode, endNode);
                            if (route) cars.push({ id: carIdCounter++, type: 'police_dispatch', color: '#111111', home: station, target: endNode, targetEnt: target, path: route, pathIndex: 0, progress: 0, state: 'driving_to_crime', currentSpeed: 1.5, realX: startNode.x + gridSize/2, realY: startNode.y + gridSize/2, angle: 0 });
                        }
                    }
                }
            }
        }
        
        // Spawn Active Patrols
        if (Math.random() < 0.1 && policeStations.length > 0 && typeof roads !== 'undefined' && roads.length > 0 && typeof findPath === 'function') {
            let station = policeStations[Math.floor(Math.random() * policeStations.length)];
            let startNode = null; for(let r of roads) { for(let n of r) { if(Math.abs(n.x - station.x) <= gridSize && Math.abs(n.y - station.y) <= gridSize) { startNode = n; break; } } if(startNode) break; }
            let randomRoad = roads[Math.floor(Math.random() * roads.length)];
            if (startNode && randomRoad && randomRoad.length > 0) {
                let endNode = randomRoad[Math.floor(Math.random() * randomRoad.length)];
                let route = findPath(startNode, endNode);
                if (route && cars.filter(c => c.type === 'police_patrol').length < policeStations.length * 2) {
                    cars.push({ id: carIdCounter++, type: 'police_patrol', color: '#111111', home: station, target: endNode, path: route, pathIndex: 0, progress: 0, state: 'patrolling', currentSpeed: 0.8, realX: startNode.x + gridSize/2, realY: startNode.y + gridSize/2, angle: 0 });
                }
            }
        }
    }

    // --- 5. VEHICLE AI MANAGER ---
    for (let i = cars.length - 1; i >= 0; i--) {
        let car = cars[i];
        
        // SWAT Vans hunting rioters (Fixed: Smooth Turning Logic Added)
        if (car.type === 'swat_van') {
            let rioters = cars.filter(c => c.type === 'rioter');
            let closestRioter = null; let minDist = Infinity;
            rioters.forEach(r => { let d = Math.abs(r.realX - car.realX) + Math.abs(r.realY - car.realY); if (d < minDist) { minDist = d; closestRioter = r; } });

            if (closestRioter) {
                let dx = closestRioter.realX - car.realX; let dy = closestRioter.realY - car.realY; let dist = Math.sqrt(dx*dx + dy*dy);
                if (dist < gridSize) {
                    // Arrested!
                    if (typeof spawnDustParticles === 'function') spawnDustParticles(closestRioter.realX, closestRioter.realY, 15, '#0984e3', gridSize/2);
                    cars.splice(cars.indexOf(closestRioter), 1);
                } else {
                    let targetAngle = Math.atan2(dy, dx);
                    let angleDiff = targetAngle - (car.angle || 0);
                    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2; while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
                    car.angle = (car.angle || 0) + angleDiff * 0.2;
                    
                    car.realX += (dx / dist) * car.currentSpeed; car.realY += (dy / dist) * car.currentSpeed;
                }
            }
        }

        // Getaway Car Logic (Fixed: Smooth Turning Logic Added)
        if (car.type === 'getaway') {
            car.escapeTimer--;
            if (car.escapeTimer <= 0) {
                if (typeof spendFunds === 'function') spendFunds(car.stolenCash);
                if (typeof logActivity === 'function') logActivity(`Getaway car escaped the city! (-$${car.stolenCash})`, "crime");
                cars.splice(i, 1);
            } else {
                let angleDiff = car.escapeAngle - (car.angle || 0);
                while (angleDiff > Math.PI) angleDiff -= Math.PI * 2; while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
                car.angle = (car.angle || 0) + angleDiff * 0.2;
                
                car.realX += Math.cos(car.escapeAngle) * car.currentSpeed;
                car.realY += Math.sin(car.escapeAngle) * car.currentSpeed;
            }
        }

        // Police Pursuit Logic (Fixed: Smooth Turning Logic Added)
        if (car.type === 'police_pursuit') {
            if (car.targetCar && cars.includes(car.targetCar)) {
                let dx = car.targetCar.realX - car.realX; let dy = car.targetCar.realY - car.realY; let dist = Math.sqrt(dx*dx + dy*dy);
                if (dist < gridSize) {
                    // Caught!
                    if (typeof logActivity === 'function') logActivity(`Police intercepted the suspects! $${car.targetCar.stolenCash} recovered.`, "good");
                    if (typeof spawnDustParticles === 'function') spawnDustParticles(car.realX, car.realY, 30, '#0984e3', gridSize);
                    
                    // Clear the crime scene
                    if (car.targetCar.originEnt && car.targetCar.originEnt.isCrimeScene) car.targetCar.originEnt.isCrimeScene = false;
                    
                    cars.splice(cars.indexOf(car.targetCar), 1); // Delete Getaway
                    cars.splice(i, 1); // Delete Police Car
                } else {
                    let targetAngle = Math.atan2(dy, dx);
                    let angleDiff = targetAngle - (car.angle || 0);
                    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2; while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
                    car.angle = (car.angle || 0) + angleDiff * 0.2;
                    
                    car.realX += (dx / dist) * car.currentSpeed; car.realY += (dy / dist) * car.currentSpeed;
                }
            } else {
                cars.splice(i, 1); // Target lost, despawn
            }
        }

        // Clear Crime Scene (Minor Crimes)
        if (car.type === 'police_dispatch' && car.state === 'driving_to_crime') {
            if (!car.path || car.pathIndex >= car.path.length - 1) {
                if (car.targetEnt && car.targetEnt.isCrimeScene) {
                    car.targetEnt.isCrimeScene = false;
                    if (typeof spawnDustParticles === 'function') spawnDustParticles(car.targetEnt.x, car.targetEnt.y, 20, '#f1c40f', gridSize);
                    if (typeof logActivity === 'function') logActivity(`Police cleared the crime scene at the ${car.targetEnt.type}.`, "info");
                }
                cars.splice(i, 1);
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