var SerialPort = require("serialport");  

//SerialPort.list(function (err, ports) {
//  ports.forEach(function(port) {
//    console.log(port);
//  });
//});


var port = new SerialPort.SerialPort("/dev/tty.usbmodem1d1171", {
  baudrate: 115200
});


port.on("open", function () {
  console.log('open');
  port.on('data', function(data) {
    console.log('data received: ' + data);
  });
  port.write([255, 2, 0, 50, 25, 25, 25], function(err, results) {
    console.log(err);
    console.log(results);
  });
});


/*

  [255, 10] = kill the board
  [255, 20] = test sequence
  [255, 1, 0, pixelNum, r, g, b, r, g, r, g, b ...] (rgb * 16), set 16 pixels
  [255, 2, 0, pixelNum, r, g, b] = set a pixel
  



*/


//
//SerialPort.list(function (err, ports) {
//  ports.forEach(function(port) {
//    console.log(port.comName);
//    console.log(port.pnpId);
//    console.log(port.manufacturer);
//  });
//});