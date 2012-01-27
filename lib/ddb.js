// Copyright Stanislas Polu and other Contributors
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
  my.port = spec.port || 80;
  
  my.inAuth = false;
  my.consumedCapacity = 0;
  my.schemaTypes = { number: 'N', 
                     string: 'S', 
                     number_array: 'NS',
                     string_array: 'SS' };

  // public
  var createTable;
  var listTables;
  var describeTable;
  var deleteTable;
  var updateTable;

  var getItem;
  var putItem;
  var deleteItem;

  var scan;

  //var batchGetItem;
  //var query;
  //var updateItem;
  
  // private
  var toDDB;
  var fromDDB;
  var execute;
  var auth;
  

  var that = new events.EventEmitter();
  that.setMaxListeners(0);

  /**
   * The CreateTable operation adds a new table to your account.
   * It returns details of the table.
   * @param name the name of the table
   * @param keySchema {hash: [attribute, type]} or {hash: [attribute, type], range: [attribute, type]}
   * @param provisionedThroughput {write: X, read: Y}
   * @param cb callback(err, tableDetails) err is set if an error occured
   */
  createTable = function(tableName, keySchema, provisionedThroughput, cb) {
    var data = { TableName: tableName, 
                 KeySchema: {}, 
                 ProvisionedThroughput: {} };    
    if(keySchema.hash && keySchema.hash.length == 2) {
      data.KeySchema.HashKeyElement = { AttributeName: keySchema.hash[0], 
                                        AttributeType: keySchema.hash[1] };
    }
    if (keySchema.range && keySchema.range.length == 2) {
      data.KeySchema.RangeKeyElement = { AttributeName: keySchema.range[0], 
                                         AttributeType: keySchema.range[1] };
    }
    if(provisionedThroughput) {
      if(provisionedThroughput.read)
        data.ProvisionedThroughput.ReadCapacityUnits = provisionedThroughput.read;
      if(provisionedThroughput.write)
        data.ProvisionedThroughput.WriteCapacityUnits = provisionedThroughput.write;
    }
    execute('CreateTable', data, function(err, res) {
        if(err) { cb(err) }
        else {
          cb(null, res.TableDescription);
        }
      });
  };

  /**
   * Updates the provisioned throughput for the given table.
   * It returns details of the table.
   * @param name the name of the table
   * @param provisionedThroughput {write: X, read: Y}
   * @param cb callback(err, tableDetails) err is set if an error occured
   */
  updateTable = function(tableName, provisionedThroughput, cb) {
    var data = { TableName: tableName, 
                 ProvisionedThroughput: {} };
    if(provisionedThroughput) {
      if(provisionedThroughput.read)
        data.ProvisionedThroughput.ReadCapacityUnits = provisionedThroughput.read;
      if(provisionedThroughput.write)
        data.ProvisionedThroughput.WriteCapacityUnits = provisionedThroughput.write;
    }
    execute('UpdateTable', data, function(err, res) {
        if(err) { cb(err) }
        else {
          cb(null, res.TableDescription);
        }
      });
  };

  /**
   * The DeleteTable operation deletes a table and all of its items
   * It returns details of the table
   * @param name the name of the table
   * @param cb callback(err, tableDetails) err is set if an error occured
   */
  deleteTable = function(tableName, cb) {
    var data = { TableName: tableName };
    execute('DeleteTable', data, function(err, res) {
        if(err) { cb(err) }
        else {
          cb(null, res.TableDescription);
        }
      });
  };

  /**
   * returns an array of all the tables associated with the current account and endpoint
   * @param options {limit, exclusiveStartTableName}
   * @param cb callback(err, tables) err is set if an error occured
   */
  listTables = function(options, cb) {
    var data = {};
    if(options.limit)
      data.Limit = options.limit;
    if(options.exclusiveStartTableName)
      data.ExclusiveStartTableName = options.exclusiveStartTableName;
    execute('ListTables', data, cb);
  };


  /**
   * returns information about the table, including the current status of the table, 
   * the primary key schema and when the table was created
   * @param table the table name
   * @param cb callback(err, tables) err is set if an error occured   
   */
  describeTable = function(table, cb) {
    var data = { TableName: table };
    execute('DescribeTable', data, function(err, res) {
        if(err) { cb(err) }
        else {
          cb(null, res.Table);
        }
      });
  };

  /**
   * returns a set of Attributes for an item that matches the primary key.
   * @param table the tableName
   * @param hash the hashKey
   * @param range the rangeKey
   * @param options {attributesToGet, consistentRead}
   * @param cb callback(err, tables) err is set if an error occured   
   */   
  getItem = function(table, hash, range, options, cb) {
    try {
      var data = { TableName: table };
      var key = { "HashKeyElement": hash };
      if(typeof range !== 'undefined' &&
         range !== null)  {
        key.RangeKeyElement = range;
      }
      data.Key = toDDB(key);
      if(options.attributesToGet) {
        data.AttributesToGet = options.attributesToGet;
      }
      if(options.consistentRead) {
        data.ConsistentRead = options.consistentRead;
      }
      execute('GetItem', data, function(err, res) {
          if(err) { cb(err) }
          else {
            my.consumedCapacity += res.ConsumedCapacityUnits;
            cb(null, fromDDB(res.Item), res.ConsumedCapacityUnits);
          }
        });  
    } 
    catch(err) { 
      cb(err);
    }        
  };


  /**
   * Creates a new item, or replaces an old item with a new item 
   * (including all the attributes). If an item already exists in the 
   * specified table with the same primary key, the new item completely 
   * replaces the existing item.
   * putItem expects a dictionary (item) containing only strings and numbers
   * This object is automatically converted into the expxected Amazon JSON
   * format for convenience.
   * @param table the tableName
   * @param item the item to put (string/number/string array dictionary)
   * @param options {expected, returnValues}
   * @param cb callback(err, tables) err is set if an error occured   
   */
  putItem = function(table, item, options, cb) {
    try {
      var data = { TableName: table,
                   Item: toDDB(item) };
      //console.log('ITEM:==' + JSON.stringify(data) + '==');
      if(options.expected) {
        data.Expected = {};
        for(var i in options.expected) {
          data.Expected[i] = {};
          if(typeof options.expected[i].exists === 'boolean') {
            data.Expected[i].Exists = options.expected[i].exists;            
          }
          if(typeof options.expected[i].value !== 'undefined') {
            data.Expected[i].Value = toDDB({ val: options.expected[i].value}).val;
          }
        }
      }
      if(options.returnValues) {
        data.ReturnValues = options.returnValues;
      }
      execute('PutItem', data, function(err, res) {
          if(err) { cb(err) }
          else {          
            my.consumedCapacity += res.ConsumedCapacityUnits;
            cb(null, fromDDB(res.Attributes), res.ConsumedCapacityUnits);
          }
        });  
    } 
    catch(err) { 
      cb(err);
    }      
  };


  /**
   * deletes a single item in a table by primary key. You can perform a conditional 
   * delete operation that deletes the item if it exists, or if it has an expected 
   * attribute value.
   * @param table the tableName
   * @param hash the hashKey
   * @param range the rangeKey
   * @param options {expected, returnValues}
   * @param cb callback(err, tables) err is set if an error occured   
   */   
  deleteItem = function(table, hash, range, options, cb) {
    try {
      var data = { TableName: table };
      var key = { "HashKeyElement": hash };
      if(typeof range !== 'undefined' &&
         range !== null)  {
        key.RangeKeyElement = range;
      }
      data.Key = toDDB(key);
      if(options.expected) {
        data.Expected = {};
        for(var i in options.expected) {
          data.Expected[i] = {};
          if(typeof options.expected[i].exists === 'boolean') {
            data.Expected[i].Exists = options.expected[i].exists;            
          }
          if(typeof options.expected[i].value !== 'undefined') {
            data.Expected[i].Value = toDDB({ val: options.expected[i].value}).val;
          }
        }
      }
      if(options.returnValues)
        data.ReturnValues = options.returnValues;
      execute('DeleteItem', data, function(err, res) {
          if(err) { cb(err) }
          else {
            my.consumedCapacity += res.ConsumedCapacityUnits;
            cb(null, fromDDB(res.Attributes), res.ConsumedCapacityUnits);
          }
        });  
    } 
    catch(err) { 
      cb(err);
    }        
  };


  /**
   * returns one or more items and its attributes by performing a full scan of a table.
   * @param table the tableName
   * @param options {attributesToGet, limit, count, scanFilter, exclusiveStartKey}
   * @param cb callback(err, {count, items, lastEvaluatedKey}) err is set if an error occured
   */   
  scan = function(table, options, cb) {
    var data = { TableName: table };
    if(options.attributesToGet) {
      data.AttributesToGet = options.attributesToGet;
    }
    if(options.limit) {
      data.Limit = options.limit;
    }
    if(options.count){
      data.Count = options.count;
    }
    if(options.exclusiveStartKey && options.exclusiveStartKey.hash){
      data.exclusiveStartKey = { HashKeyElement: toDDB(options.exclusiveStartKey.hash) };
    }
    if(options.exclusiveStartKey && options.exclusiveStartKey.range){
      data.exclusiveStartKey = { RangeKeyElement: toDDB(options.exclusiveStartKey.range) };
    }
    if(options.filter) {
      data.ScanFilter = {}
      for(var attr in options.filter) {
        if(options.filter.hasOwnProperty(attr)) {
          if(options.filter[attr].eq)
            data.ScanFilter[attr] = {"AttributeValueList":[toDDB(options.filter.eq)],"ComparisonOperator":"EQ"};
          if(options.filter[attr].ne)
            data.ScanFilter[attr] = {"AttributeValueList":[toDDB(options.filter.ne)],"ComparisonOperator":"NE"};
          if(options.filter[attr].le)
            data.ScanFilter[attr] = {"AttributeValueList":[toDDB(options.filter.le)],"ComparisonOperator":"LE"};
          if(options.filter[attr].lt)
            data.ScanFilter[attr] = {"AttributeValueList":[toDDB(options.filter.lt)],"ComparisonOperator":"LT"};
          if(options.filter[attr].ge)
            data.ScanFilter[attr] = {"AttributeValueList":[toDDB(options.filter.ge)],"ComparisonOperator":"GE"};
          if(options.filter[attr].gt)
            data.ScanFilter[attr] = {"AttributeValueList":[toDDB(options.filter.gt)],"ComparisonOperator":"GT"};
          if(options.filter[attr].eq)
            data.ScanFilter[attr] = {"AttributeValueList":[toDDB(options.filter.eq)],"ComparisonOperator":"EQ"};
          if(options.filter[attr]['not_null'])
            data.ScanFilter[attr] = {"AttributeValueList":[],"ComparisonOperator":"NOT_NULL"};
          if(options.filter[attr]['null'])
            data.ScanFilter[attr] = {"AttributeValueList":[],"ComparisonOperator":"NULL"};
          if(options.filter[attr].contains)
            data.ScanFilter[attr] = {"AttributeValueList":[toDDB(options.filter.contains)],"ComparisonOperator":"CONTAINS"};
          if(options.filter[attr]['not_contains'])
            data.ScanFilter[attr] = {"AttributeValueList":[toDDB(options.filter[attr]['not_contains'])],"ComparisonOperator":"NOT_CONTAINS"};
          if(options.filter[attr]['begins_with'])
            data.ScanFilter[attr] = {"AttributeValueList":[toDDB(options.filter[attr]['begins_with'])],"ComparisonOperator":"BEGINS_WITH"};
          if(options.filter[attr].in)
            data.ScanFilter[attr] = {"AttributeValueList":[toDDB(options.filter[attr].in)],"ComparisonOperator":"IN"};
          if(Array.isArray(options.filter[attr].between) && options.filter[attr].between.length == 2)
            data.ScanFilter[attr] = {"AttributeValueList":[toDDB(options.filter[attr].between[0]), toDDB(options.filter[attr].between[1])],"ComparisonOperator":"BETWEEN"};
        }
      }
    }
    execute('Scan', data, function(err, res) {
        if(err) { cb(err) }
        else {
          my.consumedCapacity += res.ConsumedCapacityUnits;
          var r = { count: res.Count,
                    items: [],
                    lastEvaluatedKey: {},
                    scannedCount: res.ScannedCount };
          if(Array.isArray(res.Items)) {
            for(var i = 0; i < res.Items.length; i++) {
              r.items.push(fromDDB(res.Items[i]));
            }
          }
          if(res.LastEvaluatedKey && res.LastEvaluatedKey.HashKeyElement){
            r.lastEvaluatedKey.hash = fromDDB(res.LastEvaluatedKey.HashKeyElement);
          }
          if(res.LastEvaluatedKey && res.LastEvaluatedKey.RangeKeyElement){
            r.lastEvaluatedKey.range = fromDDB(res.LastEvaluatedKey.RangeKeyElement);
          }
          cb(null, r, res.ConsumedCapacityUnits);
        }
      });
  };

  //-- INTERNALS --//

  /**
   * converts a flat string or number JSON object
   * to an amazon DynamoDB compatible JSON object
   * @param json the JSON object
   * @throws an error if input object is not compatible
   * @return res the converted object
   */
  toDDB = function(json) {
    if(typeof json === 'object') {
      var res = {};
      for(var i in json) {        
        if(json.hasOwnProperty(i)) {
          if(typeof json[i] === 'number')
            res[i] = { "N": json[i].toString() };
          else if(typeof json[i] === 'string' &&
                  json[i].length > 0)
            res[i] = { "S": json[i].toString() };                    
          else if(Array.isArray(json[i]) && 
                  json[i].length > 0) {
            var arr = [];
            for(var j= 0; j < json[i].length; j++) {
              var isSS;
              if(typeof json[i][j] === 'string') {                
                arr[j] = json[i][j];
                iSS = true;
              }
              if(typeof json[i][j] === 'number') {
                arr[j] = json[i][j].toString();
                iSS = false;
              }
            }
            if(iSS)
              res[i] = { "SS": arr };
            else
              res[i] = { "NS": arr };              
          }
          else 
            throw new Error('Non Compatible Field [not string|number|string array|number array]: ' + i);
        }
      }
      return res;
    }
    else
      return json;
  };

  /**
   * convetts a DynamoDB compatible JSON object into
   * a native JSON object
   * @param ddb the ddb JSON object
   * @throws an error if input object is not compatible
   * @return res the converted object
   */
  fromDDB = function(ddb) {
    if(typeof ddb === 'object') {
      var res = {};
      for(var i in ddb) {
        if(ddb.hasOwnProperty(i)) {
          if(ddb[i]['S'])
            res[i] = ddb[i]['S'];
          else if(ddb[i]['SS'])
            res[i] = ddb[i]['SS'];
          else if(ddb[i]['N'])
            res[i] = parseFloat(ddb[i]['N']);
          else if(ddb[i]['NS']) {
            res[i] = [];
            for(var j = 0; j < ddb[i]['NS'].length; j ++) {
              res[i][j] = parseFloat(ddb[i]['NS'][j]);
            }
          }
          else
            throw new Error('Non Compatible Field [not "S"|"N"|"NS"|"SS"]: ' + i);
        }
      }
      return res;
    }
    else
      return ddb;
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
          sha.update(new Buffer(sts,'utf8'));
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
                          'content-length': Buffer.byteLength(rqBody,'utf8') };

          var options = { host: my.endpoint,
                          port: my.port,
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
                      var err = new Error(op + ' [' + res.statusCode + ']: ' + (json.message || json['__type']));
                      err.type = json['__type'];
                      err.data = json;
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
    if(my.access && my.access.expiration.getTime() < ((new Date).getTime() + 2000)) {
      //console.log('CLEAR AUTH: ' + my.access.expiration + ' ' + new Date);
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

  fwk.method(that, 'createTable', createTable, _super);
  fwk.method(that, 'listTables', listTables, _super);
  fwk.method(that, 'describeTable', describeTable, _super);
  fwk.method(that, 'updateTable', updateTable, _super);
  fwk.method(that, 'deleteTable', deleteTable, _super);

  fwk.method(that, 'putItem', putItem, _super);
  fwk.method(that, 'getItem', getItem, _super);
  fwk.method(that, 'deleteItem', deleteItem, _super);
  
  fwk.method(that, 'scan', scan, _super);


  fwk.getter(that, 'consumedCapacity', my, 'consumedCapacity');
  fwk.getter(that, 'schemaTypes', my, 'schemaTypes');

  return that;
};


exports.ddb = ddb;