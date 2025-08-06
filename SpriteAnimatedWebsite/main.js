 const app = new PIXI.Application({
    width: window.innerWidth,
    height: 150,
    transparent: true,             // let the hero BG show through
    resolution: window.devicePixelRatio || 1,
  });
  document.getElementById('pixi-container')
          .appendChild(app.view);

  // Load just the PNG image directly for testing
  PIXI.Assets.load('Assets/Sprites/GreenKnight.png')
    .then(setup)
    .catch((error) => {
      console.error('Loading error:', error);
    });


function setup(texture) {
  console.log('Setup function called');
  console.log('Texture:', texture);
  
  // Create a simple sprite from the texture
  const pet = new PIXI.Sprite(texture);
  pet.anchor.set(0.5, 1);         // center bottom
  pet.x = 100;                    // start X
  pet.y = app.renderer.height;    // ground level
  pet.vx = 1;                     // pixels/frame

  console.log('Pet created:', pet);
  console.log('Pet position:', pet.x, pet.y);
  console.log('App renderer size:', app.renderer.width, app.renderer.height);

  // Interactivity flags
  pet.interactive = true;
  pet.buttonMode = true;

  // Drag logic
  pet
    .on('pointerdown', onDragStart)
    .on('pointerup',   onDragEnd)
    .on('pointerupoutside', onDragEnd)
    .on('pointermove', onDragMove);

  app.stage.addChild(pet);
  console.log('Pet added to stage. Stage children:', app.stage.children.length);

  // main loop: walk back and forth when not dragging
  app.ticker.add(() => {
    if (!pet.dragging) {
      pet.x += pet.vx;
      // bounce at edges
      if (pet.x < 0 || pet.x > app.renderer.width) {
        pet.vx *= -1;
        pet.scale.x *= -1;      // flip horizontally
      }
    }
  });

  // DRAG HANDLERS
  function onDragStart(event) {
    pet.data = event.data;
    pet.dragging = true;
    pet.vx = 0;
  }

  function onDragMove() {
    if (pet.dragging) {
      const newPos = pet.data.getLocalPosition(pet.parent);
      pet.x = newPos.x;
      pet.y = newPos.y;
    }
  }

  function onDragEnd() {
    pet.dragging = false;
    pet.data = null;
  }
}