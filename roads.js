// roads.js
// Handles all road detection, pathfinding logic, and road rendering.

function isRoad(x, y) {
    for (const road of roads) { for (const node of road) { if (node.x === x && node.y === y) return true; } }
    if (isDrawingRoad) { for (const node of currentRoadPath) { if (node.x === x && node.y === y) return true; } }
    return false;
}

function findPath(start, target) {
    const startX = Math.floor(start.x/gridSize)*gridSize; const startY = Math.floor(start.y/gridSize)*gridSize;
    const targetX = Math.floor(target.x/gridSize)*gridSize; const targetY = Math.floor(target.y/gridSize)*gridSize;

    const queue = [{ x: startX, y: startY, path: [] }];
    const visited = new Set(); visited.add(`${startX},${startY}`);
    const directions = [{ dx: 0, dy: -gridSize }, { dx: 0, dy: gridSize }, { dx: -gridSize, dy: 0 }, { dx: gridSize, dy: 0 }];

    while (queue.length > 0) {
        const current = queue.shift();
        if (current.x === targetX && current.y === targetY) return current.path;
        
        for (const dir of directions) {
            const nextX = current.x + dir.dx; const nextY = current.y + dir.dy; const key = `${nextX},${nextY}`;
            
            if (!visited.has(key)) {
                if (current.x === startX && current.y === startY && start.type === 'house' && start.driveway) {
                    if (nextX !== start.driveway.x || nextY !== start.driveway.y) continue;
                }
                if (nextX === targetX && nextY === targetY) {
                    if (target.type === 'house' && target.driveway) {
                        if (current.x !== target.driveway.x || current.y !== target.driveway.y) continue;
                    }
                    visited.add(key); queue.push({ x: nextX, y: nextY, path: [...current.path, { x: nextX, y: nextY }] });
                } 
                else if (isRoad(nextX, nextY)) {
                    visited.add(key); queue.push({ x: nextX, y: nextY, path: [...current.path, { x: nextX, y: nextY }] });
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
    if (isDrawingRoad && currentRoadPath.length > 0) {
        allRoadPaths.push(currentRoadPath);
    }

    // --- 1. Draw the Base Asphalt ---
    ctx.strokeStyle = '#404040'; 
    ctx.lineWidth = gridSize - 4;
    
    ctx.beginPath();
    
    // Draw the sequential paths
    allRoadPaths.forEach(path => {
        if (!path || path.length === 0) return;
        ctx.moveTo(path[0].x + gridSize / 2, path[0].y + gridSize / 2);
        for (let i = 1; i < path.length; i++) {
            ctx.lineTo(path[i].x + gridSize / 2, path[i].y + gridSize / 2);
        }
        // Draw a dot if it's a single tile
        if (path.length === 1) ctx.lineTo(path[0].x + gridSize / 2 + 1, path[0].y + gridSize / 2);
    });

    // Auto-Connect to Adjacent Paths (Creates seamless T-Junctions and Intersections)
    allRoadPaths.forEach(path => {
        path.forEach(node => {
            const nx = node.x; const ny = node.y;
            // Only check right and down to prevent drawing the same connection twice
            if (isRoad(nx + gridSize, ny)) {
                ctx.moveTo(nx + gridSize / 2, ny + gridSize / 2);
                ctx.lineTo(nx + gridSize + gridSize / 2, ny + gridSize / 2);
            }
            if (isRoad(nx, ny + gridSize)) {
                ctx.moveTo(nx + gridSize / 2, ny + gridSize / 2);
                ctx.lineTo(nx + gridSize / 2, ny + gridSize + gridSize / 2);
            }
        });
    });
    ctx.stroke();

    // --- 2. Draw the Dashed Center Lines ---
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 12]);
    
    ctx.beginPath();
    // We only draw dashes along the main travel paths to keep intersections clean
    allRoadPaths.forEach(path => {
        if (!path || path.length === 0) return;
        ctx.moveTo(path[0].x + gridSize / 2, path[0].y + gridSize / 2);
        for (let i = 1; i < path.length; i++) {
            ctx.lineTo(path[i].x + gridSize / 2, path[i].y + gridSize / 2);
        }
        if (path.length === 1) ctx.lineTo(path[0].x + gridSize / 2 + 1, path[0].y + gridSize / 2);
    });
    ctx.stroke();
    
    ctx.setLineDash([]); // Reset so buildings don't become dashed
}