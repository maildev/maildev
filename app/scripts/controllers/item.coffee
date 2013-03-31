'use strict';

ItemCtrl = ($scope, $rootScope, $routeParams, $location, Item) ->

  console.log "Item Controller: ", $routeParams.itemId

  original = {}

  # Get the item data by route parameter
  getItem = ->
    Item.get({ id: $routeParams.itemId }, (email) ->
      # original = item
      console.log email
      $scope.item = new Item(email)
      if $scope.item.html
        $scope.item.iframeUrl = "/email/#{$scope.item.id}/html"
        prepIframe()
        $scope.item.plainTextVisibility = "hidden"
        $scope.item.iframeVisibility = "show"
      else
        $scope.item.iframeVisibility = "hidden"
        $scope.item.plainTextVisibility = "show"
    , (error) ->
      console.error "404: Email not found"
      # Redirect
      $location.path '/'
    )

  getItem()

  prepIframe = ->
    # Wait for iframe to load
    window.setTimeout( ->
      # Append <base target="_blank" /> to <head> in the iframe so all links open in new window
      iframe = document.getElementsByTagName('iframe')[0]
      head = iframe.contentDocument.getElementsByTagName('head')[0]
      title = iframe.contentDocument.getElementsByTagName('title')[0]
      baseEl = iframe.contentDocument.createElement('base')
      baseEl.setAttribute('target', '_blank')
      title.parentNode.insertBefore(baseEl, title)

      # Set height
      body = iframe.contentDocument.getElementsByTagName('body')[0]
      newHeight = body.scrollHeight
      iframe.height = newHeight
    , 200 )

  $scope.show = (type) ->
    # console.log type == "html", $scope.item.html
    if type == "html" and $scope.item.html
      $scope.item.iframeVisibility = "show"
      $scope.item.plainTextVisibility = "hidden"
    else if type == "plain"
      $scope.item.plainTextVisibility = "show"
      $scope.item.iframeVisibility = "hidden"
      
  $scope.delete = (item) ->
    Item.delete({ id: item.id }, (email) ->
      $rootScope.$emit("Refresh")
    )


  # TODO - Add Delete item


ItemCtrl.$inject = ['$scope', '$rootScope', '$routeParams', '$location', 'Item']

