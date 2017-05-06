
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
 * Keep record of all connections to close them on shutdown
 */
const connections = {}

function handleConnection (socket) {
  const key = `${socket.remoteAddress}:${socket.remotePort}`
  connections[key] = socket
  socket.on('close', function () {
    delete connections[key]
  })
}

function closeConnections () {
  for (let key in connections) {
    connections[key].destroy()
  }
}

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
    const newHandlers = emitNewMail(socket)
    const deleteHandler = emitDeleteMail(socket)
    mailserver.on('new', newHandlers)
    mailserver.on('delete', deleteHandler)

    function removeListeners () {
      mailserver.removeListener('new', newHandlers)
      mailserver.removeListener('delete', deleteHandler)
    }

    socket.on('disconnect', removeListeners)
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

  server.on('connection', handleConnection)

  server.on("error", function(err){
    logger.info("Could not start web server on " + err.address + ":" + err.port + "\nPort already in use or insufficient rights to bind port");
    process.emit("SIGTERM");
  });

  logger.info('MailDev webapp running at http://%s:%s', host, port);

};

module.exports.close = function(callback) {
  closeConnections()
  io.close(callback)
};
