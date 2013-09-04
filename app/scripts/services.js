'use strict';
var Item;

Item = function($resource) {
  return $resource('email/:id', {
    id: ''
  }, {
    update: {
      method: 'PUT',
      params: {}
    }
  });
};

Item.$inject = ['$resource'];
