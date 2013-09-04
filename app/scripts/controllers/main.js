'use strict';
var HomeCtrl, MainCtrl, NavCtrl, NewLineFilter;

MainCtrl = function($scope, $rootScope, Item) {
  var loadData;

  console.log("Main Controller");
  $scope.items = [];
  loadData = function() {
    return $scope.items = Item.query();
  };
  loadData();
  $scope.markRead = function(item) {
    return item.read = true;
  };
  return $rootScope.$on("Refresh", function(e, d) {
    return loadData();
  });
};

MainCtrl.$inject = ['$scope', '$rootScope', 'Item'];

NavCtrl = function($scope, $rootScope, $location, Item) {
  console.log("Nav Controller");
  $scope.refreshList = function() {
    return $rootScope.$emit("Refresh");
  };
  return $scope.deleteAll = function() {
    return Item["delete"]({
      id: "all"
    }, function(email) {
      $rootScope.$emit("Refresh");
      return $location.path('/');
    });
  };
};

NavCtrl.$inject = ['$scope', '$rootScope', '$location', 'Item'];

HomeCtrl = function($scope) {
  return console.log("Home Controller");
};

NewLineFilter = function() {
  return function(text) {
    if (text && text.length) {
      return text.replace(/\n/g, '<br>');
    }
  };
};
