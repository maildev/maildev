'use strict';

Routes = ($routeProvider) ->
  $routeProvider
    .when('/',
      templateUrl: 'views/main.html'
      controller: 'MainCtrl'
    )
    .when('/email/:itemId',
      templateUrl: 'views/item.html'
      controller: 'ItemCtrl'
    )
    .otherwise(
      redirectTo: '/'
    )

Routes.$inject = ['$routeProvider']

Bootstrap = ($rootScope) ->

  # Socket.io script is loaded in the template
  socket = io.connect('http://localhost')
  socket.on('newMail', (data) ->
    $rootScope.$emit('Refresh')
  )

  $rootScope.$on("Refresh", ->
    console.log "Refresh event called."
    )

Bootstrap.$inject = ['$rootScope']

angular.module('nodemineApp', ['ngResource'])
  .config(Routes)
  .filter('newLines', NewLineFilter)
  .factory('Item', Item)
  .run(Bootstrap)