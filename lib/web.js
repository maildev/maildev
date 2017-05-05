
/**
 * MailDev - web.js
 */

var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')();
var routes = require('./routes');
var auth = require('./auth');
var logger = require('./logger');
var path = require('path');

/**
 * WebSockets
 */

function emitNewMail(socket) {
  return function(email) {
    socket.emit('newMail', email);
  };
}

function emitDeleteMail(socket) {
  return function(email) {
    socket.emit('deleteMail', email);
  };
}

function webSocketConnection(mailserver) {

  return function onConnection(socket) {

    // When a new email arrives, the 'new' event will be emitted
    mailserver.on('new', emitNewMail(socket));
    mailserver.on('delete', emitDeleteMail(socket));

    socket.on('disconnect', function(){
      mailserver.removeListener('new', emitNewMail(socket));
      mailserver.removeListener('delete', emitDeleteMail(socket));
    });

  };
}

module.exports.server = server;

/**
 * Start the web server
 */

module.exports.start = function(port, host, mailserver, user, password, basePathname) {

  if (user && password) {
    app.use(auth(user, password));
  }

  if (basePathname) {
    io.path(basePathname + '/socket.io');
  } else {
    basePathname = '/';
  }

  app.use(basePathname, express.static(path.join(__dirname, '../app')));

  routes(app, mailserver, basePathname);

  io.attach(server);
  io.on('connection', webSocketConnection(mailserver));

  port = port || 1080;
  host = host || '0.0.0.0';

  server.listen(port, host);

  server.on("error", function(err){
    logger.info("Could not start web server on " + err.address + ":" + err.port + "\nPort already in use or insufficient rights to bind port");
    process.emit("SIGTERM");
  });

  logger.info('MailDev webapp running at http://%s:%s', host, port);

};

module.exports.close = function(callback) {
  server.close(callback);
};
