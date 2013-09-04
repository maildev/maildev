'use strict';

MainCtrl = ($scope, $rootScope, Item) ->

  # console.clear()
  console.log "Main Controller"

  $scope.items = []

  # Get the items & index the data
  loadData = ->
    $scope.items = Item.query()
  loadData()

  $scope.markRead = (item) ->
    item.read = true


  $rootScope.$on("Refresh", (e,d) ->
    loadData()
    )

MainCtrl.$inject = ['$scope', '$rootScope', 'Item']


NavCtrl = ($scope, $rootScope, $location, Item) ->

  console.log "Nav Controller"

  $scope.refreshList = ->
    $rootScope.$emit("Refresh")

  $scope.deleteAll = ->
    Item.delete({ id: "all" }, (email) ->
      $rootScope.$emit("Refresh")
      $location.path '/'
    )

NavCtrl.$inject = ['$scope', '$rootScope', '$location', 'Item']


# Homepage controller, currently unused
HomeCtrl = ($scope) ->

  console.log "Home Controller"

# Filter to convert new line characters to br tags
NewLineFilter = ->
  return (text) ->
    return text.replace(/\n/g, '<br>') if text and text.length

