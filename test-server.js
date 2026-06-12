var express = require('express');
var path = require('path');
var fs = require('fs');
var app = express();
app.get('/', function(req, res) {
  try {
    var html = fs.readFileSync(path.join(__dirname, 'frontend', 'index.html'), 'utf8');
    res.type('html').send(html);
    console.log('sent index.html OK, length:', html.length);
  } catch(e) {
    console.error('readFile ERR:', e.message);
    res.status(500).send('fail');
  }
});
var s = app.listen(0, function() {
  var port = s.address().port;
  console.log('Listening on port', port);
  require('http').get('http://127.0.0.1:' + port + '/', function(r) {
    var d = '';
    r.on('data', function(c) { d += c; });
    r.on('end', function() {
      console.log('Response status:', r.statusCode, 'length:', d.length);
      s.close();
      process.exit(0);
    });
  });
});
