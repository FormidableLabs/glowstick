var http = require('http');

module.exports = function(runner) {
  var i = 0;
  runner.on('pass', function(test) {
    update(i, [0, 255, 0]);
    ++i;
  });
  runner.on('fail', function(test) {
    update(i, [255, 0, 0]);
    ++i;
  });
};

function update(i, color) {
  try {
    var request = http.request({
      host: 'localhost',
      port: 80,
      path: '/update',
      method: 'POST',
      headers: {
        "Content-Type": "application/json"
      }
    }, function(response) {});
  
    request.write(JSON.stringify({
      commands: [{
        command: 'set',
        index: i,
        r: color[0],
        g: color[1],
        b: color[2]
      }]
    }));
  
    request.end();
  } catch(e) {
    console.log(e);
  }
}