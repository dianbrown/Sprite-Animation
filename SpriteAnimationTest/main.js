// PixiJS Sprite Animation - Walking Knight (Updated for PixiJS v7)
class WalkingKnight {
    constructor() {
        this.app = null;
        this.knight = null;
        this.walkingRight = null;
        this.walkingLeft = null;
        this.currentAnimation = null;
        this.direction = 1; // 1 for right, -1 for left
        this.speed = 0.8; // Slower movement speed
        this.scale = 4; // Make the sprite bigger
        
        this.debug('Starting WalkingKnight initialization...');
        this.init();
    }

    debug(message) {
        console.log(message);
        const debugDiv = document.getElementById('debug-info');
        if (debugDiv) {
            debugDiv.innerHTML += message + '<br>';
        }
    }

    async init() {
        try {
            this.debug('Creating PixiJS application...');
            
            // Create the PixiJS application
            this.app = new PIXI.Application({
                width: 1000,
                height: 350,
                backgroundColor: 0x87CEEB, // Sky blue background
                antialias: false, // Keep pixel art crisp
                roundPixels: true, // Ensure pixel-perfect rendering
                resolution: 1 // Use device pixel ratio for crisp rendering
            });

            // Add the canvas to the DOM
            const canvasContainer = document.getElementById('game-canvas');
            if (canvasContainer) {
                canvasContainer.appendChild(this.app.view);
                this.debug('Canvas added to DOM');
            } else {
                this.debug('ERROR: Cannot find game-canvas element');
                return;
            }

            // Load the sprite sheet
            await this.loadAssets();
            this.createAnimations();
            this.setupKnight();
            this.startAnimation();
            
        } catch (error) {
            this.debug('ERROR in init: ' + error.message);
            console.error(error);
        }
    }

    async loadAssets() {
        try {
            this.debug('Loading sprite sheet...');
            
            // Modern PixiJS v7 way to load assets
            PIXI.Assets.add('knight', 'GreenKnight.png');
            const assets = await PIXI.Assets.load(['knight']);
            
            this.debug('Sprite sheet loaded successfully');
            return assets;
            
        } catch (error) {
            this.debug('ERROR loading assets: ' + error.message);
            throw error;
        }
    }

    createAnimations() {
        try {
            this.debug('Creating animations...');
            
            const texture = PIXI.Assets.get('knight');
            if (!texture) {
                this.debug('ERROR: Knight texture not found');
                return;
            }

            this.debug('Texture loaded, creating frames...');
            
            // Create frames for walking right animation (2nd row, 4 frames)
            const walkRightFrames = [];
            for (let i = 0; i < 4; i++) {
                const frame = new PIXI.Texture(
                    texture.baseTexture,
                    new PIXI.Rectangle(i * 32, 32, 32, 32) // 2nd row (y = 32)
                );
                walkRightFrames.push(frame);
            }

            // Create frames for walking left animation (4th row, 4 frames)
            const walkLeftFrames = [];
            for (let i = 0; i < 4; i++) {
                const frame = new PIXI.Texture(
                    texture.baseTexture,
                    new PIXI.Rectangle(i * 32, 96, 32, 32) // 4th row (y = 96)
                );
                walkLeftFrames.push(frame);
            }

            this.debug(`Created ${walkRightFrames.length} right frames and ${walkLeftFrames.length} left frames`);

            // Create animated sprites
            this.walkingRight = new PIXI.AnimatedSprite(walkRightFrames);
            this.walkingLeft = new PIXI.AnimatedSprite(walkLeftFrames);

            // Configure animations
            [this.walkingRight, this.walkingLeft].forEach(animation => {
                animation.anchor.set(0.5);
                animation.scale.set(this.scale);
                animation.animationSpeed = 0.08; // Slightly slower animation
                animation.loop = true;
                animation.visible = false;
                // Ensure pixel-perfect rendering
                animation.roundPixels = true;
                animation.texture.baseTexture.scaleMode = PIXI.SCALE_MODES.NEAREST;
            });
            
            this.debug('Animations created successfully');
            
        } catch (error) {
            this.debug('ERROR creating animations: ' + error.message);
            console.error(error);
        }
    }

    setupKnight() {
        try {
            this.debug('Setting up knight...');
            
            if (!this.walkingRight || !this.walkingLeft) {
                this.debug('ERROR: Animations not created properly');
                return;
            }
            
            // Start with walking right animation
            this.currentAnimation = this.walkingRight;
            this.currentAnimation.visible = true;
            this.currentAnimation.play();

            // Position the knight
            this.currentAnimation.x = 100;
            this.currentAnimation.y = this.app.screen.height / 2;

            // Add to stage
            this.app.stage.addChild(this.walkingRight);
            this.app.stage.addChild(this.walkingLeft);
            
            this.debug(`Knight positioned at (${this.currentAnimation.x}, ${this.currentAnimation.y})`);
            
        } catch (error) {
            this.debug('ERROR setting up knight: ' + error.message);
            console.error(error);
        }
    }

    startAnimation() {
        try {
            this.debug('Starting animation loop...');
            
            // Game loop
            this.app.ticker.add(() => {
                this.update();
            });
            
        } catch (error) {
            this.debug('ERROR starting animation: ' + error.message);
            console.error(error);
        }
    }

    update() {
        if (!this.currentAnimation) return;
        
        // Move the knight
        this.currentAnimation.x += this.speed * this.direction;

        // Check boundaries and switch direction
        const spriteWidth = 32 * this.scale;
        const leftBound = spriteWidth / 2;
        const rightBound = this.app.screen.width - spriteWidth / 2;

        // Debug boundary checking occasionally
        if (Math.random() < 0.01) { // Only log 1% of the time to avoid spam
            this.debug(`Position: ${this.currentAnimation.x.toFixed(1)}, Direction: ${this.direction}, Bounds: ${leftBound}-${rightBound}`);
        }

        if (this.currentAnimation.x >= rightBound && this.direction === 1) {
            // Hit right wall, turn left
            this.direction = -1;
            this.currentAnimation.x = rightBound; // Clamp position to boundary
            this.switchToWalkingLeft();
        } else if (this.currentAnimation.x <= leftBound && this.direction === -1) {
            // Hit left wall, turn right
            this.direction = 1;
            this.currentAnimation.x = leftBound; // Clamp position to boundary
            this.switchToWalkingRight();
        }
    }

    switchToWalkingRight() {
        const currentX = this.currentAnimation ? this.currentAnimation.x : 100;
        const currentY = this.currentAnimation ? this.currentAnimation.y : this.app.screen.height / 2;
        
        if (this.currentAnimation) {
            this.currentAnimation.visible = false;
            this.currentAnimation.stop();
        }
        
        this.currentAnimation = this.walkingRight;
        this.currentAnimation.x = currentX;
        this.currentAnimation.y = currentY;
        this.currentAnimation.visible = true;
        this.currentAnimation.play();
        
        this.debug(`Switched to walking right at position (${currentX}, ${currentY})`);
    }

    switchToWalkingLeft() {
        const currentX = this.currentAnimation ? this.currentAnimation.x : 100;
        const currentY = this.currentAnimation ? this.currentAnimation.y : this.app.screen.height / 2;
        
        if (this.currentAnimation) {
            this.currentAnimation.visible = false;
            this.currentAnimation.stop();
        }
        
        this.currentAnimation = this.walkingLeft;
        this.currentAnimation.x = currentX;
        this.currentAnimation.y = currentY;
        this.currentAnimation.visible = true;
        this.currentAnimation.play();
        
        this.debug(`Switched to walking left at position (${currentX}, ${currentY})`);
    }
}

// Initialize the walking knight when the page loads
window.addEventListener('load', () => {
    console.log('Page loaded, checking PixiJS...');
    
    if (typeof PIXI === 'undefined') {
        console.error('PIXI is not loaded!');
        const debugDiv = document.getElementById('debug-info');
        if (debugDiv) {
            debugDiv.innerHTML = 'ERROR: PixiJS not loaded!';
        }
        return;
    }
    
    console.log('PixiJS version:', PIXI.VERSION);
    new WalkingKnight();
});

// Handle window resize
window.addEventListener('resize', () => {
    // You can add resize logic here if needed
});