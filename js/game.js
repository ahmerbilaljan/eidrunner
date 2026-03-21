const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score-text');
const timeEl = document.getElementById('time-text');
const startScreen = document.getElementById('start-screen');
const startBtn = document.getElementById('start-btn');

let WIDTH = canvas.width;
let HEIGHT = canvas.height;
let GROUND_Y = HEIGHT - 40;

let isMobileMode = false;

// Game State
let isPlaying = false;
let isGameOver = false;
let gameOverTime = 0;
let score = 0;
let timeLeft = 60;
let gameSpeed = 5;
let lastTime = 0;
let animationFrameId;

// Audio Support
const bgMusic = new Audio('music/bgmusic.mp3');
bgMusic.loop = true;
bgMusic.volume = 0.35; // Lower background volume

const coinSound = new Audio('music/coin.mp3');
coinSound.volume = 0.7;

const gameOverSound = new Audio('music/gameover.mp3');
gameOverSound.volume = 0.8;

// Physics
const GRAVITY = 0.6;
const JUMP_FORCE = -12.5;

// Entities
let player;
let pillars = [];
let coins = [];
let clouds = [];
let particles = [];
let groundOffset = 0;

function handleJumpAction(e) {
    if (e && e.cancelable) e.preventDefault();
    if (isPlaying && !isGameOver) {
        player.jump();
    } else if (isGameOver) {
        if (performance.now() - gameOverTime > 500) {
            initGame();
        }
    } else if (!isPlaying) {
        startBtn.click();
    }
}

window.addEventListener('keydown', e => {
    if (e.code === 'Space') {
        handleJumpAction(e);
    }
});

window.addEventListener('touchstart', e => {
    if (e.target.tagName !== 'BUTTON') {
        handleJumpAction(e);
    }
}, { passive: false });

startBtn.addEventListener('click', () => {
    startScreen.style.display = 'none';
    initGame();
});

class Player {
    constructor() {
        this.width = 34;
        this.height = 34;
        this.x = 100;
        this.y = GROUND_Y - this.height;
        this.vy = 0;
        this.isGrounded = true;
    }

    update() {
        this.vy += GRAVITY;
        this.y += this.vy;

        if (this.y < 0) {
            this.y = 0;
            if (this.vy < 0) this.vy = 0;
        }

        if (this.y + this.height >= GROUND_Y) {
            this.y = GROUND_Y - this.height;
            if (!this.isGrounded && this.vy > 5) {
                spawnParticles(this.x + this.width / 2, this.y + this.height, 8, '#FFF');
            }
            this.vy = 0;
            this.isGrounded = true;
        } else {
            this.isGrounded = false;
        }
    }

    jump() {
        this.vy = JUMP_FORCE;
        this.isGrounded = false;
        spawnParticles(this.x + this.width / 2, this.y + this.height, 10, '#FFF');
    }

    draw() {
        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);

        if (!this.isGrounded) {
            let tilt = this.vy * 0.04;
            if (tilt > 0.4) tilt = 0.4;
            if (tilt < -0.4) tilt = -0.4;
            ctx.rotate(tilt);
        }

        const hw = this.width / 2;
        const hh = this.height / 2;

        ctx.fillStyle = '#E82C0C';
        if (ctx.roundRect) {
            ctx.beginPath();
            ctx.roundRect(-hw, -hh, this.width, this.height, 6);
            ctx.fill();
            ctx.lineWidth = 3;
            ctx.strokeStyle = '#000';
            ctx.stroke();
        } else {
            ctx.fillRect(-hw, -hh, this.width, this.height);
            ctx.lineWidth = 3;
            ctx.strokeStyle = '#000';
            ctx.strokeRect(-hw, -hh, this.width, this.height);
        }

        ctx.fillStyle = '#F8D8B0';
        ctx.fillRect(-hw + 8, -hh + 4, 22, 14);

        ctx.fillStyle = '#000';
        ctx.fillRect(-hw + 16, -hh + 8, 4, 4);
        ctx.fillRect(-hw + 24, -hh + 8, 4, 4);

        ctx.fillStyle = '#005088';
        if (ctx.roundRect) {
            ctx.beginPath();
            ctx.roundRect(-hw + 3, -hh + 20, 28, 11, [4, 4, 6, 6]);
            ctx.fill();
        } else {
            ctx.fillRect(-hw + 3, -hh + 20, 28, 11);
        }

        ctx.restore();
    }
}

class Pillar {
    constructor(x) {
        this.x = x;
        
        if (isMobileMode) {
            this.width = 62; // Precisely 18% thinner for mobile (76 * 0.82)
            this.height = 41 + Math.random() * 98; // Precisely 18% shorter vertically
        } else {
            this.width = 76; // Original desktop width
            this.height = 50 + Math.random() * 120; // Original desktop height
        }
        
        this.y = GROUND_Y - this.height;
    }

    update() {
        this.x -= gameSpeed;
    }

    draw() {
        const topHeight = 24; // The lip of the pipe
        const baseX = this.x + 8;
        const baseWidth = this.width - 16;

        ctx.lineWidth = 4;
        ctx.strokeStyle = '#FFDA03'; // Vibrant yellow border

        // Main pillar base
        ctx.fillStyle = '#102B84'; // Dark navy
        const baseHeight = this.height - topHeight + 50; // Extend downwards
        ctx.fillRect(baseX, this.y + topHeight, baseWidth, baseHeight);

        // Base strokes (Left and Right only)
        ctx.beginPath();
        ctx.moveTo(baseX, this.y + topHeight);
        ctx.lineTo(baseX, this.y + topHeight + baseHeight);
        ctx.moveTo(baseX + baseWidth, this.y + topHeight);
        ctx.lineTo(baseX + baseWidth, this.y + topHeight + baseHeight);
        ctx.stroke();

        // Top lip (Rectangle with full border)
        ctx.fillRect(this.x, this.y, this.width, topHeight);
        ctx.strokeRect(this.x, this.y, this.width, topHeight);
    }
}

class Coin {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = isMobileMode ? 10.5 : 13; // 18% smaller on mobile
        this.collected = false;
        this.hover = Math.random() * Math.PI * 2;
    }

    update() {
        this.x -= gameSpeed;
        this.hover += 0.12;
    }

    draw() {
        if (this.collected) return;

        const drawY = this.y + Math.sin(this.hover) * 4;

        ctx.fillStyle = '#FFC000';
        ctx.beginPath();
        ctx.arc(this.x, drawY, this.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.lineWidth = 3;
        ctx.strokeStyle = '#FFFFFF';
        ctx.stroke();

        ctx.fillStyle = '#FFE066';
        ctx.beginPath();
        ctx.arc(this.x, drawY, this.radius - 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#C28300';
        ctx.font = isMobileMode ? '900 10.5px Montserrat' : '900 13px Montserrat';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('E', this.x, drawY + 1);
    }
}

class Cloud {
    constructor(x) {
        this.x = x;
        this.y = 40 + Math.random() * 140;
        this.speed = gameSpeed * 0.15 + Math.random() * 0.4;
        this.scale = 0.5 + Math.random() * 0.6;
    }
    update() {
        this.x -= this.speed;
    }
    draw() {
        ctx.fillStyle = '#62CDF9'; // Flat light blue to match image
        ctx.beginPath();
        const bottomY = this.y + 15 * this.scale;

        ctx.moveTo(this.x - 30 * this.scale, bottomY);

        // left bump
        ctx.arc(this.x, this.y, 25 * this.scale, Math.PI, Math.PI * 1.5);
        // middle bump
        ctx.arc(this.x + 35 * this.scale, this.y - 15 * this.scale, 30 * this.scale, Math.PI * 1.1, Math.PI * 1.9);
        // right bump
        ctx.arc(this.x + 75 * this.scale, this.y, 20 * this.scale, Math.PI * 1.5, Math.PI * 2);

        // right tip taper
        ctx.lineTo(this.x + 110 * this.scale, bottomY);
        ctx.closePath();
        ctx.fill();
    }
}

class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.vx = (Math.random() - 0.5) * 8 - (gameSpeed * 0.4);
        this.vy = (Math.random() - 0.5) * 8;
        this.life = 1.0;
        this.size = 4 + Math.random() * 4;
    }
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life -= 0.05;
    }
    draw() {
        if (this.life <= 0) return;
        ctx.fillStyle = this.color;
        ctx.globalAlpha = Math.max(0, this.life);
        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(this.x, this.y, this.size, this.size, 2);
        } else {
            ctx.rect(this.x, this.y, this.size, this.size);
        }
        ctx.fill();
        ctx.globalAlpha = 1.0;
    }
}

function spawnParticles(x, y, count, color) {
    for (let i = 0; i < count; i++) particles.push(new Particle(x, y, color));
}

let timeAccumulator = 0;
let nextPillarDist = 400;
let nextCoinDist = 200;

function initGame() {
    if (animationFrameId) cancelAnimationFrame(animationFrameId);

    // Play Background Music
    bgMusic.currentTime = 0;
    bgMusic.play().catch(e => console.log("Audio autoplay prevented"));

    player = new Player();
    pillars = [];
    coins = [];
    clouds = [];
    particles = [];

    score = 0;
    timeLeft = 60;
    gameSpeed = 6.5;
    isGameOver = false;
    isPlaying = true;
    timeAccumulator = 0;
    nextPillarDist = 1560; // About 4 seconds delay
    nextCoinDist = 200;
    groundOffset = 0;

    for (let i = 0; i < 6; i++) {
        clouds.push(new Cloud(Math.random() * WIDTH));
    }

    // Initial starting coins inside a nice wave pattern
    for (let i = 0; i < 5; i++) {
        const cx = 350 + (i * 120);
        const cy = GROUND_Y - 40 - Math.abs(Math.sin(i * 0.8)) * 80;
        coins.push(new Coin(cx, cy));
    }

    startScreen.classList.remove('is-end');
    startScreen.style.display = 'none';
    document.getElementById('end-msg').style.display = 'none';

    scoreEl.innerText = `EIDI: 0`;
    timeEl.innerText = `TIME: 60s`;

    const blinkMsg = document.getElementById('blink-msg');
    const isMobile = window.innerWidth <= 600 || window.innerHeight <= 500 || ('ontouchstart' in window);
    blinkMsg.innerText = isMobile ? "TAP THE SCREEN" : "PRESS SPACE";
    blinkMsg.classList.remove('blink-anim');
    void blinkMsg.offsetWidth; // trigger reflow
    blinkMsg.classList.add('blink-anim');

    lastTime = performance.now();
    gameLoop(lastTime);
}

function update(dt) {
    if (isGameOver || !isPlaying) return;

    player.update();

    groundOffset -= gameSpeed;
    if (groundOffset <= -40) groundOffset = 0;

    gameSpeed += 0.0015;

    timeAccumulator += dt;
    if (timeAccumulator > 1000) {
        timeAccumulator -= 1000;
        timeLeft--;
        if (timeLeft <= 0) {
            timeLeft = 0;
            timeEl.innerText = `TIME: 0s`;
            die("TIME'S UP!");
            return;
        }
        timeEl.innerText = `TIME: ${timeLeft}s`;
    }

    nextPillarDist -= gameSpeed;
    if (nextPillarDist <= 0) {
        const pillar = new Pillar(WIDTH + 50);
        pillars.push(pillar);

        // Increase gap on mobile so it doesn't feel as fast/dense
        if (isMobileMode) {
            nextPillarDist = 450 + Math.random() * 400;
        } else {
            nextPillarDist = 300 + Math.random() * 300;
        }

        // Keep a few coins spawning above the pillars
        if (Math.random() > 0.4) {
            const coinY = pillar.y - 45 - Math.random() * 70;
            coins.push(new Coin(WIDTH + 80, coinY));
        }
    }

    // Independent coin spawning everywhere (including ground)
    nextCoinDist -= gameSpeed;
    if (nextCoinDist <= 0) {
        // Spawns coins between ground level and jump peak
        const coinY = GROUND_Y - 30 - Math.random() * 110;
        const coinX = WIDTH + 50;
        
        // Ensure coin doesn't spawn inside or too close to a pillar horizontally
        let overlaps = false;
        for (let p of pillars) {
            if (coinX > p.x - 40 && coinX < p.x + p.width + 40) {
                overlaps = true;
                break;
            }
        }
        
        if (!overlaps) {
            coins.push(new Coin(coinX, coinY));
            nextCoinDist = 180 + Math.random() * 250;
        } else {
            nextCoinDist = 40; // Retry quickly if blocked by pillar
        }
    }

    if (Math.random() < 0.012) {
        clouds.push(new Cloud(WIDTH + 100));
    }

    pillars.forEach(p => p.update());
    coins.forEach(c => c.update());
    clouds.forEach(c => c.update());
    particles.forEach(p => p.update());

    pillars = pillars.filter(p => p.x + p.width > -50);
    coins = coins.filter(c => c.x > -50 && !c.collected);
    clouds = clouds.filter(c => c.x > -150);
    particles = particles.filter(p => p.life > 0);

    const px = player.x;
    const py = player.y;
    const pw = player.width;
    const ph = player.height;

    for (let p of pillars) {
        const tolX = 5;
        const tolY = 5;

        if (
            px + tolX < p.x + p.width &&
            px + pw - tolX > p.x &&
            py + tolY < p.y + p.height &&
            py + ph > p.y
        ) {
            die("GAME OVER");
            break;
        }
    }

    for (let c of coins) {
        if (c.collected) continue;
        const playerCenterX = px + pw / 2;
        const playerCenterY = py + ph / 2;

        const dist = Math.hypot(c.x - playerCenterX, c.y - playerCenterY);
        if (dist < c.radius + pw / 2 + 5) {
            c.collected = true;
            score += 100;
            scoreEl.innerText = `EIDI: ${score}`;
            spawnParticles(c.x, c.y, 20, '#FFC000');

            // Audio Coin
            coinSound.currentTime = 0;
            coinSound.play().catch(e => e);
        }
    }
}

function die(message) {
    isGameOver = true;
    gameOverTime = performance.now();

    // Audio Game Over
    bgMusic.pause();
    gameOverSound.currentTime = 0;
    gameOverSound.play().catch(e => e);

    startScreen.classList.add('is-end');
    startScreen.style.display = 'flex';
    const endMsg = document.getElementById('end-msg');
    endMsg.style.display = 'block';
    endMsg.innerText = message;

    if (message === "TIME'S UP!") {
        endMsg.style.color = 'orange';
    } else {
        endMsg.style.color = '#E82C0C';
    }

    document.querySelector('#start-screen p').innerHTML = `You collected ${score} Eidi!<br>Press Space or Tap to try again.`;
    document.getElementById('start-btn').innerText = "PLAY AGAIN";

    spawnParticles(player.x + player.width / 2, player.y + player.height / 2, 50, '#E82C0C');
}

function drawSky() {
    ctx.fillStyle = '#01B4FA'; // Flat bright blue to match image
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    clouds.forEach(c => c.draw());
}

function drawGround() {
    ctx.fillStyle = '#6E340B';
    ctx.fillRect(0, GROUND_Y, WIDTH, HEIGHT - GROUND_Y);

    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    for (let i = groundOffset; i < WIDTH + 80; i += 40) {
        ctx.beginPath();
        ctx.moveTo(i, GROUND_Y + 6);
        ctx.lineTo(i + 20, GROUND_Y + 6);
        ctx.lineTo(i - 10, HEIGHT);
        ctx.lineTo(i - 30, HEIGHT);
        ctx.fill();
    }

    ctx.fillStyle = '#2DAA2D';
    ctx.fillRect(0, GROUND_Y, WIDTH, 12);
    ctx.fillStyle = '#4AD44A';
    ctx.fillRect(0, GROUND_Y, WIDTH, 4);
}

function draw() {
    if (!isPlaying) return;

    drawSky();

    pillars.forEach(p => p.draw());
    
    drawGround();
    
    coins.forEach(c => c.draw());

    if (!isGameOver) {
        player.draw();
    }

    particles.forEach(p => p.draw());
}

function gameLoop(time) {
    const dt = time - lastTime;
    lastTime = time;

    update(dt);
    draw();

    animationFrameId = requestAnimationFrame(gameLoop);
}

function resizeCanvas() {
    const container = document.getElementById('game-container');
    const rect = container.getBoundingClientRect();

    // Set actual canvas resolution to match its container's screen size
    canvas.width = rect.width || window.innerWidth;
    canvas.height = rect.height || window.innerHeight;

    WIDTH = canvas.width;
    HEIGHT = canvas.height;
    
    // Elevate ground level on mobile to make it comfortable to tap and view
    isMobileMode = window.innerWidth <= 600 || ('ontouchstart' in window) || HEIGHT > WIDTH;
    if (isMobileMode) {
        GROUND_Y = HEIGHT * 0.70; // 30% from the bottom
    } else {
        GROUND_Y = HEIGHT - 40; // normal desktop ground
    }

    // Safety check so player doesn't fall through ground if resize happens during play
    if (player) {
        if (player.isGrounded) {
            player.y = GROUND_Y - player.height;
        } else if (player.y + player.height > GROUND_Y) {
            player.y = GROUND_Y - player.height;
        }
    }
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();
