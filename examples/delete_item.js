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
 * delete_item.js
 * 
 * Command: DeleteItem
 * @param table [string] the table name
 * @param hash  [string|number] the hashKey
 * @param range [string|number] the optional rangeKey
 * @param options the DynamoDB options for DeleteItem as a dictionary
 *                expected                A dictionary mapping attribute name
 *                                        to expected existence or value [see 
 *                                        example below]. The expected values can
 *                                        be strings or numbers only. The expected
 *                                        parameter is automatically converted to the
 *                                        Amazon JSON format.
 *                returnValues            [string = 'NONE'|'ALL_OLD'] 'NONE' is
 *                                        default. If 'ALL_OLD' is specified and
 *                                        a value pair has been overwrote, then
 *                                        the old item is returned in the callback.
 *                                        Otherwise nothing is returned 
 * @param cb asynchronous callback:
 *                err:         [Error] if an error occured or null
 *                res:         [Object] A dictionary containing the old item if
 *                                      the returnValues option in set to 'ALL_OLD'
 *                                      The object is automatically converted from
 *                                      Amazon JSON format
 *                cap:         [number] the number of read capacity units consumed
 *                                      by the operation
 */

var ddb = require('../lib/ddb.js').ddb({ accessKeyId:     'ACCESS_KEY_ID',
                                         secretAccessKey: 'SECRET_ACCESS_KEY' });

// Simple

ddb.deleteItem('test', '3d2d69', null, {}, function(err, res, cap) {
    if(err)
      console.log(err);
    else {
      console.log('DeleteItem: ' + cap);
      console.log(res);
    }
  });

ddb.deleteItem('test', 'ffa53', 'A', {}, function(err, res, cap) {
    if(err)
      console.log(err);
    else {
      console.log('DeleteItem: ' + cap);
      console.log(res);
    }
  });

ddb.deleteItem('test', '91d2eb', 2012, {}, function(err, res, cap) {
    if(err)
      console.log(err);
    else {
      console.log('DeleteItem: ' + cap);
      console.log(res);
    }
  });


// With Options

var options = { expected: { score: { exists: false },
                            usr: { value: 'spolu', exists: true } },
                returnValues: 'ALL_OLD' };

ddb.deleteItem('test', '91d2eb', null, options, function(err, res, cap) {
    if(err)
      console.log(err);
    else {
      console.log('DeleteItem: ' + cap);
      console.log(res);
    }
  });
