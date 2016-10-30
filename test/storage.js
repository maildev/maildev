/* global describe, it */

var _ = require('underscore');

var assert = require('assert');
var store = require('../lib/storage');

describe('storage', function() {

  beforeEach(function(){
    store.reset();
  });

  describe('factory method', function() {

    it('should not override push metod if no limit provided', function() {
      //when
      try {
        store.setLimit();
      } catch(error) {}

      //then
      assert.equal(store.push, Array.prototype.push);
    });

    it('should not override push metod if limit is NaN', function() {
      //when
      try {
        store.setLimit("4");
      } catch(error) {}

      //then
      assert.equal(store.push, Array.prototype.push);
    });

    it('should not override push metod if limit is negative number', function() {
      //when
      try {
        store.setLimit(-1);
      } catch(error) {}

      //then
      assert.equal(store.prototype, [].prototype);
    });

  });

  describe('limits', function() {

    it('should limit elements if multiple elements are pushed', function(done) {
      //given
      store.setLimit(5);
      var removedItems = [];

      store.on('delete', function(item){
        removedItems.push(item);

        //then
        if(removedItems.length === 2){
          assert.ok(removedItems.indexOf(1) != -1);
          assert.ok(removedItems.indexOf(2) != -1);
          done();
        }
      });

      //when
      store.push(1, 2, 3);
      store.push(4, 5, 6, 7);
    });

    it('should limit elements when arg.length > limit', function(done) {
      //given
      store.setLimit(5);
      var removedItems = [];

      store.on('delete', function(item){
        removedItems.push(item);

        //then
        if(removedItems.length === 3){
          assert.ok(removedItems.indexOf(1) != -1);
          assert.ok(removedItems.indexOf(2) != -1);
          assert.ok(removedItems.indexOf(3) != -1);
          done();
        }
      });

      //when
      store.push(1, 2, 3);
      store.push(3, 4, 5, 6, 7);
    });

    it('should limit elements', function(done) {
      //given
      store.setLimit(5);
      store.on('delete', function(item){
        //then
        assert.equal(item, 1);
        done();
      });

      //when
      store.push(1, 2, 3, 4, 5);
      store.push(6);
    });

  });

});
