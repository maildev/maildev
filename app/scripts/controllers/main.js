/* global app */

/**
 * Main App Controller -- Manage all emails visible in the list
 */
var refreshTimeout = null
var notificationTimeout = null

app.controller('MainCtrl', [
  '$scope', '$rootScope', '$http', 'Email', '$route', '$location', 'Favicon',
  function ($scope, $rootScope, $http, Email, $route, $location, Favicon) {
    $scope.items = []
    $scope.currentItemId = null
    $scope.unreadItems = 0
    $scope.navMoreOpen = false

    $scope.notificationsSupported = 'Notification' in window && window.isSecureContext

    var settingsKey = 'maildevSettings'
    var saveSettings = function () {
      if (window.localStorage) {
        window.localStorage.setItem(settingsKey, JSON.stringify($scope.settings))
      }
    }
    var loadSettings = function (defaultSettings) {
      try {
        var settingsJSON = window.localStorage.getItem(settingsKey)
        return Object.assign({}, defaultSettings, JSON.parse(settingsJSON))
      } catch (err) {
        console.error('Error loading MailDev settings', err)
        return defaultSettings
      }
    }

    var defaultSettings = {
      notificationsEnabled: false,
      autoShowEnabled: false,
      toolbarDisplayEnabled: false,
      darkThemeEnabled: false
    }
    $scope.settings = loadSettings(defaultSettings)

    var countUnread = function () {
      $scope.unreadItems = $scope.items.filter(function (email) {
        return !email.read
      }).length
      Favicon.setUnreadCount($scope.unreadItems)
    }

    // Load all emails
    var loadData = function () {
      $scope.items = Email.query()
      $scope.items.$promise.then(function () {
        countUnread()
      })
    }

    $rootScope.$on('Refresh', function (e, d) {
      loadData()
    })

    $rootScope.$on('$routeChangeSuccess', function (e, route) {
      if (route.params) {
        $scope.currentItemId = route.params.itemId
      }
    })

    $rootScope.$on('newMail', function (e, newEmail) {
      // update model
      $scope.items.push(newEmail)
      countUnread()

      // update DOM at most 5 times per second
      if (!refreshTimeout) {
        refreshTimeout = setTimeout(function () {
          refreshTimeout = null
          if ($scope.settings.autoShowEnabled) {
            $location.path('/email/' + newEmail.id)
          }
          $scope.$apply()
        }, 200)
      }

      // show notifications
      if (!notificationTimeout && $scope.settings.notificationsEnabled) {
        notificationTimeout = setTimeout(function () {
          notificationTimeout = null
        }, 2000)
        new window.Notification('MailDev', { body: newEmail.subject, icon: 'favicon.ico' })
          .addEventListener('click', function () {
            $location.path('/email/' + newEmail.id)
            $scope.$apply()
          })
      }
    })

    $rootScope.$on('deleteMail', function (e, email) {
      if (email.id === 'all') {
        $rootScope.$emit('Refresh')
        $location.path('/')
      } else {
        var idx = $scope.items.reduce(function (p, c, i) {
          if (p !== 0) return p
          return c.id === email.id ? i : 0
        }, 0)

        var nextIdx = $scope.items.length === 1 ? null : idx === 0 ? idx + 1 : idx - 1
        if (nextIdx !== null) {
          $location.path('/email/' + $scope.items[nextIdx].id)
        } else {
          $location.path('/')
        }

        $scope.items.splice(idx, 1)
        countUnread()
        $scope.$apply()
      }
    })

    // Click event handlers
    $scope.markRead = function (email) {
      email.read = true
      countUnread()
    }



    $scope.headerNavStopPropagation = function ($event) {
      $event.stopPropagation()
    }

    $scope.toggleNavMore = function ($event) {
      $event.stopPropagation()
      $scope.navMoreOpen = !$scope.navMoreOpen;
    }

    function hideNavMore (e) {
      $scope.$apply(function () {
        $scope.navMoreOpen = false;
      })
    }

    function addHideNavMoreHandler (element) {
      angular.element(element)
        .off('click', hideNavMore)
        .on('click', hideNavMore)
    }

    addHideNavMoreHandler(window)


    $scope.toggleAutoShow = function () {
      $scope.settings.autoShowEnabled = !$scope.settings.autoShowEnabled
      saveSettings()
    }

    $scope.refreshList = function () {
      $rootScope.$emit('Refresh')
    }

    $scope.deleteAll = function () {
      Email.delete({ id: 'all' })
    }

    $scope.toggleToolbarDisplay = function () {
      $scope.settings.toolbarDisplayEnabled = !$scope.settings.toolbarDisplayEnabled
      saveSettings()
    }

    $scope.toggleDarkTheme = function () {
      $scope.settings.darkThemeEnabled = !$scope.settings.darkThemeEnabled
      saveSettings()
    }

    $scope.toggleNotifications = function () {
      if ($scope.notificationsSupported && $scope.settings.notificationsEnabled) {
        $scope.settings.notificationsEnabled = false
        saveSettings()
        return
      }

      window.Notification.requestPermission()
        .then(function (permissions) {
          $scope.settings.notificationsEnabled = permissions === 'granted'
          saveSettings()
        })
        .catch(function () {
          window.alert('Unable to enable web notifications. See console for more information')
        })
    }

    // Initialize the view
    loadData()

    $http({ method: 'GET', url: 'config' })
      .success(function (data) {
        $rootScope.config = data
        $scope.config = data
      })
  }
])
