      function componentToHex(c) {
        var hex = c.toString(16);
        return hex.length == 1 ? "0" + hex : hex;
      }

      function rgbToHex(r, g, b) {
        return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
      }

      var $set = Pixels.prototype.set;
      Pixels.prototype.set = function() {
        $set.apply(this, arguments);
        var color = convertColor.apply(this, arguments);
        var commands = [];
        _.each(this._pixels, function(pixel) {
          commands.push({
            command: 'set',
            index: pixel.index,
            r: color[0],
            g: color[1],
            b: color[2]
          });
        }, this);
        $.ajax({
          type: 'post',
          url: '/update',
          data: {commands: commands}
        });
      };

      var $clear = board.clear;
      board.clear = function() {
        $clear.apply(this, arguments);
        $.ajax({
          type: 'post',
          url: '/clear'
        });
      };

      var $rainbow = Pixels.prototype.rainbow;
      Pixels.prototype.rainbow = function(duration, callback) {
        $fade.apply(this, arguments);
        var commands = [];
        _.each(this._pixels, function(pixel) {
          commands.push({
            command: 'rainbow',
            index: pixel.index,
            duration: duration
          });
        });
        console.log(commands);
        $.ajax({
          type: 'post',
          url: '/update',
          data: {commands: commands}
        });
      };

      var $fade = Pixels.prototype.fade;
      Pixels.prototype.fade = function(from, to, duration, callback) {
        $fade.apply(this, arguments);
        var to = convertColor(to);
        var from = convertColor(from);
        var commands = [];
        _.each(this._pixels, function(pixel) {
          commands.push({
            command: 'fade',
            index: pixel.index,
            from: {
              r: from[0],
              g: from[1],
              b: from[2]
            },
            to: {
              r: to[0],
              g: to[1],
              b: to[2]
            },
            duration: duration
          });
        }, this);
        $.ajax({
          type: 'post',
          url: '/update',
          data: {commands: commands}
        });
      };
