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

var packetTypes = {
  "PktNop": 0,
  "PktVersionRequest": 1,
  "PktVersionReply": 2,
  "PktInfoRequest": 3,
  "PktInfoReply": 4,
  "PktSelfTestRequest": 5,
  "PktSelfTestReply": 6,
  "PktSetPixelRequest": 7,
  "PktSetScreenRequest": 8
};
	

function BoardTransport(fd, callback) {
  this.buffer = [];
  this.bufferTimeout;
  this.bufferDraining = false;
  this.pixels = _.range(0, 64).map(function(pixel) {
    return [0, 0, 0];
  });
  this.drawInterval;
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

  this.dataCallbacks = {};
  this.port.on( "data", _.bind(function( chunk ) {
    

    if(chunk.length >= 3 && chunk.length == chunk[2]+3){
      var replyPkt = {
        "stx": chunk[0],
        "cmd": chunk[1],
        "data_length": chunk[2],
      };

      if(replyPkt.data_length > 0){
        replyPkt.data = chunk.slice(3, chunk[2]+3);
      }

      console.log(replyPkt);
      if(this.dataCallbacks[replyPkt.cmd] != null){
        this.dataCallbacks[ replyPkt.cmd ]( replyPkt );
      }
    }
    else{
      console.log("length=" + chunk.length + " len=" + chunk[2]);
      console.log(chunk);
    }
  }, this));
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

BoardTransport.prototype.fadePixel = function(index, from, to, duration) {
  var x = (index % 8);
  var y = Math.floor(index / 8);

  if(!this.drawInterval){
    //TODO: Stop draw loop when this.pixelsIntervals[*] are all undefined
    this.drawInterval = setInterval(_.bind(this.drawScreen, this), 33);
  }

  //TODO: clean this up, remove outer most if / else, run hsv/rgb through
  //same code path
  if (this.pixelsIntervals[index]) {
    clearInterval(this.pixelsIntervals[index]);
    clearTimeout(this.pixelsIntervals[index]);
  }

  if (from.r) {
    var intervalLength = 33,
        steps = duration / intervalLength,
        stepU = 1.0 / steps,
        u = 0.0,
        fromArray = rgbArrayFromCommand(from),
        toArray = rgbArrayFromCommand(to);
    this.pixelsIntervals[index] = setInterval(_.bind(function() {
      if (u > 1.0) {
        clearInterval(this.pixelsIntervals[index]);
        clearTimeout(this.pixelsIntervals[index]);
        this.pixels[index] = rgbArrayFromCommand(to);
      }
      else{
        var color = [
          Math.max(0, Math.min(254, parseInt(lerp(fromArray[0], toArray[0], u)))),
          Math.max(0, Math.min(254, parseInt(lerp(fromArray[1], toArray[1], u)))),
          Math.max(0, Math.min(254, parseInt(lerp(fromArray[2], toArray[2], u))))
        ];
        this.pixels[index] = color;
      }
      u += stepU;
    }, this), intervalLength);
  } else {
    var intervalLength = 33,
        steps = duration / intervalLength,
        stepU = 1.0 / steps,
        u = 0.0;
    this.pixelsIntervals[index] = setInterval(_.bind(function() {
      if (u > 1.0) {
        clearInterval(this.pixelsIntervals[index]);
        clearTimeout(this.pixelsIntervals[index]);
        this.pixels[index] = rgbArrayFromCommand(to);
      }
      else{
        var hsvStep = {
          h: lerp(from.h, to.h, u),
          s: lerp(from.s, to.s, u),
          v: lerp(from.v, to.v, u)
        };
        var color = rgbArrayFromCommand(hsvStep);
        this.pixels[index] = color;
      }

      u += stepU;
    }, this), intervalLength);
  }
};

BoardTransport.prototype.writePixel = function(index, command) {
  if (this.pixelsIntervals[index]) {
    clearInterval(this.pixelsIntervals[index]);
  }
  var color = rgbArrayFromCommand(command);
  this.pixels[index] = color;

  var x = (index%8);
  var y = Math.floor(index/8);
  this.sendCommand(packetTypes.PktSetPixelRequest, [x, y, color[0], color[1], color[2]]);
};

BoardTransport.prototype.sendCommand = function(type, data) {
  this.port.write([parseInt('81', 16), type, data.length].concat(data));
};

var previousData;
BoardTransport.prototype.drawScreen = function() {
  var pixelData = [];

  for(var i=0; i<this.pixels.length; i++){
    pixelData = pixelData.concat(this.pixels[i]);
  }
  if (previousData === pixelData) {
    return;
  }

  previousData = pixelData;

  this.sendCommand(packetTypes.PktSetScreenRequest, pixelData);
}

BoardTransport.prototype.getFirmwareInfo = function(callback) {
  this.dataCallbacks[packetTypes.PktInfoReply] = callback;
  this.sendCommand(packetTypes.PktInfoRequest, []);
}

BoardTransport.prototype.getFirmwareVersion = function(callback) {
  this.dataCallbacks[packetTypes.PktVersionReply] = callback;
  this.sendCommand(packetTypes.PktVersionRequest, []);
}

BoardTransport.prototype.clear = function() {
  this.pixels = _.range(0, 64).map(function(pixel) {
    return [0, 0, 0];
  });
};

BoardTransport.prototype.test = function() {
  this.sendCommand(packetTypes.PktSelfTestRequest, []);
};

BoardTransport.list = function() {
  var boardPointers = [];
  fs.readdirSync('/dev/').forEach(function(file) {
    if (file.match(/^tty.usbmodem/)) {
      boardPointers.push('/dev/' + file);
    }
    else if(file.match(/^ttyACM/)) {
      boardPointers.push('/dev/' + file) ;
    }
  });
  return boardPointers;
};

// linear interpolation between two values a and b
// u controls amount of a/b and is in range [0.0,1.0]
function lerp(a, b, u) {
  return (1 - u) * a + u * b;
};

function rgbArrayFromCommand(command) {
  if (command.r) {
    return [
      cleanInputColor(command.r),
      cleanInputColor(command.g),
      cleanInputColor(command.b)
    ];
  } else {
    var rgb = hsvToRgb(command.h, command.s, command.v);
    return [
      cleanInputColor(rgb[0]),
      cleanInputColor(rgb[1]),
      cleanInputColor(rgb[2])
    ];
  }
}

function hsvToRgb(h, s, v) {
    var r, g, b;

    var i = Math.floor(h * 6);
    var f = h * 6 - i;
    var p = v * (1 - s);
    var q = v * (1 - f * s);
    var t = v * (1 - (1 - f) * s);

    switch(i % 6){
        case 0: r = v, g = t, b = p; break;
        case 1: r = q, g = v, b = p; break;
        case 2: r = p, g = v, b = t; break;
        case 3: r = p, g = q, b = v; break;
        case 4: r = t, g = p, b = v; break;
        case 5: r = v, g = p, b = q; break;
    }

    return [
      Math.floor(r * 255),
      Math.floor(g * 255),
      Math.floor(b * 255)
    ];
}


function cleanInputColor(color) {
  return Math.max(0, Math.min(254, parseInt(color, 10)));
}

module.exports = BoardTransport;
