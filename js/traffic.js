const CAR_SPEED = 0.03; 
const LIGHT_INTERVAL = 180; 

// --- FIXED: Pathing Wrapper ---
function getRoutedPath(startObj, targetObj) {
    if (typeof findPath !== 'function') return null;
    const route = findPath(startObj, targetObj);
    if (route && route.length > 0) {
        // Prepend the start building's center to animate pulling out
        route.unshift({ x: startObj.x, y: startObj.y });
    }
    return route;
}

function getOccupancy(building) {
    let count = 0;
    for (const car of cars) { if (car.target === building && (car.state === 'driving_work' || car.state === 'at_work' || car.state === 'driving_shop' || car.state === 'at_shop')) count++; }
    return count;
}

function manageTraffic() {
    const activeEntities = entities.filter(ent => ent.hasPower !== false && ent.hasWater !== false && ent.hasRoad !== false && !ent.isAbandoned && !ent.isBurned);

    const houses = activeEntities.filter(ent => ent.type === 'house'); 
    const offices = activeEntities.filter(ent => ent.type === 'office');
    const schools = activeEntities.filter(ent => ent.type === 'school'); 
    const shops = activeEntities.filter(ent => ent.type === 'supermarket');
    
    // --- Emergencies ---
    const policeStations = activeEntities.filter(ent => ent.type === 'policeStation'); 
    let activePolice = cars.filter(c => c.type === 'police').length; let maxPolice = policeStations.length * 2; 

    const hospitals = activeEntities.filter(ent => ent.type === 'hospital');
    let activeAmbulances = cars.filter(c => c.type === 'ambulance').length; let maxAmbulances = hospitals.length * 2;

    const fireStations = activeEntities.filter(ent => ent.type === 'fireStation');
    let activeFiretrucks = cars.filter(c => c.type === 'firetruck').length; let maxFiretrucks = fireStations.length; 

    // --- Supply Chain ---
    const factories = activeEntities.filter(ent => ent.type === 'factory');
    const farms = activeEntities.filter(ent => ent.type === 'farm');
    const hungryShops = shops.filter(s => (s.stockLevel || 0) < 80);

    [...factories, ...farms].forEach(facility => {
        const facilityTrucks = cars.filter(car => car.home === facility);
        if (facilityTrucks.length < 1 && hungryShops.length > 0) {
            let targetShop = hungryShops[Math.floor(Math.random() * hungryShops.length)];
            const routePath = getRoutedPath(facility, targetShop);
            if (routePath) {
                cars.push({
                    id: carIdCounter++, type: 'deliveryTruck', color: '#ecf0f1', 
                    home: facility, target: targetShop, path: routePath, pathIndex: 0, progress: 0,
                    state: 'driving_delivery', waitTimer: 0, offsetX: 0, offsetY: 0, angle: 0,
                    realX: facility.x + gridSize/2, realY: facility.y + gridSize/2,
                    currentSpeed: 0, stuckTimer: 0, capacity: facility.type === 'factory' ? 50 : 25 
                });
            }
        }
    });

    if (fireStations.length > 0) {
        entities.forEach(bldg => {
            if (bldg.fireLevel > 0 && !bldg.isBurned) {
                let assignedTrucks = cars.filter(c => c.type === 'firetruck' && c.patientHouse === bldg).length;
                if (assignedTrucks < bldg.fireLevel && activeFiretrucks < maxFiretrucks) {
                    let bestStation = fireStations[Math.floor(Math.random() * fireStations.length)];
                    const routePath = getRoutedPath(bestStation, bldg);
                    if (routePath) { cars.push({ id: carIdCounter++, type: 'firetruck', color: '#c0392b', home: bestStation, target: bldg, path: routePath, pathIndex: 0, progress: 0, state: 'driving_emergency', waitTimer: 0, offsetX: 0, offsetY: 0, angle: 0, realX: bestStation.x + gridSize/2, realY: bestStation.y + gridSize/2, currentSpeed: 0, patientHouse: bldg }); activeFiretrucks++; }
                }
            }
        });
    }

    if (hospitals.length > 0) {
        houses.forEach(house => {
            if (house.hasEmergency && !house.ambulanceDispatched && activeAmbulances < maxAmbulances && !house.isAbandoned && !house.isBurned) {
                let bestHospital = null; let minDistance = Infinity;
                hospitals.forEach(h => {
                    let dist = Math.abs(h.x - house.x) + Math.abs(h.y - house.y);
                    if (dist < minDistance) { minDistance = dist; bestHospital = h; }
                });

                if (bestHospital) {
                    const routePath = getRoutedPath(bestHospital, house);
                    if (routePath) {
                        house.ambulanceDispatched = true; activeAmbulances++;
                        if (typeof playSFX === 'function') playSFX('emergency', 0.2);
                        cars.push({
                            id: carIdCounter++, type: 'ambulance', color: '#ffffff',
                            home: bestHospital, target: house, path: routePath,
                            pathIndex: 0, progress: 0, state: 'driving_emergency',
                            waitTimer: 0, offsetX: 0, offsetY: 0, angle: 0,
                            realX: bestHospital.x + gridSize/2, realY: bestHospital.y + gridSize/2,
                            currentSpeed: 0, patientHouse: house
                        });
                    }
                }
            }
        });
    }

    if (policeStations.length > 0) {
        let stuckCars = cars.filter(c => c.type === 'car' && c.stuckTimer > 180 && !c.policeDispatched);
        stuckCars.sort((a, b) => b.stuckTimer - a.stuckTimer);

        stuckCars.forEach(c => {
            if (activePolice < maxPolice) {
                c.policeDispatched = true; activePolice++; 
                let bestStation = policeStations[0]; let minDistance = Infinity;
                policeStations.forEach(station => { let dist = Math.abs(station.x - c.realX) + Math.abs(station.y - c.realY); if (dist < minDistance) { minDistance = dist; bestStation = station; } });
                const targetPos = { x: Math.floor(c.realX/gridSize)*gridSize, y: Math.floor(c.realY/gridSize)*gridSize };
                const routePath = getRoutedPath(bestStation, targetPos);
                if (routePath) cars.push({ id: carIdCounter++, type: 'police', color: '#111111', home: bestStation, target: c, path: routePath, pathIndex: 0, progress: 0, state: 'driving_emergency', waitTimer: 0, offsetX: 0, offsetY: 0, angle: 0, realX: bestStation.x + gridSize/2, realY: bestStation.y + gridSize/2, currentSpeed: 0, jammedCarId: c.id });
            }
        });
    }

    if (busStops.length >= 2) {
        const busCount = cars.filter(c => c.type === 'bus').length; const desiredBuses = Math.max(1, Math.floor(busStops.length / 2)); 
        if (busCount < desiredBuses) {
            const startStop = busStops[0]; const endStop = busStops[1];
            const routePath = getRoutedPath(startStop, endStop);
            if (routePath) cars.push({ id: carIdCounter++, type: 'bus', color: 'cyan', home: startStop, target: endStop, path: routePath, pathIndex: 0, progress: 0, state: 'driving_route', waitTimer: 0, offsetX: 0, offsetY: 0, angle: 0, realX: startStop.x + gridSize/2, realY: startStop.y + gridSize/2, stopIndex: 1, currentSpeed: 0, stuckTimer: 0 });
        }
    }

    if (offices.length === 0 && schools.length === 0 && shops.length === 0) return;

    houses.forEach(house => {
        if (house.fireLevel > 0) return; 
        const houseCars = cars.filter(car => car.home === house);
        
        let coveredByTransit = false;
        for (const stop of busStops) { const dist = Math.sqrt(Math.pow(stop.x - house.x, 2) + Math.pow(stop.y - house.y, 2)); if (dist <= gridSize * 3.5) { coveredByTransit = true; break; } }
        if (!coveredByTransit && typeof activeTrains !== 'undefined' && activeTrains.length > 0) {
            for (const station of trainStations) { const dist = Math.sqrt(Math.pow(station.x - house.x, 2) + Math.pow(station.y - house.y, 2)); if (dist <= gridSize * 7) { coveredByTransit = true; break; } }
        }

        let limit = (house.level && house.level >= 2) ? 2 : 1; 
        if (coveredByTransit) limit = Math.max(0, limit - 1); 

        if (houseCars.length < limit) {
            cars.push({ id: carIdCounter++, type: 'car', color: '#FFAC4A', home: house, target: null, path: [], pathIndex: 0, progress: 0, state: 'at_home', waitTimer: 0, offsetX: 0, offsetY: 0, angle: 0, realX: house.x + gridSize/2, realY: house.y + gridSize/2, isErrand: false, currentSpeed: 0, stuckTimer: 0, policeDispatched: false });
        }
    });

    const isWeekendDay = typeof isWeekend === 'function' ? isWeekend() : false;
    const isMorningRush = !isWeekendDay && typeof gameClock !== 'undefined' && gameClock >= 7 && gameClock < 9;
    const isEveningRush = !isWeekendDay && typeof gameClock !== 'undefined' && gameClock >= 17 && gameClock < 19;
    const isMidday = typeof gameClock !== 'undefined' && gameClock >= 9 && gameClock < 17;

    const validOffices = offices.filter(o => getOccupancy(o) < (typeof ZONE_PROPS !== 'undefined' ? ZONE_PROPS['office'].capacity : 10) && !o.fireLevel);
    const validSchools = schools.filter(s => getOccupancy(s) < (typeof ZONE_PROPS !== 'undefined' ? ZONE_PROPS['school'].capacity : 5) && !s.fireLevel);
    const validShops = shops.filter(s => getOccupancy(s) < (typeof ZONE_PROPS !== 'undefined' ? ZONE_PROPS['supermarket'].capacity : 15) && !s.fireLevel);

    cars.forEach(car => {
        if (['bus', 'police', 'ambulance', 'firetruck', 'deliveryTruck', 'rioter', 'swat_van', 'getaway'].includes(car.type)) return; 

        if (car.state === 'at_home') {
            if (isMorningRush) {
                if (Math.random() < 0.02) { 
                    let workplaces = [];
                    if (validOffices.length > 0) workplaces = workplaces.concat(validOffices);
                    if (validSchools.length > 0) workplaces = workplaces.concat(validSchools);
                    
                    if (workplaces.length > 0) {
                        car.target = workplaces[Math.floor(Math.random() * workplaces.length)];
                        const pathToWork = getRoutedPath(car.home, car.target);
                        if (pathToWork) { car.path = pathToWork; car.pathIndex = 0; car.progress = 0; car.state = 'driving_work'; car.isErrand = false; }
                    }
                }
            } else if ((isMidday || isWeekendDay) && validShops.length > 0) { 
                const shoppingChance = isWeekendDay ? 0.015 : 0.005; 
                if (Math.random() < shoppingChance) {
                    car.target = validShops[Math.floor(Math.random() * validShops.length)];
                    const pathToShop = getRoutedPath(car.home, car.target);
                    if (pathToShop) { car.path = pathToShop; car.pathIndex = 0; car.progress = 0; car.state = 'driving_shop'; car.isErrand = true; }
                }
            }
        } else if (car.state === 'at_work' && isEveningRush && !car.isErrand) {
            if (Math.random() < 0.02) {
                if (validShops.length > 0 && Math.random() < 0.70) {
                    const nextTarget = validShops[Math.floor(Math.random() * validShops.length)];
                    const pathToShop = getRoutedPath(car.target, nextTarget); 
                    if (pathToShop) { car.target = nextTarget; car.path = pathToShop; car.pathIndex = 0; car.progress = 0; car.state = 'driving_shop'; return; }
                }
                const pathHome = getRoutedPath(car.target, car.home);
                if (pathHome) { car.path = pathHome; car.pathIndex = 0; car.progress = 0; car.state = 'driving_home'; } 
                else { car.state = 'at_home'; car.realX = car.home.x + gridSize/2; car.realY = car.home.y + gridSize/2; }
            }
        }
    });
}

function updateAndDrawTrafficLights(ctx) {
    trafficLights.forEach(light => {
        if (light.state === 'H') light.state = 'H_G'; if (light.state === 'V') light.state = 'V_G'; light.timer++;
        
        if (light.state === 'H_G' && light.timer >= LIGHT_INTERVAL) { light.state = 'H_Y'; light.timer = 0; } 
        else if (light.state === 'H_Y' && light.timer >= 60) { light.state = 'V_G'; light.timer = 0; } 
        else if (light.state === 'V_G' && light.timer >= LIGHT_INTERVAL) { light.state = 'V_Y'; light.timer = 0; } 
        else if (light.state === 'V_Y' && light.timer >= 60) { light.state = 'H_G'; light.timer = 0; }

        const cx = light.x + gridSize / 2; const cy = light.y + gridSize / 2;

        ctx.fillStyle = '#222f3e'; ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(cx - 10, cy - 10, 20, 20, 4); else ctx.fillRect(cx - 10, cy - 10, 20, 20); ctx.fill();

        const drawBulb = (offsetX, offsetY, color, isOn) => {
            ctx.fillStyle = isOn ? color : '#111111'; ctx.beginPath(); ctx.arc(cx + offsetX, cy + offsetY, 2.5, 0, Math.PI * 2); ctx.fill();
            if (isOn) { ctx.shadowColor = color; ctx.shadowBlur = 8; ctx.fill(); ctx.shadowBlur = 0; }
        };

        const hGreen = light.state === 'H_G'; const hYellow = light.state === 'H_Y'; const hRed = light.state.startsWith('V');
        const vGreen = light.state === 'V_G'; const vYellow = light.state === 'V_Y'; const vRed = light.state.startsWith('H');

        drawBulb(-10, -5, '#ff4757', hRed);  drawBulb(10, -5, '#ff4757', hRed);
        drawBulb(-10,  0, '#f1c40f', hYellow); drawBulb(10,  0, '#f1c40f', hYellow);
        drawBulb(-10,  5, '#2ecc71', hGreen);  drawBulb(10,  5, '#2ecc71', hGreen);

        drawBulb(-5, -10, '#ff4757', vRed);  drawBulb(-5, 10, '#ff4757', vRed);
        drawBulb( 0, -10, '#f1c40f', vYellow); drawBulb( 0, 10, '#f1c40f', vYellow);
        drawBulb( 5, -10, '#2ecc71', vGreen);  drawBulb( 5, 10, '#2ecc71', vGreen);
    });
}

function updateAndDrawCars(ctx) {
    const nightMode = typeof isNightTime === 'function' && isNightTime();

    for (let i = cars.length - 1; i >= 0; i--) {
        const car = cars[i];
        
        // --- 1. Waiting Timer Logic ---
        if (car.waitTimer > 0) { 
            car.waitTimer--; 
            if (car.type === 'firetruck' && car.state === 'extinguishing') {
                if (car.waitTimer % 5 === 0 && typeof spawnDustParticles === 'function') { spawnDustParticles(car.realX, car.realY, 2, '#3498db', gridSize/2); }
                if (car.waitTimer <= 0) {
                    if (car.patientHouse && car.patientHouse.fireLevel > 0) {
                        car.patientHouse.fireLevel -= 0.5; 
                        if (car.patientHouse.fireLevel > 0) { car.waitTimer = 120; } 
                        else {
                            car.patientHouse.fireLevel = 0;
                            const pathBack = getRoutedPath(car.patientHouse, car.home);
                            if (pathBack) { car.path = pathBack; car.pathIndex = 0; car.progress = 0; car.state = 'driving_home'; } else { car.state = 'at_home'; }
                        }
                    } else {
                        const pathBack = getRoutedPath(car.patientHouse, car.home);
                        if (pathBack) { car.path = pathBack; car.pathIndex = 0; car.progress = 0; car.state = 'driving_home'; } else { car.state = 'at_home'; }
                    }
                }
            }
            
            if (car.waitTimer <= 0) {
                if (car.state === 'police_clearing') { cars.splice(i, 1); continue; }
                if (car.state === 'ambulance_loading') {
                    const pathBack = getRoutedPath(car.patientHouse, car.home);
                    if (pathBack) { car.path = pathBack; car.pathIndex = 0; car.progress = 0; car.state = 'driving_hospital'; } else { car.state = 'at_home'; }
                }
                else if (car.state === 'at_shop') {
                    const pathHome = getRoutedPath(car.target, car.home);
                    if (pathHome) { car.path = pathHome; car.pathIndex = 0; car.progress = 0; car.state = 'driving_home'; } else { car.state = 'at_home'; }
                } else if (car.state === 'at_work' && car.isErrand) {
                    const pathHome = getRoutedPath(car.target, car.home);
                    if (pathHome) { car.path = pathHome; car.pathIndex = 0; car.progress = 0; car.state = 'driving_home'; } else { car.state = 'at_home'; }
                } else if (car.state === 'at_stop' && car.type === 'bus') {
                    const startNode = { x: Math.floor(car.realX/gridSize)*gridSize, y: Math.floor(car.realY/gridSize)*gridSize };
                    const nextPath = getRoutedPath(startNode, car.target);
                    if (nextPath) { car.path = nextPath; car.pathIndex = 0; car.progress = 0; car.state = 'driving_route'; } else { car.waitTimer = 60; } 
                } 
                else if (car.state === 'unloading') {
                    if (car.target && car.target.type === 'supermarket') {
                        car.target.stockLevel = Math.min(100, (car.target.stockLevel || 0) + car.capacity);
                        if (typeof spawnDustParticles === 'function') spawnDustParticles(car.target.x, car.target.y, 15, '#2ecc71', gridSize); 
                    }
                    const pathHome = getRoutedPath(car.target, car.home);
                    if (pathHome) { 
                        car.path = pathHome; car.pathIndex = 0; car.progress = 0; car.state = 'driving_home'; 
                    } else { 
                        cars.splice(i, 1); continue; 
                    }
                }
            }
            if (car.state === 'police_clearing' || car.state === 'ambulance_loading' || car.state === 'extinguishing' || car.state === 'unloading') { drawCarShape(ctx, car, nightMode); }
            continue; 
        }

        // --- 2. Idle State Check ---
        if (car.state === 'at_home' || car.state === 'at_work' || car.state === 'at_stop' || car.state === 'at_shop') { car.currentSpeed = 0; car.stuckTimer = 0; continue; }

        // --- 3. Driving & Movement Logic ---
        if (car.path && car.pathIndex < car.path.length - 1) {
            const currentNode = car.path[car.pathIndex]; const nextNode = car.path[car.pathIndex + 1];
            
            const dirX = Math.sign(nextNode.x - currentNode.x); const dirY = Math.sign(nextNode.y - currentNode.y);
            const targetAngle = Math.atan2(dirY, dirX);
            const rightOffset = gridSize * 0.25; const targetOffsetX = -dirY * rightOffset; const targetOffsetY = dirX * rightOffset;

            car.offsetX += (targetOffsetX - car.offsetX) * 0.2; car.offsetY += (targetOffsetY - car.offsetY) * 0.2;

            let angleDiff = targetAngle - car.angle;
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2; while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
            car.angle += angleDiff * 0.2;

            let speedModifier = 1.0; 
            const isEmergencyVehicle = (car.type.startsWith('police') || car.type === 'ambulance' || car.type === 'firetruck' || car.type === 'swat_van');

            let actualSpeed = car.type === 'bus' ? CAR_SPEED * 0.8 : CAR_SPEED;
            if (isEmergencyVehicle) actualSpeed = CAR_SPEED * 1.5; 
            if (car.type === 'rioter') actualSpeed = CAR_SPEED * 0.25; 
            actualSpeed *= (typeof getWeatherTrafficModifier === 'function') ? getWeatherTrafficModifier() : 1.0;
            
            const testProgress = car.progress + actualSpeed;
            const testBaseX = currentNode.x + (nextNode.x - currentNode.x) * testProgress + gridSize/2;
            const testBaseY = currentNode.y + (nextNode.y - currentNode.y) * testProgress + gridSize/2;

            const upcomingLight = trafficLights.find(l => l.x === nextNode.x && l.y === nextNode.y);
            const hasRoundabout = roundabouts.some(r => r.x === nextNode.x && r.y === nextNode.y);

            // Traffic Light Logic
            if (upcomingLight && !isEmergencyVehicle && !hasRoundabout && car.type !== 'rioter') {
                const state = upcomingLight.state || 'H_G'; 
                const isMovingHorizontally = Math.abs(nextNode.x - currentNode.x) > 0; const isMovingVertically = Math.abs(nextNode.y - currentNode.y) > 0;
                const distToLight = Math.sqrt(Math.pow(testBaseX - (nextNode.x + gridSize/2), 2) + Math.pow(testBaseY - (nextNode.y + gridSize/2), 2));
                const LIGHT_STOP_DIST = gridSize * 0.35; 
                let mustStop = false;

                if (isMovingHorizontally) { if (state.startsWith('V')) mustStop = true; else if (state === 'H_Y' && distToLight > LIGHT_STOP_DIST * 1.5) mustStop = true; } 
                else if (isMovingVertically) { if (state.startsWith('H')) mustStop = true; else if (state === 'V_Y' && distToLight > LIGHT_STOP_DIST * 1.5) mustStop = true; }

                if (mustStop) {
                    if (distToLight < LIGHT_STOP_DIST) speedModifier = 0; else if (distToLight < gridSize) speedModifier = Math.min(speedModifier, (distToLight - LIGHT_STOP_DIST) / (gridSize - LIGHT_STOP_DIST));
                }
            }

            // Direction-Aware Radar Anti-Overlap Brakes
            if (!isEmergencyVehicle) {
                const isLarge = (car.type === 'bus' || car.type === 'firetruck' || car.type === 'deliveryTruck');
                const RADAR_DIST = isLarge ? gridSize * 1.5 : gridSize;

                for (const otherCar of cars) {
                    // --- FIXED BUG HERE: Added !otherCar.state check so radar ignores SWAT and Getaways safely ---
                    if (car.id === otherCar.id || !otherCar.state || otherCar.state.startsWith('at_')) continue; 
                    
                    const dx = otherCar.realX - car.realX; 
                    const dy = otherCar.realY - car.realY;
                    const currentDistance = Math.sqrt(dx * dx + dy * dy);

                    if (currentDistance < RADAR_DIST) {
                        let headingDiff = Math.abs(car.angle - otherCar.angle);
                        while (headingDiff > Math.PI) headingDiff -= Math.PI * 2;
                        headingDiff = Math.abs(headingDiff);
                        
                        const isOppositeDirection = headingDiff > (Math.PI * 0.6); 
                        const isSameDirection = headingDiff < (Math.PI * 0.3);     

                        const angleToOther = Math.atan2(dy, dx);
                        let relativeAngle = Math.abs(angleToOther - car.angle);
                        while (relativeAngle > Math.PI) relativeAngle -= Math.PI * 2;
                        relativeAngle = Math.abs(relativeAngle);

                        if (isSameDirection && relativeAngle < Math.PI / 4) {
                            if (currentDistance < gridSize * 0.45) {
                                speedModifier = 0; 
                            } else {
                                const otherSpeedRatio = (otherCar.currentSpeed / actualSpeed) || 0;
                                speedModifier = Math.min(speedModifier, otherSpeedRatio);
                            }
                        } 
                        else if (!isOppositeDirection && currentDistance < gridSize * 0.6) {
                            const carInRoundabout = roundabouts.some(r => Math.abs(r.x + gridSize/2 - car.realX) < gridSize * 0.8 && Math.abs(r.y + gridSize/2 - car.realY) < gridSize * 0.8);
                            const otherInRoundabout = roundabouts.some(r => Math.abs(r.x + gridSize/2 - otherCar.realX) < gridSize * 0.8 && Math.abs(r.y + gridSize/2 - otherCar.realY) < gridSize * 0.8);
                            
                            if (carInRoundabout && !otherInRoundabout) continue; 
                            
                            if (car.id > otherCar.id) { speedModifier = 0; }
                        }
                    }
                }
            }

            if (speedModifier === 0) { 
                car.stuckTimer = (car.stuckTimer || 0) + 1; 
                if (car.stuckTimer > 150) speedModifier = 1.0; 
            } else { 
                car.stuckTimer = 0; 
                if (car.policeDispatched) car.policeDispatched = false; 
            }

            car.progress += actualSpeed * speedModifier; 
            car.currentSpeed = actualSpeed * speedModifier; 
            
            const curBaseX = currentNode.x + (nextNode.x - currentNode.x) * car.progress + gridSize/2;
            const curBaseY = currentNode.y + (nextNode.y - currentNode.y) * car.progress + gridSize/2;
            car.realX = curBaseX + car.offsetX; car.realY = curBaseY + car.offsetY;

            if (car.progress >= 1.0) { car.progress = 0; car.pathIndex++; }

        } else {
            // --- 4. Destination Reached Logic ---
            if (car.type === 'firetruck') {
                if (car.state === 'driving_emergency') { car.state = 'extinguishing'; car.waitTimer = 120; } else if (car.state === 'driving_home') { cars.splice(i, 1); continue; }
            }
            else if (car.type === 'ambulance') {
                if (car.state === 'driving_emergency') { car.state = 'ambulance_loading'; car.waitTimer = 120; } 
                else if (car.state === 'driving_hospital') {
                    if (car.patientHouse && !car.patientHouse.isAbandoned) { car.patientHouse.hasEmergency = false; car.patientHouse.ambulanceDispatched = false; car.patientHouse.emergencyTimer = 0; }
                    cars.splice(i, 1); continue;
                }
            }
            else if (car.type === 'police') {
                if (car.state === 'driving_emergency') {
                    const jammed = cars.find(c => c.id === car.jammedCarId);
                    if (jammed && jammed.policeDispatched) {
                        jammed.state = 'at_home'; jammed.realX = jammed.home.x + gridSize/2; jammed.realY = jammed.home.y + gridSize/2;
                        jammed.stuckTimer = 0; jammed.policeDispatched = false;
                        car.state = 'police_clearing'; car.waitTimer = 120; 
                    } else { cars.splice(i, 1); continue; }
                } 
            } 
            else if (car.type === 'deliveryTruck') {
                if (car.state === 'driving_delivery') { car.state = 'unloading'; car.waitTimer = 240; } 
                else if (car.state === 'driving_home') { cars.splice(i, 1); continue; }
            }
            else if (car.type === 'bus') { car.state = 'at_stop'; car.waitTimer = 120; car.stopIndex = (car.stopIndex + 1) % busStops.length; car.target = busStops[car.stopIndex]; } 
            else if (car.state === 'driving_work') { car.state = 'at_work'; } 
            else if (car.state === 'driving_shop') { car.state = 'at_shop'; car.waitTimer = 180; } 
            else if (car.state === 'driving_home') { car.state = 'at_home'; if (typeof handleCarReturnedHome === 'function') handleCarReturnedHome(car.home); }
            else if (car.state === 'rioting') {
                if (typeof roads !== 'undefined' && roads.length > 0) {
                    let endPath = roads[Math.floor(Math.random() * roads.length)];
                    if (endPath && endPath.length > 0) {
                        let endNode = endPath[Math.floor(Math.random() * endPath.length)];
                        let startNode = {x: Math.floor(car.realX/gridSize)*gridSize, y: Math.floor(car.realY/gridSize)*gridSize};
                        let route = typeof findPath === 'function' ? findPath(startNode, endNode) : null;
                        if (route) { car.path = route; car.pathIndex = 0; car.progress = 0; } else { cars.splice(i, 1); continue; }
                    } else { cars.splice(i, 1); continue; }
                } else { cars.splice(i, 1); continue; }
            }
        }
        drawCarShape(ctx, car, nightMode);
    }
}

// --- UPGRADED RENDERER FOR SWAT AND GETAWAY CARS ---
function drawCarShape(ctx, car, nightMode) {
    if (car.type === 'rioter') {
        ctx.save(); ctx.translate(car.realX, car.realY);
        const time = Date.now();
        ctx.fillStyle = '#c0392b'; ctx.beginPath(); ctx.arc(-5, Math.sin(time/100)*4, 4, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#e67e22'; ctx.beginPath(); ctx.arc(5, Math.cos(time/120)*4, 4, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#111111'; ctx.beginPath(); ctx.arc(0, Math.sin(time/110 + 2)*4 - 5, 4, 0, Math.PI*2); ctx.fill();
        ctx.restore();
        return; 
    }

    if (car.type === 'deliveryTruck') {
        ctx.save(); ctx.translate(car.realX, car.realY); ctx.rotate(car.angle);
        const w = gridSize * 0.75; const h = gridSize * 0.3;
        
        ctx.fillStyle = '#ecf0f1';
        if (ctx.roundRect) ctx.roundRect(-w/2, -h/2, w * 0.7, h, 2); else ctx.fillRect(-w/2, -h/2, w * 0.7, h); ctx.fill();
        
        ctx.fillStyle = 'red'; 
        if (ctx.roundRect) ctx.roundRect(-w/2 + w * 0.75, -h/2 + 1, w * 0.25, h - 2, 2); else ctx.fillRect(-w/2 + w * 0.75, -h/2 + 1, w * 0.25, h - 2); ctx.fill();
        
        if (nightMode) { ctx.fillStyle = 'rgba(255, 255, 150, 0.9)'; ctx.fillRect(w/2 - 2, -h/2 + 1, 3, 3); ctx.fillRect(w/2 - 2, h/2 - 4, 3, 3); }
        ctx.restore();
        return; 
    }

    const isBus = car.type === 'bus'; 
    const isPolice = car.type.startsWith('police'); 
    const isSwat = car.type === 'swat_van';
    const isGetaway = car.type === 'getaway';
    const isAmbulance = car.type === 'ambulance'; 
    const isFiretruck = car.type === 'firetruck'; 
    
    const carWidth = (isBus || isFiretruck || isSwat) ? gridSize * 0.7 : gridSize * 0.4; 
    const carHeight = (isBus || isFiretruck || isSwat) ? gridSize * 0.3 : gridSize * 0.25;
    
    ctx.save(); ctx.translate(car.realX, car.realY); ctx.rotate(car.angle);

    ctx.fillStyle = car.color; ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(-carWidth/2, -carHeight/2, carWidth, carHeight, 4); else ctx.fillRect(-carWidth/2, -carHeight/2, carWidth, carHeight); ctx.fill();

    if (isAmbulance) { ctx.fillStyle = '#e74c3c'; ctx.fillRect(-carWidth/4, -carHeight/2, carWidth/2, carHeight); }
    if (isFiretruck) { ctx.fillStyle = '#bdc3c7'; ctx.fillRect(-carWidth/2 + 4, -2, carWidth - 8, 4); ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(carWidth/2 - 6, -carHeight/2 + 2, 4, carHeight - 4); }
    if (isSwat) { ctx.fillStyle = '#111111'; ctx.fillRect(-carWidth/4, -carHeight/2 + 2, carWidth/2, carHeight - 4); } // Heavy Armored look
    if (isGetaway) { ctx.fillStyle = '#333'; ctx.fillRect(-carWidth/4, -carHeight/2 + 1, carWidth/2, carHeight - 2); } // Tinted windows

    // Sirens and Flashers
    if (isPolice && (car.state === 'driving_emergency' || car.state === 'police_clearing' || car.state === 'driving_to_crime' || car.state === 'patrolling' || car.type === 'police_pursuit')) {
        const time = Date.now(); if (time % 300 < 150) { ctx.fillStyle = '#ff0000'; ctx.fillRect(-2, -carHeight/2 - 2, 4, 3); } else { ctx.fillStyle = '#0000ff'; ctx.fillRect(-2, carHeight/2 - 1, 4, 3); }
    }
    if (isSwat) {
        const time = Date.now(); if (time % 300 < 150) { ctx.fillStyle = '#0000ff'; ctx.fillRect(-2, -carHeight/2 - 2, 4, 3); } else { ctx.fillStyle = '#ffffff'; ctx.fillRect(-2, carHeight/2 - 1, 4, 3); }
    }
    if ((isAmbulance || isFiretruck) && (car.state === 'driving_emergency' || car.state === 'driving_hospital' || car.state === 'ambulance_loading' || car.state === 'extinguishing')) {
        const time = Date.now(); if (time % 300 < 150) { ctx.fillStyle = '#ff0000'; ctx.fillRect(-2, -carHeight/2 - 2, 4, 3); } else { ctx.fillStyle = '#ffffff'; ctx.fillRect(-2, carHeight/2 - 1, 4, 3); }
    }
    
    // Headlights for Night Mode
    if (nightMode && !isPolice && !isAmbulance && !isFiretruck && !isSwat && !isGetaway) { ctx.fillStyle = 'rgba(255, 255, 150, 0.9)'; ctx.fillRect(carWidth/2 - 2, -carHeight/2 + 2, 3, 3); ctx.fillRect(carWidth/2 - 2, carHeight/2 - 5, 3, 3); }
    if (nightMode && isGetaway) { ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'; ctx.fillRect(carWidth/2 - 2, -carHeight/2 + 2, 3, 3); ctx.fillRect(carWidth/2 - 2, carHeight/2 - 5, 3, 3); }
    
    ctx.restore();
}