class Smoothie {
  constructor(
    options = {
      renderingEngine: PIXI,       //The rendering engine (Pixi)
      renderer: undefined,         //The Pixi renderer you created in your application
      rootContainer: undefined,    //The root Pixi display object (usually the `stage`)
      updateFunction: undefined,   //A logic function that should be called every frame of the game loop
      propertiesToInterpolate: [], //An array of properties that should be interpolated: "position", "rotation", "scale", "size", "alpha"
      interpolate: true,           //A Boolean to turn interpolation on or off
      fps: 60                      //The frame rate at which sprites should be rendered
    }
  ) {
    if (options.renderingEngine === undefined) throw new Error("Please assign a rendering engine as Smoothie's renderingEngine option"); 

    //Find out which rendering engine is being used (the default is Pixi)
    this.renderingEngine = "";

    //If the `renderingEngine` is Pixi, set up Pixi object aliases
    if (options.renderingEngine.ParticleContainer && options.renderingEngine.Sprite) {
      this.renderingEngine = "pixi";
    }

    //Check to make sure the user had supplied a renderer. If you're
    //using Pixi, this should be the instantiated `renderer` object
    //that you created in your main application
    if (options.renderer === undefined) {
      throw new Error("Please assign a renderer object as Smoothie's renderer option");
    } else {
      this.renderer = options.renderer;
    }


    //Check to make sure the user has supplied a root container. This
    //is the object is at the top of the display list heirarchy. If
    //you're using Pixi, it would be a `Container` object, often by
    //convention called the `stage`
    if (options.rootContainer === undefined) {
      throw new Error("Please assign a root container object (the stage) as Smoothie's rootContainer option");
    } else {
      this.stage = options.rootContainer;
    }

    if (options.updateFunction === undefined) {
      throw new Error("Please assign a function that you want to update on each frame as Smoothie's updateFunction option");
    } else {
      this.updateFunction = options.updateFunction;
    }

    if (options.propertiesToInterpolate === undefined) {
      this.propertiesToInterpolate = new Set(["position", "rotation"]); 
    } else {
      this.propertiesToInterpolate = new Set(options.propertiesToInterpolate);
    }

    //The upper-limit frames per second that the game should run at.
    //Smoothie defaults to 60 fps.
    if (options.fps !== undefined) {
      this._fps = options.fps;
    } else {
      this._fps = 60;
    }

    //Set sprite rendering position interpolation to
    //`true` by default
    if (options.interpolate === false) {
      this.interpolate = false;
    } else {
      this.interpolate = true;
    }

    //A variable that can be used to pause and play Smoothie 
    this.paused = false;

    //Private properties used to set the frame rate and figure out the interpolation values
    this._startTime = Date.now();
    this._frameDuration = 1000 / this._fps;
    this._lag = 0;
  }

  get fps() {return this._fps;}
  set fps(value) {
    this._fps = value;
    this._frameDuration = 1000 / this._fps;
  }

  start() {
  
    //Start the game loop
    this.gameLoop();
  }

  gameLoop() {
    requestAnimationFrame(this.gameLoop.bind(this));

    if (this.fps === undefined) {

      //Run the user-defined game logic function each frame of the
      //game.
      this.updateFunction();
      this.render();
    }

    //If `fps` has been set, clamp the frame rate to that upper limit.
    else {

      //Calculate the time that has elapsed since the last frame
      let current = Date.now(),
          elapsed = current - this._startTime;

      if (elapsed > 1000) elapsed = this._frameDuration;

      //For interpolation:
      this._startTime = current;

      //Add the elapsed time to the lag counter
      this._lag += elapsed;

      //Update the frame if the lag counter is greater than or
      //equal to the frame duration
      while (this._lag >= this._frameDuration){

        //Capture the sprites' previous positions for rendering
        //interpolation
        this.capturePreviousSpriteProperties();

        //Update the logic in the user-defined update function
        this.updateFunction();

        //Reduce the lag counter by the frame duration
        this._lag -= this._frameDuration;
      }

      //Calculate the lag offset and use it to render the sprites
      let lagOffset = this._lag / this._frameDuration;
      this.render(lagOffset);
    }

  }

  //`capturePreviousSpritePositions`
  //This function is run in the game loop just before the logic update
  //to store all the sprites' previous positions from the last frame.
  //It allows the render function to interpolate the sprite positions
  //for ultra-smooth sprite rendering at any frame rate
  capturePreviousSpriteProperties() {
    
    //A function that capture's the sprites properties
    let setProperties = (sprite) => {
      if(this.propertiesToInterpolate.has("position")) {
        sprite._previousX = sprite.x;
        sprite._previousY = sprite.y;
      }
      if(this.propertiesToInterpolate.has("rotation")) {
        sprite._previousRotation = sprite.rotation;
      }
      if(this.propertiesToInterpolate.has("size")) {
        sprite._previousWidth = sprite.width;
        sprite._previousHeight = sprite.height;
      }
      if(this.propertiesToInterpolate.has("scale")) {
        sprite._previousScaleX = sprite.scale.x;
        sprite._previousScaleY = sprite.scale.y;
      }
      if(this.propertiesToInterpolate.has("alpha")) {
        sprite._previousAlpha = sprite.alpha;
      }

      if (sprite.children && sprite.children.length > 0) {
        for (let i = 0; i < sprite.children.length; i++) {
          let child = sprite.children[i];
          setProperties(child);
        } 
      }
    };

    //loop through the all the sprites and capture their properties
    for (let i = 0; i < this.stage.children.length; i++) {
      let sprite = this.stage.children[i];
      setProperties(sprite);
    } 
  }  

  //Smoothie's `render` method will interpolate the sprite positions and
  //rotation for
  //ultra-smooth animation, if Hexi's `interpolate` property is `true`
  //(it is by default)
  render(lagOffset = 1) {

    //Calculate the sprites' interpolated render positions if
    //`this.interpolate` is `true` (It is true by default)

    if (this.interpolate) {

      //A recursive function that does the work of figuring out the
      //interpolated positions
      let interpolateSprite = (sprite) => {


        //Position (`x` and `y` properties)
        if(this.propertiesToInterpolate.has("position")) {

          //Capture the sprite's current x and y positions
          sprite._currentX = sprite.x;
          sprite._currentY = sprite.y;

          //Figure out its interpolated positions
          if (sprite._previousX !== undefined) {
            sprite.x = (sprite.x - sprite._previousX) * lagOffset + sprite._previousX;
          }
          if (sprite._previousY !== undefined) {
            sprite.y = (sprite.y - sprite._previousY) * lagOffset + sprite._previousY;
          }
        }

        //Rotation (`rotation` property)
        if(this.propertiesToInterpolate.has("rotation")) {

          //Capture the sprite's current rotation
          sprite._currentRotation = sprite.rotation;

          //Figure out its interpolated rotation
          if (sprite._previousRotation !== undefined) {
            sprite.rotation = (sprite.rotation - sprite._previousRotation) * lagOffset + sprite._previousRotation;
          }
        } 

        //Size (`width` and `height` properties)
        if(this.propertiesToInterpolate.has("size")) {

          //Capture the sprite's current size
          sprite._currentWidth = sprite.width;
          sprite._currentHeight = sprite.height;

          //Figure out the sprite's interpolated size
          if (sprite._previousWidth !== undefined) {
            sprite.width = (sprite.width - sprite._previousWidth) * lagOffset + sprite._previousWidth;
          }
          if (sprite._previousHeight !== undefined) {
            sprite.height = (sprite.height - sprite._previousHeight) * lagOffset + sprite._previousHeight;
          }
        }

        //Scale (`scale.x` and `scale.y` properties)
        if(this.propertiesToInterpolate.has("scale")) {
          
          //Capture the sprite's current scale
          sprite._currentScaleX = sprite.scale.x;
          sprite._currentScaleY = sprite.scale.y;

          //Figure out the sprite's interpolated scale
          if (sprite._previousScaleX !== undefined) {
            sprite.scale.x = (sprite.scale.x - sprite._previousScaleX) * lagOffset + sprite._previousScaleX;
          }
          if (sprite._previousScaleY !== undefined) {
            sprite.scale.y = (sprite.scale.y - sprite._previousScaleY) * lagOffset + sprite._previousScaleY;
          }
        }

        //Alpha (`alpha` property)
        if(this.propertiesToInterpolate.has("alpha")) {

          //Capture the sprite's current alpha
          sprite._currentAlpha = sprite.alpha;

          //Figure out its interpolated alpha
          if (sprite._previousAlpha !== undefined) {
            sprite.alpha = (sprite.alpha - sprite._previousAlpha) * lagOffset + sprite._previousAlpha;
          }
        } 
        
        //Interpolate the sprite's children, if it has any
        if (sprite.children.length !== 0) {
          for (let j = 0; j < sprite.children.length; j++) {

            //Find the sprite's child
            let child = sprite.children[j];

            //display the child
            interpolateSprite(child);
          }
        }
      };
      
      //loop through the all the sprites and interpolate them
      for (let i = 0; i < this.stage.children.length; i++) {
        let sprite = this.stage.children[i];
        interpolateSprite(sprite);
      } 
    }

    //Render the stage. If the sprite positions have been
    //interpolated, those position values will be used to render the
    //sprite
    this.renderer.render(this.stage);

    //Restore the sprites' original x and y values if they've been
    //interpolated for this frame
    if (this.interpolate) {

      //A recursive function that restores the sprite's original,
      //uninterpolated x and y positions
      let restoreSpriteProperties = (sprite) => {
        if(this.propertiesToInterpolate.has("position")) {
          sprite.x = sprite._currentX;
          sprite.y = sprite._currentY;
        }
        if(this.propertiesToInterpolate.has("rotation")) {
          sprite.rotation = sprite._currentRotation;
        }
        if(this.propertiesToInterpolate.has("size")) {
          sprite.width = sprite._currentWidth;
          sprite.height = sprite._currentHeight;
        }
        if(this.propertiesToInterpolate.has("scale")) {
          sprite.scale.x = sprite._currentScaleX;
          sprite.scale.y = sprite._currentScaleY;
        }
        if(this.propertiesToInterpolate.has("alpha")) {
          sprite.alpha = sprite._currentAlpha;
        }

        //Restore the sprite's children, if it has any
        if (sprite.children.length !== 0) {
          for (let i = 0; i < sprite.children.length; i++) {

            //Find the sprite's child
            let child = sprite.children[i];

            //display the child
            restoreSpriteProperties(child);
          }
        }
      };
      for (let i = 0; i < this.stage.children.length; i++) {
        let sprite = this.stage.children[i];
        restoreSpriteProperties(sprite);
      }
    }
  }  
}
