const terrainMap = new Map(); 
let terrainCacheCanvas = null; 

function getTerrainAt(x, y) {
    return terrainMap.get(`${x},${y}`) || null;
}

function generateTerrain(width, height, gridSize) {
    terrainMap.clear();
    const cols = Math.floor(width / gridSize);
    const rows = Math.floor(height / gridSize);

    // 1. The Great Ocean
    for (let x = 0; x < cols; x++) {
        for (let y = 0; y < rows; y++) {
            terrainMap.set(`${x * gridSize},${y * gridSize}`, 'ocean');
        }
    }

    // 2. Multi-Node Island Generation
    const centerX = cols / 2;
    const centerY = rows / 2;
    
    const sizeMult = window.ISLAND_SIZE_MULTIPLIER || 0.55; 
    const maxRadius = (Math.min(cols, rows) / 2) * sizeMult; 
    
    const numNodes = Math.floor(Math.random() * 4) + 1;
    const nodes = [];

    for (let i = 0; i < numNodes; i++) {
        const offsetX = (Math.random() - 0.5) * maxRadius * 0.65;
        const offsetY = (Math.random() - 0.5) * maxRadius * 0.65;
        const radius = (maxRadius * 0.4) + Math.random() * (maxRadius * 0.5);
        nodes.push({ x: centerX + offsetX, y: centerY + offsetY, r: radius });
    }

    for (let x = 0; x < cols; x++) {
        for (let y = 0; y < rows; y++) {
            let isLand = false;

            for (let i = 0; i < nodes.length; i++) {
                const node = nodes[i];
                const dx = x - node.x;
                const dy = y - node.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                const angle = Math.atan2(dy, dx);
                const noise = (Math.sin(angle * 4 + i) * 4) + (Math.cos(angle * 7 - i) * 2) + (Math.sin(angle * 2) * 3);
                
                if (distance < node.r + noise) {
                    isLand = true;
                    break; 
                }
            }

            if (isLand) {
                terrainMap.delete(`${x * gridSize},${y * gridSize}`);
            }
        }
    }

    // --- GATHER LAND TILES FOR LAKES & MOUNTAINS ---
    const landTiles = [];
    for (let x = 0; x < cols; x++) {
        for (let y = 0; y < rows; y++) {
            if (!terrainMap.has(`${x * gridSize},${y * gridSize}`)) {
                landTiles.push({x, y});
            }
        }
    }

    if (landTiles.length === 0) return generateTerrain(width, height, gridSize);

    // 3. Rivers, Lakes, and Mountains
    let riverX = Math.floor(centerX + (Math.random() * maxRadius * 0.5 - maxRadius * 0.25));
    for (let y = 0; y < rows; y++) {
        const key1 = `${riverX * gridSize},${y * gridSize}`;
        const key2 = `${(riverX + 1) * gridSize},${y * gridSize}`;
        
        if (!terrainMap.has(key1)) terrainMap.set(key1, 'water');
        if (!terrainMap.has(key2)) terrainMap.set(key2, 'water');
        
        if (Math.random() > 0.6) riverX--;
        else if (Math.random() > 0.6) riverX++;
    }

    const numLakes = Math.floor(Math.random() * 3) + 2;
    for (let i = 0; i < numLakes; i++) {
        const randomLand = landTiles[Math.floor(Math.random() * landTiles.length)];
        createBlob(randomLand.x * gridSize, randomLand.y * gridSize, gridSize, 'water', 15);
    }

    const numMountains = Math.floor(Math.random() * 4) + 4;
    for (let i = 0; i < numMountains; i++) {
        const randomLand = landTiles[Math.floor(Math.random() * landTiles.length)];
        createBlob(randomLand.x * gridSize, randomLand.y * gridSize, gridSize, 'mountain', 25);
    }

    // --- NEW: CLUSTERED FOREST GENERATION ---
    if (typeof entities !== 'undefined') {
        // FIX: Re-filter landTiles to remove any spots that became rivers or mountains!
        const safeLandTiles = landTiles.filter(tile => getTerrainAt(tile.x * gridSize, tile.y * gridSize) === null);
        
        if (safeLandTiles.length > 0) {
            const totalTreesTarget = Math.floor(safeLandTiles.length * 0.08); // 8% overall density
            let treesPlaced = 0;
            
            // 1. Create dense forest clusters (80% of total trees)
            const clusterCount = Math.floor(Math.random() * 5) + 4; // 4 to 8 forest biomes
            const treesPerCluster = Math.floor((totalTreesTarget * 0.8) / clusterCount);
            
            for (let i = 0; i < clusterCount; i++) {
                const startNode = safeLandTiles[Math.floor(Math.random() * safeLandTiles.length)];
                let currX = startNode.x * gridSize;
                let currY = startNode.y * gridSize;
                
                for (let j = 0; j < treesPerCluster; j++) {
                    if (getTerrainAt(currX, currY) === null && !entities.some(e => e.x === currX && e.y === currY)) {
                        entities.push({ type: 'tree', x: currX, y: currY });
                        treesPlaced++;
                    }
                    
                    const dir = Math.random();
                    if (dir < 0.25) currX += gridSize;
                    else if (dir < 0.5) currX -= gridSize;
                    else if (dir < 0.75) currY += gridSize;
                    else currY -= gridSize;

                    if (getTerrainAt(currX, currY) !== null) {
                        currX = startNode.x * gridSize;
                        currY = startNode.y * gridSize;
                    }
                }
            }
            
            // 2. Scatter individual straggler trees (Remaining 20%)
            const remainingTrees = totalTreesTarget - treesPlaced;
            for (let i = 0; i < remainingTrees; i++) {
                const randomLand = safeLandTiles[Math.floor(Math.random() * safeLandTiles.length)];
                const lx = randomLand.x * gridSize;
                const ly = randomLand.y * gridSize;
                
                // Final safety check to ensure it's empty land
                if (getTerrainAt(lx, ly) === null && !entities.some(e => e.x === lx && e.y === ly)) {
                    entities.push({ type: 'tree', x: lx, y: ly });
                }
            }
        }
    }

    // Generate the visual cache
    renderTerrainCache(width, height, gridSize);
}

function renderTerrainCache(width, height, gridSize) {
    terrainCacheCanvas = document.createElement('canvas');
    terrainCacheCanvas.width = width;
    terrainCacheCanvas.height = height;
    const cacheCtx = terrainCacheCanvas.getContext('2d');

    cacheCtx.fillStyle = '#2B5E8A'; // Ocean
    cacheCtx.fillRect(0, 0, width, height);

    for (let x = 0; x < width; x += gridSize) {
        for (let y = 0; y < height; y += gridSize) {
            const type = getTerrainAt(x, y);

            if (type === null) {
                cacheCtx.fillStyle = '#f0f0f0'; // Land
                cacheCtx.fillRect(x, y, gridSize, gridSize);
            } else if (type === 'water') {
                cacheCtx.fillStyle = '#A0C4FF'; // Water
                cacheCtx.fillRect(x, y, gridSize, gridSize);
            } else if (type === 'mountain') {
                cacheCtx.fillStyle = '#f0f0f0'; // Land underneath
                cacheCtx.fillRect(x, y, gridSize, gridSize);
                
                cacheCtx.fillStyle = '#D3D3D3'; // Mountain peak
                cacheCtx.beginPath();
                cacheCtx.moveTo(x, y + gridSize);
                cacheCtx.lineTo(x + gridSize / 2, y);
                cacheCtx.lineTo(x + gridSize, y + gridSize);
                cacheCtx.fill();
            }
        }
    }
}

function createBlob(startX, startY, gridSize, type, size) {
    let currentX = startX;
    let currentY = startY;

    for (let i = 0; i < size; i++) {
        const key = `${currentX},${currentY}`;
        if (!terrainMap.has(key)) terrainMap.set(key, type);
        
        const dir = Math.random();
        if (dir < 0.25) currentX += gridSize;
        else if (dir < 0.5) currentX -= gridSize;
        else if (dir < 0.75) currentY += gridSize;
        else currentY -= gridSize;
    }
}

function drawTerrain(ctx, gridSize) {
    if (terrainCacheCanvas) {
        ctx.drawImage(terrainCacheCanvas, 0, 0);
    }
}