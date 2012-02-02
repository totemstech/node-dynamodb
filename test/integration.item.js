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

var seq = [
           function(next) {
             ddb.putItem(cfg['DYNAMODB_TEST_TABLE'], item, {}, function(err, res, cap) {
                 if(err)
                   console.log(err);
                 assert.equal(err, null, 'putItem error occured');    
                 next();
               });
           },
           
           function(next) {
             ddb.getItem(cfg['DYNAMODB_TEST_TABLE'], '3d2d696', null, { consistentRead: true }, function(err, res, cap) {
                 if(err)
                   console.log(err);
                 assert.equal(err, null, 'getItem error occured');
                 assert.deepEqual(res, item, 'getitem item mismatch');                  
                 next();                  
               });              
           },

           function(next) {
             ddb.updateItem(cfg['DYNAMODB_TEST_TABLE'], '3d2d696', null,
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
             ddb.getItem(cfg['DYNAMODB_TEST_TABLE'], '3d2d696', null, { consistentRead: true }, function(err, res, cap) {
                 if(err)
                   console.log(err);
                 assert.equal(err, null, 'getItem error occured');
                 assert.deepEqual(res, updt, 'getitem item mismatch');                  
                 next();                  
               });              
           },

           function(next) {
             ddb.deleteItem(cfg['DYNAMODB_TEST_TABLE'], '3d2d696', null, {returnValues: 'ALL_OLD'}, 
                            function(err, res, cap) {
                              if(err)
                                console.log(err);
                              assert.equal(err, null, 'getItem error occured');
                              assert.deepEqual(res, updt, 'getitem item mismatch');                  
                              next();                  
                            });              
           },

           function(next) {
             ddb.getItem(cfg['DYNAMODB_TEST_TABLE'], '3d2d696', null, { consistentRead: true }, function(err, res, cap) {
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

