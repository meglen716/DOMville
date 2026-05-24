


const HOUSE_LEVELS = {
    1: { maxCars: 2, pop: 2, growthNeeded: 3, color: '#FF6B6B', sizeMult: 0.8 },
    2: { maxCars: 3, pop: 5, growthNeeded: 8, color: '#FF4757', sizeMult: 1.0 },
    3: { maxCars: 5, pop: 12, growthNeeded: Infinity, color: '#C0392B', sizeMult: 1.2 } 
};


function initHouseStats(house) {
    house.level = 1;
    house.growth = 0; 
    house.population = HOUSE_LEVELS[1].pop;
    house.maxCars = HOUSE_LEVELS[1].maxCars;
    house.color = HOUSE_LEVELS[1].color;
}


function handleCarReturnedHome(house) {
    
    if (!house || house.isBurned || house.isAbandoned || house.type !== 'house') {
        return; 
    }

    if (house.level >= 3) return; 

    house.growth += 1; 

    
    if (house.growth >= HOUSE_LEVELS[house.level].growthNeeded) {
        upgradeHouse(house);
    }
}


function upgradeHouse(house) {
    house.level += 1;
    playSFX('upgrade', 0.3);
    house.growth = 0; 
    house.population = HOUSE_LEVELS[house.level].pop;
    house.maxCars = HOUSE_LEVELS[house.level].maxCars;
    house.color = HOUSE_LEVELS[house.level].color;
    
    
    if (typeof logActivity === 'function') {
        logActivity(`A residence upgraded to Level ${house.level}!`, "upgrade");
    }
    
    console.log(`House upgraded to Level ${house.level}!`);
}


function getTotalPopulation(entities) {
    return entities
        .filter(ent => ent.type === 'house')
        .reduce((sum, house) => sum + (house.population || 0), 0);
}


function drawPopulationUI(ctx, entities) {
    const totalPop = getTotalPopulation(entities);
    
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.beginPath();
    ctx.roundRect(20, 20, 180, 50, 10);
    ctx.fill();
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 2;
    ctx.stroke();

    
    ctx.fillStyle = '#333333';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText(`👥 Population: ${totalPop}`, 35, 52);
}