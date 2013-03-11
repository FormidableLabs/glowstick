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

function cleanInputColor(color) {
  return Math.max(0, Math.min(254, parseInt(color, 10)));
}

function initBoard(board) {
  server.post('/clear', function(request, response) {
    board.clear();
    response.send();
  });

  server.post('/update', function(request, response) {
    request.body.commands.forEach(function(command) {
      if (command.command === 'set') {
        board.writePixel(command.index, [cleanInputColor(command.r), cleanInputColor(command.g), cleanInputColor(command.b)]);
      } else if (command.command === 'fade') {
        board.fadePixel(
          command.index,
          [cleanInputColor(command.from.r), cleanInputColor(command.from.g), cleanInputColor(command.from.b)],
          [cleanInputColor(command.to.r), cleanInputColor(command.to.g), cleanInputColor(command.to.b)],
          command.duration
        );
      }
    });
    response.send();
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
    board.clear(function() {
      //setInterval(function() {
      //  board.fadePixel(Math.floor(Math.random() * 64), [0, 0, 0], [254, 254, 254], 2000);
      //}, 33);
    });
  });
}

server.use(express.bodyParser());
server.use(express.static('public'));
server.listen(8015);


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


