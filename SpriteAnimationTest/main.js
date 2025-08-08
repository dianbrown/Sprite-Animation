// PixiJS Sprite Animation - Walking Knight (Enhanced with idle, drag, bounce)
class WalkingKnight {
    constructor() {
        // Core
        this.app = null;
        this.scale = 4;
        this.speed = 0.6; // walk speed
        this.direction = 1; // 1 right, -1 left

        // Animation sprites
        this.walkingRight = null;
        this.walkingLeft = null;
        this.idleRight = null;
        this.idleLeft = null;
        this.dangle = null; // used while dragging / bouncing
        this.currentAnimation = null;

        // State machine
        this.state = 'walking'; // walking | idle | dragging | bouncing
        this.idleTimer = 0;
        this.idleDuration = 0;

        // Drag
        this.isDragging = false;
        this.dragOffset = { x: 0, y: 0 };

        // Bounce physics
        this.vel = { x: 0, y: 0 };
        this.gravity = 0.5;
        this.bounceEnergy = 0.65;
        this.friction = 0.985;

        this.debug('Init enhanced knight...');
        this.init();
    }

    debug(msg) {
        console.log(msg);
        const d = document.getElementById('debug-info');
        if (d) {
            d.innerHTML += msg + '<br>';
            const lines = d.innerHTML.split('<br>');
            if (lines.length > 30) d.innerHTML = lines.slice(-30).join('<br>');
        }
    }

    async init() {
        try {
            this.debug('Create PIXI app');
            this.app = new PIXI.Application({
                width: 1000,
                height: 350,
                backgroundAlpha: 0, // transparent so it can sit behind/over content
                antialias: false,
                roundPixels: true,
                resolution: 1
            });
            PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;

            const host = document.getElementById('game-canvas');
            if (!host) { this.debug('ERROR: #game-canvas not found'); return; }
            host.appendChild(this.app.view);

            await this.loadAssets();
            this.createAnimations();
            this.setupKnight();
            this.setupInteractivity();
            this.startLoop();
        } catch (e) { this.debug('ERROR init: ' + e.message); }
    }

    async loadAssets() {
        PIXI.Assets.add('knight', 'GreenKnight.png');
        await PIXI.Assets.load(['knight']);
        this.debug('Assets loaded');
    }

    createAnimations() {
        const tex = PIXI.Assets.get('knight');
        if (!tex) { this.debug('No knight texture'); return; }
        const base = tex.baseTexture;
        base.scaleMode = PIXI.SCALE_MODES.NEAREST;

        // Helper build frames from row
        const row = (y, frames = 4) => {
            const arr = [];
            for (let i = 0; i < frames; i++) {
                arr.push(new PIXI.Texture(base, new PIXI.Rectangle(i * 32, y, 32, 32)));
            }
            return arr;
        };

        // Assuming sheet rows (based on earlier CSS):
        // 0: facing down (reuse as idleRight)
        // 32: face-right (walkingRight)
        // 64: face-up (reuse as idleLeft for variation)
        // 96: face-left (walkingLeft)
        this.walkingRight = new PIXI.AnimatedSprite(row(32));
        this.walkingLeft  = new PIXI.AnimatedSprite(row(96));
        this.idleRight    = new PIXI.AnimatedSprite(row(0));
        this.idleLeft     = new PIXI.AnimatedSprite(row(64));
        // Dangle: reuse idleRight first frame (single-frame anim) or whole idleRight sequence slow
        this.dangle       = new PIXI.AnimatedSprite(row(0));

        const all = [this.walkingRight, this.walkingLeft, this.idleRight, this.idleLeft, this.dangle];
        all.forEach(s => {
            s.anchor.set(0.5);
            s.scale.set(this.scale);
            s.visible = false;
            s.loop = true;
            s.roundPixels = true;
            s.animationSpeed = 0.08;
        });
        this.walkingRight.animationSpeed = this.walkingLeft.animationSpeed = 0.09;
        this.idleRight.animationSpeed = this.idleLeft.animationSpeed = 0.05;
        this.dangle.animationSpeed = 0.05;

        this.debug('Animations created');
    }

    setupKnight() {
        const stage = this.app.stage;
        [this.walkingRight, this.walkingLeft, this.idleRight, this.idleLeft, this.dangle].forEach(s => stage.addChild(s));

        this.currentAnimation = this.walkingRight;
        this.currentAnimation.visible = true;
        this.currentAnimation.play();
        this.currentAnimation.x = 100;
        this.currentAnimation.y = this.app.screen.height / 2;
        this.setRandomIdleTimer();
        this.debug('Knight ready');
    }

    setupInteractivity() {
        const sprites = [this.walkingRight, this.walkingLeft, this.idleRight, this.idleLeft, this.dangle];
        sprites.forEach(s => {
            s.eventMode = 'static';
            s.cursor = 'grab';
            s.on('pointerdown', this.onPointerDown.bind(this));
            s.on('pointerup', this.onPointerUp.bind(this));
            s.on('pointerupoutside', this.onPointerUp.bind(this));
            s.on('pointermove', this.onPointerMove.bind(this));
        });
    }

    onPointerDown(e) {
        if (this.state === 'bouncing') return;
        this.isDragging = true;
        this.state = 'dragging';
        this.switchTo(this.dangle);
        const pos = e.data.getLocalPosition(this.currentAnimation.parent);
        this.dragOffset.x = pos.x - this.currentAnimation.x;
        this.dragOffset.y = pos.y - this.currentAnimation.y;
        this.currentAnimation.alpha = 0.8;
        this.currentAnimation.cursor = 'grabbing';
    }

    onPointerMove(e) {
        if (!this.isDragging) return;
        const pos = e.data.getLocalPosition(this.currentAnimation.parent);
        this.currentAnimation.x = pos.x - this.dragOffset.x;
        this.currentAnimation.y = pos.y - this.dragOffset.y;
    }

    onPointerUp() {
        if (!this.isDragging) return;
        this.isDragging = false;
        this.currentAnimation.alpha = 1;
        this.currentAnimation.cursor = 'grab';
        if (this.isOutsideBounds(this.currentAnimation.x, this.currentAnimation.y)) {
            this.startBounce();
        } else {
            this.state = 'walking';
            this.switchTo(this.direction === 1 ? this.walkingRight : this.walkingLeft);
            this.setRandomIdleTimer();
        }
    }

    isOutsideBounds(x, y) {
        const b = this.bounds();
        return x < b.left || x > b.right || y < b.top || y > b.bottom;
    }

    startBounce() {
        this.state = 'bouncing';
        // target towards center with some randomness
        const b = this.bounds();
        const centerX = (b.left + b.right) / 2 + (Math.random() - 0.5) * 150;
        const centerY = (b.top + b.bottom) / 2 + (Math.random() - 0.5) * 80;
        const dx = centerX - this.currentAnimation.x;
        const dy = centerY - this.currentAnimation.y;
        this.vel.x = dx * 0.12;
        this.vel.y = dy * 0.12 - 6; // upward push
        this.switchTo(this.dangle);
        this.debug('Bounce initiated');
    }

    setRandomIdleTimer() {
        this.idleTimer = 240 + Math.random() * 300;      // 4–9s
        this.idleDuration = 60 + Math.random() * 120;    // 1–3s
    }

    bounds() {
        const sw = 32 * this.scale;
        const sh = 32 * this.scale;
        return {
            left: sw / 2,
            right: this.app.screen.width - sw / 2,
            top: sh / 2,
            bottom: this.app.screen.height - sh / 2
        };
    }

    switchTo(sprite) {
        if (!sprite || sprite === this.currentAnimation) return;
        const x = this.currentAnimation ? this.currentAnimation.x : this.app.screen.width / 2;
        const y = this.currentAnimation ? this.currentAnimation.y : this.app.screen.height / 2;
        if (this.currentAnimation) { this.currentAnimation.visible = false; this.currentAnimation.stop(); }
        this.currentAnimation = sprite;
        sprite.x = x; sprite.y = y; sprite.visible = true; sprite.play();
    }

    startLoop() { this.app.ticker.add(() => this.update()); }

    update() {
        if (!this.currentAnimation || this.isDragging) return;
        switch (this.state) {
            case 'walking': this.updateWalking(); break;
            case 'idle': this.updateIdle(); break;
            case 'bouncing': this.updateBouncing(); break;
        }
    }

    updateWalking() {
        this.currentAnimation.x += this.speed * this.direction;
        const b = this.bounds();
        if (this.currentAnimation.x >= b.right && this.direction === 1) {
            this.direction = -1; this.currentAnimation.x = b.right; this.switchTo(this.walkingLeft);
        } else if (this.currentAnimation.x <= b.left && this.direction === -1) {
            this.direction = 1; this.currentAnimation.x = b.left; this.switchTo(this.walkingRight);
        }
        if (--this.idleTimer <= 0) { // enter idle
            this.state = 'idle';
            this.switchTo(this.direction === 1 ? this.idleRight : this.idleLeft);
        }
    }

    updateIdle() {
        if (--this.idleDuration <= 0) {
            this.state = 'walking';
            this.switchTo(this.direction === 1 ? this.walkingRight : this.walkingLeft);
            this.setRandomIdleTimer();
        }
    }

    updateBouncing() {
        this.vel.y += this.gravity;
        this.currentAnimation.x += this.vel.x;
        this.currentAnimation.y += this.vel.y;
        const b = this.bounds();
        // horizontal
        if (this.currentAnimation.x < b.left) { this.currentAnimation.x = b.left; this.vel.x = -this.vel.x * this.bounceEnergy; }
        else if (this.currentAnimation.x > b.right) { this.currentAnimation.x = b.right; this.vel.x = -this.vel.x * this.bounceEnergy; }
        // vertical
        if (this.currentAnimation.y < b.top) { this.currentAnimation.y = b.top; this.vel.y = -this.vel.y * this.bounceEnergy; }
        else if (this.currentAnimation.y > b.bottom) { this.currentAnimation.y = b.bottom; this.vel.y = -this.vel.y * this.bounceEnergy; }
        this.vel.x *= this.friction;
        this.vel.y *= this.friction;
        if (Math.abs(this.vel.x) < 0.2 && Math.abs(this.vel.y) < 0.2) {
            this.state = 'walking';
            this.currentAnimation.y = (b.top + b.bottom) / 2; // reset height path
            this.switchTo(this.direction === 1 ? this.walkingRight : this.walkingLeft);
            this.setRandomIdleTimer();
            this.debug('Bounce settled');
        }
    }
}

// Boot
window.addEventListener('load', () => {
    if (!window.PIXI) { console.error('PIXI not loaded'); return; }
    new WalkingKnight();
});