## Basics

Very early stage DynamoDB library for Node.js

Currently supports the following operations:
   
    ListTables
    DescribeTable
    GetItem
    PutItem
    DeleteItem

Authentication is made (and refreshed) on demand

## Usage

    var ddb = require('../lib/ddb.js').ddb({ accessKeyId: '',
                                             secretAccessKey: '' });
    
    ddb.listTables({}, function(err, res) {});
    ddb.describeTable('a-table', function(err, res) {});

    // flat string and number based json object
    var item = { date: 304,
                 sha:  'sha',
                 user: 'spolu' };
    
    ddb.putItem('a-table', item, {}, function(err, res, cap) {});
    ddb.getItem('a-table', 'sha', null, {}, function(err, res, cap) {});
    ddb.deleteItem('a-table', 'sha', null, {}, function(err, res, cap) {});

    ddb.consumedCapacity();

