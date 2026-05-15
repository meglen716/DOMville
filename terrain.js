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

    // 2. Carving a Circular Island with Random Size
    const centerX = cols / 2;
    const centerY = rows / 2;
    
    // Randomize the island size to be anywhere from 15% to 45% of the world size
    const minRadius = (cols / 2) * 0.15;
    const maxRadius = (cols / 2) * 0.45;
    const baseRadius = minRadius + Math.random() * (maxRadius - minRadius);

    for (let x = 0; x < cols; x++) {
        for (let y = 0; y < rows; y++) {
            const dx = x - centerX;
            const dy = y - centerY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Smoothed out sine waves to keep it circular but slightly organic
            const angle = Math.atan2(dy, dx);
            const coastlineBump = (Math.sin(angle * 3) * 3) + (Math.cos(angle * 5) * 2);
            const boundary = baseRadius + coastlineBump;

            if (distance < boundary) {
                terrainMap.delete(`${x * gridSize},${y * gridSize}`); // Make it buildable land
            }
        }
    }

    // 3. Rivers, Lakes, and Mountains
    let riverX = Math.floor(centerX + (Math.random() * baseRadius - baseRadius / 2));
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
        const startX = Math.floor(centerX + (Math.random() * baseRadius - baseRadius / 2)) * gridSize;
        const startY = Math.floor(centerY + (Math.random() * baseRadius - baseRadius / 2)) * gridSize;
        createBlob(startX, startY, gridSize, 'water', 15);
    }

    const numMountains = Math.floor(Math.random() * 4) + 3;
    for (let i = 0; i < numMountains; i++) {
        const startX = Math.floor(centerX + (Math.random() * baseRadius - baseRadius / 2)) * gridSize;
        const startY = Math.floor(centerY + (Math.random() * baseRadius - baseRadius / 2)) * gridSize;
        createBlob(startX, startY, gridSize, 'mountain', 20);
    }

    // Generate the visual cache
    renderTerrainCache(width, height, gridSize);
}

// Extracted into its own function so we can call it after loading a saved game
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