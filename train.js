



const MIN_STATION_DIST = 400; 
const TRAIN_SPEED = 0.08; 
const activeTrains = [];

function canBuildStation(gridX, gridY, existingStations) {
    for (let s of existingStations) {
        const dist = Math.sqrt(Math.pow(s.x - gridX, 2) + Math.pow(s.y - gridY, 2));
        if (dist < MIN_STATION_DIST) return false;
    }
    return true;
}

function manageTrains(tracks, stations) {
    tracks.forEach((trackLine, index) => {
        if (!activeTrains.some(t => t.lineIndex === index)) {
            if (trackLine.length > 2) {
                activeTrains.push({
                    id: Math.random(),
                    lineIndex: index,
                    pathIndex: 0,
                    progress: 0.5, 
                    direction: 1, 
                    state: 'boarding', 
                    waitTimer: 120
                });
            }
        }
    });

    for (let i = activeTrains.length - 1; i >= 0; i--) {
        if (!tracks[activeTrains[i].lineIndex]) {
            activeTrains.splice(i, 1);
        }
    }
}

function drawTrainSystem(ctx, stations, tracks, gridSize, cameraZoom) {
    ctx.lineCap = 'butt';
    ctx.lineJoin = 'miter';

    
    tracks.forEach(path => {
        if (!path || path.length === 0) return;

        ctx.strokeStyle = '#5c4033'; 
        ctx.lineWidth = 14;
        ctx.setLineDash([4, 6]); 
        ctx.beginPath();
        ctx.moveTo(path[0].x + gridSize/2, path[0].y + gridSize/2);
        for (let i = 1; i < path.length; i++) {
            ctx.lineTo(path[i].x + gridSize/2, path[i].y + gridSize/2);
        }
        if (path.length === 1) ctx.lineTo(path[0].x + gridSize/2 + 1, path[0].y + gridSize/2);
        ctx.stroke();
        ctx.setLineDash([]); 

        ctx.strokeStyle = '#bdc3c7';
        ctx.lineWidth = 2;
        
        ctx.beginPath();
        ctx.moveTo(path[0].x + gridSize/2 - 4, path[0].y + gridSize/2 - 4);
        for (let i = 1; i < path.length; i++) ctx.lineTo(path[i].x + gridSize/2 - 4, path[i].y + gridSize/2 - 4);
        if (path.length === 1) ctx.lineTo(path[0].x + gridSize/2 - 3, path[0].y + gridSize/2 - 4);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(path[0].x + gridSize/2 + 4, path[0].y + gridSize/2 + 4);
        for (let i = 1; i < path.length; i++) ctx.lineTo(path[i].x + gridSize/2 + 4, path[i].y + gridSize/2 + 4);
        if (path.length === 1) ctx.lineTo(path[0].x + gridSize/2 + 5, path[0].y + gridSize/2 + 4);
        ctx.stroke();
    });

    
    stations.forEach(station => {
        ctx.fillStyle = '#7f8c8d'; 
        ctx.fillRect(station.x + 2, station.y + 2, gridSize - 4, gridSize - 4);
        
        ctx.fillStyle = '#2c3e50'; 
        ctx.fillRect(station.x + 8, station.y + 8, gridSize - 16, gridSize - 16);

        ctx.fillStyle = '#3498db'; 
        ctx.fillRect(station.x + 4, station.y + gridSize/2 - 6, gridSize - 8, 12);
        
        ctx.fillStyle = '#ecf0f1';
        ctx.fillRect(station.x + gridSize/2 - 6, station.y + gridSize/2 - 2, 12, 4);
    });
}

function updateAndDrawTrains(ctx, tracks, gridSize, nightMode) {
    activeTrains.forEach(train => {
        const track = tracks[train.lineIndex];
        if (!track || track.length < 2) return;

        if (train.state === 'boarding') {
            train.waitTimer--;
            if (train.waitTimer <= 0) train.state = 'driving';
        } else {
            train.progress += TRAIN_SPEED * train.direction;
            
            
            if (train.direction === 1) {
                if (train.pathIndex >= track.length - 2 && train.progress >= 0.5) {
                    train.progress = 0.5;
                    train.pathIndex = track.length - 2;
                    train.direction = -1;
                    train.state = 'boarding';
                    train.waitTimer = 120;
                } else if (train.progress >= 1.0) {
                    train.progress = 0;
                    train.pathIndex++;
                }
            } else {
                if (train.pathIndex === 0 && train.progress <= 0.5) {
                    train.progress = 0.5;
                    train.pathIndex = 0;
                    train.direction = 1;
                    train.state = 'boarding';
                    train.waitTimer = 120;
                } else if (train.progress <= 0) {
                    train.progress = 1.0;
                    train.pathIndex--;
                }
            }
        }

        let currentNode, nextNode, visualProgress;
        
        if (train.direction === 1) {
            currentNode = track[train.pathIndex];
            nextNode = track[Math.min(train.pathIndex + 1, track.length - 1)];
            visualProgress = train.progress;
        } else {
            currentNode = track[train.pathIndex];
            nextNode = track[Math.max(train.pathIndex - 1, 0)];
            visualProgress = 1.0 - train.progress;
        }

        if (!currentNode || !nextNode) return;

        const realX = currentNode.x + (nextNode.x - currentNode.x) * visualProgress + gridSize / 2;
        const realY = currentNode.y + (nextNode.y - currentNode.y) * visualProgress + gridSize / 2;
        const angle = Math.atan2(nextNode.y - currentNode.y, nextNode.x - currentNode.x);

        
        ctx.save();
        ctx.translate(realX, realY);
        ctx.rotate(angle);

        const carWidth = gridSize * 0.7;
        const carHeight = gridSize * 0.35;
        const spacing = gridSize * 0.75;

        for(let i = -1; i <= 1; i++) {
            const offsetX = i * spacing;
            
            
            if (i < 1) {
                ctx.fillStyle = '#2c3e50';
                ctx.fillRect(offsetX + carWidth/2 - 2, -4, spacing - carWidth + 4, 8);
            }
            
            
            ctx.fillStyle = 'rgba(0,0,0,0.4)';
            ctx.beginPath();
            if (ctx.roundRect) ctx.roundRect(offsetX - carWidth/2 + 2, -carHeight/2 + 2, carWidth, carHeight, 4);
            else ctx.fillRect(offsetX - carWidth/2 + 2, -carHeight/2 + 2, carWidth, carHeight);
            ctx.fill();
            
            
            ctx.fillStyle = '#9b59b6'; 
            ctx.beginPath();
            if (ctx.roundRect) ctx.roundRect(offsetX - carWidth/2, -carHeight/2, carWidth, carHeight, 4);
            else ctx.fillRect(offsetX - carWidth/2, -carHeight/2, carWidth, carHeight);
            ctx.fill();
            
            
            ctx.fillStyle = '#2c3e50';
            ctx.fillRect(offsetX - carWidth/2 + 6, -carHeight/2 + 4, carWidth - 12, carHeight - 8);
        }

        
        if (nightMode) {
            ctx.fillStyle = 'rgba(255, 255, 150, 0.9)';
            const frontOffsetX = (train.direction === 1 ? 1 : -1) * spacing + (train.direction === 1 ? carWidth/2 : -carWidth/2);
            ctx.fillRect(frontOffsetX + (train.direction === 1 ? 0 : -3), -carHeight/2 + 4, 3, 4);
            ctx.fillRect(frontOffsetX + (train.direction === 1 ? 0 : -3), carHeight/2 - 8, 3, 4);
        }

        ctx.restore();
    });
}