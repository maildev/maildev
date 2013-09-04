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
  return $rootScope.$on("Refresh", function() {
    return console.log("Refresh event called.");
  });
};

Bootstrap.$inject = ['$rootScope'];

angular.module('nodemineApp', ['ngResource']).config(Routes).filter('newLines', NewLineFilter).factory('Item', Item).run(Bootstrap);
