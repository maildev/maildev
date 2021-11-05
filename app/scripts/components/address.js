/* global app */

/**
 * This compoonent displays an address either with or without a name.
 */

app.directive('appAddress', function () {
  return {
    restrict: 'E',
    scope: {
      addr: '=address'
    },
    templateUrl: 'views/address.html'
  }
})
