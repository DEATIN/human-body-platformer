/** Pure, deterministic game rules. Rendering, input events and storage live elsewhere. */
export const LEVEL = {
  width: 1280,
  height: 600,
  spawn: { x: 70, y: 452 },
  platforms: [
    { x: 30, y: 490, w: 250, h: 30 },
    { x: 325, y: 395, w: 180, h: 30 },
    { x: 550, y: 305, w: 200, h: 30 },
    { x: 795, y: 385, w: 160, h: 30 },
    { x: 1000, y: 465, w: 250, h: 30 }
  ],
  collectibles: [
    { id: 'oxygen-1', x: 395, y: 356, w: 20, h: 26 },
    { id: 'oxygen-2', x: 640, y: 266, w: 20, h: 26 },
    { id: 'oxygen-3', x: 865, y: 346, w: 20, h: 26 }
  ],
  hazards: [{ id: 'floor', x: 0, y: 555, w: 1280, h: 45 }],
  finish: { x: 1160, y: 405, w: 50, h: 60 }
};

const SPEED = 260;
const JUMP_SPEED = 600;
const GRAVITY = 1450;
const MAX_FRAME = 1 / 20;
const MAX_STEP = 1 / 120;
const EPSILON = 0.00001;

const overlaps = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x
  && a.y < b.y + b.h && a.y + a.h > b.y;

export class GameModel {
  constructor() { this.reset(); }

  get status() { return this._status; }
  get player() { return this._player; }
  get items() { return this._items; }
  get score() { return this._score; }
  get elapsed() { return this._elapsed; }
  get collectedCount() { return this._items.filter(item => item.collected).length; }
  get endReason() { return this._endReason; }
  get message() { return this._message; }

  reset() {
    this._status = 'ready';
    this._player = {
      ...LEVEL.spawn, w: 30, h: 38, vx: 0, vy: 0, grounded: true, facing: 1
    };
    this._items = LEVEL.collectibles.map(item => ({ ...item, collected: false }));
    this._score = 0;
    this._elapsed = 0;
    this._jumpHeld = false;
    this._endReason = null;
    this._message = 'Соберите три капсулы O₂ и доставьте их к мышечной ткани.';
  }

  start() {
    if (this._status !== 'ready') return;
    this._status = 'running';
    this._message = 'Капсулы ждут на платформах. Вперёд, Линза!';
  }

  pause() {
    if (this._status !== 'running') return;
    this._status = 'paused';
    this._message = 'Пауза. Маршрут подождёт.';
  }

  resume() {
    if (this._status !== 'paused') return;
    this._status = 'running';
    this._message = 'Продолжаем доставку.';
  }

  update(dt, input = {}) {
    if (this._status !== 'running' || !Number.isFinite(dt) || dt <= 0) return;
    const jumpDown = Boolean(input.jump);
    const jumpPressed = jumpDown && !this._jumpHeld;
    this._jumpHeld = jumpDown;
    const direction = Number(Boolean(input.right)) - Number(Boolean(input.left));
    const duration = Math.min(dt, MAX_FRAME);
    const steps = Math.ceil(duration / MAX_STEP);
    const step = duration / steps;

    // A press is consumed once per input edge, even when it occurs in the air.
    if (jumpPressed && this._player.grounded) {
      this._player.vy = -JUMP_SPEED;
      this._player.grounded = false;
    }
    for (let index = 0; index < steps && this._status === 'running'; index += 1) {
      this._elapsed += step;
      this.move(step, direction);
      this.checkObjectives();
    }
  }

  move(dt, direction) {
    const player = this._player;
    player.vx = direction * SPEED;
    if (direction) player.facing = direction;
    const oldX = player.x;
    let nextX = Math.max(0, Math.min(LEVEL.width - player.w, oldX + player.vx * dt));

    // Resolve horizontal sweeps against side walls before the vertical sweep.
    for (const platform of LEVEL.platforms) {
      if (player.y >= platform.y + platform.h || player.y + player.h <= platform.y) continue;
      if (player.vx > 0 && oldX + player.w <= platform.x + EPSILON
          && nextX + player.w >= platform.x) {
        nextX = Math.min(nextX, platform.x - player.w);
      } else if (player.vx < 0 && oldX >= platform.x + platform.w - EPSILON
          && nextX <= platform.x + platform.w) {
        nextX = Math.max(nextX, platform.x + platform.w);
      }
    }
    player.x = nextX;
    if (Math.abs(nextX - (oldX + player.vx * dt)) > EPSILON) player.vx = 0;

    const oldY = player.y;
    player.vy += GRAVITY * dt;
    let nextY = oldY + player.vy * dt;
    player.grounded = false;
    for (const platform of LEVEL.platforms) {
      if (player.x >= platform.x + platform.w || player.x + player.w <= platform.x) continue;
      if (player.vy >= 0 && oldY + player.h <= platform.y + EPSILON
          && nextY + player.h >= platform.y) {
        nextY = Math.min(nextY, platform.y - player.h);
        player.vy = 0;
        player.grounded = true;
      } else if (player.vy < 0 && oldY >= platform.y + platform.h - EPSILON
          && nextY <= platform.y + platform.h) {
        nextY = Math.max(nextY, platform.y + platform.h);
        player.vy = 0;
      }
    }
    player.y = nextY;
  }

  checkObjectives() {
    const player = this._player;
    if (player.y > LEVEL.height) {
      this.finish('lost', 'fall', 'Линза покинула маршрут. Попробуйте ещё раз.');
      return;
    }
    if (LEVEL.hazards.some(hazard => overlaps(player, hazard))) {
      this.finish('lost', 'danger', 'Линза попала в опасную зону. Доставка начнётся заново.');
      return;
    }
    for (const item of this._items) {
      if (!item.collected && overlaps(player, item)) {
        item.collected = true;
        this._score += 100;
        this._message = `Капсулы O₂: ${this.collectedCount} из ${this._items.length}.`;
      }
    }
    if (overlaps(player, LEVEL.finish)) {
      if (this.collectedCount === this._items.length) {
        this._score += Math.max(0, 1000 - Math.floor(this._elapsed * 10));
        this.finish('won', 'delivered', 'Все три капсулы доставлены. Миссия выполнена!');
      } else {
        this._message = `Для доставки нужны все капсулы: ${this.collectedCount} из ${this._items.length}. Можно вернуться назад.`;
      }
    }
  }

  finish(status, reason, message) {
    this._status = status;
    this._endReason = reason;
    this._message = message;
    this._player.vx = 0;
    this._player.vy = 0;
  }
}
