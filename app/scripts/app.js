/* global angular, io, location */

/**
 * App Config
 */

const app = angular.module('mailDevApp', ['ngRoute', 'ngResource', 'ngSanitize', 'ngCookies'])

app.config(['$routeProvider', function ($routeProvider) {
  $routeProvider
    .when('/', { templateUrl: 'views/main.html', controller: 'MainCtrl' })
    .when('/email/:itemId', { templateUrl: 'views/item.html', controller: 'ItemCtrl' })
    .otherwise({ redirectTo: '/' })
}])

app.run(['$rootScope', function ($rootScope) {
  // Connect Socket.io
  const socket = io({
    path: location.pathname + 'socket.io'
  })

  socket.on('newMail', function (data) {
    $rootScope.$emit('newMail', data)
  })

  socket.on('deleteMail', function (data) {
    $rootScope.$emit('deleteMail', data)
  })

  $rootScope.$on('Refresh', function () {
    console.log('Refresh event called.')
  })
}])

/**
 * filter to encode special HTML characters as HTML entities
 */

app.filter('escapeHTML', function () {
  return function (text) {
    if (text) {
      return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/'/g, '&#39;')
        .replace(/"/g, '&quot;')
    }
    return ''
  }
})

/**
 * filter to encode URI
 */

app.filter('encodeURIComponent', function ($window) {
  return $window.encodeURIComponent
});

/**
 * Sidebar scrollbar fixed height
 */

(function () {
  const sidebar = document.querySelector('.sidebar')
  const sidebarHeader = document.querySelector('.sidebar-header')
  const emailList = document.querySelector('.email-list')
  const sidebarHeaderHeight = sidebarHeader.getBoundingClientRect().height
  let resizeTimeout = null

  function adjustEmailListHeight () {
    const newEmailListHeight = sidebar.getBoundingClientRect().height - sidebarHeaderHeight
    emailList.style.height = newEmailListHeight + 'px'
  }

  adjustEmailListHeight()

  window.onresize = function () {
    if (resizeTimeout) {
      clearTimeout(resizeTimeout)
    }
    resizeTimeout = window.setTimeout(function () {
      adjustEmailListHeight()
      resizeTimeout = null
    }, 300)
  }
})()
