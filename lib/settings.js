
/**
 * MailDev - settings.js
 */

var path  = require('path')
  , fs    = require('fs')
  ;

var settingsFilePath = path.join(__dirname, '../', './settings.json');

/**
 * Settings exports
 */

var settings = module.exports = {};

// Read the settings from the file
settings.read = function(done){
  fs.readFile(settingsFilePath, function(err, data){
    if (err) done(err, null);
    done(null, JSON.parse(data));
  });
};
