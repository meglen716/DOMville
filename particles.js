

const particles = [];


function spawnDustParticles(x, y, amount = 15, color = '#7f8c8d', gridSize = 40) {
    for (let i = 0; i < amount; i++) {
        particles.push({
            
            x: x + (Math.random() * gridSize),
            y: y + (Math.random() * gridSize),
            
            
            vx: (Math.random() - 0.5) * 5, 
            vy: (Math.random() - 0.5) * 5 - 1, 
            
            life: 1.0, 
            decay: 0.02 + Math.random() * 0.03, 
            size: 2 + Math.random() * 4, 
            color: color
        });
    }
}


function spawnLevelUpParticles(x, y, gridSize = 40) {
    spawnDustParticles(x, y, 20, '#f1c40f', gridSize); 
}


function updateAndDrawParticles(ctx) {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        
        
        p.x += p.vx;
        p.y += p.vy;
        
        
        p.vx *= 0.92;
        p.vy *= 0.92;
        
        
        p.vy -= 0.05; 
        
        
        p.life -= p.decay;
        
        
        if (p.life <= 0) {
            particles.splice(i, 1);
            continue;
        }
        
        
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, p.size, p.size); 
        ctx.restore();
    }
}