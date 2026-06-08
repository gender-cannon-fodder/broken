# broken

my entire life is broken at this point.

except for this! i got a really cool idea, let me check... December of last year, no way?! damn, time is properly compressed in such a prison of a country. nonetheless,

the reason that it is a bullet hell is that... i want to play a bullet hell, with some specifics. or in other words, all bullet hells *you* made so far are garbage. but! the reason **you** should care about it is the new and never seen before (as far as i could see, at least!) geometry of space. i credit Claude AI for helping me discover such a system. let this be the final proof that i am properly the god of game design, not like that needs a proof, not like this proof accomplishes a thing. i wanted all of us as gods, you know..?

gah, fucking metaphysics. basically, the key idea is a sphere. you play upon a sphere. "wow, how original", you say, "Spore did it. Dyson Sphere as well. and many other games". but no.

**we break the sphere in half.**

and everything exists in two positions. or, in other words, you only need a single half of the entire sphere to store the state of our entire world.

3Blue1Brown might also need some credit, as the visual of squishing spheres to circles was installed in me through one of those cool videos.

## but why?!

a few constrains had bugged me for a long, long time.

1. we must keep the player in the center of our view at every moment. shmups do suffer from this issue. not to mention quite how awkward being in the corner is, especially when otherwise the game demands that you imagine flying through an endless space or air. the biggest issue is the way it breaks the mouse (hey Nova Drift!) as flying in the corner is incredibly unpleasant. (basically if you are bottom left, the total count of pixels which would let you move in that direction is *much* smaller than the count that lets you move towards the center.)

2. we must ensure the world is visible completely at all times. now this is what i truly like about a smhup, and hate about an FPS or a top down. in a top down it ends up being endless offscreen battles (hey Starblast!), and in an FPS it means that you can always die to enemies that were behind you, which... i mean, i guess some people do enjoy that..? TF2 is pretty popular, it seems. well, let them have their fun. we are way more refined here.

those alone are solved by simple wrapping. simply Nova Drift but glue the camera to your cool ship. which...

works, but there are other issues and constraints.

3. a solution which would fit itself to the dimensions of the screen is rather ugly, as the game will play a little different depending on the hardware and the ratio.

4. ...corners make a square, and you could certainly insist to use a square to solve that issue. even then, there is a little something... off. it is the same complaint one has when playing Chess or any other game where grids are hip and square. (hey CGP!) **diagonals!** they are too long!

and then some extra pondering, and here we are. we take a sphere, we use it as the battlefield, we mirror all positions to the other side so that we only need to see a single side, and there is all the magic. one suspects the engine will be known as `venus`, as suggested by ChatGPT.


