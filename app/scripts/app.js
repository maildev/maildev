'use strict';
var Bootstrap, Routes;

Routes = function($routeProvider) {
  return $routeProvider.when('/', {
    templateUrl: 'views/main.html',
    controller: 'MainCtrl'
  }).when('/email/:itemId', {
    templateUrl: 'views/item.html',
    controller: 'ItemCtrl'
  }).otherwise({
    redirectTo: '/'
  });
};

Routes.$inject = ['$routeProvider'];

Bootstrap = function($rootScope) {
  var socket;

  socket = io.connect('http://localhost');
  socket.on('newMail', function(data) {
    return $rootScope.$emit('Refresh');
  });
  return $rootScope.$on("Refresh", function() {
    return console.log("Refresh event called.");
  });
};

Bootstrap.$inject = ['$rootScope'];

angular.module('nodemineApp', ['ngResource']).config(Routes).filter('newLines', NewLineFilter).factory('Item', Item).run(Bootstrap);
