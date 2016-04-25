var http = require('http');
var url = require('url');

var PORT = 8997;

var server = http.createServer(function(req, res){
  var parsedUrl = url.parse(req.url, true);
  res.writeHead(200, {'Content-Type': 'application/json'});
  res.end(JSON.stringify(
        {
          1 : {
          lat: 48.3582,
          long: 10.9067
          },
          2: {
            lat: 23.6578,
            long: 47.3267
          }
        }
      ));

});

server.listen(PORT, function(){
  console.log('listening on ' + PORT);
});


