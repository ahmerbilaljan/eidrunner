const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score-text');
const timeEl = document.getElementById('time-text');
const startScreen = document.getElementById('start-screen');
const startBtn = document.getElementById('start-btn');

const WIDTH = canvas.width;
const HEIGHT = canvas.height;
const GROUND_Y = HEIGHT - 40;

// Game State
let isPlaying = false;
let isGameOver = false;
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
        initGame();
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
        this.width = 64;
        this.height = 40 + Math.random() * 120;
        this.y = GROUND_Y - this.height;
    }

    update() {
        this.x -= gameSpeed;
    }

    draw() {
        ctx.fillStyle = 'navy';
        if (ctx.roundRect) {
            ctx.beginPath();
            ctx.roundRect(this.x, this.y, this.width, this.height, [8, 8, 0, 0]);
            ctx.fill();
            ctx.lineWidth = 4;
            ctx.strokeStyle = 'yellow';
            ctx.stroke();
        } else {
            ctx.fillRect(this.x, this.y, this.width, this.height);
            ctx.lineWidth = 4;
            ctx.strokeStyle = 'yellow';
            ctx.strokeRect(this.x, this.y, this.width, this.height);
        }
        ctx.fillStyle = 'navy';
        ctx.fillRect(this.x + 4, this.y + this.height - 4, this.width - 8, 4);
    }
}

class Coin {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 13;
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
        ctx.font = '900 13px Montserrat';
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
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.beginPath();
        ctx.arc(this.x, this.y, 30 * this.scale, 0, Math.PI * 2);
        ctx.arc(this.x + 35 * this.scale, this.y - 15 * this.scale, 25 * this.scale, 0, Math.PI * 2);
        ctx.arc(this.x + 70 * this.scale, this.y, 30 * this.scale, 0, Math.PI * 2);
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
    nextPillarDist = 600;
    groundOffset = 0;

    for (let i = 0; i < 6; i++) {
        clouds.push(new Cloud(Math.random() * WIDTH));
    }

    document.querySelector('#start-screen h1').style.color = 'yellow';
    document.querySelector('#start-screen h1').innerText = 'RUNNER';

    scoreEl.innerText = `EIDI: 0`;
    timeEl.innerText = `TIME: 60s`;

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

        nextPillarDist = 280 + Math.random() * 320;

        if (Math.random() > 0.3) {
            const coinY = pillar.y - 45 - Math.random() * 70;
            coins.push(new Coin(WIDTH + 80, coinY));

            if (Math.random() > 0.4) {
                coins.push(new Coin(WIDTH + 140, coinY));
            }
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
            score += 10;
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

    // Audio Game Over
    bgMusic.pause();
    gameOverSound.currentTime = 0;
    gameOverSound.play().catch(e => e);

    startScreen.style.display = 'flex';
    document.querySelector('#start-screen h1').innerText = message;

    if (message === "TIME'S UP!") {
        document.querySelector('#start-screen h1').style.color = 'orange';
    } else {
        document.querySelector('#start-screen h1').style.color = '#E82C0C';
    }

    document.querySelector('#start-screen p').innerHTML = `You collected ${score} Eidi!<br>Press Space or Tap to try again.`;
    document.getElementById('start-btn').innerText = "PLAY AGAIN";

    spawnParticles(player.x + player.width / 2, player.y + player.height / 2, 50, '#E82C0C');
}

function drawBackground() {
    const skyGrad = ctx.createLinearGradient(0, 0, 0, HEIGHT);
    skyGrad.addColorStop(0, '#4B8BF5');
    skyGrad.addColorStop(1, '#9CC9F5');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    clouds.forEach(c => c.draw());

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

    drawBackground();

    pillars.forEach(p => p.draw());
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
