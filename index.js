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
  server.post('/clear', function(request, response) {
    board.clear();
    response.send();
  });

  server.post('/test', function(request, response) {
    board.test();
    response.send();
  });

  server.post('/info', 
    function(request, response) {
      board.getFirmwareInfo(
        function(reply){
          response.send(reply);
        }
      );
    }
  );

server.post('/version', 
    function(request, response) {
      board.getFirmwareVersion(
        function(reply){
          response.send(reply);
        }
      );
    }
  );

  server.post('/update', function(request, response) {
    request.body.commands.forEach(function(command) {
      if (command.command === 'set') {
        board.writePixel(command.index, command);
      } else if (command.command === 'fade') {
        board.fadePixel(
          command.index,
          command.from,
          command.to,
          command.duration
        );
      }
    });
    response.send();
  });
}


server.use(express.bodyParser());
server.use(express.static('public'));
server.listen(80);


