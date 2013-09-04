'use strict';
var ItemCtrl;

ItemCtrl = function($scope, $rootScope, $routeParams, $location, Item, $http) {
  var fixIframeHeight, getItem, iframe, prepIframe, replaceMediaQueries;

  console.log("Item Controller: ", $routeParams.itemId);
  iframe = null;
  getItem = function() {
    return Item.get({
      id: $routeParams.itemId
    }, function(email) {
      $scope.item = new Item(email);
      if ($scope.item.html) {
        $scope.item.iframeUrl = "/email/" + $scope.item.id + "/html";
        prepIframe();
        return $scope.panelVisibility = "html";
      } else {
        $scope.htmlView = 'disabled';
        return $scope.panelVisibility = "plain";
      }
    }, function(error) {
      console.error("404: Email not found");
      return $location.path('/');
    });
  };
  getItem();
  prepIframe = function() {
    return window.setTimeout(function() {
      var baseEl, head, title;

      iframe = document.getElementsByTagName('iframe')[0];
      head = iframe.contentDocument.getElementsByTagName('head')[0];
      title = iframe.contentDocument.getElementsByTagName('title')[0];
      baseEl = iframe.contentDocument.createElement('base');
      baseEl.setAttribute('target', '_blank');
      title.parentNode.insertBefore(baseEl, title);
      replaceMediaQueries();
      return fixIframeHeight();
    }, 500);
  };
  fixIframeHeight = function() {
    var body, newHeight;

    body = iframe.contentDocument.getElementsByTagName('body')[0];
    newHeight = body.scrollHeight;
    return iframe.height = newHeight;
  };
  replaceMediaQueries = function() {
    var rule, styleSheet, _i, _len, _ref, _results;

    _ref = iframe.contentDocument.styleSheets;
    _results = [];
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      styleSheet = _ref[_i];
      _results.push((function() {
        var _j, _len1, _ref1, _results1;

        _ref1 = styleSheet.cssRules;
        _results1 = [];
        for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
          rule = _ref1[_j];
          if (rule.media && rule.media.mediaText) {
            _results1.push(rule.media.mediaText = rule.media.mediaText.replace('device-width', 'width'));
          } else {
            _results1.push(void 0);
          }
        }
        return _results1;
      })());
    }
    return _results;
  };
  $scope.show = function(type) {
    if (type === 'html' && !$scope.item.html) {
      return;
    }
    return $scope.panelVisibility = type;
  };
  $scope["delete"] = function(item) {
    return Item["delete"]({
      id: item.id
    }, function(email) {
      $rootScope.$emit("Refresh");
      return $location.path('/');
    });
  };
  $scope.resize = function(newSize) {
    iframe.style.width = newSize ? newSize : '100%';
    fixIframeHeight();
    return $scope.iframeSize = newSize;
  };
  return $scope.forward = function(item) {
    return $http({
      method: 'POST',
      url: "/email/" + item.id + "/send"
    }).success(function(data, status) {
      return console.log(data, status);
    });
  };
};

ItemCtrl.$inject = ['$scope', '$rootScope', '$routeParams', '$location', 'Item', '$http'];
