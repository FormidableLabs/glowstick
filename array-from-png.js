var PNG = require('pngjs').PNG,
    fs = require("fs");
fs.createReadStream(process.argv[2]).pipe(new PNG({
  filterType: 4
})).on('parsed', function() {
  var data = [];
  for (var y = 0; y < this.height; y++) {
    for (var x = 0; x < this.width; x++) {
      var idx = (this.width * y + x) << 2;
      data.push([this.data[idx], this.data[idx + 1], this.data[idx + 2]]);
    }
  }
  console.log(JSON.stringify(data));
});