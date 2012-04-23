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

// cfg
var cfg = fwk.populateConfig(require("./config.js").config);

var ddb = require('../lib/ddb').ddb({accessKeyId: cfg['DYNAMODB_ACCESSKEYID'], 
                                     secretAccessKey: cfg['DYNAMODB_SECRETACCESSKEY']});


var toPut = {}
toPut[cfg['DYNAMODB_TEST_TABLE1']] = [{sha: 'blabla', status: 'on'},
                                      {sha: 'bloblo', status: 'off'},
                                      {sha: 'another', status: 'pending'}]; 

var toDelete = {};
toDelete[cfg['DYNAMODB_TEST_TABLE1']] = ['blabla', 'bloblo'];

var toGet = {};
toGet[cfg['DYNAMODB_TEST_TABLE1']] = { keys: ['another', 'blabla', 'bloblo']};

var seq = [
  function(next) {
    ddb.batchWriteItem(toPut,
                       {},
                       function(err, res, cap) {
                         if(err)
                           console.log(err);
                         assert.equal(err, null, 'BatchWriteItem error occured');
                         //console.log('RES: ' + require('util').inspect(res, false, 20));
                         next();
                       });
  },
  function(next) {
    ddb.batchWriteItem({},
                       toDelete,
                       function(err, res, cap) {
                         if(err)
                           console.log(err);
                         assert.equal(err, null, 'BatchWriteItem error occured');
                         //console.log('RES: ' + require('util').inspect(res, false, 20));
                         next();
                       });
  },
  function(next) {
    ddb.batchGetItem(toGet, function(err, res, cap) {
      if(err) console.log(err);
      assert.equal(err, null, 'BatchGetItem error occured');
      //console.log('RES: ' + require('util').inspect(res, false, 20));
      next();
    });
  }
];

(function sdo(seq, i) {
  seq[i](function() {
    if(i+1 < seq.length)
      sdo(seq, i + 1);
    else
      console.log('integration    : ok');
  });
})(seq, 0);