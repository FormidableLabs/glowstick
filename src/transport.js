var fs = require('fs'),
    SerialPort = require("serialport"),
    _ = require('underscore'),
    async = require('async');

// LEDs are in a snake starting in lower corner
// we address 0 - 63 starting at top left
var translationMatrix = [
  56, 57, 58, 59, 60, 61, 62, 63,
  55, 54, 53, 52, 51, 50, 49, 48,
  40, 41, 42, 43, 44, 45, 46, 47,
  39, 38, 37, 36, 35, 34, 33, 32,
  24, 25, 26, 27, 28, 29, 30, 31,
  23, 22, 21, 20, 19, 18, 17, 16,
   8,  9, 10, 11, 12, 13, 14, 15,
   7,  6,  5,  4,  3,  2,  1,  0
];

function BoardTransport(fd, callback) {
  this.port = new SerialPort.SerialPort(fd, {
    baudrate: 115200
  });
  this.port.on('open', callback);
}

// add a delay of 33ms (1000ms / 33ms === 30fps)
function wrapCallback(callback) {
  return function() {
    setTimeout(callback || function() {}, 33);
  }
}

BoardTransport.prototype.writeFrame = function(pixels, complete) {
  var port = this.port;
  var translatedPixels = [];
  pixels.forEach(function(pixel, i) {
    translatedPixels[translationMatrix[i]] = pixel;
  });
  async.series([
    function(next) {
      var commandFrame = [255, 1, 0, 0];
      for (var i = 0; i < 16; ++i) {
        commandFrame.push(translatedPixels[i][0], translatedPixels[i][1], translatedPixels[i][2]);
      }
      port.write(commandFrame, next);
    },
    function(next) {
      var commandFrame = [255, 1, 0, 16];
      for (var i = 16; i < 32; ++i) {
        commandFrame.push(translatedPixels[i][0], translatedPixels[i][1], translatedPixels[i][2]);
      }
      port.write(commandFrame, next);
    },
    function(next) {
      var commandFrame = [255, 1, 0, 32];
      for (var i = 32; i < 48; ++i) {
        commandFrame.push(translatedPixels[i][0], translatedPixels[i][1], translatedPixels[i][2]);
      }
      port.write(commandFrame, next);
    },
    function(next) {
      var commandFrame = [255, 1, 0, 48];
      for (var i = 48; i < 64; ++i) {
        commandFrame.push(translatedPixels[i][0], translatedPixels[i][1], translatedPixels[i][2]);
      }
      port.write(commandFrame, next);
    }    
  ], wrapCallback(complete));
};

BoardTransport.prototype.writePixel = function(index, color, complete) {
  this.port.write([255, 2, 0, translationMatrix[index]].concat(color), complete);
};

BoardTransport.prototype.clear = function(callback) {
  this.port.write([255, 10], wrapCallback(callback));
};

BoardTransport.prototype.test = function(callback) {
  this.port.write([255, 20], wrapCallback(callback));
};

BoardTransport.list = function() {
  var boardPointers = [];
  fs.readdirSync('/dev/').forEach(function(file) {
    if (file.match(/^tty.usbmodem/)) {
      boardPointers.push('/dev/' + file);
    }
  });
  return boardPointers;
};

module.exports = BoardTransport;