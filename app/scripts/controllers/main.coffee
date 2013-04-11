'use strict';

MainCtrl = ($scope, $rootScope, Item) ->

  console.clear()
  console.log "Main Controller"

  $scope.items = []

  itemsIndex = {}
  
  # itemsIndex is an object containg id:index pairs for easy item lookup
  # ex. [{ id: 2 }, { id: 10 }] => { 2: 0, 10:1 }
  indexData = ->
    itemsIndex[item.id] = index for item, index in $scope.items

  # Get the items & index the data
  loadData = ->
    $scope.items = Item.query( ->
      indexData()
      )    
  loadData()
  

  # Update an item
  updateItem = (item) ->
    if itemsIndex[item.id]
      $scope.items[itemsIndex[item.id]] = item
    else
      $scope.items.push(item)
      indexData()

  $rootScope.$on("ItemUpdate", (e, d) ->
    updateItem(d)
    )

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

