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
 * @param spec {secretAccessKey, accessKeyId, endpoint, agent, sessionToken, sessionExpires}
 */

var ddb = function(spec, my) {
  my = my || {};
  var _super = {};

  my.accessKeyId = spec.accessKeyId;
  my.secretAccessKey = spec.secretAccessKey;
  my.endpoint = spec.endpoint || 'dynamodb.us-east-1.amazonaws.com';
  my.port = spec.port || 80;
  my.agent = spec.agent;

  my.retries = spec.retries || 3; 

  // Use already obtained temporary session credentials
  if(spec.sessionToken && spec.sessionExpires) {
    my.access = { sessionToken: spec.sessionToken,
                  secretAccessKey: spec.secretAccessKey,
                  accessKeyId: spec.accessKeyId,
                  expiration: spec.sessionExpires };
  }
  
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
  var updateItem;
  var query;
  var scan;
  var batchGetItem;
  var batchWriteItem;

  // private
  var scToDDB;
  var objToDDB;
  var objFromDDB;
  var arrFromDDB;
  var execute;
  var auth;


  var that = new events.EventEmitter();
  that.setMaxListeners(0);


  /**
   * The CreateTable operation adds a new table to your account.
   * It returns details of the table.
   * @param table the name of the table
   * @param keySchema {hash: [attribute, type]} or {hash: [attribute, type], range: [attribute, type]}
   * @param provisionedThroughput {write: X, read: Y}
   * @param cb callback(err, tableDetails) err is set if an error occured
   */
  createTable = function(table, keySchema, provisionedThroughput, cb) {
    var data = {};
    data.TableName = table;
    data.KeySchema = {};
    data.ProvisionedThroughput = {};
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
   * @param table the name of the table
   * @param provisionedThroughput {write: X, read: Y}
   * @param cb callback(err, tableDetails) err is set if an error occured
   */
  updateTable = function(table, provisionedThroughput, cb) {
    var data = {};
    data.TableName = table;
    data.ProvisionedThroughput = {};
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
   * @param table the name of the table
   * @param cb callback(err, tableDetails) err is set if an error occured
   */
  deleteTable = function(table, cb) {
    var data = {};
    data.TableName = table;
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
    var data = {};
    data.TableName = table;
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
    var data = {};
    try {
      data.TableName = table;
      var key = { "HashKeyElement": hash };
      if(typeof range !== 'undefined' &&
         range !== null)  {
        key.RangeKeyElement = range;
      }
      data.Key = objToDDB(key);
      if(options.attributesToGet) {
        data.AttributesToGet = options.attributesToGet;
      }
      if(options.consistentRead) {
        data.ConsistentRead = options.consistentRead;
      }
    }
    catch(err) {
      cb(err);
      return;
    }
    execute('GetItem', data, function(err, res) {
        if(err) { cb(err) }
        else {
          my.consumedCapacity += res.ConsumedCapacityUnits;
          try {
            var item = objFromDDB(res.Item);
          }
          catch(err) {
            cb(err);
            return;
          }
          cb(null, item, res.ConsumedCapacityUnits);
        }
      });
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
   * @param cb callback(err, attrs, consumedCapUnits) err is set if an error occured
   */
  putItem = function(table, item, options, cb) {
    var data = {};
    try {
      data.TableName = table;
      data.Item = objToDDB(item);
      //console.log('ITEM:==' + JSON.stringify(data) + '==');
      if(options.expected) {
        data.Expected = {};
        for(var i in options.expected) {
          data.Expected[i] = {};
          if(typeof options.expected[i].exists === 'boolean') {
            data.Expected[i].Exists = options.expected[i].exists;
          }
          if(typeof options.expected[i].value !== 'undefined') {
            data.Expected[i].Value = scToDDB(options.expected[i].value);
          }
        }
      }
      if(options.returnValues) {
        data.ReturnValues = options.returnValues;
      }
    }
    catch(err) {
      cb(err);
      return;
    }
    execute('PutItem', data, function(err, res) {
        if(err) { cb(err) }
        else {
          my.consumedCapacity += res.ConsumedCapacityUnits;
          try {
            var attr = objFromDDB(res.Attributes);
          }
          catch(err) {
            cb(err);
            return;
          }
          cb(null, attr, res.ConsumedCapacityUnits);
        }
      });
  };


  /**
   * deletes a single item in a table by primary key. You can perform a conditional
   * delete operation that deletes the item if it exists, or if it has an expected
   * attribute value.
   * @param table the tableName
   * @param hash the hashKey
   * @param range the rangeKey
   * @param options {expected, returnValues}
   * @param cb callback(err, attrs, consumedCapUnits) err is set if an error occured
   */
  deleteItem = function(table, hash, range, options, cb) {
    var data = {};
    try {
      data.TableName = table;
      var key = { "HashKeyElement": hash };
      if(typeof range !== 'undefined' &&
         range !== null)  {
        key.RangeKeyElement = range;
      }
      data.Key = objToDDB(key);
      if(options.expected) {
        data.Expected = {};
        for(var i in options.expected) {
          data.Expected[i] = {};
          if(typeof options.expected[i].exists === 'boolean') {
            data.Expected[i].Exists = options.expected[i].exists;
          }
          if(typeof options.expected[i].value !== 'undefined') {
            data.Expected[i].Value = scToDDB(options.expected[i].value);
          }
        }
      }
      if(options.returnValues)
        data.ReturnValues = options.returnValues;
    }
    catch(err) {
      cb(err);
      return;
    }
    execute('DeleteItem', data, function(err, res) {
        if(err) { cb(err) }
        else {
          my.consumedCapacity += res.ConsumedCapacityUnits;
          try {
            var attr = objFromDDB(res.Attributes);
          }
          catch(err) {
            cb(err);
            return;
          }
          cb(null, attr, res.ConsumedCapacityUnits);
        }
      });
  };


  /**
   * Updates an item with the supplied update orders.
   * @param table the tableName
   * @param hash the hashKey
   * @param range optional rangeKey
   * @param updates dictionary of attributeNames to { value: XXX, action: 'PUT|ADD|DELETE' }
   * @param options {expected, returnValues}
   * @param cb callback(err, attrs, consumedCapUnits) err is set if an error occured
   */
  updateItem = function(table, hash, range, updates, options, cb) {
    var data = {};
    try {
      data.TableName = table;
      var key = { "HashKeyElement": hash };
      if(typeof range !== 'undefined' &&
         range !== null)  {
        key.RangeKeyElement = range;
      }
      data.Key = objToDDB(key);
      if(options.expected) {
        data.Expected = {};
        for(var i in options.expected) {
          data.Expected[i] = {};
          if(typeof options.expected[i].exists === 'boolean') {
            data.Expected[i].Exists = options.expected[i].exists;
          }
          if(typeof options.expected[i].value !== 'undefined') {
            data.Expected[i].Value = scToDDB(options.expected[i].value);
          }
        }
      }
      if(typeof updates === 'object') {
        data.AttributeUpdates = {};
        for(var attr in updates) {
          if(updates.hasOwnProperty(attr)) {
            data.AttributeUpdates[attr] = {};
            if(typeof updates[attr].action === 'string')
              data.AttributeUpdates[attr]["Action"] = updates[attr].action;
            if(typeof updates[attr].value !== 'undefined')
              data.AttributeUpdates[attr]["Value"] = scToDDB(updates[attr].value);
          }
        }
      }
      if(options.returnValues) {
        data.ReturnValues = options.returnValues;
      }
    }
    catch(err) {
      cb(err);
      return;
    }
    //console.log(require('util').inspect(data, false, 20));
    execute('UpdateItem', data, function(err, res) {
        if(err) { cb(err) }
        else {
          my.consumedCapacity += res.ConsumedCapacityUnits;
          try {
            var attr = objFromDDB(res.Attributes);
          }
          catch(err) {
            cb(err);
            return;
          }
          cb(null, attr, res.ConsumedCapacityUnits);
        }
      });
  };


  /**
   * An object representing a table query, or an array of such objects
   * { 'table': { keys: [1, 2, 3], attributesToGet: ['user', 'status'] } }
   *           or keys: [['id', 'range'], ['id2', 'range2']] 
   * @param cb callback(err, tables) err is set if an error occured
   */
  batchGetItem = function(request, cb) {
    var data = {};
    try {
      data.RequestItems = {};
      for(var table in request) {
        if(request.hasOwnProperty(table)) {
          var parts = Array.isArray(request[table]) ? request[table] : [request[table]];
          
          for(var i = 0; i < parts.length; ++i) {
            var part = parts[i];
            var tableData = {Keys: []};
            var hasRange = Array.isArray(part.keys[0]);

            for(var j = 0; j < part.keys.length; j++) {
              var key = part.keys[j];
              var keyData = hasRange ? {"HashKeyElement": scToDDB(key[0]), "RangeKeyElement": scToDDB(key[1])} : {"HashKeyElement": scToDDB(key)};
              tableData.Keys.push(keyData);
            }

            if (part.attributesToGet) {
              tableData.AttributesToGet = part.attributesToGet;
            }
            data.RequestItems[table] = tableData;
          }
        }
      }
    }
    catch(err) {
      cb(err);
      return;
    }
    execute('BatchGetItem', data, function(err, res) {
        if(err) { cb(err) }
        else {
          var consumedCapacity = 0;
          for(var table in res.Responses) {
            var part = res.Responses[table];
            var cap = part.ConsumedCapacityUnits;
            if (cap) {
              consumedCapacity += cap;
            }
            if (part.Items) {
              try {
                part.items = arrFromDDB(part.Items);
              }
              catch(err) {
                cb(err);
                return;
              }
              delete part.Items;
            }
            if (res.UnprocessedKeys[table]) {
              part.UnprocessedKeys = res.UnprocessedKeys[table];
            }
          }
          my.consumedCapacity += consumedCapacity;
          if (parts.length == 1) {
            var smartResponse = res.Responses[table];
            cb(null, smartResponse, consumedCapacity);
          }
          else {
            cb(null, res.Responses, consumedCapacity);
          }
        }
      });
  };

  /**
   * Put or delete several items across multiple tables
   * @param putRequest dictionnary { 'table': [item1, item2, item3], 'table2': item }
   * @param deleteRequest dictionnary { 'table': [key1, key2, key3], 'table2': [[id1, range1], [id2, range2]] }
   * @param cb callback(err, res, cap) err is set if an error occured
   */
  batchWriteItem = function(putRequest, deleteRequest, cb) {
    var data = {};
    try {
      data.RequestItems = {};

      for(var table in putRequest) {
        if(putRequest.hasOwnProperty(table)) {
          var items = (Array.isArray(putRequest[table]) ? putRequest[table] : [putRequest[table]]);

          for(var i = 0; i < items.length; i++) {
            data.RequestItems[table] = data.RequestItems[table] || [];
            data.RequestItems[table].push( { "PutRequest": { "Item": objToDDB(items[i]) }} );
          }
        }
      }
   
      for(var table in deleteRequest) {
        if(deleteRequest.hasOwnProperty(table)) {
          var parts = (Array.isArray(deleteRequest[table]) ? deleteRequest[table] : [deleteRequest[table]]);
          
          for(var i = 0; i < parts.length; i++) {
            var part = parts[i];
            var hasRange = Array.isArray(part);
            
            var keyData = hasRange ? {"HashKeyElement": scToDDB(part[0]), "RangeKeyElement": scToDDB(part[1])} : {"HashKeyElement": scToDDB(part)};
            
            data.RequestItems[table] = data.RequestItems[table] || [];
            data.RequestItems[table].push( { "DeleteRequest": { "Key" : keyData }} );
          }
        }
      }
      execute('BatchWriteItem', data, function(err, res) {
        if(err)
          cb(err);
        else {
          var consumedCapacity = 0;
          for(var table in res.Responses) {
            if(res.Responses.hasOwnProperty(table)) {
              var part = res.Responses[table];
              var cap = part.ConsumedCapacityUnits;
              if (cap) {
                consumedCapacity += cap;
              }
            }
          }
          my.consumedCapacity += consumedCapacity;
          cb(null, res.UnprocessedItems, consumedCapacity);
        }
      });
    }
    catch(err) {
      cb(err) 
    }     
  };

  /**
   * returns a set of Attributes for an item that matches the query
   * @param table the tableName
   * @param hash the hashKey
   * @param options {attributesToGet, limit, consistentRead, count, 
   *                 rangeKeyCondition, scanIndexForward, exclusiveStartKey, indexName}
   * @param cb callback(err, tables) err is set if an error occured
   */
  query = function(table, hash, options, cb) {
    var data = {};
    try {
      data.TableName = table;
      data.HashKeyValue = scToDDB(hash)
      if(options.attributesToGet) {
        data.AttributesToGet = options.attributesToGet;
      }
      if(options.limit) {
        data.Limit = options.limit;
      }
      if(options.consistentRead) {
        data.ConsistentRead = options.consistentRead;
      }
      if(options.count && !options.attributesToGet) {
        data.Count = options.count;
      }
      if(options.rangeKeyCondition) {
        for(var op in options.rangeKeyCondition) { // supposed to be only one
          if(typeof op === 'string') {
            data.RangeKeyCondition = {"AttributeValueList":[],"ComparisonOperator": op.toUpperCase()};
            if(op == 'between' &&
               Array.isArray(options.rangeKeyCondition[op]) &&
               options.rangeKeyCondition[op].length > 1) {
              data.RangeKeyCondition.AttributeValueList.push(scToDDB(options.rangeKeyCondition[op][0]));
              data.RangeKeyCondition.AttributeValueList.push(scToDDB(options.rangeKeyCondition[op][1]));
            }
            else {
              data.RangeKeyCondition.AttributeValueList.push(scToDDB(options.rangeKeyCondition[op]));
            }
          }
        }
      }
      if(options.scanIndexForward === false) {
        data.ScanIndexForward = false;
      }
      if(options.exclusiveStartKey && options.exclusiveStartKey.hash) {
        data.ExclusiveStartKey = { HashKeyElement: scToDDB(options.exclusiveStartKey.hash) };
        if(options.exclusiveStartKey.range)
          data.ExclusiveStartKey.RangeKeyElement = scToDDB(options.exclusiveStartKey.range);      
      }
      if(options.indexName) {
        data.IndexName = options.indexName;
      }
    }
    catch(err) {
      cb(err);
      return;
    }
    execute('Query', data, function(err, res) {
        if(err) { cb(err) }
        else {
          my.consumedCapacity += res.ConsumedCapacityUnits;
          var r = { count: res.Count,
                    items: [],
                    lastEvaluatedKey: {}};
          try {
            if (res.Items) {
              r.items = arrFromDDB(res.Items);
            }
            if(res.LastEvaluatedKey) {
              var key = objFromDDB(res.LastEvaluatedKey);
              r.lastEvaluatedKey = { hash: key.HashKeyElement,
                                     range: key.RangeKeyElement };
            }
          }
          catch(err) {
            cb(err);
            return;
          }
          cb(null, r, res.ConsumedCapacityUnits);
        }
      });
  };


  /**
   * returns one or more items and its attributes by performing a full scan of a table.
   * @param table the tableName
   * @param options {attributesToGet, limit, count, scanFilter, exclusiveStartKey}
   * @param cb callback(err, {count, items, lastEvaluatedKey}) err is set if an error occured
   */
  scan = function(table, options, cb) {
    var data = {};
    try {
      data.TableName = table;
      if(options.attributesToGet) {
        data.AttributesToGet = options.attributesToGet;
      }
      if(options.limit) {
        data.Limit = options.limit;
      }
      if(options.count && !options.attributesToGet) {
        data.Count = options.count;
      }
      if(options.exclusiveStartKey && options.exclusiveStartKey.hash) {
        data.ExclusiveStartKey = { HashKeyElement: scToDDB(options.exclusiveStartKey.hash) };
        if(options.exclusiveStartKey.range)
          data.ExclusiveStartKey.RangeKeyElement = scToDDB(options.exclusiveStartKey.range);      
      }
      if(options.filter) {
        data.ScanFilter = {}
        for(var attr in options.filter) {
          if(options.filter.hasOwnProperty(attr)) {
            for(var op in options.filter[attr]) { // supposed to be only one
              if(typeof op === 'string') {
                data.ScanFilter[attr] = {"AttributeValueList":[],"ComparisonOperator": op.toUpperCase()};
                if(op === 'not_null' || op === 'null') {
                  // nothing ot do
                }
                else if((op == 'between' || op == 'in') &&
                        Array.isArray(options.filter[attr][op]) &&
                        options.filter[attr][op].length > 1) {
                  for (var i = 0; i < options.filter[attr][op].length; ++i) {
                    data.ScanFilter[attr].AttributeValueList.push(scToDDB(options.filter[attr][op][i]));
                  }
                }
                else {
                  data.ScanFilter[attr].AttributeValueList.push(scToDDB(options.filter[attr][op]));
                }
              }
            }
          }
        }
      }
    }
    catch(err) {
      cb(err);
      return;
    }
    //console.log(require('util').inspect(data));
    execute('Scan', data, function(err, res) {
        if(err) { cb(err) }
        else {
          my.consumedCapacity += res.ConsumedCapacityUnits;
          var r = { count: res.Count,
                    items: [],
                    lastEvaluatedKey: {},
                    scannedCount: res.ScannedCount };          
          try {
            if(Array.isArray(res.Items)) {
              r.items = arrFromDDB(res.Items);
            }
            if(res.LastEvaluatedKey) {
              var key = objFromDDB(res.LastEvaluatedKey);
              r.lastEvaluatedKey = { hash: key.HashKeyElement,
                                     range: key.RangeKeyElement };
            }
          }
          catch(err) {
            cb(err);
            return;
          }
          cb(null, r, res.ConsumedCapacityUnits);
        }
      });
  };
  


  //-- INTERNALS --//

  /**
   * converts a JSON object (dictionary of values) to an amazon DynamoDB 
   * compatible JSON object
   * @param json the JSON object
   * @throws an error if input object is not compatible
   * @return res the converted object
   */
  objToDDB = function(json) {
    if(typeof json === 'object') {
      var res = {};
      for(var i in json) {
        if(json.hasOwnProperty(i) && json[i] !== null) {
          res[i] = scToDDB(json[i]);
        }
      }
      return res;
    }
    else
      return json;
  };

  
  /**
   * converts a string, string array, number or number array (scalar)
   * JSON object to an amazon DynamoDB compatible JSON object
   * @param json the JSON scalar object
   * @throws an error if input object is not compatible
   * @return res the converted object
   */
  scToDDB = function(value) {
    if (typeof value === 'number') {
      return { "N": value.toString() };
    }
    if (typeof value === 'string') {
      return { "S": value };
    }
    if (Array.isArray(value)) {
      var arr = [];
      var length = value.length;
      var isSS = false;
      for(var i = 0; i < length; ++i) {
        if(typeof value[i] === 'string') {
          arr[i] = value[i];
          isSS = true;
        }
        else if(typeof value[i] === 'number') {
          arr[i] = value[i].toString();
        }
      }
      return isSS ? {"SS": arr} : {"NS": arr};
    }     
    throw new Error('Non Compatible Field [not string|number|string array|number array]: ' + value);
  }


  /**
   * converts a DynamoDB compatible JSON object into
   * a native JSON object
   * @param ddb the ddb JSON object
   * @throws an error if input object is not compatible
   * @return res the converted object
   */
  objFromDDB = function(ddb) {
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
   * converts an array of DynamoDB compatible JSON object into
   * an array of native JSON object
   * @param arr the array of ddb  objects to convert
   * @throws an error if input object is not compatible
   * @return res the converted object
   */
  arrFromDDB = function(arr) {
    var length = arr.length;
    for(var i = 0; i < length; ++i) {
      arr[i] = objFromDDB(arr[i]);
    }
    return arr;
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
                          headers: headers,
                          agent: my.agent };

          var executeRequest = function(cb) {
            var req = http.request(options, function(res) {
                var body = '';
                res.on('data', function(chunk) {
                    body += chunk;
                  });
                res.on('end', function() {
                    if (!cb) {
                      // Do not call callback if it's already been called in the error handler.
                      return;
                    }
                    try {
                      var json = JSON.parse(body);
                    }
                    catch(err) {
                      cb(err);
                      return;
                    }
                    if(res.statusCode >= 300) {
                      var err = new Error(op + ' [' + res.statusCode + ']: ' + (json.message || json['__type']));
                      err.type = json['__type'];
                      err.statusCode = res.statusCode;
                      err.requestId = res.headers['x-amzn-requestid'];
                      err.message = op + ' [' + res.statusCode + ']: ' + (json.message || json['__type']);
                      err.code = err.type.substring(err.type.lastIndexOf("#") + 1, err.type.length);
                      err.data = json;
                      cb(err);
                    }
                    else {
                      cb(null, json);
                    }
                  });
              });

            req.on('error', function(err) {
                cb(err);
                cb = undefined; // Clear callback so we do not call it twice
              });

            req.write(rqBody);
            req.end();
          };

          // see: https://github.com/amazonwebservices/aws-sdk-for-php/blob/master/sdk.class.php
          // for the original php retry logic used here
          (function retry(c) {
            executeRequest(function (err, json) {
              if(err != null) {
                if(err.statusCode === 500 || err.statusCode === 503) {
                  if(c <= my.retries) {
                    setTimeout(function() {
                      retry(c + 1);
                    }, Math.pow(4, c) * 100);
                  }
                  else
                    cb(err);
                }
                else if(err.statusCode === 400 &&
                        err.code === "ProvisionedThroughputExceededException") {
                  if(c === 0) {
                    retry(c + 1);
                  }
                  else if(c <= my.retries && c <= 10) {
                    setTimeout(function() {
                      retry(c + 1);
                    }, Math.pow(2, c-1) * (25 * (Math.random() + 1)));
                  }
                  else
                    cb(err);
                }
                else {
                  cb(err);
                }
              } else {
                cb(null, json);
              }
            });
          })(0);

        }
      });
  };

  /**
   * retrieves a temporary access key and secret from amazon STS
   * @param cb callback(err) err specified in case of error
   */
  auth = function(cb) {
    // auth if necessary and always async
    if(my.access && my.access.expiration.getTime() < ((new Date).getTime() + 60000)) {
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
              //            ((my.access.expiration - new Date) - 60000));

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
  fwk.method(that, 'updateItem', updateItem, _super);
  fwk.method(that, 'query', query, _super);
  fwk.method(that, 'batchGetItem', batchGetItem, _super);
  fwk.method(that, 'batchWriteItem', batchWriteItem, _super);
  fwk.method(that, 'scan', scan, _super);


  // for testing purpose
  fwk.method(that, 'objToDDB', objToDDB, _super);
  fwk.method(that, 'scToDDB', scToDDB, _super);
  fwk.method(that, 'objFromDDB', objFromDDB, _super);
  fwk.method(that, 'arrFromDDB', arrFromDDB, _super);


  fwk.getter(that, 'consumedCapacity', my, 'consumedCapacity');
  fwk.getter(that, 'schemaTypes', my, 'schemaTypes');

  return that;
};


exports.ddb = ddb;
