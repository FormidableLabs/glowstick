var config = {
  size: 8,
  singleColor: false
};

var MAX_SIZE = (config.size * config.size) - 1;

var board = {
  _pixels: [],
  range: function() {
    return new Pixels(_.range.apply(_, arguments).map(function(i) {
      return _.find(this._pixels, function(pixel) {
        return pixel.index === i;
      });
    }, this));
  },
  at: function(index) {
    if (arguments.length == 2) {
      var args = arguments;
      // x y
      return new Pixels([_.find(this._pixels, function(pixel) {
        return pixel.x === args[0] && pixel.y === args[1];
      })]);
    } else {
      // index
      return new Pixels([_.find(this._pixels, function(pixel) {
        return pixel.index === index;
      })]);
    }
  },
  row: function(index) {
    return new Pixels(_.select(this._pixels, function(pixel) {
      return pixel.y == index;
    }));
  },
  column: function(index) {
    return new Pixels(_.select(this._pixels, function(pixel) {
      return pixel.x == index;
    }));
  },
  all: function() {
    return new Pixels(this._pixels);
  },
  clear: function() {
    this.all().each(function(pixel) {
      pixel.set([0, 0, 0]);
    });
  },
  random: function() {
    return this.at(Math.floor(Math.random() * (config.size * config.size)));
  }
};

//TODO: mixin Backbone.Events

function Pixels(pixels) {
  this._pixels = [];
  this.length = 0;
  _.each(pixels, addPixel, this);
}

function addPixel(pixel) {
  this[this.length] = pixel;
  this._pixels.push(pixel);
  ++this.length;
}

Pixels.prototype.has = function(index) {
  // Can be a pixel or a number
  var i = index.index || index;
  return _.find(this._pixels, function(pixel) {
    return pixel.index === i;
  });
};

Pixels.prototype.each = function(callback, context) {
  _.each(this._pixels, callback, context);
  return this;
};

Pixels.prototype.add = function() {
  _.flatten(_.toArray(arguments)).forEach(function(pixels) {
    pixels._pixels.forEach(function(pixel) {
      if (!this.has(pixel)) {
        addPixel.call(this, pixel);
      }
    }, this);
  }, this);
  return this;
};

Pixels.prototype.filter = function(callback, context) {
  return _.filter(this._pixels, callback, context);
};

Pixels.prototype.eq = function(index) {
  var pixel = _.find(this._pixels, function(pixel) {
    return pixel.index === index;
  });
  return new Pixels(pixel ? [pixel] : []);
};

Pixels.prototype.toArray = function() {
  return _.toArray(this._pixels);
};

Pixels.prototype.first = function() {
  return new Pixels([this._pixels[0]]);
};

Pixels.prototype.last = function() {
  return new Pixels([this._pixels[this._pixels.length - 1]]);
};

Pixels.prototype.next = function(options) {
  options = options || {
    wrap: true
  };
  var pixel = this.last()[0];
  if (!pixel) {
    return empty();
  } else {
    var targetIndex = pixel.index + 1;
    if (options.wrap) {
      return board.at(targetIndex > MAX_SIZE ? 0 : targetIndex);
    } else if (targetIndex > MAX_SIZE) {
      return empty();
    } else {
      return board.at(targetIndex);
    }
  }
};

Pixels.prototype.previous = function(options) {
  options = options || {
    wrap: true
  };
  var pixel = this.first()[0];
  if (!pixel) {
    return empty();
  } else {
    var targetIndex = pixel.index - 1;
    if (options.wrap) {
      return board.at(targetIndex < 0 ? MAX_SIZE : targetIndex);
    } else if (targetIndex < 0) {
      return empty();
    } else {
      return board.at(targetIndex);
    }
  }
};

Pixels.prototype.above = function(options) {
  options = options || {
    wrap: true
  };
  if (!this._pixels.length) {
    return empty();
  } else {
    var arr = [];
    _.each(this._pixels, function(pixel) {
        var targetY = pixel.y - 1;
        if (targetY < 0) {
          if (!options.wrap) {
            return;
          }
          targetY = config.size - 1;
        }
        arr.push(board.at(pixel.x, targetY)[0]);
    });
    return new Pixels(arr);
  }
};

Pixels.prototype.below = function(options) {
  options = options || {
    wrap: true
  };
  if (!this._pixels.length) {
    return empty();
  } else {
    var arr = [];
    _.each(this._pixels, function(pixel) {
        var targetY = pixel.y + 1;
        if (targetY > (config.size - 1)) {
          if (!options.wrap) {
            return;
          }
          targetY = 0;
        }
        arr.push(board.at(pixel.x, targetY)[0]);
    });
    return new Pixels(arr);
  }
};

Pixels.prototype.left = function(options) {
  options = options || {
    wrap: true
  };
  if (!this._pixels.length) {
    return empty();
  } else {
    var arr = [];
    _.each(this._pixels, function(pixel) {
        var targetX = pixel.x - 1;
        if (targetX < 0) {
          if (!options.wrap) {
            return;
          }
          targetX = config.size - 1;
        }
        arr.push(board.at(targetX, pixel.y)[0]);
    });
    return new Pixels(arr);
  }
};

Pixels.prototype.right = function(options) {
  options = options || {
    wrap: true
  };
  if (!this._pixels.length) {
    return empty();
  } else {
    var arr = [];
    _.each(this._pixels, function(pixel) {
        var targetX = pixel.x + 1;
        if (targetX > (config.size - 1)) {
          if (!options.wrap) {
            return;
          }
          targetX = 0;
        }
        arr.push(board.at(targetX, pixel.y)[0]);
    });
    return new Pixels(arr);
  }
};

function convertColor() {
  var color;
  if (arguments.length === 1 && typeof arguments[0] === 'string') {
    var hex = arguments[0];
    if (!hex.match(/^#/)) {
      hex = hexFromColorName(hex);
    }
    hex = hex.replace(/^#/, '');
    color = [
      parseInt(hex.substr(0, 2), 16),
      parseInt(hex.substr(2, 2), 16),
      parseInt(hex.substr(4, 2), 16)
    ];
  } else if (arguments.length === 3) {
    color = _.toArray(arguments);
  } else {
    color = arguments[0] || [0, 0, 0];
  }
  return color;
}

Pixels.prototype.set = function(color) {
  color = convertColor.apply(this, arguments);
  _.each(this._pixels, function(pixel) {
    pixel.set(color);
  });
  return this;
};

Pixels.prototype.fade = function(from, to, duration, complete) {
  var args = arguments;
  _.each(this._pixels, function(pixel) {
    pixel.fade.apply(pixel, args);
  });
  if (complete) {
    setTimeout(complete, duration);
  }
  return this;
};

Pixels.prototype.rainbow = function(duration, callback) {
  rainbow(this, duration, callback);
};

Pixels.prototype.inspect = function() {
  var output = 'Pixels (' + this.length + ')';
  if (this.length) {
    output += '{' + this._pixels.map(function(pixel) {
      return pixel.index + ': ' + (JSON.stringify({
        x: pixel.x,
        y: pixel.y,
        color: pixel.color
      }));
    }).join(' ,') + '}';
  }
  return output;
};

function Pixel(index, color) {
  this.index = index;
  this.x = index % config.size;
  this.y = Math.floor(index / config.size);
  this.set(color);
}

Pixel.prototype.set = function(color) {
  this.color = convertColor.apply(this, arguments);
};

Pixel.prototype.fade = function() {
  //...
};

function empty() {
  return new Pixels([]);
}

// init board
_.each(_.range(0, 64), function(i) {
  board[i] = board._pixels[i] = new Pixel(i);
});


// color shifting
function rainbow(pixel, length, callback) {
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
  function step() {
    i += stepSize;
    pixel.set(rgbFromHue(i));
    if (i <= 360) {
      setTimeout(step, timeoutLength);
    }
  }
  step();
  if (callback) {
    setTimeout(callback, length);
  }
}
