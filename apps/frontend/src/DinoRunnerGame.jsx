import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  unlockGameAudio,
  playJumpSound,
  playScoreSound,
  playMilestoneSound,
  playCrashSound,
} from './dinoGameSound';

const STORAGE_KEY = 'sman1sooko_dino_highscore';
const MILESTONES = [
  { score: 50, text: 'Mantap! 🔥' },
  { score: 100, text: 'Keren banget! ⭐' },
  { score: 200, text: 'Juara lari! 🏆' },
  { score: 350, text: 'Legenda portal! 👑' },
];

const COLORS = {
  skyTop: '#b9e6ff',
  skyMid: '#d4f1ff',
  skyBottom: '#fff8e8',
  ground: '#075fab',
  groundStripe: '#70aeff',
  groundLine: '#004077',
  runnerBody: '#000a3d',
  runnerAccent: '#ffd300',
  runnerShirt: '#ff6b6b',
  runnerShoe: '#ffffff',
  cloud: '#ffffff',
  obstacleBook: '#ba1a1a',
  obstacleBag: '#4658ab',
  obstacleCone: '#ff9f1c',
  particle: ['#ffd300', '#ff6b6b', '#70aeff', '#4ade80', '#f472b6'],
};

const OBSTACLE_TYPES = ['book', 'bag', 'cone'];
const RUNNER_FEET_OFFSET = 42;
const GROUND_BAND = 42;
const RUNNER_DRAW_SCALE = 1.2;

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function loadHighScore() {
  try {
    return Number(localStorage.getItem(STORAGE_KEY) || 0);
  } catch {
    return 0;
  }
}

function saveHighScore(score) {
  try {
    localStorage.setItem(STORAGE_KEY, String(score));
  } catch {
    // ignore
  }
}

function drawRoundedRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function drawRunner(ctx, x, y, frame, isJumping, isDucking) {
  const bob = isJumping ? 0 : Math.sin(frame * 0.25) * 2;
  const duckOffset = isDucking ? 12 : 0;
  const bodyY = y - bob + duckOffset;
  const scale = (isDucking ? 0.82 : 1) * RUNNER_DRAW_SCALE;

  ctx.save();
  ctx.translate(x, bodyY);
  ctx.scale(scale, scale);

  // Shadow
  ctx.fillStyle = 'rgba(0, 10, 61, 0.15)';
  ctx.beginPath();
  ctx.ellipse(18, 34, 16, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Legs animation
  const legSwing = isJumping ? 0 : Math.sin(frame * 0.35) * 8;
  ctx.strokeStyle = COLORS.runnerBody;
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(14, 24);
  ctx.lineTo(10 + legSwing * 0.3, 32);
  ctx.moveTo(22, 24);
  ctx.lineTo(26 - legSwing * 0.3, 32);
  ctx.stroke();

  // Shoes
  ctx.fillStyle = COLORS.runnerShoe;
  drawRoundedRect(ctx, 6 + legSwing * 0.2, 30, 10, 5, 2);
  ctx.fill();
  drawRoundedRect(ctx, 22 - legSwing * 0.2, 30, 10, 5, 2);
  ctx.fill();

  // Body / shirt
  ctx.fillStyle = COLORS.runnerShirt;
  drawRoundedRect(ctx, 8, 10, 20, 16, 6);
  ctx.fill();

  // Backpack
  ctx.fillStyle = COLORS.runnerAccent;
  drawRoundedRect(ctx, 24, 12, 8, 12, 3);
  ctx.fill();
  ctx.strokeStyle = COLORS.runnerBody;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(25, 14, 6, 2);
  ctx.strokeRect(25, 18, 6, 2);

  // Head
  ctx.fillStyle = '#ffd8b1';
  ctx.beginPath();
  ctx.arc(18, 6, 7, 0, Math.PI * 2);
  ctx.fill();

  // Hair / cap
  ctx.fillStyle = COLORS.runnerBody;
  ctx.beginPath();
  ctx.arc(18, 4, 7, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLORS.runnerAccent;
  drawRoundedRect(ctx, 10, 2, 18, 4, 2);
  ctx.fill();

  // Eyes
  ctx.fillStyle = COLORS.runnerBody;
  ctx.beginPath();
  ctx.arc(15, 6, 1.4, 0, Math.PI * 2);
  ctx.arc(21, 6, 1.4, 0, Math.PI * 2);
  ctx.fill();

  // Smile
  ctx.strokeStyle = COLORS.runnerBody;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(18, 8, 3, 0.2, Math.PI - 0.2);
  ctx.stroke();

  // Arms
  ctx.strokeStyle = COLORS.runnerShirt;
  ctx.lineWidth = 4;
  const armSwing = isJumping ? -12 : Math.sin(frame * 0.35) * 14;
  ctx.beginPath();
  ctx.moveTo(10, 16);
  ctx.lineTo(2, 20 + armSwing * 0.15);
  ctx.moveTo(26, 16);
  ctx.lineTo(34, 20 - armSwing * 0.15);
  ctx.stroke();

  ctx.restore();
}

function drawObstacle(ctx, obstacle) {
  const { x, y, width, height, type } = obstacle;

  if (type === 'book') {
    ctx.fillStyle = COLORS.obstacleBook;
    drawRoundedRect(ctx, x, y - height + 8, width, height - 8, 3);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x + 4, y - height + 14, width - 8, 3);
    ctx.fillStyle = COLORS.runnerAccent;
    ctx.fillRect(x + 4, y - height + 20, width - 8, 2);
  } else if (type === 'bag') {
    ctx.fillStyle = COLORS.obstacleBag;
    drawRoundedRect(ctx, x + 2, y - height + 6, width - 4, height - 10, 5);
    ctx.fill();
    ctx.fillStyle = COLORS.runnerAccent;
    ctx.beginPath();
    ctx.arc(x + width / 2, y - height + 4, 5, Math.PI, 0);
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x + width / 2 - 2, y - height / 2, 4, 8);
  } else {
    ctx.fillStyle = COLORS.obstacleCone;
    ctx.beginPath();
    ctx.moveTo(x + width / 2, y - height);
    ctx.lineTo(x + width, y);
    ctx.lineTo(x, y);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x + 6, y - height * 0.45, width - 12, 3);
    ctx.fillRect(x + 8, y - height * 0.65, width - 16, 3);
  }
}

function drawCloud(ctx, cloud) {
  ctx.fillStyle = `rgba(255, 255, 255, ${cloud.opacity})`;
  const { x, y, scale } = cloud;
  ctx.beginPath();
  ctx.arc(x, y, 12 * scale, 0, Math.PI * 2);
  ctx.arc(x + 14 * scale, y - 4 * scale, 10 * scale, 0, Math.PI * 2);
  ctx.arc(x + 28 * scale, y, 11 * scale, 0, Math.PI * 2);
  ctx.fill();
}

function drawParticle(ctx, particle) {
  ctx.fillStyle = particle.color;
  ctx.globalAlpha = particle.life;
  ctx.beginPath();
  ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function createObstacle(canvasWidth, groundY, speed) {
  const type = OBSTACLE_TYPES[Math.floor(Math.random() * OBSTACLE_TYPES.length)];
  const height = type === 'cone' ? randomBetween(28, 36) : randomBetween(24, 34);
  const width = type === 'bag' ? randomBetween(22, 28) : randomBetween(16, 24);
  return {
    type,
    x: canvasWidth + 20,
    y: groundY,
    width,
    height,
    passed: false,
    speed,
  };
}

function rectsOverlap(a, b) {
  return (
    a.x < b.x + b.width
    && a.x + a.width > b.x
    && a.y < b.y + b.height
    && a.y + a.height > b.y
  );
}

export default function DinoRunnerGame() {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const rafRef = useRef(null);
  const gameRef = useRef(null);

  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(loadHighScore);
  const [gameOver, setGameOver] = useState(false);
  const [milestoneText, setMilestoneText] = useState('');
  const [muted, setMuted] = useState(false);
  const mutedRef = useRef(false);

  const initGameState = useCallback((width, height) => {
    const groundLine = height - GROUND_BAND;
    const standY = groundLine - RUNNER_FEET_OFFSET;
    return {
      width,
      height,
      groundLine,
      groundY: groundLine,
      frame: 0,
      speed: 4.2,
      maxSpeed: 8.5,
      gravity: 0.52,
      jumpVelocity: -10.5,
      runner: {
        x: 56,
        y: standY,
        standY,
        width: 40,
        height: 42,
        vy: 0,
        jumping: false,
        ducking: false,
        onGround: true,
      },
      obstacles: [],
      clouds: Array.from({ length: 4 }, (_, i) => ({
        x: randomBetween(0, width),
        y: randomBetween(18, 56),
        scale: randomBetween(0.7, 1.2),
        speed: randomBetween(0.25, 0.55),
        opacity: randomBetween(0.55, 0.95),
      })),
      stars: Array.from({ length: 12 }, () => ({
        x: randomBetween(0, width),
        y: randomBetween(8, 70),
        size: randomBetween(1, 2.5),
        twinkle: randomBetween(0, Math.PI * 2),
      })),
      particles: [],
      popups: [],
      spawnTimer: 0,
      nextSpawn: 110,
      score: 0,
      streak: 0,
      alive: true,
      shake: 0,
      reachedMilestones: new Set(),
      groundOffset: 0,
      rainbowMode: false,
    };
  }, []);

  const spawnParticles = (state, x, y, count = 8) => {
    for (let i = 0; i < count; i += 1) {
      state.particles.push({
        x,
        y,
        vx: randomBetween(-2.5, 2.5),
        vy: randomBetween(-4, -1),
        size: randomBetween(2, 4),
        life: 1,
        color: COLORS.particle[Math.floor(Math.random() * COLORS.particle.length)],
      });
    }
  };

  const addPopup = (state, text, x, y) => {
    state.popups.push({ text, x, y, life: 1 });
  };

  const checkMilestones = (state) => {
    MILESTONES.forEach((milestone) => {
      if (state.score >= milestone.score && !state.reachedMilestones.has(milestone.score)) {
        state.reachedMilestones.add(milestone.score);
        setMilestoneText(milestone.text);
        if (!mutedRef.current) playMilestoneSound();
        setTimeout(() => setMilestoneText(''), 2200);
      }
    });
    state.rainbowMode = state.score >= 100;
  };

  const jump = useCallback(() => {
    const state = gameRef.current;
    if (!state || !state.alive) return;
    const runner = state.runner;
    if (runner.onGround && !runner.ducking) {
      runner.vy = state.jumpVelocity;
      runner.jumping = true;
      runner.onGround = false;
      spawnParticles(state, runner.x + 16, runner.y - 4, 6);
      if (!mutedRef.current) playJumpSound();
    }
  }, []);

  const measureCanvas = useCallback(() => {
    const container = containerRef.current;
    if (!container) return null;
    const rect = container.getBoundingClientRect();
    const width = Math.max(320, Math.floor(rect.width));
    const height = Math.max(240, Math.floor(rect.height || width * 0.3));
    return { width, height };
  }, []);

  const applyCanvasSize = useCallback((canvas, width, height) => {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctxRef.current = ctx;
    return ctx;
  }, []);

  const syncGroundLayout = useCallback((state, height) => {
    state.height = height;
    state.groundLine = height - GROUND_BAND;
    state.groundY = state.groundLine;
    state.runner.standY = state.groundLine - RUNNER_FEET_OFFSET;
    if (state.runner.onGround) {
      state.runner.y = state.runner.standY;
    }
    state.obstacles.forEach((obstacle) => {
      obstacle.y = state.groundLine;
    });
  }, []);

  const startGame = useCallback(async () => {
    await unlockGameAudio();
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const size = measureCanvas();
    if (!size) return;
    const { width, height } = size;
    const ctx = applyCanvasSize(canvas, width, height);
    if (!ctx) return;

    gameRef.current = initGameState(width, height);
    setScore(0);
    setGameOver(false);
    setMilestoneText('');

    const loop = () => {
      const state = gameRef.current;
      const ctx = ctxRef.current;
      if (!state || !ctx) return;
      const { runner } = state;
      state.frame += 1;

      if (state.shake > 0) state.shake -= 1;

      // Runner physics
      if (!runner.onGround) {
        runner.vy += state.gravity;
        runner.y += runner.vy;
        if (runner.y >= runner.standY) {
          runner.y = runner.standY;
          runner.vy = 0;
          runner.jumping = false;
          runner.onGround = true;
        }
      }

      const runnerHitbox = {
        x: runner.x + (runner.ducking ? 10 : 8),
        y: runner.y + (runner.ducking ? 10 : 4),
        width: runner.ducking ? 34 : 30,
        height: runner.ducking ? 24 : 34,
      };

      if (state.alive) {
        state.speed = Math.min(state.maxSpeed, state.speed + 0.0015);
        state.groundOffset = (state.groundOffset + state.speed) % 24;
        state.spawnTimer += 1;

        if (state.spawnTimer >= state.nextSpawn) {
          state.obstacles.push(createObstacle(state.width, state.groundY, state.speed));
          state.spawnTimer = 0;
          state.nextSpawn = randomBetween(95, 170) - state.speed * 4;
        }

        state.obstacles.forEach((obstacle) => {
          obstacle.x -= state.speed;
          if (!obstacle.passed && obstacle.x + obstacle.width < runner.x) {
            obstacle.passed = true;
            state.score += 10;
            state.streak += 1;
            setScore(state.score);
            checkMilestones(state);
            addPopup(state, '+10', obstacle.x + obstacle.width, state.groundY - obstacle.height - 10);
            if (!mutedRef.current && state.streak % 2 === 0) playScoreSound(state.streak);
          }

          const obstacleHitbox = {
            x: obstacle.x + 3,
            y: obstacle.y - obstacle.height + 4,
            width: obstacle.width - 6,
            height: obstacle.height - 6,
          };

          if (rectsOverlap(runnerHitbox, obstacleHitbox)) {
            state.alive = false;
            state.shake = 14;
            setGameOver(true);
            if (!mutedRef.current) playCrashSound();
            if (state.score > loadHighScore()) {
              saveHighScore(state.score);
              setHighScore(state.score);
            }
          }
        });

        state.obstacles = state.obstacles.filter((o) => o.x + o.width > -20);
      }

      state.clouds.forEach((cloud) => {
        cloud.x -= cloud.speed;
        if (cloud.x < -50) {
          cloud.x = state.width + randomBetween(10, 80);
          cloud.y = randomBetween(18, 56);
        }
      });

      state.particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.15;
        p.life -= 0.04;
      });
      state.particles = state.particles.filter((p) => p.life > 0);

      state.popups.forEach((p) => {
        p.y -= 0.6;
        p.life -= 0.02;
      });
      state.popups = state.popups.filter((p) => p.life > 0);

      // Draw
      const shakeX = state.shake ? (Math.random() - 0.5) * state.shake : 0;
      ctx.save();
      ctx.translate(shakeX, 0);

      const gradient = ctx.createLinearGradient(0, 0, 0, state.height);
      gradient.addColorStop(0, COLORS.skyTop);
      gradient.addColorStop(0.55, COLORS.skyMid);
      gradient.addColorStop(1, COLORS.skyBottom);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, state.width, state.height);

      state.stars.forEach((star) => {
        const alpha = 0.35 + Math.sin(state.frame * 0.05 + star.twinkle) * 0.25;
        ctx.fillStyle = `rgba(255, 211, 0, ${alpha})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
      });

      state.clouds.forEach((cloud) => drawCloud(ctx, cloud));

      // Ground
      ctx.fillStyle = COLORS.groundLine;
      ctx.fillRect(0, state.groundLine, state.width, 3);
      ctx.fillStyle = COLORS.ground;
      ctx.fillRect(0, state.groundLine + 3, state.width, state.height - state.groundLine);

      for (let gx = -24; gx < state.width + 24; gx += 24) {
        const stripeX = gx - state.groundOffset;
        ctx.fillStyle = state.rainbowMode
          ? COLORS.particle[Math.floor((stripeX / 24) % COLORS.particle.length)]
          : COLORS.groundStripe;
        ctx.globalAlpha = state.rainbowMode ? 0.45 : 0.35;
        ctx.fillRect(stripeX, state.groundLine + 12, 12, 4);
        ctx.globalAlpha = 1;
      }

      state.obstacles.forEach((obstacle) => drawObstacle(ctx, obstacle));
      drawRunner(ctx, runner.x, runner.y, state.frame, runner.jumping, runner.ducking);
      state.particles.forEach((p) => drawParticle(ctx, p));

      ctx.font = 'bold 13px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      state.popups.forEach((popup) => {
        ctx.globalAlpha = popup.life;
        ctx.fillStyle = COLORS.runnerAccent;
        ctx.strokeStyle = COLORS.runnerBody;
        ctx.lineWidth = 2;
        ctx.strokeText(popup.text, popup.x, popup.y);
        ctx.fillText(popup.text, popup.x, popup.y);
        ctx.globalAlpha = 1;
      });

      if (!state.alive) {
        ctx.fillStyle = 'rgba(0, 10, 61, 0.35)';
        ctx.fillRect(0, 0, state.width, state.height);
      }

      ctx.restore();

      rafRef.current = requestAnimationFrame(loop);
    };

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(loop);
  }, [applyCanvasSize, initGameState, measureCanvas]);

  const restartGame = useCallback(() => {
    startGame();
  }, [startGame]);

  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);

  useEffect(() => {
    const boot = window.setTimeout(() => startGame(), 50);

    const handleResize = () => {
      const canvas = canvasRef.current;
      const size = measureCanvas();
      const state = gameRef.current;
      if (!canvas || !size || !state) return;
      applyCanvasSize(canvas, size.width, size.height);
      state.width = size.width;
      syncGroundLayout(state, size.height);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.clearTimeout(boot);
      window.removeEventListener('resize', handleResize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [applyCanvasSize, measureCanvas, startGame, syncGroundLayout]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        jump();
      }
      if (e.code === 'ArrowDown') {
        const state = gameRef.current;
        if (state?.alive) state.runner.ducking = true;
      }
    };

    const onKeyUp = (e) => {
      if (e.code === 'ArrowDown') {
        const state = gameRef.current;
        if (state) state.runner.ducking = false;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [jump]);

  const handlePointer = async (e) => {
    e.preventDefault();
    await unlockGameAudio();
    jump();
  };

  return (
    <section className="countdown-dino-game" aria-label="Mini game sambil menunggu">
      <div className="countdown-dino-game-header">
        <div>
          <h2 className="countdown-dino-game-title">
            <span className="material-symbols-outlined">sports_esports</span>
            Lari Sambil Nunggu
          </h2>
          <p className="countdown-dino-game-desc">Tap, klik, atau tekan spasi untuk loncat. Hindari rintangan!</p>
        </div>
        <div className="countdown-dino-game-stats">
          <div className="countdown-dino-stat">
            <span className="countdown-dino-stat-label">Skor</span>
            <span className="countdown-dino-stat-value">{score}</span>
          </div>
          <div className="countdown-dino-stat">
            <span className="countdown-dino-stat-label">Rekor</span>
            <span className="countdown-dino-stat-value">{highScore}</span>
          </div>
          <button
            type="button"
            className="countdown-dino-mute-btn"
            onClick={() => setMuted((prev) => !prev)}
            aria-label={muted ? 'Nyalakan suara game' : 'Matikan suara game'}
          >
            <span className="material-symbols-outlined">{muted ? 'volume_off' : 'volume_up'}</span>
          </button>
        </div>
      </div>

      <div
        ref={containerRef}
        className="countdown-dino-canvas-wrap"
        onPointerDown={handlePointer}
        role="button"
        tabIndex={0}
        aria-label="Area permainan lari"
      >
        {milestoneText && (
          <div className="countdown-dino-milestone" role="status" aria-live="polite">
            {milestoneText}
          </div>
        )}

        <canvas ref={canvasRef} className="countdown-dino-canvas" />

        {gameOver && (
          <div className="countdown-dino-overlay">
            <p className="countdown-dino-overlay-title">Yah, nabrak!</p>
            <p className="countdown-dino-overlay-score">Skor kamu: <strong>{score}</strong></p>
            <button type="button" onClick={restartGame} className="countdown-dino-restart-btn">
              <span className="material-symbols-outlined">replay</span>
              Main Lagi
            </button>
          </div>
        )}


      </div>

      <div className="countdown-dino-controls">
        <span><kbd>Spasi</kbd> / <kbd>↑</kbd> loncat</span>
        <span><kbd>↓</kbd> merunduk</span>
        <span>Tap layar untuk loncat</span>
      </div>
    </section>
  );
}