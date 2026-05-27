// roads.js
// Handles all road detection, pathfinding logic, and road rendering.

function isRoad(x, y) {
    for (const road of roads) { for (const node of road) { if (node.x === x && node.y === y) return true; } }
    if (isDrawingRoad) { for (const node of currentRoadPath) { if (node.x === x && node.y === y) return true; } }
    return false;
}

// --- NEW: Smart Traffic Weighting ---
function getTrafficWeight(x, y) {
    let weight = 1; // Base cost of driving 1 block
    if (typeof cars !== 'undefined') {
        for (const car of cars) {
            // If a car is physically near this intersection, increase the "cost" of routing here
            if (Math.abs(car.realX - x) < gridSize * 1.5 && Math.abs(car.realY - y) < gridSize * 1.5) {
                weight += 3; // Traffic penalty
            }
        }
    }
    return weight;
}

// --- UPDATED: A* Pathfinding (Waze-style Routing) ---
function findPath(start, target) {
    const startX = Math.floor(start.x/gridSize)*gridSize; const startY = Math.floor(start.y/gridSize)*gridSize;
    const targetX = Math.floor(target.x/gridSize)*gridSize; const targetY = Math.floor(target.y/gridSize)*gridSize;

    // We now track the 'cost' of the path to avoid traffic
    const openSet = [{ x: startX, y: startY, path: [], cost: 0 }];
    const visited = new Map(); 
    visited.set(`${startX},${startY}`, 0);
    
    const directions = [{ dx: 0, dy: -gridSize }, { dx: 0, dy: gridSize }, { dx: -gridSize, dy: 0 }, { dx: gridSize, dy: 0 }];

    while (openSet.length > 0) {
        // Sort to always process the fastest/cheapest route first
        openSet.sort((a, b) => a.cost - b.cost);
        const current = openSet.shift();

        if (current.x === targetX && current.y === targetY) return current.path;
        
        for (const dir of directions) {
            const nextX = current.x + dir.dx; const nextY = current.y + dir.dy; 
            const key = `${nextX},${nextY}`;
            
            // Logic for snapping exactly to house driveways
            if (current.x === startX && current.y === startY && start.type === 'house' && start.driveway) {
                if (nextX !== start.driveway.x || nextY !== start.driveway.y) continue;
            }
            
            if (nextX === targetX && nextY === targetY) {
                if (target.type === 'house' && target.driveway) {
                    if (current.x !== target.driveway.x || current.y !== target.driveway.y) continue;
                }
                const newCost = current.cost + 1;
                if (!visited.has(key) || newCost < visited.get(key)) {
                    visited.set(key, newCost);
                    openSet.push({ x: nextX, y: nextY, path: [...current.path, { x: nextX, y: nextY }], cost: newCost });
                }
            } 
            else if (isRoad(nextX, nextY)) {
                // Calculate dynamic cost based on current traffic density
                const trafficPenalty = getTrafficWeight(nextX, nextY);
                const newCost = current.cost + trafficPenalty;

                if (!visited.has(key) || newCost < visited.get(key)) {
                    visited.set(key, newCost); 
                    openSet.push({ x: nextX, y: nextY, path: [...current.path, { x: nextX, y: nextY }], cost: newCost });
                }
            }
        }
    }
    return null; 
}

function drawAllRoadsAndBridges() {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Combine saved roads with the one currently being drawn for live-preview
    const allRoadPaths = [...roads];
    if (typeof isDrawingRoad !== 'undefined' && isDrawingRoad && currentRoadPath.length > 0) {
        allRoadPaths.push(currentRoadPath);
    }

    // --- 1. Draw the Base Asphalt (Unified Dark Gray) ---
    ctx.strokeStyle = '#404040'; 
    ctx.lineWidth = gridSize - 4;
    
    ctx.beginPath();
    allRoadPaths.forEach(path => {
        if (!path || path.length === 0) return;
        ctx.moveTo(path[0].x + gridSize / 2, path[0].y + gridSize / 2);
        for (let i = 1; i < path.length; i++) {
            ctx.lineTo(path[i].x + gridSize / 2, path[i].y + gridSize / 2);
        }
        // Draw a dot if it's a single tile
        if (path.length === 1) ctx.lineTo(path[0].x + gridSize / 2 + 1, path[0].y + gridSize / 2);
    });

    // Auto-Connect to Adjacent Paths (Creates seamless Intersections)
    allRoadPaths.forEach(path => {
        path.forEach(node => {
            const nx = node.x; const ny = node.y;
            if (typeof isRoad === 'function') {
                if (isRoad(nx + gridSize, ny)) {
                    ctx.moveTo(nx + gridSize / 2, ny + gridSize / 2);
                    ctx.lineTo(nx + gridSize + gridSize / 2, ny + gridSize / 2);
                }
                if (isRoad(nx, ny + gridSize)) {
                    ctx.moveTo(nx + gridSize / 2, ny + gridSize / 2);
                    ctx.lineTo(nx + gridSize / 2, ny + gridSize + gridSize / 2);
                }
            }
        });
    });
    ctx.stroke();

    // --- 2. Draw the Colored Dashed Center Lines ---
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 12]);
    
    allRoadPaths.forEach(path => {
        if (!path || path.length === 0) return;

        // Safely check the type of the road (default to regular road if undefined)
        const roadType = path[0].type || 'road'; 
        
        if (roadType === 'bridge') {
            ctx.strokeStyle = '#f1c40f'; // Yellow Dashes
        } else if (roadType === 'tunnel') {
            ctx.strokeStyle = '#00d2d3'; // Cyan Dashes
        } else {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)'; // White Dashes
        }

        ctx.beginPath();
        ctx.moveTo(path[0].x + gridSize / 2, path[0].y + gridSize / 2);
        for (let i = 1; i < path.length; i++) {
            ctx.lineTo(path[i].x + gridSize / 2, path[i].y + gridSize / 2);
        }
        if (path.length === 1) ctx.lineTo(path[0].x + gridSize / 2 + 1, path[0].y + gridSize / 2);
        
        ctx.stroke();
    });
    
    ctx.setLineDash([]); // Reset so buildings don't become dashed
}