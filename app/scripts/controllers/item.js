/* global angular, app */

/**
 * Email item Controller -- The UI for the email pane
 */

app.controller('ItemCtrl', [
  '$scope', '$rootScope', '$routeParams', '$location', 'Email', '$http',
  function($scope, $rootScope, $routeParams, $location, Email, $http) {

    var iframe = null
      , getItem
      , prepIframe
      , fixIframeHeight
      , replaceMediaQueries;


    // Get the item data by route parameter
    getItem = function() {

      Email.get({ id: $routeParams.itemId }, function(email) {

        $scope.item = new Email(email);

        if ($scope.item.html) {
          $scope.item.iframeUrl = '/email/' + $scope.item.id + '/html';
          prepIframe();
          $scope.panelVisibility = 'html';
        } else {
          $scope.htmlView = 'disabled';
          $scope.panelVisibility = 'plain';
        }
      }, function(error) {
        console.error('404: Email not found');
        $location.path('/');
      });
    };

    // Prepares the iframe for interaction
    prepIframe = function() {
      // Wait for iframe to load
      setTimeout(function() {
        var baseEl, head;

        iframe  = document.getElementsByTagName('iframe')[0];
        head    = iframe.contentDocument.getElementsByTagName('head')[0];
        baseEl  = iframe.contentDocument.createElement('base');

        // Append <base target="_blank" /> to <head> in the iframe so all links open in new window
        baseEl.setAttribute('target', '_blank');

        if (head)
          head.appendChild(baseEl);

        replaceMediaQueries();
        fixIframeHeight();

        addHideDropdownHanlder(  iframe.contentDocument.getElementsByTagName('body')[0] );

      }, 500);
    };

    // Updates the iframe height so it matches it's content
    // This prevents the iframe from having scrollbars
    fixIframeHeight = function() {
      
      var body      = iframe.contentDocument.getElementsByTagName('body')[0]
        , newHeight = body.scrollHeight;

      iframe.height = newHeight;
    };

    // Updates all media query rules to use 'width' instead of device width
    replaceMediaQueries = function(){
      angular.forEach(iframe.contentDocument.styleSheets, function(styleSheet){
        angular.forEach(styleSheet.cssRules, function(rule){
          if (rule.media && rule.media.mediaText){
            // TODO -- Add future warning if email doesn't use '[max|min]-device-width' media queries
            rule.media.mediaText = rule.media.mediaText.replace('device-width', 'width');
          }
        });
      });
    };

    // NOTE: This is kind of a hack to get these dropdowns working. Should be revisited in the future

    // Toggle a dropdown open/closed by toggling a class on the trigger itself
    $scope.toggleDropdown = function($event, dropdownName) {
      $event.stopPropagation();
      $scope.dropdownOpen = dropdownName === $scope.dropdownOpen ? '' : dropdownName;
    };

    function hideDropdown(e){
      $scope.$apply(function(){
        $scope.dropdownOpen = '';
      });
    }

    function addHideDropdownHanlder(element){
      angular.element( element )
        .off('click', hideDropdown)
        .on('click', hideDropdown);
    }

    addHideDropdownHanlder( window );


    // Toggle what format is viewable
    $scope.show = function(type) {
      if ((type === 'html' || type === 'attachments') && !$scope.item[type]) return;

      $scope.panelVisibility = type;
    };

    // Sends a DELETE request to the server
    $scope.delete = function(item) {
      
      Email.delete({ id: item.id }, function(email) {
        $rootScope.$emit('Refresh');
        $location.path('/');
      });

    };

    // Updates iframe to have a width of newSize, i.e. '320px'
    $scope.resize = function(newSize) {
      iframe.style.width = newSize || '100%';
      fixIframeHeight();
      $scope.iframeSize = newSize;
    };
    
    // TODO -- Future implementation of forwarding emails via gmail
    $scope.forward = function(item) {
      $http({
        method: 'POST',
        url: '/email/' + item.id + '/send'
      })
        .success(function(data, status) {
          console.log(data, status);
        });
    };


    // Initialize the view by getting the email
    getItem();
  }
]);
