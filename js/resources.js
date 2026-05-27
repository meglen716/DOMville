// resources.js

// Checks the 8 tiles surrounding a coordinate to see if it touches water
function isNearWater(x, y, gridSize) {
    if (typeof getTerrainAt !== 'function') return true; // Fallback if terrain map is missing
    
    const dirs = [
        {dx: 0, dy: -gridSize}, {dx: gridSize, dy: -gridSize},
        {dx: gridSize, dy: 0}, {dx: gridSize, dy: gridSize},
        {dx: 0, dy: gridSize}, {dx: -gridSize, dy: gridSize},
        {dx: -gridSize, dy: 0}, {dx: -gridSize, dy: -gridSize}
    ];
    
    for (let d of dirs) {
        // Convert screen/world coordinates to grid index for the terrain map check
        const terrainType = getTerrainAt(x + d.dx, y + d.dy);
        if (terrainType === 'water' || terrainType === 'ocean') {
            return true;
        }
    }
    return false;
}

// Calculates power and water distribution
function updateResources(entities, gridSize) {
    // 1. Reset all buildings to have NO power and NO water
    entities.forEach(e => {
        if (['house', 'office', 'supermarket', 'school', 'policeStation', 'hospital', 'fireStation'].includes(e.type)) {
            e.hasPower = false;
            e.hasWater = false;
        } else {
            e.hasPower = true; // Utilities power themselves
            e.hasWater = true;
        }
    });

    const powerPlants = entities.filter(e => e.type === 'powerPlant');
    const waterPumps = entities.filter(e => e.type === 'waterPump');

    // 2. Helper function to distribute utilities
    function distribute(sources, resourceType, maxRadius, capacityPerSource) {
        sources.forEach(source => {
            let remainingCapacity = capacityPerSource;
            
            // Get all unpowered/unwatered buildings, sort by closest first
            const targets = entities.filter(e => e[resourceType] === false && !['powerPlant', 'waterPump', 'road'].includes(e.type))
                .sort((a, b) => {
                    const distA = Math.abs(a.x - source.x) + Math.abs(a.y - source.y);
                    const distB = Math.abs(b.x - source.x) + Math.abs(b.y - source.y);
                    return distA - distB;
                });

            for (const ent of targets) {
                if (remainingCapacity <= 0) break; // Source is overloaded!
                
                // Manhattan distance radius
                const dist = Math.abs(ent.x - source.x) + Math.abs(ent.y - source.y);
                if (dist <= maxRadius) {
                    ent[resourceType] = true;
                    remainingCapacity--;
                }
            }
        });
    }

    // A Power Plant reaches 20 tiles and powers 40 buildings
    distribute(powerPlants, 'hasPower', gridSize * 20, 40); 
    // A Water Pump reaches 15 tiles and waters 30 buildings
    distribute(waterPumps, 'hasWater', gridSize * 15, 30);  
}