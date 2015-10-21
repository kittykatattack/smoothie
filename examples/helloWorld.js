//First, Create a Pixi renderer and stage
var renderer = PIXI.autoDetectRenderer(512, 512);
document.body.appendChild(renderer.view);
var stage = new PIXI.Container();

//Next, create a new instance of Smoothie
var smoothie = new Smoothie({
  engine: PIXI, 
  renderer: renderer,
  root: stage,
  update: update.bind(this),
  fps: 30,
});

/*
Here's what those options above mean:
- `renderingEngine`: the PIXI global object.
- `renderer`: The `renderer` object you created using Pixi's `autoDetectRenderer`
- `root`: The `stage` Container object at the top of Pixi's sprite display list heirarchy
- `updateFunction`: A function, containing your game or application logic, that you want to run in a loop. 
In this example it's the function caled `update` that you'll see ahead in this file. 
Importantly, use `bind(this)` to bind the function to the current application scope.
- `fps`: The frames-per-second that you want your animation to run at. The default is 60.

There are other options you could supply:
- `properties`: An object that defines 5 Boolean sprite properties for which you want 
smooth animation: `position`, `rotation`, `scale`, `size`, `alpha`. 
Set them to `true` to turn them on, and `false` to turn them off. If you leave the `properties` option out, 
Smoothie will automatically give you smooth animation for position and rotation.
- `interpolate`: A Boolean (true/false) value that determines whether animation smoothing (interpolation) should be on or off.
*/

//Load any assets you might need and call the `setup` function when
//they've finished loading
PIXI.loader
  .add("images/cat.png")
  .load(setup);

//Define any variables used in more than one function
var cat;

//The `setup` function will run when the loader has finished loading the image
function setup() {

  //Create the cat sprite and add it to the stage
  cat = new PIXI.Sprite(PIXI.loader.resources["images/cat.png"].texture);
  stage.addChild(cat);

  //After everything is set up, start Smoothie by calling its `start`
  //method.
  smoothie.start();
}

//All your game or application logic goes in this `update` function
//that you've supplied to Smoothie when you instantiated it above. Smoothie will run this
//`update` function in loop at
//whatever fps (frames-per-second) you've defined.

function update() {

  //Use any physics or game logic code here
  cat.x += 1;
  cat.y += 1;

  //You can change Smoothie's `fps` at any time, like this:
  //smoothie.fps = 12;
  //You can turn interpolation (animation smoothing) on or off at any
  //time using Smoothie's `interpolate` Boolean property, like this:
  //smoothie.interpolate = false;
}
