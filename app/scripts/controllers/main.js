/* global app */

/**
 * Main App Controller -- Manage all emails visible in the list
 */

app.controller('MainCtrl', [
  '$scope', '$rootScope', '$http', 'Email', '$route', '$location',
  function($scope, $rootScope, $http, Email, $route, $location) {

    $scope.items = [];
    $scope.configOpen = false;
    $scope.currentItemId = null;
    $scope.autoShow = false;
    $scope.unreadItems = 0;

    // Load all emails
    var loadData = function() {
      $scope.items = Email.query(function(data) {
          var count = 0;
          angular.forEach(data, function(value, key) {
              if (!value.read) count++;
          });

          $scope.unreadItems = count;
      });
    };

    $rootScope.$on('Refresh', function(e, d) {
      loadData();
    });

    $rootScope.$on('$routeChangeSuccess', function( e, route ) {
      if ( route.params ) {
        $scope.currentItemId = route.params.itemId;
      }
    });

    var refreshTimeout = null;
    $rootScope.$on('newMail', function(e, newEmail) {
      
      //update model
      $scope.items.push(newEmail);
      $scope.unreadItems++;

      //update DOM at most 5 times per second
      if (!refreshTimeout) {
        refreshTimeout = setTimeout(function() {
          refreshTimeout = null;
          if ( $scope.autoShow === true ) {
            $location.path('/email/' + newEmail.id );
          }
          $scope.$apply();
        }, 200);
      }

    });

    // Click event handlers
    $scope.markRead = function(email) {
      email.read = true;
      $scope.unreadItems--;
    };

    $scope.showConfig = function(){
      $scope.configOpen = !$scope.configOpen;
    };
    
    $scope.toggleAutoShow = function() {
      $scope.autoShow = !$scope.autoShow;
    };

    // Initialize the view
    loadData();

    $http({method: 'GET', url: 'config'})
      .success(function(data){
        $rootScope.config = data;
        $scope.config = data;
      });

  }
]);

/**
 * Navigation Controller
 */

app.controller('NavCtrl', [
  '$scope', '$rootScope', '$location', 'Email',
  function($scope, $rootScope, $location, Email) {
  
    $scope.refreshList = function() {
      $rootScope.$emit('Refresh');
    };

    $scope.deleteAll = function() {

      Email.delete({ id: 'all' }, function(email) {
        $rootScope.$emit('Refresh');
        $location.path('/');
      });

    };

  }
]);
