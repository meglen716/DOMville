


function isRoad(x, y) {
    for (const road of roads) { for (const node of road) { if (node.x === x && node.y === y) return true; } }
    if (isDrawingRoad) { for (const node of currentRoadPath) { if (node.x === x && node.y === y) return true; } }
    return false;
}


function getTrafficWeight(x, y) {
    let weight = 1; 
    if (typeof cars !== 'undefined') {
        for (const car of cars) {
            
            if (Math.abs(car.realX - x) < gridSize * 1.5 && Math.abs(car.realY - y) < gridSize * 1.5) {
                weight += 3; 
            }
        }
    }
    return weight;
}


function findPath(start, target) {
    const startX = Math.floor(start.x/gridSize)*gridSize; const startY = Math.floor(start.y/gridSize)*gridSize;
    const targetX = Math.floor(target.x/gridSize)*gridSize; const targetY = Math.floor(target.y/gridSize)*gridSize;

    
    const openSet = [{ x: startX, y: startY, path: [], cost: 0 }];
    const visited = new Map(); 
    visited.set(`${startX},${startY}`, 0);
    
    const directions = [{ dx: 0, dy: -gridSize }, { dx: 0, dy: gridSize }, { dx: -gridSize, dy: 0 }, { dx: gridSize, dy: 0 }];

    while (openSet.length > 0) {
        
        openSet.sort((a, b) => a.cost - b.cost);
        const current = openSet.shift();

        if (current.x === targetX && current.y === targetY) return current.path;
        
        for (const dir of directions) {
            const nextX = current.x + dir.dx; const nextY = current.y + dir.dy; 
            const key = `${nextX},${nextY}`;
            
            
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

    
    const allRoadPaths = [...roads];
    if (typeof isDrawingRoad !== 'undefined' && isDrawingRoad && currentRoadPath.length > 0) {
        allRoadPaths.push(currentRoadPath);
    }

    
    ctx.strokeStyle = '#404040'; 
    ctx.lineWidth = gridSize - 4;
    
    ctx.beginPath();
    allRoadPaths.forEach(path => {
        if (!path || path.length === 0) return;
        ctx.moveTo(path[0].x + gridSize / 2, path[0].y + gridSize / 2);
        for (let i = 1; i < path.length; i++) {
            ctx.lineTo(path[i].x + gridSize / 2, path[i].y + gridSize / 2);
        }
        
        if (path.length === 1) ctx.lineTo(path[0].x + gridSize / 2 + 1, path[0].y + gridSize / 2);
    });

    
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

    
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 12]);
    
    allRoadPaths.forEach(path => {
        if (!path || path.length === 0) return;

        
        const roadType = path[0].type || 'road'; 
        
        if (roadType === 'bridge') {
            ctx.strokeStyle = '#f1c40f'; 
        } else if (roadType === 'tunnel') {
            ctx.strokeStyle = '#00d2d3'; 
        } else {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)'; 
        }

        ctx.beginPath();
        ctx.moveTo(path[0].x + gridSize / 2, path[0].y + gridSize / 2);
        for (let i = 1; i < path.length; i++) {
            ctx.lineTo(path[i].x + gridSize / 2, path[i].y + gridSize / 2);
        }
        if (path.length === 1) ctx.lineTo(path[0].x + gridSize / 2 + 1, path[0].y + gridSize / 2);
        
        ctx.stroke();
    });
    
    ctx.setLineDash([]); 
}