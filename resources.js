


function isNearWater(x, y, gridSize) {
    if (typeof getTerrainAt !== 'function') return true; 
    
    const dirs = [
        {dx: 0, dy: -gridSize}, {dx: gridSize, dy: -gridSize},
        {dx: gridSize, dy: 0}, {dx: gridSize, dy: gridSize},
        {dx: 0, dy: gridSize}, {dx: -gridSize, dy: gridSize},
        {dx: -gridSize, dy: 0}, {dx: -gridSize, dy: -gridSize}
    ];
    
    for (let d of dirs) {
        
        const terrainType = getTerrainAt(x + d.dx, y + d.dy);
        if (terrainType === 'water' || terrainType === 'ocean') {
            return true;
        }
    }
    return false;
}


function updateResources(entities, gridSize) {
    
    entities.forEach(e => {
        if (['house', 'office', 'supermarket', 'school', 'policeStation', 'hospital', 'fireStation'].includes(e.type)) {
            e.hasPower = false;
            e.hasWater = false;
        } else {
            e.hasPower = true; 
            e.hasWater = true;
        }
    });

    const powerPlants = entities.filter(e => e.type === 'powerPlant');
    const waterPumps = entities.filter(e => e.type === 'waterPump');

    
    function distribute(sources, resourceType, maxRadius, capacityPerSource) {
        sources.forEach(source => {
            let remainingCapacity = capacityPerSource;
            
            
            const targets = entities.filter(e => e[resourceType] === false && !['powerPlant', 'waterPump', 'road'].includes(e.type))
                .sort((a, b) => {
                    const distA = Math.abs(a.x - source.x) + Math.abs(a.y - source.y);
                    const distB = Math.abs(b.x - source.x) + Math.abs(b.y - source.y);
                    return distA - distB;
                });

            for (const ent of targets) {
                if (remainingCapacity <= 0) break; 
                
                
                const dist = Math.abs(ent.x - source.x) + Math.abs(ent.y - source.y);
                if (dist <= maxRadius) {
                    ent[resourceType] = true;
                    remainingCapacity--;
                }
            }
        });
    }

    
    distribute(powerPlants, 'hasPower', gridSize * 20, 40); 
    
    distribute(waterPumps, 'hasWater', gridSize * 15, 30);  
}