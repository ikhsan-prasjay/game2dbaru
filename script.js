/** 
 * BRAIN QUEST - CORE ENGINE
 * Platformer 2D Modular System with Pits (Gap) Framework & Permadeath
 */

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const W = canvas.width;
const H = canvas.height;
const GROUND_Y = H - 40; 

/* --- STATUS & VARIABEL GLOBAL --- */
const STATE = { MENU: 0, LEVEL_SELECT: 1, PLAYING: 2, PAUSED_QUIZ: 3, GAME_OVER: 4, LEVEL_COMPLETE: 5, WIN: 6, RESPAWNING: 7 };
let currentState = STATE.MENU;

let currentLevel = 1;
let unlockedLevels = parseInt(localStorage.getItem('bq_unlocked')) || 1;
let totalScore = parseInt(localStorage.getItem('bq_score')) || 0;
let levelScore = 0;
let lives = 3;

// Engine Timing & Camera
let lastTime = 0;
let currentFrameId = null; // Pengunci loop ganda
let cameraX = 0;
let nextSpawnX = 500; 
let cpSpawnedThisLevel = 0;
let shakeTime = 0;

// Obyek Dunia
let player;
let obstacles = [];
let checkpoints = [];
let particles = [];
let pits = []; // {x, w} Array jurang!
let bgLayers = null;


/* --- DATA KUIS --- */
const QUESTIONS = {
    1: [
        { q: "Apa nama mata uang yang digunakan di Indonesia?", opts: ["Dollar", "Rupiah", "Yen", "Euro"], ans: 1 },
        { q: "Pulau terbesar di Indonesia adalah…", opts: ["Jawa", "Bali", "Kalimantan", "Sulawesi"], ans: 2 },
        { q: "Berapa jumlah provinsi di Indonesia saat ini?", opts: ["34", "38", "30", "40"], ans: 1 } 
    ],
    2: [
        { q: "Tari Saman berasal dari provinsi…", opts: ["Jawa Barat", "Sumatera Utara", "Aceh", "Sulawesi"], ans: 2 },
        { q: "Bahasa resmi negara Indonesia adalah…", opts: ["Jawa", "Indonesia", "Melayu", "Sunda"], ans: 1 },
        { q: "Candi Borobudur terletak di provinsi…", opts: ["DKI Jakarta", "Jawa Timur", "Bali", "Jawa Tengah"], ans: 3 }
    ],
    3: [
        { q: "Indonesia memproklamasikan kemerdekaan pada tanggal…", opts: ["1 Juni 1945", "17 Agustus 1945", "20 Mei 1908", "28 Oktober 1928"], ans: 1 },
        { q: "Siapakah proklamator kemerdekaan Indonesia?", opts: ["Soeharto & Habibie", "Cut Nyak Dien & Kartini", "Soekarno & Hatta", "Gajah Mada & Hayam Wuruk"], ans: 2 },
        { q: "Pancasila sebagai dasar negara dirumuskan oleh…", opts: ["Moh. Yamin", "Soepomo", "Soekarno", "Hatta"], ans: 2 }
    ]
};


/* --- MODUL LEVEL & DIFFICULTY SCALING (PARKOUR & PITS) --- */
const LEVELS = { 
    1: { 
        name: "Mengenal Lingkungan", 
        bg: "village", 
        maxSpeed: 600,   // Kecepatan lambat (Tutorial)
        spawnGap: 800,   // Jeda antar grup leluasa
        innerGap: 350,   // Jeda rintangan dalam 1 grup
        // 0=Spike, 3=Pit 150px
        patterns: [ [0], [3], [0, 0], [3, 0] ] 
    },
    2: { 
        name: "Sosial & Budaya", 
        bg: "sawah", 
        maxSpeed: 750,   // Cukup cekatan
        spawnGap: 550,   // Kelonggaran dipangkas
        innerGap: 300,   // Kombinasi lebih padat
        // 0=Spike, 1=Slime, 3=Pit 150px, 4=Pit 250px
        patterns: [ [0, 1], [3, 1], [4, 0], [1, 0], [3, 3] ]
    },
    3: { 
        name: "Sejarah", 
        bg: "temple", 
        maxSpeed: 900,   // Kecepatan sangat reaktif
        spawnGap: 400,   // Mengalir terus menerus
        innerGap: 280,   // Kombinasi parkour menuntut timing pas
        // 0=Spike, 1=Slime, 2=Bat, 3=Pit150, 4=Pit250, 5=Pit350
        // (Kombinasi 4, 2 -> Lompat jurang, waspada kelelawar)
        patterns: [ [0, 2], [4, 2], [5], [3, 0, 1], [0, 1, 0, 3], [5, 0] ]
    }
};


/* --- MODUL UI DOM HANDLER --- */
function showOverlay(id) {
    document.querySelectorAll('.overlay').forEach(el => el.classList.remove('active'));
    if (id) {
        document.getElementById(id).classList.add('active');
        document.getElementById('hud').classList.remove('active');
    }
}

function updateHUD() {
    document.getElementById('lives').innerText = '❤️'.repeat(lives);
    document.getElementById('score').innerText = totalScore + levelScore;
    document.getElementById('level-name').innerText = 'LEVEL ' + currentLevel;
}

function showLevelSelect() {
    console.log("[DEBUG] Membutuhkan Level Pilih...");
    currentState = STATE.LEVEL_SELECT;
    showOverlay('level-select');
    const container = document.getElementById('levels-container');
    container.innerHTML = '';
    for (let i = 1; i <= 3; i++) {
        let isLocked = i > unlockedLevels;
        let c = document.createElement('div');
        c.className = `card ${isLocked ? 'locked' : ''}`;
        c.innerHTML = `<h3>Level ${i}</h3><p style="color:#FFF;">${LEVELS[i].name}</p><div style="font-size:24px;margin-top:10px;">${isLocked ? '🔒' : '⭐'}</div>`;
        if (!isLocked) c.onclick = () => initGame(i);
        container.appendChild(c);
    }
}


/* --- MODUL SFX AUDIO (FAIL-SAFE) --- */
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const sfx = {
    playTone(freq, type, duration, vol = 0.1) {
        try {
            if (audioCtx.state === 'suspended') audioCtx.resume();
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = type; osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
            gain.gain.setValueAtTime(vol, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
            osc.connect(gain); gain.connect(audioCtx.destination);
            osc.start(); osc.stop(audioCtx.currentTime + duration);
        } catch(e) { console.warn("[WARN] Audio interupsi dicegah"); }
    },
    jump() { this.playTone(400, 'square', 0.15, 0.05); setTimeout(() => this.playTone(600, 'square', 0.15, 0.05), 50); },
    hit() { this.playTone(150, 'sawtooth', 0.3, 0.1); },
    coin() { this.playTone(800, 'sine', 0.1, 0.05); setTimeout(() => this.playTone(1200, 'sine', 0.2, 0.05), 100); },
    over() { this.playTone(200, 'square', 0.5, 0.1); setTimeout(() => this.playTone(100, 'square', 0.8, 0.1), 300); }
};


/* --- KELAS ENTITAS (PLAYER & OBSTACLE) --- */

class Player {
    constructor(cfgSpeed) {
        this.w = 30; this.h = 40;
        this.x = 200; this.y = GROUND_Y - this.h;
        this.vy = 0; this.vx = 0;
        
        // Dynamic Difficulty Params dari Setting Level
        this.maxSpeed = cfgSpeed; 
        this.accel = 5000;    
        this.friction = 0.85; 
        
        this.grav = 1600;      
        this.fallGravMulti = 1.8; 
        this.jumpForce = -800; // Tenaga seimbang

        this.grounded = true;
        this.legPhase = 0;
        this.squash = 0; 
    }
    jump() {
        if (this.grounded) {
            this.vy = this.jumpForce; this.grounded = false;
            this.squash = -10; 
            sfx.jump();
            spawnDust(this.x + this.w / 2 - cameraX, this.y + this.h);
        }
    }
    update(dt) {
        if (keys.left) this.vx -= this.accel * dt;
        if (keys.right) this.vx += this.accel * dt;
        
        this.vx *= this.friction;
        
        // Clamping (Menjaga agar tdk menembus glitching)
        if (this.vx > this.maxSpeed) this.vx = this.maxSpeed;
        if (this.vx < -this.maxSpeed) this.vx = -this.maxSpeed;
        
        this.x += this.vx * dt;
        
        // Anti Backtracking (Batas Kiri Level)
        if (this.x < cameraX) { this.x = cameraX; this.vx = 0; }
        
        // Pengejaran Kamera Halus via Lerp
        let targetScreenX = W * 0.35; // Ruang 65% ke arah kanan 
        let desiredCameraX = this.x - targetScreenX;
        if (desiredCameraX > cameraX) {
            cameraX += (desiredCameraX - cameraX) * 12 * dt; 
            if (cameraX < desiredCameraX - 10) cameraX = desiredCameraX - 10;
        }

        // Variabel Gravitasi Dinamis
        let currentGrav = this.grav;
        if (this.vy > 0) currentGrav *= this.fallGravMulti;
        else if (!keys.jump && this.vy < 0) currentGrav *= 2.5; // Short jump catch
        
        this.vy += currentGrav * dt;
        this.y += this.vy * dt;
        
        // ------------------
        // FISIKA LOMPAT JURANG PITS
        // ------------------
        let overPit = false;
        let pxCenter = this.x + this.w / 2;
        for (let p of pits) {
            if (pxCenter > p.x && pxCenter < p.x + p.w) {
                overPit = true; break;
            }
        }
        
        // Bottom Ground limit handling
        // Hanya nempel jika y pas ada di batas ground, speed positive, dan tidak diatas jurang
        if (this.y + this.h >= GROUND_Y && this.y + this.h <= GROUND_Y + 25 && this.vy >= 0 && !overPit) {
            if (!this.grounded) {
                spawnDust(this.x + this.w / 2 - cameraX, this.y + this.h); 
                this.squash = 12; // Boing impact
            }
            this.y = GROUND_Y - this.h;
            this.vy = 0;
            this.grounded = true;
        } else if (this.y + this.h > GROUND_Y) {
            // Meluncur mulus menutupi bug tembus pilar di dalam jurang
            this.grounded = false; 
        }

        // Kematian Instan di bawah Map
        if (this.y > H + 50 && currentState === STATE.PLAYING) {
            lives--; updateHUD();
            if (lives <= 0) gameOver();
            else stopGame();
            return;
        }

        this.squash *= 0.8; 
        if (this.grounded && Math.abs(this.vx) > 10) {
            this.legPhase += Math.abs(this.vx) * 0.05 * dt;
        } else {
            this.legPhase = 0; 
        }
    }
    draw(ctx, cx) {
        let screenX = this.x - cx;
        let bob = this.grounded ? Math.abs(Math.sin(this.legPhase)) * 3 : 0;
        let sq = this.squash;
        
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath(); ctx.ellipse(screenX + this.w / 2, GROUND_Y, 15 + Math.abs(this.vx)*0.01, 4, 0, 0, Math.PI * 2); ctx.fill();

        ctx.fillStyle = '#f0f0f0'; ctx.fillRect(screenX - sq/2, this.y + 10 + bob + sq, this.w + sq, this.h - 20 - sq);
        ctx.fillStyle = '#ff0000'; ctx.fillRect(screenX - sq/2, this.y + this.h - 10 + bob + sq/2, this.w + sq, 10 - sq/2);
        ctx.fillStyle = '#ffcc99'; ctx.fillRect(screenX + 2, this.y + bob + sq, this.w - 4, 15);
        ctx.fillStyle = '#222'; ctx.fillRect(screenX + 2, this.y + bob + sq, this.w - 4, 5);
        ctx.fillRect(screenX + this.w - 6, this.y + bob + sq, 4, 10);
        ctx.fillStyle = '#1155cc'; ctx.fillRect(screenX - 10, this.y + 12 + bob + sq, 10, 15);

        ctx.fillStyle = '#ffcc99';
        let loff = this.grounded ? Math.sin(this.legPhase) * 12 : -5;
        let roff = this.grounded ? Math.sin(this.legPhase + Math.PI) * 12 : 5;
        ctx.fillRect(screenX + 5 + loff, this.y + this.h + bob, 6, 10); ctx.fillRect(screenX + this.w - 13 + roff, this.y + this.h + bob, 6, 10);

        ctx.fillStyle = '#333';
        ctx.fillRect(screenX + 4 + loff, this.y + this.h + 8 + bob, 8, 4); ctx.fillRect(screenX + this.w - 14 + roff, this.y + this.h + 8 + bob, 8, 4);
    }
    getHitbox() {
        return {
            x: this.x + 5, y: this.y + 5 + this.squash,
            w: this.w - 10, h: this.h - 5 - this.squash
        };
    }
}

class Obstacle {
    constructor(worldX, type) { 
        this.w = 34; this.h = 34;
        this.type = type; // 0=duri, 1=slime patrol, 2=bat patrol vert
        this.x = worldX;
        this.originX = worldX;
        this.y = GROUND_Y - this.h;
        this.originY = GROUND_Y - this.h - 60; 
        this.marked = false;
        this.phase = Math.random() * Math.PI * 2;
    }
    update(dt) {
        this.phase += 3 * dt;
        if (this.type === 1) this.x = this.originX + Math.sin(this.phase) * 80;
        else if (this.type === 2) this.y = this.originY + Math.sin(this.phase) * 60;
    }
    draw(ctx, cx) {
        let screenX = this.x - cx;
        if (screenX < -this.w || screenX > W + this.w) return; 
        
        ctx.shadowBlur = 10;
        ctx.shadowColor = (this.type === 1) ? '#ff00ff' : (this.type === 2) ? '#ff4d4d' : 'rgba(0,0,0,0.5)';
        
        if (this.type === 0) { 
            ctx.fillStyle = '#888';
            ctx.beginPath(); ctx.moveTo(screenX, this.y + this.h);
            ctx.lineTo(screenX + this.w / 2, this.y + 10); ctx.lineTo(screenX + this.w, this.y + this.h); ctx.fill();
            ctx.fillStyle = '#555';
            ctx.beginPath(); ctx.moveTo(screenX + this.w / 2, this.y + 10);
            ctx.lineTo(screenX + this.w / 2, this.y + this.h); ctx.lineTo(screenX + this.w, this.y + this.h); ctx.fill();
        } else if (this.type === 1) { 
            ctx.fillStyle = '#b300b3'; let squish = Math.sin(this.phase * 2) * 5;
            ctx.beginPath(); ctx.ellipse(screenX + this.w / 2, this.y + this.h - 10 + squish / 2, this.w / 2, 10 - squish / 2, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#000'; ctx.fillRect(screenX + 10, this.y + this.h - 15 + squish / 2, 4, 4); ctx.fillRect(screenX + 20, this.y + this.h - 15 + squish / 2, 4, 4);
        } else if (this.type === 2) { 
            ctx.fillStyle = '#222'; ctx.fillRect(screenX + 10, this.y + 10, 14, 10); 
            let wingY = Math.sin(this.phase * 4) * 15;
            ctx.beginPath(); ctx.moveTo(screenX + 10, this.y + 15); ctx.lineTo(screenX - 10, this.y + 15 + wingY); ctx.lineTo(screenX, this.y + 20); ctx.fill(); 
            ctx.beginPath(); ctx.moveTo(screenX + 24, this.y + 15); ctx.lineTo(screenX + 44, this.y + 15 + wingY); ctx.lineTo(screenX + 34, this.y + 20); ctx.fill(); 
            ctx.fillStyle = '#f00'; ctx.fillRect(screenX + 12, this.y + 12, 3, 3); ctx.fillRect(screenX + 19, this.y + 12, 3, 3); 
        }
        ctx.shadowBlur = 0;
    }
    getHitbox() {
        let shrink = (this.type === 2) ? 14 : 10; 
        return { x: this.x + 5, y: this.y + 5, w: this.w - shrink, h: this.h - shrink };
    }
}

class Checkpoint {
    constructor(worldX, qIndex) {
        this.x = worldX; this.y = GROUND_Y - 60;
        this.w = 40; this.h = 60;
        this.qIndex = qIndex; this.triggered = false; this.phase = 0;
    }
    update(dt) { this.phase += 6 * dt; }
    draw(ctx, cx) {
        let screenX = this.x - cx;
        if (screenX < -this.w || screenX > W) return;
        ctx.fillStyle = '#ccc'; ctx.fillRect(screenX, this.y, 6, this.h);
        ctx.fillStyle = '#999'; ctx.fillRect(screenX + 4, this.y, 2, this.h); 
        ctx.fillStyle = '#F5C518'; let wave = Math.sin(this.phase) * 5;
        ctx.beginPath(); ctx.moveTo(screenX + 6, this.y);
        ctx.quadraticCurveTo(screenX + 25, this.y - 5 + wave, screenX + 40, this.y + 10);
        ctx.quadraticCurveTo(screenX + 25, this.y + 25 + wave, screenX + 6, this.y + 25);
        ctx.fill();
        ctx.fillStyle = '#FFF'; ctx.font = '10px "Press Start 2P"'; ctx.fillText('?', screenX + 15, this.y + 18);
    }
    getHitbox() { return this; }
}

class Particle {
    constructor(startX, startY, color, isDust = false) {
        this.x = startX; this.y = startY; this.isDust = isDust;
        this.vx = (Math.random() - 0.5) * (isDust ? 100 : 300);
        this.vy = (Math.random() - (isDust ? 0 : 1)) * (isDust ? 20 : 400);
        this.life = 1.0; this.color = color;
        this.size = isDust ? Math.random() * 4 + 2 : Math.random() * 5 + 4;
    }
    update(dt) {
        this.x += this.vx * dt; this.y += this.vy * dt;
        if (!this.isDust) this.vy += 800 * dt; 
        this.life -= (this.isDust ? 2.5 : 0.8) * dt;
    }
    draw(ctx) {
        ctx.fillStyle = this.color; ctx.globalAlpha = Math.max(0, this.life);
        ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1.0;
    }
}
function spawnDust(screenX, screenY) {
    for (let i = 0; i < 5; i++) particles.push(new Particle(screenX + (Math.random() * 16 - 8), screenY, '#d3d3d3', true));
}

class ParallaxBg {
    constructor(type) {
        this.type = type;
        this.layers = [ { speedMult: 0.15, y: GROUND_Y - 80, draw: this.drawMountains }, { speedMult: 0.4, y: GROUND_Y - 30, draw: this.drawMid } ];
        this.skyGrad = ctx.createLinearGradient(0, 0, 0, H);
        if (type === 'village') { this.skyGrad.addColorStop(0, '#4aaeff'); this.skyGrad.addColorStop(1, '#a6d9ff'); } else if (type === 'sawah') { this.skyGrad.addColorStop(0, '#ff7b54'); this.skyGrad.addColorStop(1, '#ffd56b'); } else { this.skyGrad.addColorStop(0, '#2d1e2f'); this.skyGrad.addColorStop(1, '#a83232'); }
    }
    draw(ctx, cx) {
        ctx.fillStyle = this.skyGrad; ctx.fillRect(0, 0, W, H);
        // Latar Belakang Tembus Pandang Pits!
        for (let i = 0; i < 2; i++) {
            let pShift = cx * this.layers[i].speedMult; let offset = pShift % W; 
            this.layers[i].draw(ctx, -offset, this.layers[i].y, this.type);
            this.layers[i].draw(ctx, -offset + W, this.layers[i].y, this.type);
            if (offset < 0) this.layers[i].draw(ctx, -offset - W, this.layers[i].y, this.type);
        }
    }
    drawMountains(ctx, x, y, type) { 
        if (type === 'temple') {
            ctx.fillStyle = '#4a2511'; ctx.fillRect(x, y - 20, W, 120);
            for (let i = 0; i < W; i += 120) {
                ctx.fillRect(x + i + 20, y - 60, 80, 40); 
                ctx.beginPath(); ctx.arc(x + i + 60, y - 60, 30, Math.PI, 0); ctx.fill(); 
                ctx.fillStyle = '#36190a'; ctx.fillRect(x + i + 55, y - 80, 10, 20); ctx.fillStyle = '#4a2511'; 
            }
        } else {
            ctx.fillStyle = type === 'sawah' ? '#cc5522' : '#6b9c9f';
            ctx.beginPath(); ctx.moveTo(x, y + 40); ctx.lineTo(x + W / 4, y - 80); ctx.lineTo(x + W / 2, y + 40);
            ctx.lineTo(x + 3 * W / 4, y - 60); ctx.lineTo(x + W, y + 40); ctx.fill();
        }
    }
    drawMid(ctx, x, y, type) { 
        if (type === 'sawah') {
            ctx.fillStyle = '#4d2d18'; 
            for (let i = 0; i < W; i += 80) {
                ctx.beginPath(); ctx.moveTo(x + i + 40, y + 30);
                ctx.bezierCurveTo(x + i + 10, y - 10, x + i + 70, y - 40, x + i + 40, y - 60); ctx.bezierCurveTo(x + i + 10, y - 40, x + i + 70, y - 10, x + i + 40, y + 30); ctx.fill();
            }
        } else if (type === 'village') {
            ctx.fillStyle = '#a65628';
            for (let i = 0; i < W; i += 150) {
                ctx.beginPath(); ctx.moveTo(x + i, y); ctx.lineTo(x + i + 40, y - 50); ctx.lineTo(x + i + 80, y); ctx.fill(); 
                ctx.fillStyle = '#ebd3a4'; ctx.fillRect(x + i + 10, y - 10, 60, 40); ctx.fillStyle = '#a65628'; 
            }
        } else {
            ctx.fillStyle = '#36190a'; ctx.fillRect(x, y - 20, W, 80); ctx.fillStyle = '#241005';
            for (let i = 0; i < W; i += 30) { ctx.fillRect(x + i, y, 10, 20); } 
        }
    }
}

// ----------------------------------------
// MODUL RENDERING GROUND CHUNKS (JUAL JURANG)
// ----------------------------------------
function drawDynamicGround(ctx, cx, type) {
    let groundColor = type === 'temple' ? '#5c3a21' : type === 'sawah' ? '#4a6b2f' : '#6b8e23'; 
    let grassColor = type === 'temple' ? '#714c30' : type === 'sawah' ? '#5b823b' : '#88bc88';

    let maxR = cx + W;
    let chunks = [];
    let cur = cx;

    // Hitung sisa padatan di antara pits
    for (let p of pits) {
        if (p.x > maxR) break; 
        if (p.x + p.w < cx) continue;
        
        if (cur < p.x) chunks.push({ x: cur, w: p.x - cur });
        cur = Math.max(cur, p.x + p.w);
    }
    if (cur < maxR) chunks.push({ x: cur, w: maxR - cur });

    chunks.forEach(c => {
        let scX = c.x - cx;
        ctx.fillStyle = groundColor;
        ctx.fillRect(scX, GROUND_Y, c.w + 1, H - GROUND_Y); // +1 nyegah micro-gap
        
        ctx.fillStyle = grassColor;
        ctx.fillRect(scX, GROUND_Y, c.w + 1, 6);
        
        ctx.fillStyle = 'rgba(0,0,0,0.15)'; 
        let firstStripe = Math.ceil(c.x / 20) * 20;
        for (let ix = firstStripe; ix < c.x + c.w; ix += 20) {
            ctx.fillRect(ix - cx, GROUND_Y, 8, H - GROUND_Y);
        }
    });
}


/* --- MODUL INTI GAME LOOP & SIKLUS RESPAWN --- */

let quizActiveIndex = -1;

function resetGame(isRespawn = false) {
    let cfg = LEVELS[currentLevel];
    player = new Player(cfg.maxSpeed);
    obstacles = []; checkpoints = []; particles = []; pits = [];
    bgLayers = new ParallaxBg(cfg.bg);
    
    cameraX = 0;
    nextSpawnX = player.x + 800; // Mulai membeberkan level jauh di depan
    cpSpawnedThisLevel = 0;
    quizActiveIndex = -1;
    shakeTime = 0;
    
    // Khusus init (Start Level), skor & nyawa dikembalikan penuh. Bila sekadar Respawn, nyawa sisanya dijaga!
    if (!isRespawn) {
        levelScore = 0; 
        lives = 3;
    }
}

function initGame(level) {
    console.log(`[SYS] Initializing Level ${level}...`);
    try { if (audioCtx.state === 'suspended') audioCtx.resume(); } catch(e){}

    let cfg = LEVELS[level];
    if (!cfg) { console.error("[FATAL] Data level tidak terbaca!"); return; }

    currentLevel = level; 
    resetGame(false);

    currentState = STATE.PLAYING;
    showOverlay(null); document.getElementById('hud').classList.add('active');
    updateHUD();
    
    lastTime = performance.now();
    if (currentFrameId) cancelAnimationFrame(currentFrameId); // ANTI DOUBLE LOOP
    currentFrameId = requestAnimationFrame(gameLoop);
}

function stopGame() {
    console.log("[SYS] Tertabrak/Jatuh! Membekukan mesin untuk Respawn...");
    currentState = STATE.RESPAWNING;
    shakeTime = 0;
    let f = document.getElementById('flash-overlay');
    f.style.backgroundColor = 'rgba(0,0,0,0.7)'; // Pingsan gelap
    f.style.opacity = '1';
    
    setTimeout(respawn, 1000);
}

function respawn() {
    console.log("[SYS] Respawning di titik awal tanpa memakan Skor sebelumnya...");
    resetGame(true);
    let f = document.getElementById('flash-overlay');
    f.style.backgroundColor = 'rgba(255,0,0,0.4)'; // set asali kembali
    f.style.opacity = '0';
    updateHUD();
    
    currentState = STATE.PLAYING;
    lastTime = performance.now();
}

function gameLoop(timestamp) {
    let dt = (timestamp - lastTime) / 1000;
    if (dt > 0.1) dt = 0.1; 
    lastTime = timestamp;

    if (currentState === STATE.PLAYING || currentState === STATE.PAUSED_QUIZ || currentState === STATE.RESPAWNING) {
        if (currentState === STATE.PLAYING) {
            update(dt);
        } else if (currentState === STATE.PAUSED_QUIZ) { 
            // Quiz partikel background bergerak
            particles.forEach(p => p.update(dt)); particles = particles.filter(p => p.life > 0); 
        }
        // Saat RESPAWNING, Update fisika diskip total! Mesin terhenti murni.
        draw();
        currentFrameId = requestAnimationFrame(gameLoop);
    }
}

function checkCollision(r1, r2) {
    return r1.x < r2.x + r2.w && r1.x + r1.w > r2.x && r1.y < r2.y + r2.h && r1.y + r1.h > r2.y;
}

function update(dt) {
    let cfg = LEVELS[currentLevel];
    player.update(dt);
    
    // SISTEM MODULAR SPAWNING DISTRIBUSI SEIMBANG 
    let cpInterval = 3000; // Peta level jauh lebih panjang menghindari kekosongan map

    // Kamera antisipasi sejauh 1500px agar obstacle tdk tersendat load
    if (player.x + 1500 > nextSpawnX && cpSpawnedThisLevel < 3) {
        
        let expectedCP = Math.floor(nextSpawnX / cpInterval);
        
        if (expectedCP > cpSpawnedThisLevel) {
            // Merender Pintu Cekpoin Kuis
            checkpoints.push(new Checkpoint(nextSpawnX, cpSpawnedThisLevel));
            cpSpawnedThisLevel++;
            nextSpawnX += 800; // Ruang napas damai 800px pasca checkpoint (tidak ada bolong besar)
        } else {
            // Merender Kombinasi Musuh Tanpa Kekosongan Ekstrem
            let chosenPattern = [0]; 
            try { chosenPattern = cfg.patterns[Math.floor(Math.random() * cfg.patterns.length)]; } 
            catch (e) { console.warn("[WARN] Pola rusak ditarik fallback"); }

            let curX = nextSpawnX;
            chosenPattern.forEach((type) => {
                let isPit = type >= 3 && type <= 5;
                if (isPit) {
                    let pw = (type === 3) ? 150 : (type === 4) ? 250 : 350;
                    pits.push({ x: curX, w: pw });
                    curX += pw + 250; // Lebar jurang + Area batas aman pendaratan (Safe Landing Margin)
                } else {
                    obstacles.push(new Obstacle(curX, type));
                    curX += cfg.innerGap; // Rentang parkour saling dempet dalam 1 kawanan
                }
            });
            // Update jarak spawn berikutnya dihitung berdasar gap ujung kombo musuh
            nextSpawnX = curX - cfg.innerGap + cfg.spawnGap; 
        }
    }

    for (let i = obstacles.length - 1; i >= 0; i--) {
        let obs = obstacles[i]; obs.update(dt);
        if (checkCollision(player.getHitbox(), obs.getHitbox()) && !obs.marked) {
            obs.marked = true; lives--; shakeTime = 0.3; sfx.hit(); flashScreen(); updateHUD();
            if (lives <= 0) gameOver();
            else stopGame();
        }
        if (obs.x < cameraX - 200) obstacles.splice(i, 1); // garbage collection
    }

    // Pembersihan Pits jika sudah tenggelam dari scene
    for (let i = pits.length - 1; i >= 0; i--) {
        if (pits[i].x + pits[i].w < cameraX - 200) pits.splice(i, 1);
    }

    for (let i = checkpoints.length - 1; i >= 0; i--) {
        let cp = checkpoints[i]; cp.update(dt);
        if (checkCollision(player.getHitbox(), cp.getHitbox()) && !cp.triggered) {
            cp.triggered = true; sfx.coin(); triggerQuiz(cp.qIndex);
        }
        if (cp.x < cameraX - 200) checkpoints.splice(i, 1);
    }

    particles.forEach(p => p.update(dt));
    particles = particles.filter(p => p.life > 0);
    if (shakeTime > 0) shakeTime -= dt;
}

function draw() {
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    if (shakeTime > 0) { let dx = (Math.random() - 0.5) * 10; let dy = (Math.random() - 0.5) * 10; ctx.translate(dx, dy); }
    bgLayers.draw(ctx, cameraX); // Draws Sky & Mountains/Mid
    drawDynamicGround(ctx, cameraX, LEVELS[currentLevel].bg); // Draws Ground Chunks With Pits

    checkpoints.forEach(c => c.draw(ctx, cameraX));
    obstacles.forEach(o => o.draw(ctx, cameraX));
    player.draw(ctx, cameraX);
    particles.forEach(p => p.draw(ctx)); 
    ctx.restore();
}

/* --- KONTROL KEYBOARD & TOUCH --- */
function jumpAction() { if (currentState === STATE.PLAYING) player.jump(); }
const keys = { left: false, right: false, jump: false };

window.addEventListener('keydown', e => { 
    // Mencegah tombol Spasi memicu klik berkali-kali pada tombol yang sedang aktif/fokus (Behavior Bug UI)
    // dan mencegah Arrow keys menggeser layr 
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
    }
    
    // Mencegah auto-repeat beruntun (bug pogo-stick mental saat ditekan tahan)
    if (e.repeat) return;

    if (e.code === 'Space' || e.code === 'ArrowUp' || e.key === 'w' || e.key === 'W') { keys.jump = true; jumpAction(); }
    if (e.code === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.left = true;
    if (e.code === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = true;
}, { passive: false }); // Deklarasi passive false dibutuhkan Safari/iOS usap

window.addEventListener('keyup', e => { 
    if (e.code === 'Space' || e.code === 'ArrowUp' || e.key === 'w' || e.key === 'W') keys.jump = false;
    if (e.code === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.left = false;
    if (e.code === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = false;
});
window.addEventListener('touchstart', e => { if (e.target.tagName !== 'BUTTON') { keys.jump = true; jumpAction(); } });
window.addEventListener('touchend', e => { if (e.target.tagName !== 'BUTTON') keys.jump = false; });


/* --- LOGIKA PERALIHAN LAYAR & POPUP --- */
function flashScreen() {
    let f = document.getElementById('flash-overlay'); f.style.opacity = '1';
    setTimeout(() => { f.style.opacity = '0'; }, 200);
}

function gameOver() {
    console.log("[SYS/PIT] GAMEOVER - Mekanisme Reset Sentral");
    currentState = STATE.GAME_OVER; sfx.over();
    document.getElementById('final-score').innerText = totalScore + levelScore;
    
    // Reset Data Level Lock / PERMADEATH
    unlockedLevels = 1; totalScore = 0;
    localStorage.setItem('bq_unlocked', 1);
    localStorage.setItem('bq_score', 0);

    showOverlay('game-over');
}

function triggerQuiz(qIndex) {
    console.log(`[SYS] TRIGGER KUIS Posisi: ${qIndex}`);
    currentState = STATE.PAUSED_QUIZ; quizActiveIndex = qIndex;
    let qData = QUESTIONS[currentLevel][qIndex];
    document.getElementById('quiz-question').innerText = qData.q;
    
    let optsDiv = document.getElementById('quiz-options'); optsDiv.innerHTML = '';
    const letters = ['A', 'B', 'C', 'D'];
    qData.opts.forEach((opt, i) => {
        let btn = document.createElement('button'); btn.className = 'opt-btn'; btn.innerText = `${letters[i]}) ${opt}`;
        btn.onclick = () => checkAnswer(i, qData.ans); optsDiv.appendChild(btn);
    });
    
    document.getElementById('quiz-feedback').style.display = 'none'; document.getElementById('quiz-next-btn').style.display = 'none';
    showOverlay('quiz-modal');
}

function checkAnswer(selected, correct) {
    let fb = document.getElementById('quiz-feedback'); fb.style.display = 'block';
    let btns = document.querySelectorAll('.opt-btn'); btns.forEach(b => b.disabled = true);
    if (selected === correct) {
        fb.style.color = 'var(--green)'; fb.innerText = 'Hebat! +10 Poin';
        levelScore += 10; sfx.coin(); updateHUD(); createConfetti();
    } else {
        fb.style.color = '#f00'; fb.innerText = 'Jawaban Kurang Tepat!';
        sfx.hit(); shakeTime = 0.2; flashScreen();
    }
    document.getElementById('quiz-next-btn').style.display = 'block';
}

function resumeGame() {
    if (quizActiveIndex >= 2) finishLevel(); // End Map Logic
    else {
        document.getElementById('quiz-modal').classList.remove('active');
        setTimeout(() => { lastTime = performance.now(); currentState = STATE.PLAYING; }, 400); 
    }
}

function createConfetti() {
    const clr = ['#C1440E', '#F5C518', '#2D6A2D', '#1A6BAA', '#FFF8E7'];
    for (let i = 0; i < 50; i++) particles.push(new Particle(W / 2, H / 2, clr[Math.floor(Math.random() * clr.length)]));
}

let winTimer = null;
function finishLevel() {
    console.log(`[SYS] FINISH Level ${currentLevel} dengan ${levelScore} Point`);
    currentState = STATE.LEVEL_COMPLETE; totalScore += levelScore; localStorage.setItem('bq_score', totalScore);
    
    if (currentLevel < 3 && currentLevel >= unlockedLevels) { unlockedLevels = currentLevel + 1; localStorage.setItem('bq_unlocked', unlockedLevels); }
    document.getElementById('level-score').innerText = levelScore;
    
    if (currentLevel === 3) {
        // PERBAIKAN CRASH LEVEL 3 MENANG + Reset Data Utuh (Beat the Game)
        currentState = STATE.WIN; document.getElementById('win-score').innerText = totalScore; showOverlay('win-screen');
        if (winTimer) clearInterval(winTimer);
        winTimer = setInterval(createConfetti, 800);
        
        // Membersihkan Memory Tamat/Menang dr Ujung
        unlockedLevels = 1; totalScore = 0;
        localStorage.setItem('bq_unlocked', 1);
        localStorage.setItem('bq_score', 0);
        
        lastTime = performance.now();
        if (currentFrameId) cancelAnimationFrame(currentFrameId);
        currentFrameId = requestAnimationFrame(function winLoop(timestamp) {
            let dt = (timestamp - lastTime) / 1000; if (dt > 0.1) dt = 0.1; lastTime = timestamp;
            if (currentState === STATE.WIN) {
                ctx.clearRect(0, 0, W, H); bgLayers.draw(ctx, 0); drawDynamicGround(ctx, 0, LEVELS[currentLevel].bg);
                particles.forEach(p => p.update(dt)); particles = particles.filter(p => p.life > 0); particles.forEach(p => p.draw(ctx));
                currentFrameId = requestAnimationFrame(winLoop);
            } else { clearInterval(winTimer); } 
        });
    } else {
        showOverlay('level-complete');
    }
}

function nextLevel() { initGame(currentLevel + 1); }
function retryLevel() { initGame(currentLevel); }

function goMainMenu() {
    console.log("[SYS] Resesi Global (Kembali ke Awal). Resetting State...");
    if (winTimer) clearInterval(winTimer); 
    currentState = STATE.MENU; showOverlay('main-menu');
    startMenuLoop(); 
}

bgLayers = new ParallaxBg('village'); let demoCam = 0;

function startMenuLoop() {
    lastTime = performance.now();
    pits = []; // Bersihkan jurang di menu
    if (currentFrameId) cancelAnimationFrame(currentFrameId);
    currentFrameId = requestAnimationFrame(function menuLoop(timestamp) {
        let dt = (timestamp - lastTime) / 1000; if (dt > 0.1) dt = 0.1; lastTime = timestamp;
        if (currentState === STATE.MENU || currentState === STATE.LEVEL_SELECT || currentState === STATE.GAME_OVER || currentState === STATE.LEVEL_COMPLETE) {
            demoCam += 50 * dt; ctx.clearRect(0, 0, W, H); 
            bgLayers.draw(ctx, demoCam); drawDynamicGround(ctx, demoCam, 'village');
            currentFrameId = requestAnimationFrame(menuLoop);
        }
    });
}
startMenuLoop();
