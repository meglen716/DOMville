



const ZONE_PROPS = {
    office: { color: '#3498db', nightLight: 'rgba(200, 230, 255, 0.7)', capacity: 10 }, 
    supermarket: { color: '#f1c40f', nightLight: 'rgba(255, 255, 200, 0.8)', capacity: 15 }, 
    school: { color: '#9b59b6', nightLight: null, capacity: 5 },
    policeStation: { color: '#2c3e50', nightLight: 'police_flash', capacity: 99 },
    hospital: { color: '#e74c3c', nightLight: 'hospital_flash', capacity: 99 },
    fireStation: { color: '#d35400', nightLight: 'fire_flash', capacity: 99 },
    powerPlant: { color: '#7f8c8d', nightLight: 'rgba(241, 196, 15, 0.5)', capacity: 99 },
    waterPump: { color: '#2980b9', nightLight: 'rgba(52, 152, 219, 0.5)', capacity: 99 },
    
    park: { color: '#2ecc71', nightLight: null, capacity: 0 } 
};

function drawZone(ctx, entity, gridSize, nightMode, currentOccupancy) {
    const props = ZONE_PROPS[entity.type];
    if (!props) return;

    ctx.fillStyle = props.color;
    ctx.fillRect(entity.x + 4, entity.y + 4, gridSize - 8, gridSize - 8);

    
    if (entity.type === 'hospital') {
        ctx.fillStyle = 'white';
        ctx.fillRect(entity.x + gridSize/2 - 3, entity.y + 12, 6, gridSize - 24);
        ctx.fillRect(entity.x + 12, entity.y + gridSize/2 - 3, gridSize - 24, 6);
    }
    else if (entity.type === 'fireStation') {
        ctx.fillStyle = '#2c3e50';
        ctx.fillRect(entity.x + 8, entity.y + gridSize - 12, 10, 12);
        ctx.fillRect(entity.x + gridSize - 18, entity.y + gridSize - 12, 10, 12);
    }
    else if (entity.type === 'powerPlant') {
        ctx.fillStyle = '#f1c40f'; ctx.font = `bold ${gridSize * 0.6}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('⚡', entity.x + gridSize/2, entity.y + gridSize/2 + 2);
    }
    else if (entity.type === 'waterPump') {
        ctx.fillStyle = '#3498db'; ctx.font = `bold ${gridSize * 0.6}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('💧', entity.x + gridSize/2, entity.y + gridSize/2);
    }
    else if (entity.type === 'park') {
        
        ctx.fillStyle = '#27ae60';
        ctx.beginPath();
        ctx.arc(entity.x + gridSize/2 - 6, entity.y + gridSize/2 + 4, 8, 0, Math.PI*2);
        ctx.arc(entity.x + gridSize/2 + 6, entity.y + gridSize/2 + 4, 6, 0, Math.PI*2);
        ctx.arc(entity.x + gridSize/2, entity.y + gridSize/2 - 6, 10, 0, Math.PI*2);
        ctx.fill();
    }

    
    if (currentOccupancy !== undefined && ['office', 'supermarket', 'school'].includes(entity.type)) {
        const fillPercentage = currentOccupancy / props.capacity;
        const barWidth = gridSize - 16;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'; ctx.fillRect(entity.x + 8, entity.y + gridSize - 12, barWidth, 4);
        ctx.fillStyle = fillPercentage >= 1 ? '#FF4757' : '#2ecc71'; ctx.fillRect(entity.x + 8, entity.y + gridSize - 12, barWidth * Math.min(1, fillPercentage), 4);
    }
}


function drawFireAnimation(ctx, ent, gridSize) {
    if (!ent.fireLevel || ent.fireLevel <= 0) return;
    
    const time = Date.now();
    ctx.save();
    
    
    const flameCount = ent.fireLevel * 3; 
    for (let i = 0; i < flameCount; i++) {
        const flickerX = Math.sin(time / 100 + i) * 3;
        const flickerY = Math.cos(time / 80 + i) * 4;
        
        const baseX = ent.x + (gridSize/2) + (Math.random() * 20 - 10);
        const baseY = ent.y + (gridSize/2) + 10;
        
        ctx.fillStyle = i % 2 === 0 ? 'rgba(231, 76, 60, 0.9)' : 'rgba(241, 196, 15, 0.9)';
        ctx.beginPath();
        ctx.moveTo(baseX - 6, baseY);
        ctx.lineTo(baseX + 6, baseY);
        ctx.lineTo(baseX + flickerX, baseY - 15 - flickerY - (ent.fireLevel * 5)); 
        ctx.fill();
    }
    ctx.restore();
}