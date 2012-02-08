// Copyright Teleportd Ltd. and other Contributors
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var fwk = require('fwk');
var assert = require('assert');

var objToDDB = require('../lib/ddb').ddb({accessKeyId: "", secretAccessKey: ""}).objToDDB;
var scToDDB = require('../lib/ddb').ddb({accessKeyId: "", secretAccessKey: ""}).scToDDB;

assert.deepEqual({key : { S : "str"}}, objToDDB({key : "str"}));
assert.deepEqual({key : { N : "1234"}}, objToDDB({key : 1234}));
assert.deepEqual({key : { SS : ["foo"]}}, objToDDB({key : ["foo"]}));
assert.deepEqual({key : { SS : ["foo", "bar"]}}, objToDDB({key : ["foo", "bar"]}));
assert.deepEqual({key : { NS : ["42"]}}, objToDDB({key : [42]}));
assert.deepEqual({key : { NS : ["4", "5", "42"]}}, objToDDB({key : [4, 5, 42]}));
assert.deepEqual({}, objToDDB({key : null}));
assert.deepEqual({"key1":{"S":"str"}}, objToDDB({key1:"str", key : null}));
assert.deepEqual({"key1":{"N":"1234"}}, objToDDB({key1:1234, key : null}));

var expect = {
  str : {"S" : "string"},
  stringSet : { SS : ["foo", "bar"]}
};
assert.deepEqual(expect, objToDDB({str : "string", stringSet : ["foo", "bar"]}));

console.log('objToDDB          : ok');

assert.deepEqual({ SS : ["foo"]}, scToDDB(["foo"]));
assert.deepEqual({ SS : ["foo", "bar"]}, scToDDB(["foo", "bar"]));

console.log('scToDDB           : ok');

