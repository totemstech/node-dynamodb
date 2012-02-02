var fwk = require('fwk');
var assert = require('assert');

var toDDB = require('../lib/ddb').ddb({accessKeyId: "", secretAccessKey: ""}).toDDB;

assert.deepEqual({key : { S : "str"}}, toDDB({key : "str"}));
assert.deepEqual({key : { N : "1234"}}, toDDB({key : 1234}));
assert.deepEqual({key : { SS : ["foo"]}}, toDDB({key : ["foo"]}));
assert.deepEqual({key : { SS : ["foo", "bar"]}}, toDDB({key : ["foo", "bar"]}));
assert.deepEqual({key : { NS : ["42"]}}, toDDB({key : [42]}));
assert.deepEqual({key : { NS : ["4", "5", "42"]}}, toDDB({key : [4, 5, 42]}));

var expect = {
  str : {"S" : "string"},
  stringSet : { SS : ["foo", "bar"]}
};
assert.deepEqual(expect, toDDB({str : "string", stringSet : ["foo", "bar"]}));

console.log('toDDB          : ok');