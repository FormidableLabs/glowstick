// Many thanks to Ben for creating this!
// https://github.com/casiotone

var bounds = [7,6];
var puck = [2,3];
var velocity = [1, 1];
var direction = [1, 1];
var paddles = [3,3];

function gameloop(){
  movePuck();
  movePaddles();
  draw();
}

function movePuck(){
  if(puck[0] >= bounds[0] - 1 || puck[0] <= 1){
    direction[0] *= -1;
  }
  if(puck[1] >= bounds[1] - 1 || puck[1] <= 1){
    direction[1] *= -1;
  }

  puck[0] += velocity[0] * direction[0];
  puck[1] += velocity[1] * direction[1];
}

function movePaddles(){
  // Only move the paddle if the puck is on that paddle's side of the board
  if(puck[0] >= 4){
    paddles[1] = puck[1];
  } else {
    paddles[0] = puck[1];
  }
}

function draw(){
  drawPuck();
  drawLeftPaddle();
  drawRightPaddle();
}

function drawPuck(){
  board.at(puck[0], puck[1]).fade('white', 'black', 500);
}

function drawLeftPaddle(){
  var x = 0;
  var y = paddles[0];
  drawPaddle(x, y, 'blue');
}

function drawRightPaddle(){
  var x = bounds[0];
  var y = paddles[1];
  drawPaddle(x, y, 'red');
}

function drawPaddle(x, y, color){
  var pixels = board.at(x, y);

  // Don't draw beyond bounds
  if(y - 1 >= 0){
    pixels.add(board.at(x, y - 1));
  }
  if(y + 1 <= bounds[1]){
    pixels.add(board.at(x, y + 1));
  }

  // Draw
  pixels.fade(color, 'black', 500);
}

function pong() {
  setInterval(gameloop, 300);
}