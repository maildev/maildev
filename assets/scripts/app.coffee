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

  $rootScope.$on("Refresh", ->
    console.log "Refresh event called."
    )

Bootstrap.$inject = ['$rootScope']

angular.module('nodemineApp', ['ngResource'])
  .config(Routes)
  .filter('newLines', NewLineFilter)
  .factory('Item', Item)
  .run(Bootstrap)