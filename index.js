var SerialPort = require("serialport").SerialPort;
var port = new SerialPort("/dev/tty-usbserial1", {
  baudrate: 57600
});