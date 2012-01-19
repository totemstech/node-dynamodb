// Copyright Stanislas Polu
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

var http = require('http');
var https = require('https');
var crypto = require('crypto');
var events = require('events');

var fwk = require('fwk');

/**
 * ddb.js
 *
 */

/**
 * The DynamoDb Object
 *
 * @extends events.EventEmitter
 *
 * @param spec {secretAccessKey, accessKeyId, endpoint}
 */

var ddb = function(spec, my) {  
  my = my || {};
  var _super = {};

  my.accessKeyId = spec.accessKeyId;
  my.secretAccessKey = spec.secretAccessKey;
  my.endpoint = spec.endpoint || 'dynamodb.us-east-1.amazonaws.com';
  
  my.inAuth = false;

  // public
  var listTables;
  var describeTable;
  var batchGetItem;
  var deleteItem;
  var getItem;
  var putItem;
  var query;
  var scan;
  var updateItem;
  //var createTable;
  //var deleteTable;
  //var updateTable;
  
  // private
  var execute;
  var auth;

  var that = new events.EventEmitter();

  /**
   * returns an array of all the tables associated with the current account and endpoint
   * @param spec {limit, exclusiveStartTableName}
   * @param cb callback(err, tables) err is set if an error occured
   */
  listTables = function(spec, cb) {
    var data = {};
    if(spec.limit)
      data.Limit = limit;
    if(spec.exclusiveStartTableName)
      data.ExclusiveStartTableName = exclusiveStartTableName;
    execute('ListTables', data, function(err, res) {
        if(err) { cb(err) }
        else {
          cb(null, res.TableNames);
        }
      });
  };


  /**
   * returns information about the table, including the current status of the table, 
   * the primary key schema and when the table was created
   * @param spec {tableName}
   * @param cb callback(err, tables) err is set if an error occured   
   */
  describeTable = function(spec, cb) {
    var data = { TableName: spec.tableName };
    execute('DescribeTable', data, function(err, res) {
        if(err) { cb(err) }
        else {
          cb(null, res.Table);
        }
      });
  };


  /**
   * executes a constructed request, eventually calling auth.
   * @param request JSON request body
   * @param cb callback(err, result) err specified in case of error
   */
  execute = function(op, data, cb) {    
    auth(function(err) {
        if(err) { cb(err); }
        else {
          var dtStr = (new Date).toUTCString();
          var rqBody = JSON.stringify(data);

          var sts = ('POST' + '\n' +
                     '/' + '\n' + 
                     '' + '\n' +                      
                     ('host'                 + ':' + my.endpoint + '\n' +
                      'x-amz-date'           + ':' + dtStr + '\n' + 
                      'x-amz-security-token' + ':' + my.access.sessionToken + '\n' +
                      'x-amz-target'         + ':' + 'DynamoDB_20111205.' + op + '\n') + '\n' +
                     rqBody);
          
          var sha = crypto.createHash('sha256');
          sha.update(sts);
          var hmac = crypto.createHmac('sha256', my.access.secretAccessKey);
          hmac.update(sha.digest());                        

          var auth = ('AWS3' + ' ' +
                      'AWSAccessKeyId' + '=' + my.access.accessKeyId + ',' +
                      'Algorithm' + '=' + 'HmacSHA256' + ',' +
                      'SignedHeaders' + '=' + 'host;x-amz-date;x-amz-target;x-amz-security-token' + ',' +
                      'Signature' + '=' + hmac.digest(encoding='base64'));

          var headers = { 'Host': my.endpoint,
                          'x-amz-date': dtStr,
                          'x-amz-security-token': my.access.sessionToken,
                          'X-amz-target': 'DynamoDB_20111205.' + op,                          
                          'X-amzn-authorization' : auth,
                          'date': dtStr,
                          'content-type': 'application/x-amz-json-1.0',
                          'content-length': rqBody.length };

          var options = { host: my.endpoint,
                          path: '/',
                          method: 'POST',
                          headers: headers };          

          var req = http.request(options, function(res) {
              var body = '';
              res.on('data', function(chunk) {
                  body += chunk;
                });                            
              res.on('end', function() {
                  try {
                    var json = JSON.parse(body);

                    if(res.statusCode >= 300) {
                      var err = new Error('EXECUTE [' + res.statusCode + ']: ' + json.message);
                      err.type = json['__type'];
                      cb(err);
                    }
                    else {
                      cb(null, json);
                    }
                  }
                  catch(err) {
                    cb(err);
                    return;
                  }
                });              
            })

          req.on('error', function(err) {
              cb(err);
            });            

          req.write(rqBody);
          req.end();
        }
      });    
  };


  /**
   * retrieves a temporary access key and seceret from amazon STS
   * @param cb callback(err) err specified in case of error
   */
  auth = function(cb) {
    // auth if necessary and always async
    if(my.access && my.access.expiration >= new Date) {
      delete my.access;
      my.inAuth = false;
    }
    if(my.access) {
      cb(); 
      return; 
    }        
    that.once('auth', cb);
    if(my.inAuth)
      return;

    my.inAuth = true;
    
    var cqs = ('AWSAccessKeyId'   + '=' + encodeURIComponent(my.accessKeyId) + '&' +
               'Action'           + '=' + 'GetSessionToken' + '&' +               
               'DurationSeconds'  + '=' + '3600' + '&' +
               'SignatureMethod'  + '=' + 'HmacSHA256' + '&' +
               'SignatureVersion' + '=' + '2' + '&' +
               'Timestamp'        + '=' + encodeURIComponent((new Date).toISOString().substr(0, 19) + 'Z') + '&' +
               'Version'          + '=' + '2011-06-15');

    var host = 'sts.amazonaws.com';
    
    var sts = ('GET' + '\n' +
               host  + '\n' + 
               '/'   + '\n' +
               cqs);

    var hmac = crypto.createHmac('sha256', my.secretAccessKey);
    hmac.update(sts);    
    cqs += '&' + 'Signature' + '=' + encodeURIComponent(hmac.digest(encoding='base64'));
               
    https.get({ host: host, path: '/?' + cqs }, function(res) {
        var xml = '';
        res.on('data', function(chunk) {
            xml += chunk;
          });
        res.on('end', function() {

            //console.log(xml);
            var st_r = /\<SessionToken\>(.*)\<\/SessionToken\>/.exec(xml);
            var sak_r = /\<SecretAccessKey\>(.*)\<\/SecretAccessKey\>/.exec(xml);
            var aki_r = /\<AccessKeyId\>(.*)\<\/AccessKeyId\>/.exec(xml);
            var e_r = /\<Expiration\>(.*)\<\/Expiration\>/.exec(xml);

            if(st_r && sak_r && aki_r && e_r) {
              my.access = { sessionToken: st_r[1],
                            secretAccessKey: sak_r[1],
                            accessKeyId: aki_r[1],
                            expiration: new Date(e_r[1]) };

              //console.log('AUTH OK: ' + require('util').inspect(my.access) + '\n' + 
              //            ((my.access.expiration - new Date) - 2000));

              my.inAuth = false;
              that.emit('auth');
            }
            else {
              var tp_r = /\<Type\>(.*)\<\/Type\>/.exec(xml);
              var cd_r = /\<Code\>(.*)\<\/Code\>/.exec(xml);
              var msg_r = /\<Message\>(.*)\<\/Message\>/.exec(xml);
              
              if(tp_r && cd_r && msg_r) {
                var err = new Error('AUTH [' + cd_r[1] + ']: ' + msg_r[1]);
                err.type = tp_r[1];
                err.code = cd_r[1];
                my.inAuth = false;
                that.emit('auth', err);
              }              
              else {
                var err = new Error('AUTH: Unknown Error');
                my.inAuth = false;
                that.emit('auth', err);
              }
            }
          });
        
      }).on('error', function(err) {
          my.inAuth = false;
          that.emit('auth', err);
        });
  };

  fwk.method(that, 'listTables', listTables, _super);
  fwk.method(that, 'describeTable', describeTable, _super);
  
  return that;
};


exports.ddb = ddb;