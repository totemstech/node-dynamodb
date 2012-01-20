## Basics

Early stage DynamoDB library for Node.js, with:

- Syntaxic sweeteners to handle Amazon DynamoDB's JSON format in Node.
- Efficient on-demand authentication and authentication refresh using Amazon STS
- Currently in production with more than 80 write/s, 60 read/s


Supports the following operations:
   
    ListTables
    DescribeTable
    GetItem
    PutItem
    DeleteItem

Any contribution is welcome! There's still a lot of work to be done on how to nicely
map the rather complex syntax of DynamoDB optional aguments into node space!

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

