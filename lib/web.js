
/**
 * MailDev - web.js
 */

var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io').listen(server);
var routes = require('./routes');
var auth = require('./auth');
var logger = require('./logger');


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

/**
 * Start the web server
 */

module.exports.start = function(port, host, mailserver, user, password) {

  if (user && password) {
    app.use(auth(user, password));
  }

  app.use('/', express.static(__dirname + '../../app'));

  routes(app, mailserver);

  io.on('connection', webSocketConnection(mailserver));

  port = port || 1080;
  host = host || '0.0.0.0';

  server.listen(port, host);

  logger.info('MailDev app running at %s:%s', host, port);

};
