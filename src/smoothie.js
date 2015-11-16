class Smoothie {
  constructor(
    options = {
      engine: PIXI,                //The rendering engine (Pixi)
      renderer: undefined,         //The Pixi renderer you created in your application
      root: undefined,             //The root Pixi display object (usually the `stage`)
      update: undefined,           //A logic function that should be called every frame of the game loop
      interpolate: true,           //A Boolean to turn interpolation on or off
      fps: 60,                     //The frame rate at which the application's looping logic function should update
      renderFps: undefined,        //The frame rate at which sprites should be rendered
      properties: {                //Sprite roperties that should be interpolated
        position: true,
        rotation: true,
        size: false,
        scale: false,
        alpha: false,
        tile: false                //Refers to `tileposition` and `tileScale` x and y properties
      }              
    }
  ) {
    if (options.engine === undefined) throw new Error("Please assign a rendering engine as Smoothie's engine option"); 

    //Find out which rendering engine is being used (the default is Pixi)
    this.engine = "";

    //If the `renderingEngine` is Pixi, set up Pixi object aliases
    if (options.engine.ParticleContainer && options.engine.Sprite) {
      this.renderingEngine = "pixi";
      this.Container = options.engine.Container;
      this.Sprite = options.engine.Sprite;
      this.MovieClip = options.engine.extras.MovieClip;
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
    if (options.root === undefined) {
      throw new Error("Please assign a root container object (the stage) as Smoothie's rootr option");
    } else {
      this.stage = options.root;
    }

    if (options.update === undefined) {
      throw new Error("Please assign a function that you want to update on each frame as Smoothie's update option");
    } else {
      this.update = options.update;
    }

    //Define the sprite properties that should be interpolated
    if(options.properties === undefined) {
      this.properties = {position: true, rotation: true};
    } else {
      this.properties = options.properties;
    }

    //The upper-limit frames per second that the game' logic update
    //function should run at.
    //Smoothie defaults to 60 fps.
    if (options.fps !== undefined) {
      this._fps = options.fps;
    } else {
      this._fps = undefined;
    }

    //Optionally Clamp the upper-limit frame rate at which sprites should render
    if (options.renderFps !== undefined) {
      this._renderFps = options.renderFps;
    } else {
      this._renderFps = undefined;
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
    this._lagOffset = 0;

    this._renderStartTime = 0;
    if (this._renderFps !== undefined) {
      this._renderDuration = 1000 / this._renderFps;
    }
  }

  //Getters and setters

  //Fps
  get fps() {return this._fps;}
  set fps(value) {
    this._fps = value;
    this._frameDuration = 1000 / this._fps;
  }
 
  //renderFps
  get renderFps() {return this._renderFps;}
  set renderFps(value) {
    this._renderFps = value;
    this._renderDuration = 1000 / this._renderFps;
  }

  //`dt` (Delta time, the `this._lagOffset` value in Smoothie's code)
  get dt() {return this._lagOffset;}

  //Methods to pause and resume Smoothie
  pause() {
    this.paused = true;
  }
  resume() {
    this.paused = false;
  }

  //The `start` method gets Smoothie's game loop running
  start() {
  
    //Start the game loop
    this.gameLoop();
  }

  //The core game loop
  gameLoop(timestamp) {
    requestAnimationFrame(this.gameLoop.bind(this));

    //Only run if Smoothie isn't paused
    if (!this.paused) {

      //The `interpolate` function updates the logic function at the
      //same rate as the user-defined fps, renders the sprites, with
      //interpolation, at the maximum frame rate the system is capbale
      //of

      let interpolate = () => {

        //Calculate the time that has elapsed since the last frame
        let current = Date.now(),
            elapsed = current - this._startTime;

        //Catch any unexpectedly large frame rate spikes
        if (elapsed > 1000) elapsed = this._frameDuration;

        //For interpolation:
        this._startTime = current;

        //Add the elapsed time to the lag counter
        this._lag += elapsed;

        //Update the frame if the lag counter is greater than or
        //equal to the frame duration
        while (this._lag >= this._frameDuration){

          //Capture the sprites' previous properties for rendering
          //interpolation
          this.capturePreviousSpriteProperties();

          //Update the logic in the user-defined update function
          this.update();

          //Reduce the lag counter by the frame duration
          this._lag -= this._frameDuration;
        }

        //Calculate the lag offset and use it to render the sprites
        this._lagOffset = this._lag / this._frameDuration;
        this.render(this._lagOffset);
      };

      //If the `fps` hasn't been defined, call the user-defined update 
      //function and render the sprites at the maximum rate the 
      //system is capable of
      if (this._fps === undefined) {

        //Run the user-defined game logic function each frame of the
        //game at the maxium frame rate your system is capable of
        this.update();
        this.render();
      } else {
        if (this._renderFps === undefined){
          interpolate();
        } else {

          //Implement optional frame rate rendering clamping
          if(timestamp >= this._renderStartTime) {
            
            //Update the current logic frame and render with
            //interpolation
            interpolate();

            //Reset the frame render start time
            this._renderStartTime = timestamp + this._renderDuration;
          }
        }
      }
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
      if(this.properties.position) {
        sprite._previousX = sprite.x;
        sprite._previousY = sprite.y;
      }
      if(this.properties.rotation) {
        sprite._previousRotation = sprite.rotation;
      }
      if(this.properties.size) {
        sprite._previousWidth = sprite.width;
        sprite._previousHeight = sprite.height;
      }
      if(this.properties.scale) {
        sprite._previousScaleX = sprite.scale.x;
        sprite._previousScaleY = sprite.scale.y;
      }
      if(this.properties.alpha) {
        sprite._previousAlpha = sprite.alpha;
      }
      if(this.properties.tile) {
        if (sprite.tilePosition !== undefined) {
          sprite._previousTilePositionX = sprite.tilePosition.x;
          sprite._previousTilePositionY = sprite.tilePosition.y;
        }
        if (sprite.tileScale !== undefined) {
          sprite._previousTileScaleX = sprite.tileScale.x;
          sprite._previousTileScaleY = sprite.tileScale.y;
        } 
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
        if(this.properties.position) {

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
        if(this.properties.rotation) {

          //Capture the sprite's current rotation
          sprite._currentRotation = sprite.rotation;

          //Figure out its interpolated rotation
          if (sprite._previousRotation !== undefined) {
            sprite.rotation = (sprite.rotation - sprite._previousRotation) * lagOffset + sprite._previousRotation;
          }
        } 

        //Size (`width` and `height` properties)
        if(this.properties.size) {
       
          //Only allow this for Sprites or MovieClips. Because
          //Containers vary in size when the sprites they contain
          //move, the interpolation will cause them to scale erraticly
          if (sprite instanceof this.Sprite || sprite instanceof this.MovieClip)  {

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
        }

        //Scale (`scale.x` and `scale.y` properties)
        if(this.properties.scale) {
          
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
        if(this.properties.alpha) {

          //Capture the sprite's current alpha
          sprite._currentAlpha = sprite.alpha;

          //Figure out its interpolated alpha
          if (sprite._previousAlpha !== undefined) {
            sprite.alpha = (sprite.alpha - sprite._previousAlpha) * lagOffset + sprite._previousAlpha;
          }
        } 

        //Tiling sprite properties (`tileposition` and `tileScale` x
        //and y values)
        if (this.properties.tile) {

          //`tilePosition.x` and `tilePosition.y`
          if (sprite.tilePosition !== undefined) {

            //Capture the sprite's current tile x and y positions
            sprite._currentTilePositionX = sprite.tilePosition.x;
            sprite._currentTilePositionY = sprite.tilePosition.y;

            //Figure out its interpolated positions
            if (sprite._previousTilePositionX !== undefined) {
              sprite.tilePosition.x = (sprite.tilePosition.x - sprite._previousTilePositionX) * lagOffset + sprite._previousTilePositionX;
            }
            if (sprite._previousTilePositionY !== undefined) {
              sprite.tilePosition.y = (sprite.tilePosition.y - sprite._previousTilePositionY) * lagOffset + sprite._previousTilePositionY;
            }
          }

          //`tileScale.x` and `tileScale.y`
          if (sprite.tileScale !== undefined) {

            //Capture the sprite's current tile scale
            sprite._currentTileScaleX = sprite.tileScale.x;
            sprite._currentTileScaleY = sprite.tileScale.y;

            //Figure out the sprite's interpolated scale
            if (sprite._previousTileScaleX !== undefined) {
              sprite.tileScale.x = (sprite.tileScale.x - sprite._previousTileScaleX) * lagOffset + sprite._previousTileScaleX;
            }
            if (sprite._previousTileScaleY !== undefined) {
              sprite.tileScale.y = (sprite.tileScale.y - sprite._previousTileScaleY) * lagOffset + sprite._previousTileScaleY;
            }
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
        if(this.properties.position) {
          sprite.x = sprite._currentX;
          sprite.y = sprite._currentY;
        }
        if(this.properties.rotation) {
          sprite.rotation = sprite._currentRotation;
        }
        if(this.properties.size) {

          //Only allow this for Sprites or Movie clips, to prevent
          //Container scaling bug
          if (sprite instanceof this.Sprite || sprite instanceof this.MovieClip)  {
            sprite.width = sprite._currentWidth;
            sprite.height = sprite._currentHeight;
          }
        }
        if(this.properties.scale) {
          sprite.scale.x = sprite._currentScaleX;
          sprite.scale.y = sprite._currentScaleY;
        }
        if(this.properties.alpha) {
          sprite.alpha = sprite._currentAlpha;
        }
        if(this.properties.tile) {
          if (sprite.tilePosition !== undefined) {
            sprite.tilePosition.x = sprite._currentTilePositionX;
            sprite.tilePosition.y = sprite._currentTilePositionY;
          }
          if (sprite.tileScale !== undefined) {
            sprite.tileScale.x = sprite._currentTileScaleX;
            sprite.tileScale.y = sprite._currentTileScaleY;
          }
        }

        //Restore the sprite's children, if it has any
        if (sprite.children.length !== 0) {
          for (let i = 0; i < sprite.children.length; i++) {

            //Find the sprite's child
            let child = sprite.children[i];

            //Restore the child sprite properties
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
