/* global app */

/**
 * Main App Controller -- Manage all emails visible in the list
 */

app.controller('MainCtrl', [
  '$scope', '$rootScope', '$http', 'Email',
  function($scope, $rootScope, $http, Email) {

    $scope.items = [];
    $scope.configOpen = false;

    // Load all emails
    var loadData = function() {
      $scope.items = Email.query();
    };

    $rootScope.$on('Refresh', function(e, d) {
      loadData();
    });

    var refreshTimeout = null;
    $rootScope.$on('newMail', function(e, newEmail) {
      
      //update model
      $scope.items.push(newEmail);

      //update DOM at most 5 times per second
      if (!refreshTimeout) {
        refreshTimeout = setTimeout(function() {
          refreshTimeout = null;
          $scope.$apply();
        }, 200);
      }

    });

    // Click event handlers
    $scope.markRead = function(email) {
      email.read = true;
    };

    $scope.showConfig = function(){
      $scope.configOpen = !$scope.configOpen;
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
