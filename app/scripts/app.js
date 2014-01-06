/* global angular, io */

/**
 * App Config
 */

var app = angular.module('mailDevApp', ['ngRoute', 'ngResource',  'ngSanitize']);

app.config(['$routeProvider', function($routeProvider){

  $routeProvider
    .when('/', { templateUrl: 'views/main.html', controller: 'MainCtrl' })
    .when('/email/:itemId', { templateUrl: 'views/item.html', controller: 'ItemCtrl' })
    .otherwise({ redirectTo: '/' });

}]);

app.run(['$rootScope', function($rootScope){
  
  // Connect Socket.io
  var socket = io.connect('http://localhost');

  socket.on('newMail', function(data) {
    $rootScope.$emit('Refresh');
  });
  
  $rootScope.$on('Refresh', function() {
    console.log('Refresh event called.');
  });

}]);

/**
 * NewLineFilter -- Converts new line characters to br tags
 */

app.filter('newLines', function() {
  
  return function(text) {
    return text && text.replace(/\n/g, '<br>') || '';
  };

});

/**
 * Sidebar scrollbar fixed height
 */

(function(){

  var sidebar             = document.querySelector('.sidebar')
    , sidebarHeader       = document.querySelector('.sidebar-header')
    , emailList           = document.querySelector('.email-list')
    , sidebarHeaderHeight = sidebarHeader.getBoundingClientRect().height
    , resizeTimeout       = null
    ;

  function adjustEmailListHeight(){
    var newEmailListHeight = sidebar.getBoundingClientRect().height - sidebarHeaderHeight;
    emailList.style.height = newEmailListHeight + 'px';
  }

  adjustEmailListHeight();

  window.onresize = function(){
    if (resizeTimeout){
      clearTimeout(resizeTimeout);
    }
    resizeTimeout = window.setTimeout(function(){
      adjustEmailListHeight();
      resizeTimeout = null;
    }, 300);
  };

})();
