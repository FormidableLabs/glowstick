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
      } else if (command.command === 'rainbow') {
        board.rainbowPixel(
          command.index,
          command.duration
        );
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

  startup(board);
}

function startup(board, next) {
  var yellw = [241, 220, 63],
    black = [50, 51, 48];

  var jsLogo = [
    yellw, yellw, yellw, yellw, yellw, yellw, yellw, yellw,
    yellw, yellw, yellw, yellw, yellw, yellw, yellw, yellw,
    yellw, yellw, yellw, yellw, yellw, yellw, yellw, yellw,
    yellw, black, black, black, yellw, black, black, black,
    yellw, yellw, black, yellw, yellw, black, yellw, yellw,
    yellw, yellw, black, yellw, yellw, black, black, black,
    yellw, yellw, black, yellw, yellw, yellw, yellw, black,
    yellw, black, black, yellw, yellw, black, black, black
  ];

  board.writeFrame(jsLogo, function(){
    setTimeout(function() {
      board.clear();
      if (next) {
        next();
      }
    }, 7000);
  });
}

server.use(express.bodyParser());
server.use(express.static('public'));
server.listen(8015);


