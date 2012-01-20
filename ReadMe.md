## Basics

A DynamoDB driver for Node.js, with:

- Syntactic sweeteners/mapping to handle Amazon DynamoDB's JSON format in NodeJS
- Efficient and transparent authentication and authentication refresh using Amazon STS
- Currently in production with more than 80 write/s, 60 read/s

Discussion Group: http://groups.google.com/group/node-dynamodb

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
    // res: ['test','foo','bar']

    ddb.describeTable('a-table', function(err, res) {});
    // res: { ... }

    // flat [string, number or string array] based json object
    var item = { score: 304,
                 date: (new Date).getTime(),
                 sha: '3d2d6963',
                 usr: 'spolu',
                 lng: ['node', 'c++'] };
    
    ddb.putItem('a-table', item, {}, function(err, res, cap) {});

    ddb.getItem('a-table', '3d2d6963', null, {}, function(err, res, cap) {});
    // res: { score: 304,
    //        date: (new Date).getTime(),
    //        sha: '3d2d6963',
    //        usr: 'spolu',
    //        lng: ['node', 'c++'] };

    ddb.deleteItem('a-table', 'sha', null, {}, function(err, res, cap) {});

    ddb.consumedCapacity();

