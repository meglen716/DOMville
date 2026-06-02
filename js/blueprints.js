const BLUEPRINTS = {
    // --- ALL BUILDINGS (Grid size is 40x40, max building size ~30x30 to allow margins) ---
    house: {
        width: 24, height: 24,
        colors: { base: '#d1d8e0', roof: '#ff4757', nightWindows: '#ffa502' }
    },
    supermarket: { 
        width: 26, height: 26, 
        colors: { base: '#ced6e0', stripe1: '#007f5f', stripe2: '#d35400', stripe3: '#c0392b', roof: '#ecf0f1' }
    },
    waterPump: {
        width: 24, height: 24,
        colors: { base: '#1e90ff', dome: '#70a1ff', pipe: '#95a5a6' }
    },
    office: {
        width: 24, height: 28, 
        colors: { base: '#2c3e50', windows: '#85c1e9', nightWindows: '#f1c40f', bush: '#27ae60' }
    },
    policeStation: {
        width: 26, height: 26, 
        colors: { base: '#4b7bec', roof: '#3867d6', door: '#2f3542', windows: '#ff7f50' }
    },
    factory: {
        width: 26, height: 26, 
        colors: { base: '#34495e', chimney: '#7f8c8d' }
    },
    powerPlant: {
        width: 26, height: 26, 
        colors: { base: '#747d8c', tower: '#bdc3c7' }
    },
    school: {
        width: 26, height: 26, 
        colors: { base: '#f7b731', roof: '#fd9644', flagPole: '#2f3542', flag: '#2d98da' }
    },
    farm: {
        width: 26, height: 28, 
        colors: { base: '#ff4757', door: '#ced6e0', blades: '#404040', hub: '#2c3e50' } 
    },
    hospital: {
        width: 26, height: 26, 
        colors: { base: '#ced6e0', roof: '#bdc3c7', cross: '#e74c3c' }
    },
    fireStation: {
        width: 26, height: 26, 
        colors: { base: '#eb3b5a', roof: '#fd9644', door: '#111111', ladder: '#bdc3c7' } 
    },
    park: {
        width: 28, height: 28, 
        colors: { benchWood: '#5c4033', benchLegs: '#111111', trunk: '#8B4513', leaf1: '#2ecc71', leaf2: '#27ae60', leaf3: '#1e8449' }
    },
    trainStation: {
        width: 30, height: 26,
        colors: { base: '#7f8c8d', roof: '#aed6f1', tunnel: '#111111' }
    }
};

// ==========================================
// MASTER RENDERER
// ==========================================

function drawBuilding(ctx, ent, gridSize, nightMode) {
    const style = BLUEPRINTS[ent.type];
    if (!style) return; 

    const w = style.width;
    const h = style.height;
    const time = Date.now();
    const showLines = window.showBuildingOutlines !== false; 

    ctx.save();
    ctx.translate(ent.x + gridSize / 2, ent.y + gridSize / 2);

    ctx.lineWidth = 1;
    ctx.strokeStyle = '#000000';

    switch (ent.type) {
        case 'house':
            const lvl = ent.level || 1;
            ctx.fillStyle = style.colors.base;
            
            const hW = lvl === 1 ? w * 0.7 : w * 0.9; 
            const hH = lvl === 3 ? h * 0.9 : h * 0.6;
            const yOffset = lvl === 3 ? -h * 0.2 : 0;
            
            ctx.fillRect(-hW/2, yOffset, hW, hH); 
            if (showLines) ctx.strokeRect(-hW/2, yOffset, hW, hH);
            
            ctx.fillStyle = style.colors.roof;
            ctx.beginPath();
            ctx.moveTo(-hW/2 - 4, yOffset);
            ctx.lineTo(hW/2 + 4, yOffset);
            ctx.lineTo(0, yOffset - h*0.4);
            ctx.closePath();
            ctx.fill(); 
            if (showLines) ctx.stroke();

            ctx.fillStyle = (nightMode && ent.hasPower !== false) ? style.colors.nightWindows : '#34495e';
            
            if (lvl === 1) {
                ctx.fillRect(-2, yOffset + hH/2 - 4, 4, 6); 
                if (showLines) ctx.strokeRect(-2, yOffset + hH/2 - 4, 4, 6);
            } else {
                ctx.fillRect(-hW/4 - 2, yOffset + hH/2 - 4, 4, 6); if (showLines) ctx.strokeRect(-hW/4 - 2, yOffset + hH/2 - 4, 4, 6);
                ctx.fillRect(hW/4 - 2, yOffset + hH/2 - 4, 4, 6); if (showLines) ctx.strokeRect(hW/4 - 2, yOffset + hH/2 - 4, 4, 6);
            }
            if (lvl === 3) {
                ctx.fillRect(-hW/4 - 2, yOffset + 4, 4, 6); if (showLines) ctx.strokeRect(-hW/4 - 2, yOffset + 4, 4, 6);
                ctx.fillRect(hW/4 - 2, yOffset + 4, 4, 6); if (showLines) ctx.strokeRect(hW/4 - 2, yOffset + 4, 4, 6);
            }
            break;

        case 'supermarket': 
            ctx.fillStyle = style.colors.base;
            ctx.fillRect(-w/2, -h/2 + 8, w, h - 8);
            if (showLines) ctx.strokeRect(-w/2, -h/2 + 8, w, h - 8);
            
            ctx.fillStyle = style.colors.stripe1; ctx.fillRect(-w/2 - 2, -h/2 + 4, w + 4, 3);
            ctx.fillStyle = style.colors.stripe2; ctx.fillRect(-w/2 - 2, -h/2 + 7, w + 4, 3);
            ctx.fillStyle = style.colors.stripe3; ctx.fillRect(-w/2 - 2, -h/2 + 10, w + 4, 2);
            if (showLines) ctx.strokeRect(-w/2 - 2, -h/2 + 4, w + 4, 8); 
            
            ctx.fillStyle = style.colors.stripe2;
            ctx.font = 'bold 12px sans-serif'; 
            ctx.textAlign = 'center'; 
            ctx.textBaseline = 'middle';
            ctx.fillText('7', 0, 4);

            ctx.fillStyle = nightMode ? '#f1c40f' : '#85c1e9';
            ctx.fillRect(-6, h/2 - 8, 12, 8);
            if (showLines) ctx.strokeRect(-6, h/2 - 8, 12, 8);
            break;

        case 'office':
            ctx.fillStyle = style.colors.base;
            ctx.fillRect(-w/2, -h/2 + 2, w, h - 2); 
            if (showLines) ctx.strokeRect(-w/2, -h/2 + 2, w, h - 2);
            
            ctx.fillStyle = (nightMode && ent.hasPower !== false) ? style.colors.nightWindows : style.colors.windows;
            for (let row = 0; row < 3; row++) {
                for (let col = 0; col < 2; col++) {
                    let wx = -w/4 - 3 + col * (w/2 + 2);
                    let wy = -h/2 + 6 + row * 7;
                    ctx.fillRect(wx, wy, 4, 4);
                    if (showLines) ctx.strokeRect(wx, wy, 4, 4);
                }
            }
            
            ctx.fillStyle = style.colors.bush;
            ctx.beginPath(); 
            ctx.arc(w/2 - 2, h/2 - 2, 4, 0, Math.PI * 2); 
            ctx.fill();
            if (showLines) ctx.stroke();
            break;

        case 'policeStation':
            ctx.fillStyle = style.colors.base;
            ctx.fillRect(-w/2, -h/2 + 8, w, h - 8);
            if (showLines) ctx.strokeRect(-w/2, -h/2 + 8, w, h - 8);
            
            ctx.fillStyle = style.colors.roof;
            ctx.fillRect(-w/2 - 2, -h/2, w + 4, 8);
            if (showLines) ctx.strokeRect(-w/2 - 2, -h/2, w + 4, 8);
            
            ctx.fillStyle = '#f1c40f';
            ctx.beginPath();
            ctx.arc(0, -h/2 + 4, 3.5, 0, Math.PI * 2);
            ctx.fill(); 
            if (showLines) ctx.stroke();
            
            ctx.fillStyle = style.colors.door;
            ctx.fillRect(-6, h/2 - 10, 12, 10);
            if (showLines) ctx.strokeRect(-6, h/2 - 10, 12, 10);
            break;

        case 'waterPump':
            ctx.fillStyle = style.colors.pipe;
            ctx.fillRect(-w/2 + 6, h*0.2, 4, h*0.3); if (showLines) ctx.strokeRect(-w/2 + 6, h*0.2, 4, h*0.3);
            ctx.fillRect(w/2 - 10, h*0.2, 4, h*0.3); if (showLines) ctx.strokeRect(w/2 - 10, h*0.2, 4, h*0.3);
            
            ctx.fillStyle = style.colors.dome;
            ctx.beginPath();
            if (ctx.roundRect) {
                ctx.roundRect(-w/2 + 1, -h/2, w - 2, h * 0.7, 6);
            } else {
                ctx.rect(-w/2 + 1, -h/2, w - 2, h * 0.7);
            }
            ctx.fill(); 
            if (showLines) ctx.stroke();
            
            ctx.beginPath(); ctx.moveTo(-w/2 + 1, -h/4); ctx.lineTo(w/2 - 1, -h/4); 
            if (showLines) ctx.stroke();
            break;

        case 'factory':
            ctx.fillStyle = style.colors.base;
            ctx.fillRect(-w/2, 0, w, h/2);
            if (showLines) ctx.strokeRect(-w/2, 0, w, h/2);
            
            ctx.fillStyle = style.colors.chimney;
            ctx.fillRect(-w/4 - 4, -h/2, 8, h/2); if (showLines) ctx.strokeRect(-w/4 - 4, -h/2, 8, h/2);
            ctx.fillRect(w/4 - 4, -h/2, 8, h/2); if (showLines) ctx.strokeRect(w/4 - 4, -h/2, 8, h/2);
            
            if (ent.hasPower !== false && !ent.isAbandoned && !ent.isBurned && !ent.isRebuilding) {
                if (Math.random() < 0.05 && typeof spawnSmokeParticle === 'function') {
                    spawnSmokeParticle(ent.x + gridSize/2 - w/4, ent.y + gridSize/2 - h/2);
                    spawnSmokeParticle(ent.x + gridSize/2 + w/4, ent.y + gridSize/2 - h/2);
                }
            }
            break;

        case 'powerPlant':
            ctx.fillStyle = style.colors.base;
            ctx.beginPath();
            ctx.moveTo(-w/2, h/2);  
            ctx.lineTo(w/2, h/2);    
            ctx.lineTo(w/4, -h/2);   
            ctx.lineTo(-w/4, -h/2);  
            ctx.closePath();
            ctx.fill(); 
            if (showLines) ctx.stroke();

            if (ent.hasPower !== false && !ent.isAbandoned && !ent.isBurned && !ent.isRebuilding) {
                if (Math.random() < 0.08 && typeof spawnSmokeParticle === 'function') {
                    spawnSmokeParticle(ent.x + gridSize/2, ent.y + gridSize/2 - h/2);
                }
            }
            break;

        case 'school':
            ctx.fillStyle = style.colors.base;
            ctx.fillRect(-w/2, -h/4, w, h * 0.75); if (showLines) ctx.strokeRect(-w/2, -h/4, w, h * 0.75);
            
            ctx.fillStyle = style.colors.roof;
            ctx.fillRect(-w/2 - 2, -h/4 - 6, w + 4, 6); if (showLines) ctx.strokeRect(-w/2 - 2, -h/4 - 6, w + 4, 6);
            
            ctx.fillStyle = style.colors.flagPole;
            ctx.fillRect(-w/2 + 4, -14, 2, 14 + h/2); 
            if (showLines) ctx.strokeRect(-w/2 + 4, -14, 2, 14 + h/2);
            
            ctx.fillStyle = style.colors.flag;
            const flagWave = Math.sin(time / 200) * 3;
            ctx.beginPath();
            ctx.moveTo(-w/2 + 6, -13);
            ctx.lineTo(-w/2 + 14 + flagWave, -11);
            ctx.lineTo(-w/2 + 6, -9);
            ctx.closePath();
            ctx.fill(); 
            if (showLines) ctx.stroke();
            break;

        case 'farm':
            // 1. Draw the Base Barn (Pitched Roof Silhouette)
            ctx.fillStyle = style.colors.base;
            ctx.beginPath();
            ctx.moveTo(-w/2, h/2);      
            ctx.lineTo(w/2, h/2);       
            ctx.lineTo(w/4, -h/2);      
            ctx.lineTo(-w/4, -h/2);     
            ctx.closePath();
            ctx.fill(); 
            if (showLines) ctx.stroke();
            
            // 2. Draw the Barn Door
            const doorW = w * 0.45;
            const doorH = h * 0.55;
            ctx.fillStyle = style.colors.door;
            ctx.fillRect(-doorW/2, h/2 - doorH, doorW, doorH); 
            if (showLines) ctx.strokeRect(-doorW/2, h/2 - doorH, doorW, doorH);
            if (showLines) {
                ctx.beginPath(); ctx.moveTo(0, h/2 - doorH); ctx.lineTo(0, h/2); ctx.stroke();
            }

            // 3. Draw the Spinning Windmill Blades
            ctx.save();
            ctx.translate(0, -h/4 + 2); 
            
            // The magic math that makes it spin smoothly based on real-time!
            let isStorming = typeof getWeatherState === 'function' && getWeatherState().toUpperCase() === 'STORM';
            let spinSpeed = isStorming ? 750 : 1500; // 750ms in a storm, 1500ms normally
            let angle = (time % spinSpeed) / spinSpeed * (Math.PI * 2);
            
            ctx.rotate(angle); 
            
            // Draw the 4 intersecting wooden blades
            ctx.fillStyle = style.colors.blades;
            for (let i = 0; i < 4; i++) {
                ctx.fillRect(-2, -12, 4, 10); 
                if (showLines) ctx.strokeRect(-2, -12, 4, 10);
                ctx.rotate(Math.PI / 2); 
            }
            
            // 4. Draw the Center Hub Pin
            ctx.beginPath();
            ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
            ctx.fillStyle = style.colors.hub;
            ctx.fill();
            if (showLines) ctx.stroke();
            ctx.restore();
            break;

        case 'hospital':
            ctx.fillStyle = style.colors.base;
            ctx.fillRect(-w/2, -h/2 + 6, w, h - 6); if (showLines) ctx.strokeRect(-w/2, -h/2 + 6, w, h - 6);
            
            ctx.fillStyle = style.colors.roof;
            ctx.fillRect(-w/2 - 2, -h/2, w + 4, 6); if (showLines) ctx.strokeRect(-w/2 - 2, -h/2, w + 4, 6);
            
            ctx.fillStyle = style.colors.cross;
            ctx.beginPath();
            const cx = 0, cy = 4; 
            ctx.moveTo(cx - 2, cy - 6); ctx.lineTo(cx + 2, cy - 6);
            ctx.lineTo(cx + 2, cy - 2); ctx.lineTo(cx + 6, cy - 2);
            ctx.lineTo(cx + 6, cy + 2); ctx.lineTo(cx + 2, cy + 2);
            ctx.lineTo(cx + 2, cy + 6); ctx.lineTo(cx - 2, cy + 6);
            ctx.lineTo(cx - 2, cy + 2); ctx.lineTo(cx - 6, cy + 2);
            ctx.lineTo(cx - 6, cy - 2); ctx.lineTo(cx - 2, cy - 2);
            ctx.closePath();
            ctx.fill(); 
            if (showLines) ctx.stroke();
            break;

        case 'fireStation':
            ctx.fillStyle = style.colors.base;
            ctx.fillRect(-w/2, -h/2 + 8, w, h - 8); 
            if (showLines) ctx.strokeRect(-w/2, -h/2 + 8, w, h - 8);
            
            ctx.fillStyle = style.colors.roof;
            ctx.fillRect(-w/2 - 2, -h/2, w + 4, 8);
            if (showLines) ctx.strokeRect(-w/2 - 2, -h/2, w + 4, 8);
            
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(0, -h/2 + 4, 3.5, 0, Math.PI * 2);
            ctx.fill(); 
            if (showLines) ctx.stroke();
            
            ctx.fillStyle = style.colors.door;
            ctx.fillRect(-w/2 + 2, h/2 - 10, 10, 10);
            if (showLines) ctx.strokeRect(-w/2 + 2, h/2 - 10, 10, 10);
            
            ctx.fillStyle = style.colors.ladder;
            const ladX = w/4 + 1;
            const ladY = -h/2 + 10;
            const ladW = 5;
            const ladH = h/2;
            
            ctx.fillRect(ladX, ladY, 1.5, ladH); if (showLines) ctx.strokeRect(ladX, ladY, 1.5, ladH);
            ctx.fillRect(ladX + ladW - 1.5, ladY, 1.5, ladH); if (showLines) ctx.strokeRect(ladX + ladW - 1.5, ladY, 1.5, ladH);
            
            for(let r = ladY + 2; r < ladY + ladH - 1; r += 3) {
                ctx.fillRect(ladX + 1.5, r, ladW - 3, 1.5);
                if (showLines) {
                    ctx.beginPath(); ctx.rect(ladX + 1.5, r, ladW - 3, 1.5); ctx.stroke();
                }
            }
            break;

        case 'park':
            ctx.fillStyle = style.colors.benchWood;
            ctx.fillRect(2, -2, w*0.4, 3); if (showLines) ctx.strokeRect(2, -2, w*0.4, 3);
            ctx.fillRect(0, 1, w*0.4 + 4, 4); if (showLines) ctx.strokeRect(0, 1, w*0.4 + 4, 4);
            
            ctx.fillStyle = style.colors.benchLegs;
            ctx.fillRect(4, 5, 2, 3); if (showLines) ctx.strokeRect(4, 5, 2, 3);
            ctx.fillRect(w*0.4, 5, 2, 3); if (showLines) ctx.strokeRect(w*0.4, 5, 2, 3);
            
            const trunkW = 4, trunkH = 10;
            ctx.fillStyle = style.colors.trunk;
            ctx.fillRect(-w/3 - trunkW/2, 0, trunkW, trunkH); 
            if (showLines) ctx.strokeRect(-w/3 - trunkW/2, 0, trunkW, trunkH);
            
            ctx.fillStyle = style.colors.leaf3; 
            ctx.beginPath(); ctx.arc(-w/3 - 4, 0, 5.5, 0, Math.PI * 2); ctx.fill(); 
            if (showLines) ctx.stroke();
            
            ctx.fillStyle = style.colors.leaf2; 
            ctx.beginPath(); ctx.arc(-w/3 + 4, -1, 5, 0, Math.PI * 2); ctx.fill(); 
            if (showLines) ctx.stroke();
            
            ctx.fillStyle = style.colors.leaf1; 
            ctx.beginPath(); ctx.arc(-w/3, -4, 6, 0, Math.PI * 2); ctx.fill(); 
            if (showLines) ctx.stroke();
            break;
            
        case 'trainStation':
            // Concrete Main Building
            ctx.fillStyle = style.colors.base;
            ctx.fillRect(-w/2, -h/4, w, h * 0.75); 
            if (showLines) ctx.strokeRect(-w/2, -h/4, w, h * 0.75);
            
            // Massive Black Tunnel Archway (Big enough for the train)
            ctx.fillStyle = style.colors.tunnel;
            ctx.beginPath();
            ctx.moveTo(-12, h/2);              // Start bottom left
            ctx.lineTo(-12, -h/4 + 6);         // Straight up
            ctx.arc(0, -h/4 + 6, 12, Math.PI, 0); // Curve over the top
            ctx.lineTo(12, h/2);               // Straight down to bottom right
            ctx.closePath();
            ctx.fill();
            if (showLines) ctx.stroke();
            
            // Sleek Curved Overhang Roof (Pastel Blue)
            ctx.fillStyle = style.colors.roof;
            ctx.beginPath();
            ctx.moveTo(-w/2 - 4, -h/4);
            ctx.quadraticCurveTo(0, -h/2 - 8, w/2 + 4, -h/4);
            ctx.lineTo(w/2 + 4, -h/4 + 4);
            ctx.quadraticCurveTo(0, -h/2 - 4, -w/2 - 4, -h/4 + 4);
            ctx.closePath();
            ctx.fill(); 
            if (showLines) ctx.stroke();
            
            // Station Clock
            ctx.fillStyle = '#ecf0f1';
            ctx.beginPath(); ctx.arc(0, -h/4 + 1, 3.5, 0, Math.PI*2); ctx.fill(); 
            if (showLines) ctx.stroke();
            
            // Clock hands
            ctx.fillStyle = '#000000';
            ctx.fillRect(-0.5, -h/4, 1, 2.5);   // Hour hand
            ctx.fillRect(0, -h/4 + 0.5, 2.5, 1);  // Minute hand
            break;
    }

    ctx.restore();
}