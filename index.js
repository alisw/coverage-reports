var http = require('http');
var path = require('path');
var chokidar = require('chokidar');
var express = require('express');
const spawn = require('child_process').spawn;
var StreamZip = require('node-stream-zip');
var mime = require('mime-types');
var mustache = require('mustache');
var app = express();

var data_dir = process.env.DATA_DIR || "/data"

var watcher = chokidar.watch(data_dir + '/**/*.zip', {
  persistent: true,
  usePolling: true,
});

var log = console.log.bind(console);

var archives = {};

watcher
  .on('add', function(f) {
      // Add a new file as entrypoint which can be served.
      var id = path.parse(f).name;
      archives[id] = f;
      log('File', f, 'has been added with id ', id);
   })
  .on('addDir', function(d) { log('Directory', path, 'has been added'); })
  .on('change', function(f) { log('File', path, 'has been changed'); })
  .on('unlink', function(f) {
      var id = path.parse(f).name;
      delete archives[id];
      log('File', f, 'has been removed. ', id);
  })
  .on('unlinkDir', function(f) { log('Directory', d, 'has been removed'); })
  .on('error', function(error) { log('Error happened', error); })
  .on('ready', function() { log('Initial scan complete. Ready for changes.'); })
  .on('raw', function(event, p, details) { log('Raw event info:', event, p, details); })

process.on( 'SIGINT', function() {
  console.log( "\nGracefully shutting down from SIGINT (Ctrl-C)" );
  // some other closing procedures go here
  process.exit( );
});

// Listen on port 8000
var app = express();
app.listen(process.env.COVERAGE_PORT || 8000, process.env.COVERAGE_IP || "0.0.0.0");

function pipeZippedFile(archiveName, filename, outputStream, closeCallback) {
  // Zip
  var zip = new StreamZip({
      file: archiveName,
      storeEntries: true
  });
  zip.on('error', function(err) {
    outputStream.status("404");
    outputStream.end(JSON.stringify(err));
  });
  zip.on('ready', function() {
    outputStream.contentType(mime.lookup(filename));
    zip.stream(filename, function(err, stm) {
        stm.pipe(outputStream);
    });
  });
}

// Toplevel simply return the list of all the valid ids
app.get('/', function(req, res) {
  var template = '<body><h1>List of available coverage reports</h1><ul>{{#archives}}<li><a href="reports/{{id}}/">{{id}}</a></li>{{/archives}}</ul></body>';
  var view = {"archives": []}
  for (var ai in archives) {
    if (!archives.hasOwnProperty(ai))
      continue;
    view.archives.push({id: ai});
  }
  res.end(mustache.render(template, view));
});


// No filename specified in the GET redirects to index.html
app.get(/^\/reports\/([^\/]*)\/*$/, function(req, res) {
  var id = req.params[0];
  if (!id || !archives[id]) {
    res.status(404);
    res.send(id + " not found.");
    return;
  }
  var archiveName = archives[id];
  pipeZippedFile(archiveName, "index.html", res);
});

// {id}/{filename} extract filename from the archive and
// pipes it as response.
app.get(/^\/reports\/([^\/]*)\/(.*)/, function(req, res) {
  var id = req.params[0];
  var filename = req.params[1];
  if (!id || !archives[id]) {
    res.status(400);
    res.send(id + " not found.");
  }
  var archiveName = archives[id];
  pipeZippedFile(archiveName, filename, res);
});

app.get('/reports', function(req, res) {
  res.end(JSON.stringify(archives));
});

app.get('/health', function(req, res) {
  res.end('{"status": "ok"}');
});

// Put a friendly message on the terminal
console.log("Server running on port 8000");
