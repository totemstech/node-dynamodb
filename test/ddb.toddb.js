var assert = require('chai').assert;
var toDDB = require('../lib/ddb').ddb({accessKeyId : "", secretAccessKey : ""}).toDDB;

suite('toDDB', function(){

  test('simple string', function(){
    assert.deepEqual({key : { S : "str"}}, toDDB({key : "str"}));
  });

  test('simple number', function(){
    assert.deepEqual({key : { N : "1234"}}, toDDB({key : 1234}));
  });

  test('string set', function(){
    assert.deepEqual({key : { SS : ["foo"]}}, toDDB({key : ["foo"]}));
    assert.deepEqual({key : { SS : ["foo", "bar"]}}, toDDB({key : ["foo", "bar"]}));
  });

  test('number set', function(){
    assert.deepEqual({key : { NS : ["42"]}}, toDDB({key : [42]}));
    assert.deepEqual({key : { NS : ["4", "5", "42"]}}, toDDB({key : [4, 5, 42]}));
  });

  test('simple string and string set', function() {
    var expect = {
      str : {"S" : "string"},
      stringSet : { SS : ["foo", "bar"]}
    };
    assert.deepEqual(expect, toDDB({str : "string", stringSet : ["foo", "bar"]}));
  });


  test("complex data with metadata", function() {
    var input = {
      counter : {Value : 1, Action : "ADD"},
      string : {Value : "str"}
    };

    var expect = {
      counter : {Value : {"N" : "1"}, Action : "ADD"},
      string : {Value : {"S" : "str"}}
    };

    assert.deepEqual(expect, toDDB(input));
  });

});
