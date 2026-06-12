/**
 * Simple logger module for Wellness App
 */
const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(__dirname, '..', 'logs');

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
  try { fs.mkdirSync(LOG_DIR, { recursive: true }); } catch(_) {}
}

function timestamp() {
  return new Date().toISOString();
}

function write(level, args) {
  var msg = timestamp() + ' [' + level + '] ' + Array.prototype.slice.call(args).map(function(a) {
    return typeof a === 'object' ? JSON.stringify(a) : String(a);
  }).join(' ');
  console.log(msg);
  try {
    fs.appendFileSync(path.join(LOG_DIR, 'app.log'), msg + '\n');
  } catch(_) {}
}

var logger = {
  info: function() { write('INFO', arguments); },
  warn: function() { write('WARN', arguments); },
  error: function() { write('ERROR', arguments); },
  debug: function() { write('DEBUG', arguments); },
  getLogDir: function() { return LOG_DIR; }
};

module.exports = logger;
