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
 * get_item.js
 * 
 * getItem returns a flat JSON object made of string and number. It automatically
 * converts the returned Amazon JSON format for convenience.
 *
 * Command: GetItem
 * @param table [string] the table name
 * @param hash  [string|number] the hashKey
 * @param range [string|number] the optional rangeKey
 * @param options the DynamoDB options for GetItem as a dictionary
 *                attributesToGet         An array of string representing the name
 *                                        of the attributes to get
 *                consistentRead          Boolean value wether or not the read
 *                                        should be consistent
 * @param cb asynchronous callback:
 *                err:         [Error] if an error occured or null
 *                res:         [Object] A dictionary containing the item
 *                                      The object is automatically converted from
 *                                      Amazon JSON format
 *                cap:         [number] the number of read capacity units consumed
 *                                      by the operation
 */

var ddb = require('../lib/ddb.js').ddb({ accessKeyId:     'ACCESS_KEY_ID',
                                         secretAccessKey: 'SECRET_ACCESS_KEY' });


// Simple

ddb.getItem('test', '3d2d69', null, {}, function(err, res, cap) {
    if(err)
      console.log(err);
    else {
      console.log('GetItem: ' + cap);
      console.log(res);
    }
  });

ddb.getItem('test', 'ffa53', 'A', {}, function(err, res, cap) {
    if(err)
      console.log(err);
    else {
      console.log('GetItem: ' + cap);
      console.log(res);
    }
  });

ddb.getItem('test', '91d2eb', 2012, {}, function(err, res, cap) {
    if(err)
      console.log(err);
    else {
      console.log('GetItem: ' + cap);
      console.log(res);
    }
  });


// With Options

var options = { attributesToGet: ['sha', 'usr'],
                consistentRead: true };

ddb.getItem('test', '91d2eb', 2012, options, function(err, res, cap) {
    if(err)
      console.log(err);
    else {
      console.log('GetItem: ' + cap);
      console.log(res);
    }
  });

