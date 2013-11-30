/* global app */

/**
 * Main App Controller -- Manage all emails visible in the list
 */

app.controller('MainCtrl', [
  '$scope', '$rootScope', 'Email',
  function($scope, $rootScope, Email) {

    // Load all emails
    var loadData = function() {
      $scope.items = Email.query();
    };

    // Initially load all emails
    $scope.items = [];
    loadData();


    $scope.markRead = function(email) {
      email.read = true;
    };
    
    $rootScope.$on('Refresh', function(e, d) {
      loadData();
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
