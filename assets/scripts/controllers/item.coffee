'use strict';

ItemCtrl = ($scope, $rootScope, $routeParams, $location, Item, $http) ->

  console.log "Item Controller: ", $routeParams.itemId

  # iframe will be available throughout the controller
  iframe = null

  # Get the item data by route parameter
  getItem = ->
    Item.get({ id: $routeParams.itemId }, (email) ->
      $scope.item = new Item(email)

      if $scope.item.html
        $scope.item.iframeUrl = "/email/#{$scope.item.id}/html"
        prepIframe()
        $scope.panelVisibility = "html"
      else
        $scope.htmlView = 'disabled'
        $scope.panelVisibility = "plain"

    , (error) ->
      console.error "404: Email not found"
      # Redirect
      $location.path '/'
    )

  getItem()

  # Gets the iframe ready for interaction
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

      replaceMediaQueries()
      fixIframeHeight()
    , 500 )

  # Updates the iframe height so it matches it's content
  # This prevents the iframe from having scrollbars
  fixIframeHeight = ->
    body = iframe.contentDocument.getElementsByTagName('body')[0]
    newHeight = body.scrollHeight
    iframe.height = newHeight    

  # Updates all media query rules to use 'width' instead of device width
  replaceMediaQueries = ->
    for styleSheet in iframe.contentDocument.styleSheets
      for rule in styleSheet.cssRules
        if rule.media and rule.media.mediaText
          # Future warning implementation, not ready yet.
          # if rule.media.mediaText 
          #   console.warn "To target mobile devices, use '[max|min]-device-width' media queries instead of '[max|min]-width'"
          rule.media.mediaText = rule.media.mediaText.replace('device-width', 'width')

  # Toggle what format is viewable
  $scope.show = (type) ->
    if type == 'html' and not $scope.item.html 
      return
    $scope.panelVisibility = type
      
  # Sends a DELETE request to the server
  $scope.delete = (item) ->
    Item.delete({ id: item.id }, (email) ->
      $rootScope.$emit("Refresh")
      $location.path '/'
    )

  # Updates iframe to have a width of @newSize, i.e. '320px'
  $scope.resize = (newSize) ->
    iframe.style.width = if newSize then newSize else '100%'
    fixIframeHeight()
    $scope.iframeSize = newSize

  $scope.forward = (item) ->
    $http({ method: 'POST', url: "/email/#{item.id}/send"})
      .success( (data, status) ->
        console.log data, status
        )


ItemCtrl.$inject = ['$scope', '$rootScope', '$routeParams', '$location', 'Item', '$http']

