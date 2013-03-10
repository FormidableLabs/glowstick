var express = require('express'),
    fs = require('fs'),
    _ = require('underscore'),
    transport = require('./src/transport.js'),
    server = express();

var boards = transport.list();
if (!boards.length) {
  throw new Error('No boards connected.');
}

boards.forEach(function(fd) {
  var board = new transport(fd, function() {
    initBoard(board);
  });
});

function initBoard(board) {
  server.post('/update', function(request, response) {
    request.body.commands.forEach(function(command) {
      board.writePixel(command.index, [command.r, command.g, command.b]);
    });
  });


  var color = 254;
  var frame = _.range(0, 64).map(function(i) {
    if (i < 16) {
      return [color, color, 0];
    } else if (i < 32) {
      return [color, 0, color];
    } else if (i < 48) {
      return [0, color, color];
    } else {
      return [color, color, color];
    }
  });
  board.writeFrame(frame, function(){
    board.clear();
  });
}

server.use(express.bodyParser());
server.use(express.static('public'));
server.listen(8014);


/*


port.on("open", function () {
  console.log('open');
  port.on('data', function(data) {
    console.log('data received: ' + data);
  });
  port.write([255, 2, 0, 50, 254, 254, 254], function(err, results) {
    console.log(err);
    console.log(results);
  });
});
*/

/*

  [255, 10] = kill the board
  [255, 20] = test sequence
  [255, 1, 0, pixelNum, r, g, b, r, g, r, g, b ...] (rgb * 16), set 16 pixels
  [255, 2, 0, pixelNum, r, g, b] = set a pixel

*/


