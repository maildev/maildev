'use strict';

Item = ($resource) ->
  return $resource('email/:id', { id: '' },
    update:
      method: 'PUT'
      params: {}
    )

Item.$inject = ['$resource']