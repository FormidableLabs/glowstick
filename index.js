var express = require('express'),
    fs = require('fs'),
    _ = require('underscore'),
    async = require('async'),
    server = express();

server.use(express.static('public'));
server.listen(8014);


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


