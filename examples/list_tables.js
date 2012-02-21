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

/**
 * list_tables.js
 * 
 * Command: ListTables
 * @param options the DynamoDB options for ListTables as a dictionary
 *                limit                   [number] maximum table names to return
 *                exclusiveStartTableName [string] the name of the table that
 *                                                 starts the list
 * @param cb asynchronous callback:
 *                err:                    [Error] if an error occured or null
 *                res:                    [Object] containing the LastEvaluatedTableName
 *                                                 value and a string array containing the
 *                                                 table names
 */

var ddb = require('../lib/ddb.js').ddb({ accessKeyId:     'ACCESS_KEY_ID',
                                         secretAccessKey: 'SECRET_ACCESS_KEY' });

// Simple 

ddb.listTables({}, function(err, res) {
    if(err) 
      console.log(err);
    else {
      console.log('ListTable:');
      console.log(res);
    }
  });


// With Options

ddb.listTables({ limit: 12,
                 exclusiveStartTableName: 'test' }, function(err, res) {
    if(err) 
      console.log(err);
    else {
      console.log('ListTable from "test":');
      console.log(res);
    }
  });
