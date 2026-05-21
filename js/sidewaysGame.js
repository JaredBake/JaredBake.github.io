const MIN_GAME_WIDTH = 1280;
const BOUNCE_LIMIT = 25;
const SCROLL_EDGE = 120;
const SCROLL_SPEED = 500;
const CHARGE_MAX_TIME = 1.1;
const CHARGE_FIRE_THRESHOLD = 0.35;
const CHARGE_VISUAL_THRESHOLD = 0.5;
const CHARGE_MIN_SPEED = 560;
const CHARGE_MAX_SPEED = 860;
const CHARGE_MIN_RADIUS = 12.4;
const CHARGE_MAX_RADIUS = 20.4;
const PLAYER_X_MIN = 25;
const PLAYER_X_MAX = 115;
const PLAYER_X_SPEED = 250;
const TARGET_SELECTORS = [
	"#hero .hero-content",
	"#hero .hero-card",
	"#hero .profile-photo",
	"#hero .status-pill",
	"#hero .hero-actions",
	"#about .panel",
	"#resume .panel",
	"#projects .project-card",
	"#skills .panel",
	"#contact .contact-card",
	".site-header",
	".site-footer"
];

function clamp(value, min, max) {
	return Math.min(max, Math.max(min, value));
}

function randomBetween(min, max) {
	return min + Math.random() * (max - min);
}

function circlesIntersectRect(circle, rect) {
	const closestX = clamp(circle.x, rect.x, rect.x + rect.width);
	const closestY = clamp(circle.y, rect.y, rect.y + rect.height);
	const dx = circle.x - closestX;
	const dy = circle.y - closestY;
	return dx * dx + dy * dy <= circle.radius * circle.radius;
}

function inflateRect(rect, padding = 4, scrollY = 0) {
  return {
    x: rect.left - padding,
    y: rect.top + scrollY - padding,
		width: rect.width + padding * 2,
		height: rect.height + padding * 2
	};
}

function rectsOverlap(a, b) {
	return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

function createShipGeometry(x, y, facing = 1) {
	return {
		x,
		y,
		facing,
		width: 28,
		height: 22,
		cooldown: 0,
		alive: true,
		respawnTimer: 0,
		wobble: Math.random() * Math.PI * 2,
		drift: randomBetween(0.25, 0.75)
	};
}

export function initSidewaysGame() {
	if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
	if (window.innerWidth < MIN_GAME_WIDTH) return;

	const layer = document.createElement("div");
	layer.className = "sideways-game-layer";
	layer.setAttribute("aria-hidden", "true");

	const canvas = document.createElement("canvas");
	canvas.className = "sideways-game-canvas";
	layer.append(canvas);
	document.body.append(layer);

	const context = canvas.getContext("2d");
	if (!context) {
		layer.remove();
		return;
	}

	const state = {
		width: 0,
		height: 0,
		dpr: Math.min(window.devicePixelRatio || 1, 2),
		running: true,
		layoutDirty: true,
		time: 0,
		playerHits: 0,
		enemyHits: 0,
		player: createShipGeometry(56, 0.5 * window.innerHeight, 1),
		enemies: [],
		bullets: [],
		sparks: [],
		targetRects: [],
		keys: { up: false, down: false, left: false, right: false, fire: false },
		chargeTime: 0,
		chargeActive: false,
		scrollVelocity: 0,
		scrollRAF: 0
	};

	const enemyCount = 4;
	const enemySpacing = 78;

	function spawnEnemyWave() {
		state.enemies = Array.from({ length: enemyCount }, (_, index) => {
			const y = 110 + index * enemySpacing;
			const enemy = createShipGeometry(0, y, -1);
		enemy.baseY = y;
			enemy.phase = Math.random() * Math.PI * 2;
			enemy.cooldown = randomBetween(0.3, 1.2);
			enemy.laneY = y;
			enemy.laneTimer = Math.random() * 1.5;
						enemy.dodgeCooldown = randomBetween(0.8, 2.0);
						enemy.dodgeTimer = 0;
						enemy.dodgeDir = 1;
			return enemy;
		});
	}

	function resizeCanvas() {
		state.width = window.innerWidth;
		state.height = window.innerHeight;
		state.dpr = Math.min(window.devicePixelRatio || 1, 2);
		canvas.width = Math.round(state.width * state.dpr);
		canvas.height = Math.round(state.height * state.dpr);
		canvas.style.width = `${state.width}px`;
		canvas.style.height = `${state.height}px`;
		context.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
		state.player.x = clamp(state.player.x || 56, PLAYER_X_MIN, Math.min(PLAYER_X_MAX, state.width * 0.14));
		state.player.y = clamp(state.player.y || state.height * 0.5, SCROLL_EDGE, state.height - SCROLL_EDGE);
		state.layoutDirty = true;
	}

	function collectTargetRects() {
		const elements = new Set();
		TARGET_SELECTORS.forEach((selector) => {
			document.querySelectorAll(selector).forEach((element) => {
				if (element instanceof Element) elements.add(element);
			});
		});

		const scrollY = window.scrollY || 0;
		const rects = [];
		elements.forEach((element) => {
			const rect = element.getBoundingClientRect();
			if (rect.width < 16 || rect.height < 16) return;
			rects.push(inflateRect(rect, 6, scrollY));
		});

		return rects;
	}

	function syncTargets() {
		state.targetRects = collectTargetRects();
		state.layoutDirty = false;
	}

	function markLayoutDirty() {
		state.layoutDirty = true;
	}

	function addSpark(x, y, color) {
		state.sparks.push({ x, y, color, life: 0.22, radius: randomBetween(1.5, 3.8) });
		if (state.sparks.length > 30) state.sparks.splice(0, state.sparks.length - 30);
	}

	function fireBullet(owner, x, y, vx, vy, color) {
		state.bullets.push({ owner, x, y, vx, vy, radius: owner === "player" ? 3 : 2.7, bounces: 0, color });
		if (state.bullets.length > 26) state.bullets.splice(0, state.bullets.length - 26);
	}

	function fireNormalShot() {
		fireBullet("player", state.player.x + 20, state.player.y - 3, 520, randomBetween(-18, 18), "rgba(124, 196, 255, 0.96)");
	}

	function fireChargedShot() {
		if (!state.chargeActive) return;

		const effectiveChargeTime = Math.max(state.chargeTime, 0.12);
		const chargeRatio = clamp(effectiveChargeTime / CHARGE_MAX_TIME, 0, 1);
		const shotSpeed = CHARGE_MIN_SPEED + (CHARGE_MAX_SPEED - CHARGE_MIN_SPEED) * chargeRatio;
		const shotRadius = CHARGE_MIN_RADIUS + (CHARGE_MAX_RADIUS - CHARGE_MIN_RADIUS) * chargeRatio;
		const shotVerticalDrift = randomBetween(-14, 14) * (1 - chargeRatio * 0.4);

		state.bullets.push({
			owner: "player",
			x: state.player.x + 20,
			y: state.player.y - 3,
			vx: shotSpeed,
			vy: shotVerticalDrift,
			radius: shotRadius,
			bounces: 0,
			color: "rgba(255, 225, 92, 0.98)",
			charged: true,
			chargeRatio
		});

		if (state.bullets.length > 26) state.bullets.splice(0, state.bullets.length - 26);
		addSpark(state.player.x + 24, state.player.y - 3, "rgba(255, 225, 92, 0.98)");
		state.chargeTime = 0;
		state.chargeActive = false;
	}

	function releaseShot() {
		if (!state.chargeActive) return;

		if (state.chargeTime < CHARGE_FIRE_THRESHOLD) {
			fireNormalShot();
			state.chargeTime = 0;
			state.chargeActive = false;
			return;
		}

		fireChargedShot();
	}

	function cancelCharge() {
		state.chargeTime = 0;
		state.chargeActive = false;
	}

	function resetRound() {
		state.playerHits = 0;
		state.enemyHits = 0;
		cancelCharge();
		state.bullets = [];
		state.sparks = [];
		spawnEnemyWave();
	}

	function resetAfterHit() {
		state.enemyHits += 1;
		state.bullets = state.bullets.filter((bullet) => bullet.owner !== "enemy");
	}

	function handleTargetCollision(bullet, rect) {
		const centerX = bullet.x;
		const centerY = bullet.y;
		const distances = [
			{ axis: "x", value: Math.abs(centerX - rect.x), push: rect.x - bullet.radius - 1 },
			{ axis: "x", value: Math.abs(centerX - (rect.x + rect.width)), push: rect.x + rect.width + bullet.radius + 1 },
			{ axis: "y", value: Math.abs(centerY - rect.y), push: rect.y - bullet.radius - 1 },
			{ axis: "y", value: Math.abs(centerY - (rect.y + rect.height)), push: rect.y + rect.height + bullet.radius + 1 }
		];

		distances.sort((a, b) => a.value - b.value);
		const nearest = distances[0];
		if (nearest.axis === "x") {
			bullet.vx *= -0.98;
			bullet.x = nearest.push;
		} else {
			bullet.vy *= -0.98;
			bullet.y = nearest.push;
		}
		bullet.bounces += 1;
		addSpark(bullet.x, bullet.y, bullet.color);
	}

	function updatePageScroll(dt, direction) {
		const topZone = SCROLL_EDGE;
		const bottomZone = state.height - SCROLL_EDGE;
		const docHeight = document.documentElement.scrollHeight;
		const maxScroll = Math.max(0, docHeight - window.innerHeight);
		let targetVelocity = 0;

		if (direction < 0 && state.player.y <= topZone && window.scrollY > 0) {
			targetVelocity = -SCROLL_SPEED;
			state.player.y = topZone;
		} else if (direction > 0 && state.player.y >= bottomZone && window.scrollY < maxScroll) {
			targetVelocity = SCROLL_SPEED;
			state.player.y = bottomZone;
		}

		const easing = 1 - Math.exp(-dt * 12);
		state.scrollVelocity += (targetVelocity - state.scrollVelocity) * easing;

		if (Math.abs(targetVelocity) < 1 && Math.abs(state.scrollVelocity) < 1) {
			state.scrollVelocity = 0;
			return;
		}

		const nextScrollY = clamp(window.scrollY + state.scrollVelocity * dt, 0, maxScroll);
		if (nextScrollY !== window.scrollY) {
			window.scrollTo(0, nextScrollY);
		} else if (targetVelocity === 0) {
			state.scrollVelocity = 0;
		}
	}

	// Returns the nearest viewport Y with a clear horizontal path from the right edge
	// to the player zone — no targetRect blocking that Y in the right half of the screen.
	function findNearestOpenLane(fromY) {
		const scrollY = window.scrollY || 0;
		const margin = 70;
		const step = 6;
		let bestY = fromY;
		let bestDist = Infinity;

		for (let y = margin; y <= state.height - margin; y += step) {
			const blocked = state.targetRects.some((rect) => {
				const vy = rect.y - scrollY;
				// Rect blocks this lane if it spans this Y and sits in the right-side travel path
				return y >= vy && y <= vy + rect.height && rect.x + rect.width > PLAYER_X_MAX;
			});
			if (!blocked) {
				const dist = Math.abs(y - fromY);
				if (dist < bestDist) {
					bestDist = dist;
					bestY = y;
				}
			}
		}
		return bestY;
	}

	function updateEnemies(dt) {
		const enemyX = state.width - 56;
		const playerCenterY = state.player.y;

		state.enemies.forEach((enemy, index) => {
			if (!enemy.alive) {
				enemy.respawnTimer -= dt;
				if (enemy.respawnTimer <= 0) {
					enemy.alive = true;
					enemy.y = clamp(randomBetween(120, state.height - 120), 110, state.height - 110);
					enemy.baseY = enemy.y;				enemy.laneY = enemy.y;
				enemy.laneTimer = 0.3;
				enemy.dodgeCooldown = randomBetween(0.5, 1.5);
				enemy.dodgeTimer = 0;
				enemy.cooldown = randomBetween(0.35, 1.2) + index * 0.1;
				}
				return;
			}

			enemy.x = enemyX;
			enemy.wobble += dt * (0.85 + enemy.drift);

			// Dodge cooldown tick
			if (enemy.dodgeCooldown > 0) enemy.dodgeCooldown -= dt;

			if (enemy.dodgeTimer > 0) {
				// Active dodge: move directly and keep baseY/laneY synced to prevent snap-back
				enemy.dodgeTimer -= dt;
				enemy.y = clamp(enemy.y + enemy.dodgeDir * 215 * dt, 92, state.height - 92);
				enemy.baseY = enemy.y;
				enemy.laneY = enemy.y;
			} else {
				// Check for incoming player bullets and maybe dodge
				if (enemy.dodgeCooldown <= 0) {
					const threatened = state.bullets.some(
						(b) =>
							b.owner === "player" &&
							b.vx > 0 &&
							b.x < enemy.x &&
							b.x > enemy.x - 420 &&
							Math.abs(b.y - enemy.y) < 74
					);
					if (threatened && Math.random() < 0.42) {
						enemy.dodgeDir = Math.random() < 0.5 ? 1 : -1;
						enemy.dodgeTimer = randomBetween(0.38, 0.68);
						enemy.dodgeCooldown = randomBetween(2.0, 4.8);
					}
				}

				// Normal lane-seeking + wave movement
				enemy.laneTimer -= dt;
				if (enemy.laneTimer <= 0) {
					enemy.laneY = findNearestOpenLane(enemy.y);
					enemy.laneTimer = 1.4 + Math.random() * 0.6;
				}
				enemy.baseY += (enemy.laneY - enemy.baseY) * dt * 1.5;

				const waveOffset = Math.sin(enemy.wobble + enemy.phase) * 18;
				const trackingOffset = clamp((playerCenterY - enemy.y) * 0.04, -48, 48);
				const targetY = clamp(enemy.baseY + waveOffset + trackingOffset, 92, state.height - 92);
				enemy.y += (targetY - enemy.y) * dt * 2.6;
			}

			enemy.cooldown -= dt;
			if (enemy.cooldown <= 0) {
				const aim = (playerCenterY - enemy.y) * 0.7;
				fireBullet("enemy", enemy.x - 16, enemy.y, -440, clamp(aim, -160, 160), "rgba(255, 128, 128, 0.95)");
				enemy.cooldown = randomBetween(0.9, 1.7) + index * 0.14;
			}
		});
	}

	function updateBullets(dt) {
		const playerRect = {
			x: state.player.x - state.player.width * 0.4,
			y: state.player.y - state.player.height * 0.5,
			width: state.player.width,
			height: state.player.height
		};

		const enemyRects = state.enemies
			.filter((enemy) => enemy.alive)
			.map((enemy) => ({ x: enemy.x - enemy.width * 0.5, y: enemy.y - enemy.height * 0.5, width: enemy.width, height: enemy.height, enemy }));

		state.bullets = state.bullets.filter((bullet) => {
			bullet.x += bullet.vx * dt;
			bullet.y += bullet.vy * dt;

			if (bullet.owner === "player") {
				for (const enemyRect of enemyRects) {
					if (!rectsOverlap({ x: bullet.x - bullet.radius, y: bullet.y - bullet.radius, width: bullet.radius * 2, height: bullet.radius * 2 }, enemyRect)) continue;
					enemyRect.enemy.alive = false;
					enemyRect.enemy.respawnTimer = 1.25;
					bullet.bounces = 99;
				state.playerHits += 1;
					addSpark(bullet.x, bullet.y, bullet.color);
					return false;
				}
			} else if (rectsOverlap({ x: bullet.x - bullet.radius, y: bullet.y - bullet.radius, width: bullet.radius * 2, height: bullet.radius * 2 }, playerRect)) {
				addSpark(bullet.x, bullet.y, bullet.color);
				bullet.bounces = 99;
				resetAfterHit();
				return false;
			}

			const scrollY = window.scrollY || 0;
			for (const rect of state.targetRects) {
				const vRect = { x: rect.x, y: rect.y - scrollY, width: rect.width, height: rect.height };
				const circle = { x: bullet.x, y: bullet.y, radius: bullet.radius };
				if (!circlesIntersectRect(circle, vRect)) continue;
				handleTargetCollision(bullet, vRect);
				if (bullet.bounces >= BOUNCE_LIMIT) return false;
			}

			if (bullet.x < -24 || bullet.x > state.width + 24 || bullet.y < -24 || bullet.y > state.height + 24) {
				return false;
			}

			return bullet.bounces < BOUNCE_LIMIT;
		});
	}

	function updateSparks(dt) {
		state.sparks = state.sparks.filter((spark) => {
			spark.life -= dt;
			return spark.life > 0;
		});
	}

	function updatePlayer(dt) {
		const speed = 320;
		const direction = (state.keys.down ? 1 : 0) - (state.keys.up ? 1 : 0);
		const horizontalDirection = (state.keys.right ? 1 : 0) - (state.keys.left ? 1 : 0);
		state.player.x = clamp(state.player.x + horizontalDirection * PLAYER_X_SPEED * dt, PLAYER_X_MIN, Math.min(PLAYER_X_MAX, state.width * 0.14));
		state.player.y = clamp(state.player.y + direction * speed * dt, SCROLL_EDGE, state.height - SCROLL_EDGE);
		updatePageScroll(dt, direction);

		if (state.keys.fire && state.chargeActive) {
			state.chargeTime = clamp(state.chargeTime + dt, 0, CHARGE_MAX_TIME);
		}
	}

	function renderShip(x, y, facing, color) {
		context.save();
		context.translate(x, y);
		context.scale(facing, 1);
		context.globalAlpha = 0.92;
		context.shadowColor = color;
		context.shadowBlur = 8;
		context.fillStyle = color;
		context.beginPath();
		context.moveTo(14, 0);
		context.lineTo(-11, -10);
		context.lineTo(-6, 0);
		context.lineTo(-11, 10);
		context.closePath();
		context.fill();
		context.restore();
	}

	function renderChargeEffect() {
		if (!state.chargeActive || state.chargeTime < CHARGE_VISUAL_THRESHOLD) return;

		const chargeRatio = clamp(state.chargeTime / CHARGE_MAX_TIME, 0, 1);
		const radius = 14 + chargeRatio * 16;
		const alpha = 0.18 + chargeRatio * 0.34;
		const x = state.player.x + 6;
		const y = state.player.y - 2;

		context.save();
		context.globalAlpha = alpha;
		context.strokeStyle = "rgba(255, 225, 92, 0.95)";
		context.lineWidth = 2 + chargeRatio * 1.2;
		context.shadowColor = "rgba(255, 225, 92, 0.85)";
		context.shadowBlur = 14 + chargeRatio * 10;
		context.beginPath();
		context.arc(x, y, radius, 0, Math.PI * 2);
		context.stroke();

		context.fillStyle = "rgba(255, 225, 92, 0.9)";
		context.fillRect(x - 8, y + 18, 16 + chargeRatio * 18, 3.5);
		context.restore();
	}

	function render() {
		context.clearRect(0, 0, state.width, state.height);

		const leftGlow = context.createLinearGradient(0, 0, 130, 0);
		leftGlow.addColorStop(0, "rgba(76, 150, 255, 0.12)");
		leftGlow.addColorStop(1, "rgba(76, 150, 255, 0)");
		context.fillStyle = leftGlow;
		context.fillRect(0, 0, 130, state.height);

		const rightGlow = context.createLinearGradient(state.width - 130, 0, state.width, 0);
		rightGlow.addColorStop(0, "rgba(255, 255, 255, 0)");
		rightGlow.addColorStop(1, "rgba(255, 255, 255, 0.08)");
		context.fillStyle = rightGlow;
		context.fillRect(state.width - 130, 0, 130, state.height);

		context.strokeStyle = "rgba(124, 196, 255, 0.15)";
		context.lineWidth = 1;
		context.beginPath();
		context.moveTo(130, 0);
		context.lineTo(130, state.height);
		context.moveTo(state.width - 130, 0);
		context.lineTo(state.width - 130, state.height);
		context.stroke();

		state.sparks.forEach((spark) => {
			context.beginPath();
			context.fillStyle = spark.color;
			context.globalAlpha = Math.max(0, spark.life / 0.22);
			context.arc(spark.x, spark.y, spark.radius, 0, Math.PI * 2);
			context.fill();
		});
		context.globalAlpha = 1;

		state.bullets.forEach((bullet) => {
			context.beginPath();
			context.shadowColor = bullet.color;
			context.shadowBlur = 10;
			context.fillStyle = bullet.color;
			context.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
			context.fill();
		});

		// Prevent projectile glow from tinting later HUD/text draws.
		context.shadowColor = "rgba(0, 0, 0, 0)";
		context.shadowBlur = 0;

		renderChargeEffect();
		const chargeVisualActive = state.chargeActive && state.chargeTime >= CHARGE_VISUAL_THRESHOLD;
		const playerWobble = chargeVisualActive ? Math.sin(state.time * 0.035) * 1.3 : 0;
		renderShip(state.player.x, state.player.y + playerWobble, 1, "rgba(124, 196, 255, 0.96)");

		state.enemies.forEach((enemy) => {
			if (!enemy.alive) return;
			renderShip(enemy.x, enemy.y, -1, "rgba(255, 128, 128, 0.9)");
		});

		context.save();
		context.shadowColor = "rgba(0, 0, 0, 0)";
		context.shadowBlur = 0;
		context.font = "600 12px 'Manrope', sans-serif";
		context.textAlign = "right";
		context.fillStyle = "rgba(245, 247, 251, 0.75)";
		context.fillText("W/S A/D move   Space fire   R reset", state.width - 18, 26);

		// Bottom counters
		context.font = "700 28px 'Manrope', sans-serif";
		context.textAlign = "left";
		context.fillStyle = "rgba(124, 196, 255, 0.95)";
		context.fillText(String(state.playerHits), 28, state.height - 20);
		context.font = "500 11px 'Manrope', sans-serif";
		context.fillStyle = "rgba(124, 196, 255, 0.6)";
		context.fillText("YOU", 28, state.height - 44);

		context.font = "700 28px 'Manrope', sans-serif";
		context.textAlign = "right";
		context.fillStyle = "rgba(255, 128, 128, 0.95)";
		context.fillText(String(state.enemyHits), state.width - 28, state.height - 20);
		context.font = "500 11px 'Manrope', sans-serif";
		context.fillStyle = "rgba(255, 128, 128, 0.6)";
		context.fillText("THEM", state.width - 28, state.height - 44);
		context.restore();
	}

	function resetTargetsIfNeeded() {
		if (state.layoutDirty) syncTargets();
	}

	function step(now) {
		if (!state.running) return;

		if (!state.lastTime) state.lastTime = now;
		const dt = Math.min(0.033, (now - state.lastTime) / 1000);
		state.lastTime = now;
		state.time = now;

		resetTargetsIfNeeded();
		updatePlayer(dt);
		updateEnemies(dt);
		updateBullets(dt);
		updateSparks(dt);
		render();

		state.raf = window.requestAnimationFrame(step);
	}

	const onKeyDown = (event) => {
		if (event.code === "KeyW") state.keys.up = true;
		if (event.code === "KeyS") state.keys.down = true;
		if (event.code === "KeyA" || event.code === "ArrowLeft") {
			event.preventDefault();
			state.keys.left = true;
		}
		if (event.code === "KeyD" || event.code === "ArrowRight") {
			event.preventDefault();
			state.keys.right = true;
		}
		if (event.code === "Space") {
			event.preventDefault();
			if (!state.keys.fire) {
				state.chargeTime = 0;
				state.chargeActive = true;
			}
			state.keys.fire = true;
		}
		if (event.code === "KeyR") {
			resetRound();
		}
	};

	const onKeyUp = (event) => {
		if (event.code === "KeyW") state.keys.up = false;
		if (event.code === "KeyS") state.keys.down = false;
		if (event.code === "KeyA" || event.code === "ArrowLeft") state.keys.left = false;
		if (event.code === "KeyD" || event.code === "ArrowRight") state.keys.right = false;
		if (event.code === "Space") {
			state.keys.fire = false;
			releaseShot();
		}
	};

	const onScroll = () => {
		markLayoutDirty();
	};

	const onVisibilityChange = () => {
		if (document.hidden) {
			state.running = false;
			cancelCharge();
			if (state.raf) window.cancelAnimationFrame(state.raf);
			state.raf = 0;
			return;
		}

		if (!state.running) {
			state.running = true;
			state.lastTime = 0;
			state.raf = window.requestAnimationFrame(step);
		}
	};

	const resizeObserver = "ResizeObserver" in window ? new ResizeObserver(markLayoutDirty) : null;
	const mutationObserver = "MutationObserver" in window ? new MutationObserver(markLayoutDirty) : null;

	window.addEventListener("resize", resizeCanvas);
	window.addEventListener("scroll", onScroll, { passive: true });
	window.addEventListener("keydown", onKeyDown);
	window.addEventListener("keyup", onKeyUp);
	document.addEventListener("visibilitychange", onVisibilityChange);

	resizeObserver?.observe(document.body);
	resizeObserver?.observe(document.documentElement);
	const main = document.querySelector("main");
	if (main) {
		resizeObserver?.observe(main);
		mutationObserver?.observe(main, { subtree: true, childList: true, attributes: true, characterData: true });
	}

	resizeCanvas();
	spawnEnemyWave();
	state.raf = window.requestAnimationFrame(step);

	return () => {
		state.running = false;
		if (state.raf) window.cancelAnimationFrame(state.raf);
		if (state.scrollRAF) window.cancelAnimationFrame(state.scrollRAF);
		resizeObserver?.disconnect();
		mutationObserver?.disconnect();
		window.removeEventListener("resize", resizeCanvas);
		window.removeEventListener("scroll", onScroll);
		window.removeEventListener("keydown", onKeyDown);
		window.removeEventListener("keyup", onKeyUp);
		document.removeEventListener("visibilitychange", onVisibilityChange);
		layer.remove();
	};
}
