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
 * scan.js
 *
 * scan scans the table and returns a flat JSON version of the objects retrieved. 
 * It automatically converts the returned Amazon JSON format for convenience.
 * 
 * Command: Scan
 * @param table [string] the table name
 * @param options the DynamoDB options for Scan as a dictionary
 *                attributesToGet         An array of string representing the name
 *                                        of the attributes to get
 *                limit                   Maximum number of items to return
 *                count                   Boolean wether the total number of items
 *                                        for the scan operation should be returned
 *                filter                  A dictionary mapping attribute names to 
 *                                        filter objects. Filters objects map a
 *                                        filter operation (eq, ne, le, lt, ge,
 *                                        gt, eq, not_null, null, contains, 
 *                                        not_contains, begins_with, in, between)
 *                                        to a value or an array of value if 
 *                                        applicable
 * @param cb asynchronous callback:
 *                err:         [Error] if an error occured or null
 *                res:         [Object] A dictionary containing the following elemnts:
 *                                      count: number of items in the response
 *                                      items: the items (transformed from DDB format)
 *                                      lastEvaluatedKey: primary key where scan stopped
 *                                      ScannedCount: Total num of items (if count is true)
 *                cap:         [number] the number of read capacity units consumed
 *                                      by the operation
 */

var ddb = require('../lib/ddb.js').ddb({ accessKeyId:     'ACCESS_KEY_ID',
                                         secretAccessKey: 'SECRET_ACCESS_KEY' });


// Simple

ddb.scan('test', {}, function(err, res) {
    if(err) {
      console.log(err);
    } else {
      console.log(res);
    }
  });



// With Options

var options = { limit: 100,
                filter : { date: { ge: 123012398234 } } };

ddb.scan('test', options, function(err, res) {
    if(err) {
      console.log(err);
    } else {
      console.log(res);
    }
  });


var options = { count:true };

ddb.scan('test', options, function(err, res) {
    if(err) {
      console.log(err);
    } else {
      console.log(res);      
    }
  });


var options = { filter : { date: { null: true } } };

ddb.scan('test', options, function(err, res) {
    if(err) {
      console.log(err);
    } else {
      console.log(res);      
    }
  });






