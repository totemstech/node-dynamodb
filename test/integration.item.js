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


var item = { date: (new Date).getTime(),
             sha: '3d2d696',
             usr: 'spolu',
             val: 4 };
var updt = { sha: '3d2d696', 
             usr: 'nouser', 
             val: 8 };
var ritem = { date: (new Date).getTime(),
             hash: 'test',
             range: '3d2d696',
             usr: 'spolu',
             val: 4 };

var seq = [
           function(next) {
             ddb.putItem(cfg['DYNAMODB_TEST_TABLE1'], item, {}, function(err, res, cap) {
                 if(err)
                   console.log(err);
                 assert.equal(err, null, 'putItem error occured');    
                 next();
               });
           },
           
           function(next) {
             ddb.getItem(cfg['DYNAMODB_TEST_TABLE1'], '3d2d696', null, { consistentRead: true }, function(err, res, cap) {
                 if(err)
                   console.log(err);
                 assert.equal(err, null, 'getItem error occured');
                 assert.deepEqual(res, item, 'getitem item mismatch');                  
                 next();                  
               });              
           },

           function(next) {
             ddb.updateItem(cfg['DYNAMODB_TEST_TABLE1'], '3d2d696', null,
                            { usr: { value: 'nouser' },
                              date: { action: 'DELETE' },
                              val: { value: 4, action: 'ADD'} },
                            {}, function(err, res, cap) {
                              if(err)
                                console.log(err);
                              assert.equal(err, null, 'updateItem error occured');
                              next();                  
                            });              
           },

           function(next) {
             ddb.getItem(cfg['DYNAMODB_TEST_TABLE1'], '3d2d696', null, { consistentRead: true }, function(err, res, cap) {
                 if(err)
                   console.log(err);
                 assert.equal(err, null, 'getItem error occured');
                 assert.deepEqual(res, updt, 'getitem item mismatch');                  
                 next();                  
               });              
           },

           function(next) {
             ddb.deleteItem(cfg['DYNAMODB_TEST_TABLE1'], '3d2d696', null, {returnValues: 'ALL_OLD'}, 
                            function(err, res, cap) {
                              if(err)
                                console.log(err);
                              assert.equal(err, null, 'getItem error occured');
                              assert.deepEqual(res, updt, 'getitem item mismatch');                  
                              next();                  
                            });              
           },

           function(next) {
             ddb.getItem(cfg['DYNAMODB_TEST_TABLE1'], '3d2d696', null, { consistentRead: true }, function(err, res, cap) {
                 if(err)
                   console.log(err);
                 assert.equal(err, null, 'getItem error occured');
                 assert.equal(res, undefined, 'getItem error occured');
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

