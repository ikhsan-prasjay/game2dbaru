/** * BRAIN QUEST - CORE ENGINE
 * Platformer 2D Modular System with Pits (Gap) Framework & Permadeath
 * JURUS PAMUNGKAS: "Undercoat Painting" 100% Bebas Garis Celah SVG!
 */

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const TARGET_W = 800;
const TARGET_H = 400; 
const dpr = window.devicePixelRatio || 1;

canvas.width = TARGET_W * dpr;
canvas.height = TARGET_H * dpr;
canvas.style.width = TARGET_W + 'px';
canvas.style.height = TARGET_H + 'px';
ctx.scale(dpr, dpr);

// Biarkan true agar grafis karakter & lingkungan tetap HD dan halus
ctx.imageSmoothingEnabled = true; 

const W = TARGET_W; 
const H = TARGET_H;
const GROUND_Y = H - 40; 

/* --- ASSET GAMBAR KENNEY --- */
const ASSETS = {
    playerIdle: new Image(), playerWalk1: new Image(), playerWalk2: new Image(), playerJump: new Image(), playerHit: new Image(),
    slime: new Image(), spike: new Image(), bat: new Image(), flag: new Image(),
    
    bgClouds: new Image(), bgHillsFade: new Image(), bgHillsColor: new Image(),
    bgTreesFade: new Image(), bgTreesColor: new Image(), bgDesertFade: new Image(), bgDesertColor: new Image(),
    bgMushroomsFade: new Image(), bgMushroomsColor: new Image(),

    tileGrass: new Image(), tileDirt: new Image(), decorBush: new Image(),
    tileBrown: new Image(), tileBrownDirt: new Image(), decorMushroom: new Image(),
    tileSand: new Image(), tileSandDirt: new Image(), decorCactus: new Image()
};

ASSETS.playerIdle.src = 'assets/character_purple_idle.svg'; 
ASSETS.playerWalk1.src = 'assets/character_purple_walk_a.svg'; 
ASSETS.playerWalk2.src = 'assets/character_purple_walk_b.svg'; 
ASSETS.playerJump.src = 'assets/character_purple_jump.svg'; 
ASSETS.playerHit.src = 'assets/character_purple_hit.svg'; 
ASSETS.slime.src = 'assets/slime_walk.svg';
ASSETS.spike.src = 'assets/spikes.svg';      
ASSETS.bat.src = 'assets/bee.svg';           
ASSETS.flag.src = 'assets/flag_yellow.svg';  

ASSETS.bgClouds.src = 'assets/background_clouds.svg'; 
ASSETS.bgHillsFade.src = 'assets/background_fade_hills.svg';
ASSETS.bgHillsColor.src = 'assets/background_color_hills.svg';
ASSETS.bgTreesFade.src = 'assets/background_fade_trees.svg';
ASSETS.bgTreesColor.src = 'assets/background_color_trees.svg';
ASSETS.bgDesertFade.src = 'assets/background_fade_desert.svg';
ASSETS.bgDesertColor.src = 'assets/background_color_desert.svg';
ASSETS.bgMushroomsFade.src = 'assets/background_fade_mushrooms.svg';
ASSETS.bgMushroomsColor.src = 'assets/background_color_mushrooms.svg';

ASSETS.tileGrass.src = 'assets/terrain_grass_vertical_top.svg';
ASSETS.tileDirt.src = 'assets/terrain_dirt_vertical_middle.svg'; 
ASSETS.decorBush.src = 'assets/plant_bush.svg'; 

ASSETS.tileBrown.src = 'assets/terrain_dirt_vertical_top.svg'; 
ASSETS.tileBrownDirt.src = 'assets/terrain_dirt_vertical_middle.svg';
ASSETS.decorMushroom.src = 'assets/mushroom_red.svg'; 

ASSETS.tileSand.src = 'assets/terrain_sand_vertical_top.svg';
ASSETS.tileSandDirt.src = 'assets/terrain_sand_vertical_middle.svg';
ASSETS.decorCactus.src = 'assets/cactus_short.svg'; 

/* --- STATUS & VARIABEL GLOBAL --- */
const STATE = { MENU: 0, LEVEL_SELECT: 1, PLAYING: 2, PAUSED_QUIZ: 3, GAME_OVER: 4, LEVEL_COMPLETE: 5, WIN: 6, RESPAWNING: 7 };
let currentState = STATE.MENU;
let currentLevel = 1;
let unlockedLevels = parseInt(localStorage.getItem('bq_unlocked')) || 1;
let totalScore = parseInt(localStorage.getItem('bq_score')) || 0;
let levelScore = 0; let lives = 3; let lastTime = 0; let currentFrameId = null;
let cameraX = 0; let nextSpawnX = 500; let cpSpawnedThisLevel = 0; let shakeTime = 0;
let player; let obstacles = []; let checkpoints = []; let particles = []; let pits = []; let bgLayers = null;

/* --- DATA KUIS IPS --- */
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

/* --- UI HANDLER --- */
function showOverlay(id) { document.querySelectorAll('.overlay').forEach(el => el.classList.remove('active')); if (id) { document.getElementById(id).classList.add('active'); document.getElementById('hud').classList.remove('active'); } }
function updateHUD() { document.getElementById('lives').innerText = '❤️'.repeat(lives); document.getElementById('score').innerText = totalScore + levelScore; document.getElementById('level-name').innerText = 'LEVEL ' + currentLevel; }
function showLevelSelect() {
    currentState = STATE.LEVEL_SELECT; showOverlay('level-select'); const container = document.getElementById('levels-container'); container.innerHTML = '';
    for (let i = 1; i <= 3; i++) {
        let isLocked = i > unlockedLevels; let c = document.createElement('div'); c.className = `card ${isLocked ? 'locked' : ''}`;
        c.innerHTML = `<h3>Level ${i}</h3><p style="color:#FFF;">${LEVELS[i].name}</p><div style="font-size:24px;margin-top:10px;">${isLocked ? '🔒' : '⭐'}</div>`;
        if (!isLocked) c.onclick = () => initGame(i); container.appendChild(c);
    }
}

/* --- SFX AUDIO --- */
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const sfx = {
    playTone(freq, type, duration, vol = 0.1) {
        try { if (audioCtx.state === 'suspended') audioCtx.resume(); const osc = audioCtx.createOscillator(); const gain = audioCtx.createGain(); osc.type = type; osc.frequency.setValueAtTime(freq, audioCtx.currentTime); gain.gain.setValueAtTime(vol, audioCtx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration); osc.connect(gain); gain.connect(audioCtx.destination); osc.start(); osc.stop(audioCtx.currentTime + duration); } catch(e) { }
    },
    jump() { this.playTone(400, 'square', 0.15, 0.05); setTimeout(() => this.playTone(600, 'square', 0.15, 0.05), 50); }, hit() { this.playTone(150, 'sawtooth', 0.3, 0.1); }, coin() { this.playTone(800, 'sine', 0.1, 0.05); setTimeout(() => this.playTone(1200, 'sine', 0.2, 0.05), 100); }, over() { this.playTone(200, 'square', 0.5, 0.1); setTimeout(() => this.playTone(100, 'square', 0.8, 0.1), 300); }
};

/* --- KELAS ENTITAS --- */
class Player {
    constructor(cfgSpeed) {
        this.w = 40; this.h = 48; this.x = 200; this.y = GROUND_Y - this.h; this.vy = 0; this.vx = 0;
        this.maxSpeed = cfgSpeed; this.accel = 5000; this.friction = 0.85; this.grav = 1600; this.fallGravMulti = 1.8; this.jumpForce = -800;
        this.grounded = true; this.squash = 0; this.animTimer = 0; this.facingRight = true; this.idleTimer = 0;
    }
    jump() { if (this.grounded) { this.vy = this.jumpForce; this.grounded = false; this.squash = -8; sfx.jump(); spawnDust(this.x + this.w / 2 - cameraX, this.y + this.h); } }
    update(dt) {
        if (keys.left) this.vx -= this.accel * dt; if (keys.right) this.vx += this.accel * dt;
        this.vx *= this.friction; if (this.vx > this.maxSpeed) this.vx = this.maxSpeed; if (this.vx < -this.maxSpeed) this.vx = -this.maxSpeed;
        if (this.vx > 5) this.facingRight = true; if (this.vx < -5) this.facingRight = false;
        this.animTimer += dt;
        if (this.grounded && Math.abs(this.vx) < 5) { this.idleTimer += dt; } else { this.idleTimer = 0; }
        this.x += this.vx * dt; if (this.x < cameraX) { this.x = cameraX; this.vx = 0; }
        let targetScreenX = W * 0.35; let desiredCameraX = this.x - targetScreenX;
        if (desiredCameraX > cameraX) { cameraX += (desiredCameraX - cameraX) * 12 * dt; if (cameraX < desiredCameraX - 10) cameraX = desiredCameraX - 10; }
        let currentGrav = this.grav; if (this.vy > 0) currentGrav *= this.fallGravMulti; else if (!keys.jump && this.vy < 0) currentGrav *= 2.5;
        this.vy += currentGrav * dt; this.y += this.vy * dt;
        
        let overPit = false; let pxCenter = this.x + this.w / 2;
        for (let p of pits) { if (pxCenter > p.x && pxCenter < p.x + p.w) { overPit = true; break; } }
        if (this.y + this.h >= GROUND_Y && this.y + this.h <= GROUND_Y + 25 && this.vy >= 0 && !overPit) {
            if (!this.grounded) { spawnDust(this.x + this.w / 2 - cameraX, this.y + this.h); this.squash = 10; }
            this.y = GROUND_Y - this.h; this.vy = 0; this.grounded = true;
        } else if (this.y + this.h > GROUND_Y) { this.grounded = false; }
        if (this.y > H + 100 && currentState === STATE.PLAYING) { lives--; updateHUD(); if (lives <= 0) gameOver(); else stopGame(); return; }
        this.squash *= 0.8; if (Math.abs(this.squash) < 0.1) this.squash = 0;
    }
    draw(ctx, cx) {
        let screenX = this.x - cx; let sq = this.squash; let breatheSq = 0; 
        ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(screenX + this.w / 2, GROUND_Y, this.w / 2 + Math.abs(this.vx)*0.01, 5, 0, 0, Math.PI * 2); ctx.fill();

        let currentFrame = ASSETS.playerIdle; 
        if (currentState === STATE.RESPAWNING || currentState === STATE.GAME_OVER) { currentFrame = ASSETS.playerHit; } 
        else if (!this.grounded) { currentFrame = ASSETS.playerJump; } 
        else if (Math.abs(this.vx) > 10) { if (Math.floor(this.animTimer / 0.15) % 2 === 0) currentFrame = ASSETS.playerWalk1; else currentFrame = ASSETS.playerWalk2; } 
        else { breatheSq = Math.sin(this.idleTimer * 4) * 1.5; if (this.idleTimer > 2.0 && this.idleTimer % 3.5 < 0.15) currentFrame = ASSETS.playerHit; }

        if (currentFrame.complete) {
            let totalSquash = sq + breatheSq; let curH = this.h - totalSquash; let curW = this.w + (totalSquash * 0.5); let adjX = screenX - (curW - this.w) / 2;
            ctx.save();
            if (!this.facingRight) { ctx.translate(adjX + curW / 2, 0); ctx.scale(-1, 1); ctx.drawImage(currentFrame, -curW / 2, this.y + totalSquash, curW, curH); } 
            else { ctx.drawImage(currentFrame, adjX, this.y + totalSquash, curW, curH); }
            ctx.restore(); 
        } else { ctx.fillStyle = '#9b59b6'; ctx.fillRect(screenX, this.y + 10, this.w, this.h - 10); }
    }
    getHitbox() { return { x: this.x + 5, y: this.y + 5, w: this.w - 10, h: this.h - 5 }; }
}

class Obstacle {
    constructor(worldX, type) { this.w = 34; this.h = 34; this.type = type; this.x = worldX; this.originX = worldX; this.y = GROUND_Y - this.h; this.originY = GROUND_Y - this.h - 60; this.marked = false; this.phase = Math.random() * Math.PI * 2; }
    update(dt) { this.phase += 3 * dt; if (this.type === 1) this.x = this.originX + Math.sin(this.phase) * 80; else if (this.type === 2) this.y = this.originY + Math.sin(this.phase) * 60; }
    draw(ctx, cx) {
        let screenX = this.x - cx; if (screenX < -this.w || screenX > W + this.w) return; 
        ctx.shadowBlur = 10; ctx.shadowColor = (this.type === 1) ? '#ff00ff' : (this.type === 2) ? '#ff4d4d' : 'rgba(0,0,0,0.5)';
        if (this.type === 0 && ASSETS.spike.complete) { ctx.drawImage(ASSETS.spike, screenX, this.y, this.w, this.h); } 
        else if (this.type === 1 && ASSETS.slime.complete) { let squish = Math.sin(this.phase * 2) * 5; ctx.drawImage(ASSETS.slime, screenX, this.y + squish/2, this.w, this.h - squish/2); } 
        else if (this.type === 2 && ASSETS.bat.complete) { let wingY = Math.sin(this.phase * 4) * 15; ctx.drawImage(ASSETS.bat, screenX, this.y + (wingY * 0.3), this.w, this.h); } 
        else {
            if (this.type === 0) { ctx.fillStyle = '#888'; ctx.beginPath(); ctx.moveTo(screenX, this.y + this.h); ctx.lineTo(screenX + this.w / 2, this.y + 10); ctx.lineTo(screenX + this.w, this.y + this.h); ctx.fill(); } 
            else if (this.type === 1) { ctx.fillStyle = '#b300b3'; let squish = Math.sin(this.phase * 2) * 5; ctx.beginPath(); ctx.ellipse(screenX + this.w / 2, this.y + this.h - 10 + squish / 2, this.w / 2, 10 - squish / 2, 0, 0, Math.PI * 2); ctx.fill(); } 
            else if (this.type === 2) { ctx.fillStyle = '#222'; ctx.fillRect(screenX + 10, this.y + 10, 14, 10); }
        }
        ctx.shadowBlur = 0;
    }
    getHitbox() { let shrink = (this.type === 2) ? 14 : 10; return { x: this.x + 5, y: this.y + 5, w: this.w - shrink, h: this.h - shrink }; }
}

class Checkpoint {
    constructor(worldX, qIndex) { this.x = worldX; this.y = GROUND_Y - 60; this.w = 40; this.h = 60; this.qIndex = qIndex; this.triggered = false; this.phase = 0; }
    update(dt) { this.phase += 6 * dt; }
    draw(ctx, cx) {
        let screenX = this.x - cx; if (screenX < -this.w || screenX > W) return;
        if (ASSETS.flag.complete) { ctx.drawImage(ASSETS.flag, screenX, this.y, this.w, this.h); ctx.fillStyle = '#FFF'; ctx.font = '10px "Press Start 2P"'; let wave = Math.sin(this.phase) * 5; ctx.fillText('?', screenX + 15, this.y - 10 + wave);
        } else { ctx.fillStyle = '#ccc'; ctx.fillRect(screenX, this.y, 6, this.h); ctx.fillStyle = '#F5C518'; let wave = Math.sin(this.phase) * 5; ctx.beginPath(); ctx.moveTo(screenX + 6, this.y); ctx.quadraticCurveTo(screenX + 25, this.y - 5 + wave, screenX + 40, this.y + 10); ctx.quadraticCurveTo(screenX + 25, this.y + 25 + wave, screenX + 6, this.y + 25); ctx.fill(); ctx.fillStyle = '#FFF'; ctx.font = '10px "Press Start 2P"'; ctx.fillText('?', screenX + 15, this.y + 18); }
    }
    getHitbox() { return this; }
}

class Particle {
    constructor(startX, startY, color, isDust = false) { this.x = startX; this.y = startY; this.isDust = isDust; this.vx = (Math.random() - 0.5) * (isDust ? 100 : 300); this.vy = (Math.random() - (isDust ? 0 : 1)) * (isDust ? 20 : 400); this.life = 1.0; this.color = color; this.size = isDust ? Math.random() * 4 + 2 : Math.random() * 5 + 4; }
    update(dt) { this.x += this.vx * dt; this.y += this.vy * dt; if (!this.isDust) this.vy += 800 * dt; this.life -= (this.isDust ? 2.5 : 0.8) * dt; }
    draw(ctx) { ctx.fillStyle = this.color; ctx.globalAlpha = Math.max(0, this.life); ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1.0; }
}
function spawnDust(screenX, screenY) { for (let i = 0; i < 5; i++) particles.push(new Particle(screenX + (Math.random() * 16 - 8), screenY, '#d3d3d3', true)); }

/* ==========================================================
   CLASS PARALLAX
   ========================================================== */
class ParallaxBg {
    constructor(type) {
        this.type = type; 
        this.skyGrad = ctx.createLinearGradient(0, 0, 0, H);
        if (this.type === 'village') { this.skyGrad.addColorStop(0, '#4aaeff'); this.skyGrad.addColorStop(1, '#a6d9ff'); } 
        else if (this.type === 'sawah') { this.skyGrad.addColorStop(0, '#ff7b54'); this.skyGrad.addColorStop(1, '#ffd56b'); } 
        else if (this.type === 'temple') { this.skyGrad.addColorStop(0, '#e8a158'); this.skyGrad.addColorStop(1, '#f2d49b'); } 
        else { this.skyGrad.addColorStop(0, '#2d1e2f'); this.skyGrad.addColorStop(1, '#852b47'); }
    }
    drawLayer(ctx, img, cx, speed, targetHeight, yPos) {
        if (!img.complete || img.naturalWidth === 0) return; 
        let imgW = Math.ceil(img.naturalWidth * (targetHeight / img.naturalHeight)); 
        let offset = Math.floor((cx * speed) % imgW);
        let tilesNeeded = Math.ceil(W / imgW) + 1;
        
        for (let i = -1; i <= tilesNeeded; i++) { 
            let drawX = Math.floor(i * imgW - offset) - 1; 
            let drawW = imgW + 2; 
            ctx.drawImage(img, drawX, yPos, drawW, targetHeight); 
        }
    }
    draw(ctx, cx) {
        ctx.fillStyle = this.skyGrad; ctx.fillRect(0, 0, W, H);
        let activeFade, activeColor;
        if (this.type === 'village') { activeFade = ASSETS.bgHillsFade; activeColor = ASSETS.bgHillsColor; } 
        else if (this.type === 'sawah') { activeFade = ASSETS.bgTreesFade; activeColor = ASSETS.bgTreesColor; } 
        else if (this.type === 'temple') { activeFade = ASSETS.bgDesertFade; activeColor = ASSETS.bgDesertColor; } 
        else { activeFade = ASSETS.bgMushroomsFade; activeColor = ASSETS.bgMushroomsColor; }

        this.drawLayer(ctx, ASSETS.bgClouds, cx, 0.1, 260, 0);
        this.drawLayer(ctx, activeFade, cx, 0.3, 220, GROUND_Y - 215);
        this.drawLayer(ctx, activeColor, cx, 0.5, 150, GROUND_Y - 145);
    }
}

// ==========================================================
// FUNGSI GROUND (CAT DASAR + EXACT TILE SIZING)
// ==========================================================
function drawDynamicGround(ctx, cx, type) {
    let topTile, bodyTile, decorImg;
    let baseTop, baseBody; // Variabel warna cat dasar

    // Setel Asset & Warna Cat Dasar sesuai tema level
    if (type === 'temple') { 
        topTile = ASSETS.tileSand; bodyTile = ASSETS.tileSandDirt; decorImg = ASSETS.decorCactus; 
        baseTop = '#e3b778'; baseBody = '#d4a373';
    } else if (type === 'sawah') { 
        topTile = ASSETS.tileBrown; bodyTile = ASSETS.tileBrownDirt; decorImg = ASSETS.decorMushroom; 
        baseTop = '#c67e41'; baseBody = '#a05b2c';
    } else { // Village & Menu
        topTile = ASSETS.tileGrass; bodyTile = ASSETS.tileDirt; decorImg = ASSETS.decorBush; 
        baseTop = '#71c837'; baseBody = '#a05b2c'; 
    }

    let maxR = cx + W; let chunks = []; let cur = cx;
    for (let p of pits) {
        if (p.x > maxR) break; 
        if (p.x + p.w < cx) continue;
        if (cur < p.x) chunks.push({ x: cur, w: p.x - cur });
        cur = Math.max(cur, p.x + p.w);
    }
    if (cur < maxR) chunks.push({ x: cur, w: maxR - cur });

    const TILE_SIZE = 40; 

    chunks.forEach(c => {
        let scX = Math.floor(c.x - cx);
        let scW = Math.ceil(c.w);

        ctx.save();
        ctx.beginPath();
        ctx.rect(scX, 0, scW, H); 
        ctx.clip();

        // ----------------------------------------------------
        // JURUS UNDERCOAT: KITA CAT DULU LATARNYA FULL SOLID!
        // ----------------------------------------------------
        ctx.fillStyle = baseTop;
        ctx.fillRect(scX, Math.floor(GROUND_Y), scW + 1, TILE_SIZE); // Blok Rumput
        
        ctx.fillStyle = baseBody;
        ctx.fillRect(scX, Math.floor(GROUND_Y) + TILE_SIZE, scW + 1, H); // Blok Tanah

        // Jika SVG belum loading, minimal tanah cat solid ini sudah muncul
        if (!topTile.complete || topTile.naturalWidth === 0) {
            ctx.restore(); return;
        }

        let firstTileX = Math.floor(c.x / TILE_SIZE) * TILE_SIZE;
        
        for (let tx = firstTileX; tx < c.x + c.w; tx += TILE_SIZE) {
            let drawX = Math.floor(tx - cx);

            // Karena kita punya Undercoat, kita BISA menggambar ubin dengan ukuran aslinya
            // tanpa takut ada pinggiran bocor. Lengkungan rumputnya akan tetap mulus!
            if (bodyTile.complete && bodyTile.naturalWidth > 0) {
                for (let ty = GROUND_Y + TILE_SIZE; ty < H + 50; ty += TILE_SIZE) {
                    ctx.drawImage(bodyTile, drawX, Math.floor(ty), TILE_SIZE, TILE_SIZE); 
                }
            }
            
            ctx.drawImage(topTile, drawX, Math.floor(GROUND_Y), TILE_SIZE, TILE_SIZE);

            // Dekorasi
            let magicSeed = Math.abs(Math.sin(tx * 99.99));
            if (decorImg.complete && decorImg.naturalWidth > 0 && magicSeed > 0.85) {
                let dSize = 28 + (magicSeed * 10); 
                ctx.drawImage(decorImg, drawX + (TILE_SIZE - dSize)/2, Math.floor(GROUND_Y) - dSize + 5, dSize, dSize);
            }
        }
        ctx.restore();
    });
}

/* --- GAME LOOP --- */
let quizActiveIndex = -1;

function resetGame(isRespawn = false) {
    let cfg = LEVELS[currentLevel]; player = new Player(cfg.maxSpeed); obstacles = []; checkpoints = []; particles = []; pits = []; bgLayers = new ParallaxBg(cfg.bg);
    cameraX = 0; nextSpawnX = player.x + 800; cpSpawnedThisLevel = 0; quizActiveIndex = -1; shakeTime = 0;
    if (!isRespawn) { levelScore = 0; lives = 3; }
}

function initGame(level) {
    try { if (audioCtx.state === 'suspended') audioCtx.resume(); } catch(e){}
    currentLevel = level; resetGame(false); currentState = STATE.PLAYING;
    showOverlay(null); document.getElementById('hud').classList.add('active'); updateHUD();
    lastTime = performance.now(); if (currentFrameId) cancelAnimationFrame(currentFrameId); currentFrameId = requestAnimationFrame(gameLoop);
}

function stopGame() { currentState = STATE.RESPAWNING; shakeTime = 0; let f = document.getElementById('flash-overlay'); f.style.backgroundColor = 'rgba(0,0,0,0.7)'; f.style.opacity = '1'; setTimeout(respawn, 1000); }
function respawn() { resetGame(true); let f = document.getElementById('flash-overlay'); f.style.backgroundColor = 'rgba(255,0,0,0.4)'; f.style.opacity = '0'; updateHUD(); currentState = STATE.PLAYING; lastTime = performance.now(); }

function gameLoop(timestamp) {
    let dt = (timestamp - lastTime) / 1000; if (dt > 0.1) dt = 0.1; lastTime = timestamp;
    if (currentState === STATE.PLAYING || currentState === STATE.PAUSED_QUIZ || currentState === STATE.RESPAWNING) {
        if (currentState === STATE.PLAYING) { update(dt); } else if (currentState === STATE.PAUSED_QUIZ) { particles.forEach(p => p.update(dt)); particles = particles.filter(p => p.life > 0); }
        draw(); currentFrameId = requestAnimationFrame(gameLoop);
    }
}

function checkCollision(r1, r2) { return r1.x < r2.x + r2.w && r1.x + r1.w > r2.x && r1.y < r2.y + r2.h && r1.y + r1.h > r2.y; }

function update(dt) {
    let cfg = LEVELS[currentLevel]; player.update(dt); let cpInterval = 3000; 
    if (player.x + 1500 > nextSpawnX && cpSpawnedThisLevel < 3) {
        let expectedCP = Math.floor(nextSpawnX / cpInterval);
        if (expectedCP > cpSpawnedThisLevel) { checkpoints.push(new Checkpoint(nextSpawnX, cpSpawnedThisLevel)); cpSpawnedThisLevel++; nextSpawnX += 800; } 
        else {
            let chosenPattern = [0]; try { chosenPattern = cfg.patterns[Math.floor(Math.random() * cfg.patterns.length)]; } catch (e) {}
            let curX = nextSpawnX;
            chosenPattern.forEach((type) => {
                let isPit = type >= 3 && type <= 5;
                if (isPit) { let pw = (type === 3) ? 150 : (type === 4) ? 250 : 350; pits.push({ x: curX, w: pw }); curX += pw + 250; } 
                else { obstacles.push(new Obstacle(curX, type)); curX += cfg.innerGap; }
            });
            nextSpawnX = curX - cfg.innerGap + cfg.spawnGap; 
        }
    }

    for (let i = obstacles.length - 1; i >= 0; i--) {
        let obs = obstacles[i]; obs.update(dt);
        if (checkCollision(player.getHitbox(), obs.getHitbox()) && !obs.marked) { obs.marked = true; lives--; shakeTime = 0.3; sfx.hit(); flashScreen(); updateHUD(); if (lives <= 0) gameOver(); else stopGame(); }
        if (obs.x < cameraX - 200) obstacles.splice(i, 1); 
    }
    for (let i = pits.length - 1; i >= 0; i--) { if (pits[i].x + pits[i].w < cameraX - 200) pits.splice(i, 1); }
    for (let i = checkpoints.length - 1; i >= 0; i--) {
        let cp = checkpoints[i]; cp.update(dt);
        if (checkCollision(player.getHitbox(), cp.getHitbox()) && !cp.triggered) { cp.triggered = true; sfx.coin(); triggerQuiz(cp.qIndex); }
        if (cp.x < cameraX - 200) checkpoints.splice(i, 1);
    }
    particles.forEach(p => p.update(dt)); particles = particles.filter(p => p.life > 0); if (shakeTime > 0) shakeTime -= dt;
}

function draw() {
    ctx.clearRect(0, 0, W, H); ctx.save();
    if (shakeTime > 0) { let dx = (Math.random() - 0.5) * 10; let dy = (Math.random() - 0.5) * 10; ctx.translate(dx, dy); }
    
    // Kamera wajib disnap ke Integer (bulat)
    let camSnap = Math.floor(cameraX);

    bgLayers.draw(ctx, camSnap); drawDynamicGround(ctx, camSnap, LEVELS[currentLevel].bg);
    checkpoints.forEach(c => c.draw(ctx, camSnap)); obstacles.forEach(o => o.draw(ctx, camSnap)); player.draw(ctx, camSnap); particles.forEach(p => p.draw(ctx)); 
    ctx.restore();
}

/* --- KONTROL --- */
function jumpAction() { if (currentState === STATE.PLAYING) player.jump(); }
const keys = { left: false, right: false, jump: false };
window.addEventListener('keydown', e => { if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) { e.preventDefault(); } if (e.repeat) return; if (e.code === 'Space' || e.code === 'ArrowUp' || e.key === 'w' || e.key === 'W') { keys.jump = true; jumpAction(); } if (e.code === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.left = true; if (e.code === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = true; }, { passive: false });
window.addEventListener('keyup', e => { if (e.code === 'Space' || e.code === 'ArrowUp' || e.key === 'w' || e.key === 'W') keys.jump = false; if (e.code === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.left = false; if (e.code === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = false; });
window.addEventListener('touchstart', e => { if (e.target.tagName !== 'BUTTON') { keys.jump = true; jumpAction(); } }); window.addEventListener('touchend', e => { if (e.target.tagName !== 'BUTTON') keys.jump = false; });

/* --- LOGIKA PERALIHAN LAYAR --- */
function flashScreen() { let f = document.getElementById('flash-overlay'); f.style.opacity = '1'; setTimeout(() => { f.style.opacity = '0'; }, 200); }
function gameOver() { currentState = STATE.GAME_OVER; sfx.over(); document.getElementById('final-score').innerText = totalScore + levelScore; unlockedLevels = 1; totalScore = 0; localStorage.setItem('bq_unlocked', 1); localStorage.setItem('bq_score', 0); showOverlay('game-over'); }
function triggerQuiz(qIndex) {
    currentState = STATE.PAUSED_QUIZ; quizActiveIndex = qIndex; let qData = QUESTIONS[currentLevel][qIndex]; document.getElementById('quiz-question').innerText = qData.q;
    let optsDiv = document.getElementById('quiz-options'); optsDiv.innerHTML = ''; const letters = ['A', 'B', 'C', 'D'];
    qData.opts.forEach((opt, i) => { let btn = document.createElement('button'); btn.className = 'opt-btn'; btn.innerText = `${letters[i]}) ${opt}`; btn.onclick = () => checkAnswer(i, qData.ans); optsDiv.appendChild(btn); });
    document.getElementById('quiz-feedback').style.display = 'none'; document.getElementById('quiz-next-btn').style.display = 'none'; showOverlay('quiz-modal');
}
function checkAnswer(selected, correct) {
    let fb = document.getElementById('quiz-feedback'); fb.style.display = 'block'; document.querySelectorAll('.opt-btn').forEach(b => b.disabled = true);
    if (selected === correct) { fb.style.color = 'var(--green)'; fb.innerText = 'Hebat! +10 Poin'; levelScore += 10; sfx.coin(); updateHUD(); createConfetti(); } else { fb.style.color = '#f00'; fb.innerText = 'Jawaban Kurang Tepat!'; sfx.hit(); shakeTime = 0.2; flashScreen(); }
    document.getElementById('quiz-next-btn').style.display = 'block';
}
function resumeGame() { if (quizActiveIndex >= 2) finishLevel(); else { document.getElementById('quiz-modal').classList.remove('active'); setTimeout(() => { lastTime = performance.now(); currentState = STATE.PLAYING; }, 400); } }
function createConfetti() { const clr = ['#C1440E', '#F5C518', '#2D6A2D', '#1A6BAA', '#FFF8E7']; for (let i = 0; i < 50; i++) particles.push(new Particle(W / 2, H / 2, clr[Math.floor(Math.random() * clr.length)])); }

let winTimer = null;
function finishLevel() {
    currentState = STATE.LEVEL_COMPLETE; totalScore += levelScore; localStorage.setItem('bq_score', totalScore); if (currentLevel < 3 && currentLevel >= unlockedLevels) { unlockedLevels = currentLevel + 1; localStorage.setItem('bq_unlocked', unlockedLevels); } document.getElementById('level-score').innerText = levelScore;
    if (currentLevel === 3) {
        currentState = STATE.WIN; document.getElementById('win-score').innerText = totalScore; showOverlay('win-screen'); if (winTimer) clearInterval(winTimer); winTimer = setInterval(createConfetti, 800); unlockedLevels = 1; totalScore = 0; localStorage.setItem('bq_unlocked', 1); localStorage.setItem('bq_score', 0); lastTime = performance.now(); if (currentFrameId) cancelAnimationFrame(currentFrameId);
        currentFrameId = requestAnimationFrame(function winLoop(timestamp) { let dt = (timestamp - lastTime) / 1000; if (dt > 0.1) dt = 0.1; lastTime = timestamp; if (currentState === STATE.WIN) { ctx.clearRect(0, 0, W, H); bgLayers.draw(ctx, 0); drawDynamicGround(ctx, 0, LEVELS[currentLevel].bg); particles.forEach(p => p.update(dt)); particles = particles.filter(p => p.life > 0); particles.forEach(p => p.draw(ctx)); currentFrameId = requestAnimationFrame(winLoop); } else { clearInterval(winTimer); } });
    } else { showOverlay('level-complete'); }
}
function nextLevel() { initGame(currentLevel + 1); } function retryLevel() { initGame(currentLevel); } function goMainMenu() { if (winTimer) clearInterval(winTimer); currentState = STATE.MENU; showOverlay('main-menu'); startMenuLoop(); }

bgLayers = new ParallaxBg('menu'); let demoCam = 0;
function startMenuLoop() {
    lastTime = performance.now(); pits = []; if (currentFrameId) cancelAnimationFrame(currentFrameId);
    currentFrameId = requestAnimationFrame(function menuLoop(timestamp) { let dt = (timestamp - lastTime) / 1000; if (dt > 0.1) dt = 0.1; lastTime = timestamp; if (currentState === STATE.MENU || currentState === STATE.LEVEL_SELECT || currentState === STATE.GAME_OVER || currentState === STATE.LEVEL_COMPLETE) { demoCam += 50 * dt; ctx.clearRect(0, 0, W, H); bgLayers.draw(ctx, Math.floor(demoCam)); drawDynamicGround(ctx, Math.floor(demoCam), 'menu'); currentFrameId = requestAnimationFrame(menuLoop); } });
}
startMenuLoop();