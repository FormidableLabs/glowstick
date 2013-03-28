var config = {
  size: 8,
  singleColor: false
};

var MAX_SIZE = (config.size * config.size) - 1;

var board = {
  _pixels: [],
  _intervals: [],
  _timeouts: [],
  every: function(duration, callback) {
    if (typeof duration === 'function') {
      callback = arguments[0];
      duration = arguments[1];
    }
    this._intervals.push(setInterval(callback, duration));
  },
  after: function(duration, callback) {
    if (typeof duration === 'function') {
      callback = arguments[0];
      duration = arguments[1];
    }
    this._timeouts.push(setTimeout(callback, duration));
  },
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
    this._intervals.forEach(function(interval) {
      clearInterval(interval);
    });
    this._timeouts.forEach(function(timeout) {
      clearTimeout(timeout);
    });
    this.all().each(function(pixel) {
      pixel.set([0, 0, 0]);
    });
  },
  random: function(i) {
    if (typeof i === 'undefined') {
      i = 1;
    }
    var pixels = [];
    for (var x = 0; x < i; ++x) {
      pixels.push(this._pixels[Math.floor(Math.random() * (config.size * config.size))]);
    }
    return new Pixels(_.uniq(pixels));
  },
  set: function(data) {
    if (typeof data === 'string') {
      this.all().set(data);
    } else {
      var commands = [];
      _.each(data, function(pixel, i) {
          commands.push({
            command: 'set',
            index: i,
            r: pixel[0],
            g: pixel[1],
            b: pixel[2]
          });
        }, this);
      $.ajax({
        type: 'post',
        url: '/update',
        data: {commands: commands}
      });
    }
  },
  js: function() {
    var yellw = [241, 220, 63],
        black = [50, 51, 48];
    this.set([
      yellw, yellw, yellw, yellw, yellw, yellw, yellw, yellw,
      yellw, yellw, yellw, yellw, yellw, yellw, yellw, yellw,
      yellw, yellw, yellw, yellw, yellw, yellw, yellw, yellw,
      yellw, black, black, black, yellw, black, black, black,
      yellw, yellw, black, yellw, yellw, black, yellw, yellw,
      yellw, yellw, black, yellw, yellw, black, black, black,
      yellw, yellw, black, yellw, yellw, yellw, yellw, black,
      yellw, black, black, yellw, yellw, black, black, black
    ]);
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
  return new Pixels(_.filter(this._pixels, callback, context));
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

Pixels.prototype.rainbow = function(duration, complete) {
  if (complete) {
    setTimeout(complete, duration);
  }
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