/** * BRAIN QUEST - PROFESSIONAL 2D ENGINE (FINAL DEFINITIVE)
 * WIDESCREEN | Mobile Touch | Alive Clouds | Ducking | Smart Auto-Tiling
 */
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const TARGET_W = 1024;
const TARGET_H = 576; 
const dpr = window.devicePixelRatio || 1;

canvas.width = TARGET_W * dpr;
canvas.height = TARGET_H * dpr;
ctx.scale(dpr, dpr);
ctx.imageSmoothingEnabled = true; 
ctx.imageSmoothingQuality = 'high';

const W = TARGET_W; const H = TARGET_H; const TILE_SIZE = 40; const GROUND_Y = H - 120; 

const ASSETS = {
    playerIdle: new Image(), playerWalk1: new Image(), playerWalk2: new Image(), playerJump: new Image(), playerHit: new Image(), playerDuck: new Image(),
    slime: new Image(), spike: new Image(), bee: new Image(), flag: new Image(), flagA: new Image(), flagB: new Image(),
    bgClouds: new Image(), bgHillsFade: new Image(), bgHillsColor: new Image(), bgTreesFade: new Image(), bgTreesColor: new Image(), bgDesertFade: new Image(), bgDesertColor: new Image(), bgMushroomsFade: new Image(), bgMushroomsColor: new Image(),
    tileGrass: new Image(), tileDirt: new Image(), decorBush: new Image(), tileBrown: new Image(), tileBrownDirt: new Image(), decorMushroom: new Image(), tileSand: new Image(), tileSandDirt: new Image(), decorCactus: new Image(),
    tiles: {} 
};

// Pastikan lokasi file ini persis dengan folder assets milikmu!
ASSETS.playerIdle.src = 'assets/character_purple_idle.svg'; ASSETS.playerWalk1.src = 'assets/character_purple_walk_a.svg'; ASSETS.playerWalk2.src = 'assets/character_purple_walk_b.svg'; ASSETS.playerJump.src = 'assets/character_purple_jump.svg'; ASSETS.playerHit.src = 'assets/character_purple_hit.svg'; ASSETS.playerDuck.src = 'assets/character_purple_duck.svg'; 
ASSETS.slime.src = 'assets/slime_walk.svg'; ASSETS.spike.src = 'assets/spikes.svg'; ASSETS.bee.src = 'assets/bee.svg';           
ASSETS.flag.src = 'assets/flag_yellow.svg'; ASSETS.flagA.src = 'assets/flag_yellow_a.svg'; ASSETS.flagB.src = 'assets/flag_yellow_b.svg'; 
ASSETS.bgClouds.src = 'assets/background_clouds.svg'; ASSETS.bgHillsFade.src = 'assets/background_fade_hills.svg'; ASSETS.bgHillsColor.src = 'assets/background_color_hills.svg'; ASSETS.bgTreesFade.src = 'assets/background_fade_trees.svg'; ASSETS.bgTreesColor.src = 'assets/background_color_trees.svg'; ASSETS.bgDesertFade.src = 'assets/background_fade_desert.svg'; ASSETS.bgDesertColor.src = 'assets/background_color_desert.svg'; ASSETS.bgMushroomsFade.src = 'assets/background_fade_mushrooms.svg'; ASSETS.bgMushroomsColor.src = 'assets/background_color_mushrooms.svg';
ASSETS.tileGrass.src = 'assets/terrain_grass_vertical_top.svg'; ASSETS.tileDirt.src = 'assets/terrain_dirt_vertical_middle.svg'; ASSETS.decorBush.src = 'assets/bush.svg'; 
ASSETS.tileBrown.src = 'assets/terrain_dirt_vertical_top.svg'; ASSETS.tileBrownDirt.src = 'assets/terrain_dirt_vertical_middle.svg'; ASSETS.decorMushroom.src = 'assets/mushroom_red.svg'; 
ASSETS.tileSand.src = 'assets/terrain_sand_vertical_top.svg'; ASSETS.tileSandDirt.src = 'assets/terrain_sand_vertical_middle.svg'; ASSETS.decorCactus.src = 'assets/cactus.svg'; 

const THEMES = ['grass', 'dirt', 'sand', 'purple']; const TILE_TYPES = ['top_left', 'top', 'top_right', 'left', 'center', 'right', 'bottom_left', 'bottom', 'bottom_right'];
THEMES.forEach(theme => { ASSETS.tiles[theme] = {}; TILE_TYPES.forEach(type => { let img = new Image(); img.src = `assets/terrain_${theme}_block_${type}.svg`; ASSETS.tiles[theme][type] = img; }); });

const STATE = { MENU: 0, LEVEL_SELECT: 1, PLAYING: 2, PAUSED_QUIZ: 3, GAME_OVER: 4, LEVEL_COMPLETE: 5, WIN: 6, RESPAWNING: 7 };
let currentState = STATE.MENU; let currentLevel = 1; let unlockedLevels = parseInt(localStorage.getItem('bq_unlocked')) || 1; let totalScore = parseInt(localStorage.getItem('bq_score')) || 0; let levelScore = 0; let lives = 3; let lastTime = 0; let currentFrameId = null;
let cameraX = 0; let nextSpawnX = 800; let cpSpawnedThisLevel = 0; let shakeTime = 0; let lastCheckpointX = 200; 
let player; let obstacles = []; let checkpoints = []; let particles = []; let pits = []; let bgLayers = null;

const QUESTIONS = {
    1: [ { q: "Apa nama mata uang yang digunakan di Indonesia?", opts: ["Dollar", "Rupiah", "Yen", "Euro"], ans: 1 }, { q: "Pulau terbesar di Indonesia adalah…", opts: ["Jawa", "Bali", "Kalimantan", "Sulawesi"], ans: 2 }, { q: "Berapa jumlah provinsi di Indonesia saat ini?", opts: ["34", "38", "30", "40"], ans: 1 } ],
    2: [ { q: "Tari Saman berasal dari provinsi…", opts: ["Jawa Barat", "Sumatera Utara", "Aceh", "Sulawesi"], ans: 2 }, { q: "Bahasa resmi negara Indonesia adalah…", opts: ["Jawa", "Indonesia", "Melayu", "Sunda"], ans: 1 }, { q: "Candi Borobudur terletak di provinsi…", opts: ["DKI Jakarta", "Jawa Timur", "Bali", "Jawa Tengah"], ans: 3 } ],
    3: [ { q: "Indonesia memproklamasikan kemerdekaan pada tanggal…", opts: ["1 Juni 1945", "17 Agustus 1945", "20 Mei 1908", "28 Oktober 1928"], ans: 1 }, { q: "Siapakah proklamator kemerdekaan Indonesia?", opts: ["Soeharto & Habibie", "Cut Nyak Dien & Kartini", "Soekarno & Hatta", "Gajah Mada & Hayam Wuruk"], ans: 2 }, { q: "Pancasila sebagai dasar negara dirumuskan oleh…", opts: ["Moh. Yamin", "Soepomo", "Soekarno", "Hatta"], ans: 2 } ]
};

const LEVELS = { 
    1: { name: "Mengenal Lingkungan", bg: "village", maxSpeed: 600, spawnGap: 800, innerGap: 350, patterns: [ [0], [3], [0, 0], [3, 0] ] },
    2: { name: "Sosial & Budaya", bg: "sawah", maxSpeed: 750, spawnGap: 550, innerGap: 300, patterns: [ [0, 1], [3, 1], [4, 0], [1, 0], [3, 3] ] },
    3: { name: "Sejarah", bg: "temple", maxSpeed: 900, spawnGap: 400, innerGap: 280, patterns: [ [0, 2], [4, 2], [5], [3, 0, 1], [0, 1, 0, 3], [5, 0] ] }
};

/* --- FUNGSI FULLSCREEN --- */
function toggleFullScreen() {
    if (!document.fullscreenElement) { document.documentElement.requestFullscreen().catch(err => { console.log(`Gagal fullscreen: ${err.message}`); }); } 
    else { if (document.exitFullscreen) document.exitFullscreen(); }
}

function showOverlay(id) { document.querySelectorAll('.overlay').forEach(el => el.classList.remove('active')); if (id) { document.getElementById(id).classList.add('active'); document.getElementById('hud').classList.remove('active'); } }
function updateHUD() { document.getElementById('lives').innerText = '❤️'.repeat(lives); document.getElementById('score').innerText = totalScore + levelScore; document.getElementById('level-name').innerText = 'LEVEL ' + currentLevel; }
function showLevelSelect() { currentState = STATE.LEVEL_SELECT; showOverlay('level-select'); const container = document.getElementById('levels-container'); container.innerHTML = ''; for (let i = 1; i <= 3; i++) { let isLocked = i > unlockedLevels; let c = document.createElement('div'); c.className = `card ${isLocked ? 'locked' : ''}`; c.innerHTML = `<h3>Level ${i}</h3><p style="color:#FFF;">${LEVELS[i].name}</p><div style="font-size:24px;margin-top:10px;">${isLocked ? '🔒' : '⭐'}</div>`; if (!isLocked) c.onclick = () => initGame(i); container.appendChild(c); } }

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const sfx = { play(freq, type, dur, vol = 0.1) { try { if (audioCtx.state === 'suspended') audioCtx.resume(); const osc = audioCtx.createOscillator(); const gain = audioCtx.createGain(); osc.type = type; osc.frequency.setValueAtTime(freq, audioCtx.currentTime); gain.gain.setValueAtTime(vol, audioCtx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + dur); osc.connect(gain); gain.connect(audioCtx.destination); osc.start(); osc.stop(audioCtx.currentTime + dur); } catch(e) { } }, jump() { this.play(400, 'square', 0.15, 0.05); }, hit() { this.play(150, 'sawtooth', 0.3, 0.1); }, coin() { this.play(800, 'sine', 0.1, 0.05); }, over() { this.play(200, 'square', 0.5, 0.1); } };

class Player {
    constructor(cfgSpeed) { this.w = 40; this.h = 48; this.x = 200; this.y = GROUND_Y - this.h; this.vy = 0; this.vx = 0; this.maxSpeed = cfgSpeed; this.accel = 5000; this.friction = 0.85; this.grav = 1600; this.fallGravMulti = 1.8; this.jumpForce = -800; this.grounded = true; this.squash = 0; this.animTimer = 0; this.facingRight = true; this.idleTimer = 0; this.isDucking = false; }
    jump() { if (this.grounded && !this.isDucking) { this.vy = this.jumpForce; this.grounded = false; this.squash = -8; sfx.jump(); spawnDust(this.x + this.w/2 - cameraX, this.y + this.h); } }
    update(dt) {
        this.isDucking = (keys.down && this.grounded);
        if (keys.left) this.vx -= this.accel * dt; if (keys.right) this.vx += this.accel * dt;
        this.vx *= this.friction; if (this.isDucking) this.vx *= 0.5; 
        if (this.vx > this.maxSpeed) this.vx = this.maxSpeed; if (this.vx < -this.maxSpeed) this.vx = -this.maxSpeed;
        if (this.vx > 5) this.facingRight = true; if (this.vx < -5) this.facingRight = false;
        this.animTimer += dt; if (this.grounded && Math.abs(this.vx) < 5 && !this.isDucking) this.idleTimer += dt; else this.idleTimer = 0;
        this.x += this.vx * dt; if (this.x < cameraX) { this.x = cameraX; this.vx = 0; }
        let targetX = this.x - W * 0.35; if (targetX > cameraX) cameraX += (targetX - cameraX) * 12 * dt;
        let curGrav = this.grav; if (this.vy > 0) curGrav *= this.fallGravMulti; else if (!keys.jump && this.vy < 0) curGrav *= 2.5;
        this.vy += curGrav * dt; this.y += this.vy * dt;
        let overPit = false; let px = this.x + this.w/2; for (let p of pits) if (px > p.x && px < p.x + p.w) overPit = true;
        if (this.y + this.h >= GROUND_Y && this.y + this.h <= GROUND_Y + 25 && this.vy >= 0 && !overPit) { if (!this.grounded) { spawnDust(this.x + this.w/2 - cameraX, this.y + this.h); this.squash = 10; } this.y = GROUND_Y - this.h; this.vy = 0; this.grounded = true; } else if (this.y + this.h > GROUND_Y) this.grounded = false;
        if (this.y > H + 100 && currentState === STATE.PLAYING) { lives--; updateHUD(); if (lives <= 0) gameOver(); else stopGame(); }
        this.squash *= 0.8;
    }
    draw(ctx, camX) {
        let sx = Math.floor(this.x - camX); let sq = this.squash; let bSq = 0;
        ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.beginPath(); ctx.ellipse(sx + this.w/2, GROUND_Y, this.w/2, 4, 0, 0, Math.PI*2); ctx.fill();
        let frame = ASSETS.playerIdle;
        if (currentState === STATE.RESPAWNING || currentState === STATE.GAME_OVER) frame = ASSETS.playerHit; else if (this.isDucking) frame = ASSETS.playerDuck; else if (!this.grounded) frame = ASSETS.playerJump; else if (Math.abs(this.vx) > 10) frame = (Math.floor(this.animTimer/0.15)%2 === 0) ? ASSETS.playerWalk1 : ASSETS.playerWalk2; else { bSq = Math.sin(this.idleTimer*4)*1.5; if (this.idleTimer > 2 && this.idleTimer % 3.5 < 0.15) frame = ASSETS.playerHit; }
        if (frame.complete) { let tSq = sq + bSq; if (this.isDucking) tSq = 0; let cH = this.h - tSq; let cW = this.w + (tSq*0.5); let aX = sx - (cW - this.w)/2; ctx.save(); if (!this.facingRight) { ctx.translate(aX + cW/2, 0); ctx.scale(-1, 1); ctx.drawImage(frame, -cW/2, Math.floor(this.y + tSq), cW, cH); } else ctx.drawImage(frame, aX, Math.floor(this.y + tSq), cW, cH); ctx.restore(); }
    }
    getHitbox() { if (this.isDucking) return { x: this.x + 5, y: this.y + 24, w: this.w - 10, h: this.h - 24 }; return { x: this.x + 5, y: this.y + 5, w: this.w - 10, h: this.h - 5 }; }
}

class Obstacle {
    constructor(worldX, type) { this.w = 34; this.h = 34; this.type = type; this.x = worldX; this.originX = worldX; this.y = GROUND_Y - this.h; this.originY = GROUND_Y - this.h - 30; this.marked = false; this.phase = Math.random() * Math.PI * 2; }
    update(dt) { this.phase += 3 * dt; if (this.type === 1) this.x = this.originX + Math.sin(this.phase) * 80; else if (this.type === 2) this.y = this.originY + Math.sin(this.phase) * 40; }
    draw(ctx, camX) { let sx = Math.floor(this.x - camX); if (sx < -this.w || sx > W + this.w) return; let img = (this.type === 0) ? ASSETS.spike : (this.type === 1) ? ASSETS.slime : ASSETS.bee; if (img.complete) ctx.drawImage(img, sx, Math.floor(this.y), this.w, this.h); }
    getHitbox() { return { x: this.x + 5, y: this.y + 5, w: this.w - 10, h: this.h - 10 }; }
}

class Checkpoint {
    constructor(worldX, qIndex) { this.x = worldX; this.y = GROUND_Y - 60; this.w = 40; this.h = 60; this.qIndex = qIndex; this.triggered = false; this.phase = 0; }
    update(dt) { this.phase += 6 * dt; }
    draw(ctx, camX) {
        let sx = Math.floor(this.x - camX); if (sx < -this.w || sx > W) return;
        let flagImg = ASSETS.flag; if (this.triggered && ASSETS.flagA.complete && ASSETS.flagB.complete) flagImg = (Math.floor(this.phase * 1.5) % 2 === 0) ? ASSETS.flagA : ASSETS.flagB;
        if (flagImg.complete) { ctx.drawImage(flagImg, sx, Math.floor(this.y), this.w, this.h); if(!this.triggered) { ctx.fillStyle = '#FFF'; ctx.font = '10px "Press Start 2P"'; ctx.fillText('?', sx + 15, Math.floor(this.y - 10 + Math.sin(this.phase)*5)); } }
    }
    getHitbox() { return this; }
}

class Particle {
    constructor(startX, startY, color, isDust = false) { this.x = startX; this.y = startY; this.isDust = isDust; this.vx = (Math.random()-0.5)*(isDust?100:300); this.vy = (Math.random()-(isDust?0:1))*(isDust?20:400); this.life = 1.0; this.color = color; this.size = isDust?Math.random()*4+2:Math.random()*5+4; }
    update(dt) { this.x += this.vx*dt; this.y += this.vy*dt; if (!this.isDust) this.vy += 800*dt; this.life -= (this.isDust?2.5:0.8)*dt; }
    draw(ctx) { ctx.fillStyle = this.color; ctx.globalAlpha = Math.max(0, this.life); ctx.beginPath(); ctx.arc(Math.floor(this.x), Math.floor(this.y), this.size, 0, Math.PI*2); ctx.fill(); ctx.globalAlpha = 1.0; }
}
function spawnDust(sx, sy) { for (let i = 0; i < 5; i++) particles.push(new Particle(sx + (Math.random()*16-8), sy, '#d3d3d3', true)); }

/* ==========================================================
   PARALLAX BACKGROUND (Awan Gerak Pakai Waktu Mesin 100%)
   ========================================================== */
class ParallaxBg {
    constructor(type) { this.type = type; this.skyGrad = ctx.createLinearGradient(0, 0, 0, H); if (this.type === 'village') { this.skyGrad.addColorStop(0, '#4aaeff'); this.skyGrad.addColorStop(1, '#a6d9ff'); } else if (this.type === 'sawah') { this.skyGrad.addColorStop(0, '#ff7b54'); this.skyGrad.addColorStop(1, '#ffd56b'); } else if (this.type === 'temple') { this.skyGrad.addColorStop(0, '#e8a158'); this.skyGrad.addColorStop(1, '#f2d49b'); } else { this.skyGrad.addColorStop(0, '#2d1e2f'); this.skyGrad.addColorStop(1, '#852b47'); } }
    drawLayer(ctx, img, camX, speed, targetHeight, yPos, autoOffset = 0) {
        if (!img.complete || img.naturalWidth === 0) return; let imgW = Math.ceil(img.naturalWidth * (targetHeight / img.naturalHeight)); 
        let totalOffset = ((camX * speed) + autoOffset) % imgW; if (totalOffset < 0) totalOffset += imgW; let offset = Math.floor(totalOffset);
        for (let i = -1; i <= Math.ceil(W / imgW) + 1; i++) { let drawX = Math.floor(i * imgW - offset) - 1; ctx.drawImage(img, drawX, Math.floor(yPos), imgW + 2, targetHeight); }
    }
    draw(ctx, camX) {
        ctx.fillStyle = this.skyGrad; ctx.fillRect(0, 0, W, H); 
        let f = ASSETS.bgHillsFade, c = ASSETS.bgHillsColor; if (this.type === 'sawah') { f = ASSETS.bgTreesFade; c = ASSETS.bgTreesColor; } else if (this.type === 'temple') { f = ASSETS.bgDesertFade; c = ASSETS.bgDesertColor; } else if (this.type === 'menu') { f = ASSETS.bgMushroomsFade; c = ASSETS.bgMushroomsColor; }
        
        // Sedot waktu dari Browser (Jaminan awan gerak terus)
        let mesinWaktu = performance.now() / 1000;
        
        this.drawLayer(ctx, ASSETS.bgClouds, camX, 0.05, H, 0, mesinWaktu * 50); // Kecepatan 50!
        this.drawLayer(ctx, f, camX, 0.3, H, 0); 
        this.drawLayer(ctx, c, camX, 0.5, H, 0);
    }
}

function isOverPit(worldX) { let tileCenter = worldX + (TILE_SIZE / 2); for (let p of pits) if (tileCenter >= p.x && tileCenter <= p.x + p.w) return true; return false; }

function drawDynamicGround(ctx, camX, type) {
    let theme = 'grass'; let decorImg = ASSETS.decorBush; if (type === 'temple') { theme = 'sand'; decorImg = ASSETS.decorCactus; } else if (type === 'sawah') { theme = 'dirt'; decorImg = ASSETS.decorMushroom; } else if (type === 'menu') { theme = 'purple'; decorImg = ASSETS.decorBush; }
    let tiles = ASSETS.tiles[theme]; let startCol = Math.floor(camX / TILE_SIZE); let endCol = Math.floor((camX + W) / TILE_SIZE) + 1;
    for (let col = startCol; col <= endCol; col++) {
        let worldX = col * TILE_SIZE; if (isOverPit(worldX)) continue; 
        let isLeftEmpty = isOverPit(worldX - TILE_SIZE); let isRightEmpty = isOverPit(worldX + TILE_SIZE);
        let screenX = Math.floor(worldX - camX); let drawW = TILE_SIZE + 1; let drawH = TILE_SIZE + 1; 
        let hPos = 'center'; if (isLeftEmpty) hPos = 'left'; else if (isRightEmpty) hPos = 'right';
        for (let y = GROUND_Y; y < H + TILE_SIZE; y += TILE_SIZE) {
            let vPos = 'center'; if (y === GROUND_Y) vPos = 'top'; else if (y + TILE_SIZE >= H + TILE_SIZE) vPos = 'bottom';
            let tileKey = ''; if (vPos === 'center' && hPos === 'center') tileKey = 'center'; else if (vPos === 'top' && hPos === 'center') tileKey = 'top'; else if (vPos === 'bottom' && hPos === 'center') tileKey = 'bottom'; else if (vPos === 'center' && hPos === 'left') tileKey = 'left'; else if (vPos === 'center' && hPos === 'right') tileKey = 'right'; else tileKey = `${vPos}_${hPos}`; 
            let img = tiles[tileKey]; if (img && img.complete && img.naturalWidth > 0) { ctx.drawImage(img, screenX, Math.floor(y), drawW, drawH); } else { ctx.fillStyle = '#8b5a2b'; ctx.fillRect(screenX, Math.floor(y), drawW, drawH); }
        }
        let seed = Math.abs(Math.sin(worldX * 123.456)); if (hPos === 'center' && decorImg.complete && decorImg.naturalWidth > 0 && seed > 0.85) { let dSize = 25 + (seed * 10); let dX = screenX + Math.floor((TILE_SIZE - dSize)/2); let dY = Math.floor(GROUND_Y - dSize + 5); ctx.drawImage(decorImg, dX, dY, dSize, dSize); }
    }
}

function resetGame(isDead = false) { if (!isDead) { let cfg = LEVELS[currentLevel]; player = new Player(cfg.maxSpeed); obstacles = []; checkpoints = []; particles = []; pits = []; bgLayers = new ParallaxBg(cfg.bg); cameraX = 0; nextSpawnX = 800; cpSpawnedThisLevel = 0; quizActiveIndex = -1; levelScore = 0; lives = 3; lastCheckpointX = 200; } }
function initGame(level) { currentLevel = level; resetGame(false); currentState = STATE.PLAYING; showOverlay(null); document.getElementById('hud').classList.add('active'); updateHUD(); lastTime = performance.now(); if (currentFrameId) cancelAnimationFrame(currentFrameId); currentFrameId = requestAnimationFrame(gameLoop); }
function stopGame() { currentState = STATE.RESPAWNING; let f = document.getElementById('flash-overlay'); f.style.backgroundColor = 'rgba(0,0,0,0.7)'; f.style.opacity = '1'; setTimeout(respawn, 1000); }
function respawn() { player.x = lastCheckpointX; player.y = GROUND_Y - player.h; player.vx = 0; player.vy = 0; cameraX = Math.max(0, player.x - 200); obstacles = obstacles.filter(o => Math.abs(o.x - player.x) > 400); document.getElementById('flash-overlay').style.opacity = '0'; updateHUD(); currentState = STATE.PLAYING; lastTime = performance.now(); }
function gameOver() { currentState = STATE.GAME_OVER; sfx.over(); document.getElementById('final-score').innerText = totalScore + levelScore; unlockedLevels = 1; localStorage.setItem('bq_unlocked', 1); showOverlay('game-over'); }

function gameLoop(timestamp) {
    let dt = (timestamp - lastTime) / 1000; if (dt > 0.1) dt = 0.1; lastTime = timestamp;
    if (currentState === STATE.PLAYING || currentState === STATE.PAUSED_QUIZ || currentState === STATE.RESPAWNING) {
        if (currentState === STATE.PLAYING) update(dt); else if (currentState === STATE.PAUSED_QUIZ) { particles.forEach(p => p.update(dt)); particles = particles.filter(p => p.life > 0); }
        draw(); currentFrameId = requestAnimationFrame(gameLoop);
    }
}

function update(dt) {
    let cfg = LEVELS[currentLevel]; player.update(dt);
    if (player.x + 1500 > nextSpawnX && cpSpawnedThisLevel < 3) {
        if (Math.floor(nextSpawnX / 3000) > cpSpawnedThisLevel) { checkpoints.push(new Checkpoint(nextSpawnX, cpSpawnedThisLevel)); cpSpawnedThisLevel++; nextSpawnX += 800; }
        else { let p = cfg.patterns[Math.floor(Math.random() * cfg.patterns.length)]; let cur = nextSpawnX; p.forEach(t => { if (t >= 3) { let pw = (t===3)?150:(t===4)?250:350; pits.push({x:cur, w:pw}); cur += pw + 250; } else { obstacles.push(new Obstacle(cur, t)); cur += cfg.innerGap; } }); nextSpawnX = cur + cfg.spawnGap; }
    }
    obstacles.forEach(o => { o.update(dt); if (checkCollision(player.getHitbox(), o.getHitbox()) && !o.marked) { o.marked = true; lives--; sfx.hit(); if (lives <= 0) gameOver(); else stopGame(); } });
    checkpoints.forEach(c => { c.update(dt); if (checkCollision(player.getHitbox(), c.getHitbox()) && !c.triggered) { c.triggered = true; sfx.coin(); lastCheckpointX = c.x; triggerQuiz(c.qIndex); } });
    particles.forEach(p => p.update(dt)); particles = particles.filter(p => p.life > 0);
}

function draw() {
    ctx.clearRect(0, 0, W, H); let snapCamX = Math.floor(cameraX);
    bgLayers.draw(ctx, snapCamX); drawDynamicGround(ctx, snapCamX, (currentState===STATE.MENU)?'menu':LEVELS[currentLevel].bg);
    checkpoints.forEach(c => c.draw(ctx, snapCamX)); obstacles.forEach(o => o.draw(ctx, snapCamX)); player.draw(ctx, snapCamX); particles.forEach(p => p.draw(ctx));
}

function checkCollision(r1, r2) { return r1.x < r2.x + r2.w && r1.x + r1.w > r2.x && r1.y < r2.y + r2.h && r1.y + r1.h > r2.y; }

function triggerQuiz(idx) { currentState = STATE.PAUSED_QUIZ; quizActiveIndex = idx; let q = QUESTIONS[currentLevel][idx]; document.getElementById('quiz-question').innerText = q.q; let div = document.getElementById('quiz-options'); div.innerHTML = ''; q.opts.forEach((o, i) => { let b = document.createElement('button'); b.className = 'opt-btn'; b.innerText = o; b.onclick = () => checkAnswer(i, q.ans); div.appendChild(b); }); document.getElementById('quiz-feedback').style.display = 'none'; document.getElementById('quiz-next-btn').style.display = 'none'; showOverlay('quiz-modal'); }
function checkAnswer(s, a) { let fb = document.getElementById('quiz-feedback'); fb.style.display = 'block'; if (s === a) { fb.style.color = '#27ae60'; fb.innerText = 'Jawaban Benar! +10 Poin ✨'; levelScore += 10; updateHUD(); } else { fb.style.color = '#e74c3c'; fb.innerText = 'Jawaban Kurang Tepat!'; } document.getElementById('quiz-next-btn').style.display = 'block'; }
function resumeGame() { if (quizActiveIndex >= 2) finishLevel(); else { showOverlay(null); document.getElementById('hud').classList.add('active'); setTimeout(() => { lastTime = performance.now(); currentState = STATE.PLAYING; }, 400); } }
function finishLevel() { totalScore += levelScore; if (currentLevel < 3) { unlockedLevels = Math.max(unlockedLevels, currentLevel + 1); localStorage.setItem('bq_unlocked', unlockedLevels); showOverlay('level-complete'); } else showOverlay('win-screen'); }
function nextLevel() { initGame(currentLevel + 1); } function retryLevel() { initGame(currentLevel); } function goMainMenu() { currentState = STATE.MENU; showOverlay('main-menu'); startMenuLoop(); }

/* --- CONTROLS: KEYBOARD & MOBILE --- */
const keys = { left: false, right: false, jump: false, down: false };

// 1. Keyboard
window.addEventListener('keydown', e => { if (['Space', 'ArrowUp', 'KeyW', 'w', 'W'].includes(e.code) || ['w', 'W'].includes(e.key)) { keys.jump = true; player.jump(); e.preventDefault(); } if (['ArrowLeft', 'KeyA', 'a', 'A'].includes(e.code) || ['a', 'A'].includes(e.key)) keys.left = true; if (['ArrowRight', 'KeyD', 'd', 'D'].includes(e.code) || ['d', 'D'].includes(e.key)) keys.right = true; if (['ArrowDown', 'KeyS', 's', 'S'].includes(e.code) || ['s', 'S'].includes(e.key)) keys.down = true; }, { passive: false });
window.addEventListener('keyup', e => { if (['Space', 'ArrowUp', 'KeyW', 'w', 'W'].includes(e.code) || ['w', 'W'].includes(e.key)) keys.jump = false; if (['ArrowLeft', 'KeyA', 'a', 'A'].includes(e.code) || ['a', 'A'].includes(e.key)) keys.left = false; if (['ArrowRight', 'KeyD', 'd', 'D'].includes(e.code) || ['d', 'D'].includes(e.key)) keys.right = false; if (['ArrowDown', 'KeyS', 's', 'S'].includes(e.code) || ['s', 'S'].includes(e.key)) keys.down = false; });

// 2. Mobile Joypad Binding
const btnLeft = document.getElementById('btn-left'); const btnRight = document.getElementById('btn-right');
const btnJump = document.getElementById('btn-jump'); const btnDuck = document.getElementById('btn-duck');

function setupMobileBtn(btn, keyName) {
    if(!btn) return;
    btn.addEventListener('touchstart', (e) => { e.preventDefault(); keys[keyName] = true; if(keyName === 'jump') player.jump(); btn.classList.add('active'); }, { passive: false });
    btn.addEventListener('touchend', (e) => { e.preventDefault(); keys[keyName] = false; btn.classList.remove('active'); }, { passive: false });
    btn.addEventListener('mousedown', (e) => { keys[keyName] = true; if(keyName === 'jump') player.jump(); btn.classList.add('active'); });
    btn.addEventListener('mouseup', (e) => { keys[keyName] = false; btn.classList.remove('active'); });
    btn.addEventListener('mouseleave', (e) => { keys[keyName] = false; btn.classList.remove('active'); });
}
setupMobileBtn(btnLeft, 'left'); setupMobileBtn(btnRight, 'right');
setupMobileBtn(btnJump, 'jump'); setupMobileBtn(btnDuck, 'down');

function startMenuLoop() {
    lastTime = performance.now(); pits = []; if (currentFrameId) cancelAnimationFrame(currentFrameId);
    currentFrameId = requestAnimationFrame(function loop(t) {
        let dt = (t - lastTime) / 1000; if (dt > 0.1) dt = 0.1; lastTime = t; 
        if (currentState === STATE.MENU || currentState === STATE.LEVEL_SELECT) {
            demoCam += 50 * dt; ctx.clearRect(0, 0, W, H); let snapDemoCam = Math.floor(demoCam);
            bgLayers.draw(ctx, snapDemoCam); drawDynamicGround(ctx, snapDemoCam, 'menu'); currentFrameId = requestAnimationFrame(loop);
        }
    });
}
startMenuLoop();