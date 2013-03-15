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
  this.buffer = [];
  this.bufferTimeout;
  this.bufferDraining = false;
  this.pixels = _.range(0, 64).map(function(pixel) {
    return [0, 0, 0];
  });
  this.pixelsIntervals = {};
  this.port = new SerialPort.SerialPort(fd, {
    baudrate: 115200
  });
  this.$write = this.port.write;
  this.port.write = _.bind(function(data) {
    console.log(data);
    this.pushBuffer(data);
  }, this);
  this.port.on('open', callback);
}

BoardTransport.prototype.pushBuffer = function(data) {
  this.buffer.push(data);
  if (!this.bufferDraining) {
    this.drainBuffer();
  }
};

BoardTransport.prototype.drainBuffer = function() {
  if (this.buffer.length) {
    this.bufferDraining = true;
    this.$write.call(this.port, this.buffer.pop(), _.bind(function() {
      this.bufferDraining = false;
      this.drainBuffer();
    }, this));
  }
};

/*
BoardTransport.prototype.writeFrame = function(pixels, complete) {
  var port = this.port;
  var translatedPixels = [];
  pixels.forEach(function(pixel, i) {
    if (this.pixelsIntervals[i]) {
      clearInterval(this.pixelsIntervals[i]);
      this.pixels[i] = pixel;
    }
    translatedPixels[translationMatrix[i]] = pixel;
  }, this);
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
*/
BoardTransport.prototype.rainbowPixel = function(index, length, complete) {
  if (this.pixelsIntervals[index]) {
    clearInterval(this.pixelsIntervals[index]);
    clearTimeout(this.pixelsIntervals[index]);
  }
  function rgbFromHue(hue) {
    var h = hue / 60;
    var c = 255;
    var x = (1 - Math.abs(h % 2 - 1)) * 255;
    var color;
    var i = Math.floor(h);
    if (i == 0) color = [c, x, 0];
    else if (i == 1) color = [x, c, 0];
    else if (i == 2) color = [0, c, x];
    else if (i == 3) color = [0, x, c];
    else if (i == 4) color = [x, 0, c];
    else color = [c, 0, x];
    return color;
  }
  var stepSize = 3;
  var timeoutLength = length / (360 / stepSize) 
  var i = 0;
  var step = _.bind(function() {
    i += stepSize;
    var color = rgbFromHue(i);
    this.pixels[i] = color;
    this.port.write([255, 2, 0, translationMatrix[index]].concat(color), complete);
    if (i <= 360) {
      this.pixelsIntervals[i] = setTimeout(step, timeoutLength);
    }
  }, this);
  step();
};

BoardTransport.prototype.fadePixel = function(index, from, to, duration) {
  if (this.pixelsIntervals[index]) {
    clearInterval(this.pixelsIntervals[index]);
    clearTimeout(this.pixelsIntervals[index]);
  }
  var intervalLength = 33,
      steps = duration / intervalLength,
      stepU = 1.0 / steps,
      u = 0.0;
  this.pixelsIntervals[index] = setInterval(_.bind(function() {
    if (u > 1.0) {
      clearInterval(this.pixelsIntervals[index]);
      clearTimeout(this.pixelsIntervals[index]);
      this.pixels[index] = to;
      this.port.write([255, 2, 0, translationMatrix[index]].concat(to));
    }
    var color = [
      Math.max(0, Math.min(254, parseInt(lerp(from[0], to[0], u)))),
      Math.max(0, Math.min(254, parseInt(lerp(from[1], to[1], u)))),
      Math.max(0, Math.min(254, parseInt(lerp(from[2], to[2], u))))
    ];
    this.pixels[index] = color;
    this.port.write([255, 2, 0, translationMatrix[index]].concat(color));
    u += stepU;
  }, this), intervalLength);
};

// linear interpolation between two values a and b
// u controls amount of a/b and is in range [0.0,1.0]
function lerp(a, b, u) {
  return (1 - u) * a + u * b;
};

BoardTransport.prototype.writePixel = function(index, color) {
  if (this.pixelsIntervals[index]) {
    clearInterval(this.pixelsIntervals[index])
  }
  this.pixels[index] = color;
  this.port.write([255, 2, 0, translationMatrix[index]].concat(color));
};

BoardTransport.prototype.clear = function() {
  this.port.write([255, 10]);
};

BoardTransport.prototype.test = function() {
  this.port.write([255, 20]);
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