## Basics

A DynamoDB driver for Node.js, with:

- Syntactic sweeteners/mapping to handle Amazon DynamoDB's JSON format in NodeJS
- Efficient and transparent authentication and authentication refresh using Amazon STS
- Currently in production with more than 80 write/s, 60 read/s

Discussion Group: http://groups.google.com/group/node-dynamodb

Supports the following operations:

    CreateTable
    ListTables
    DescribeTable
    DeleteTable
    UpdateTable

    GetItem
    PutItem
    DeleteItem
    UpdateItem
    Query
    Scan
    BatchGetItem

Any contribution is welcome! There's still a lot of work to be done!

## Usage

    var ddb = require('dynamodb').ddb({ accessKeyId: '',
                                        secretAccessKey: '' });

    ddb.createTable('foo', { hash: ['id', ddb.schemaTypes().string],
                             range: ['time', ddb.schemaTypes().number] },
                    {read: 10, write: 10}, function(err, details) {});
    // res: { "CreationDateTime": 1.310506263362E9,
    //        "KeySchema": { "HashKeyElement": { "AttributeName": "AttributeName1",
    //                                           "AttributeType": "S"},
    //                       "RangeKeyElement": { "AttributeName": "AttributeName2",
    //                                            "AttributeType": "N"} },
    //        "ProvisionedThroughput":{ "ReadCapacityUnits": 5,
    //                                  "WriteCapacityUnits": 10 },
    //        "TableName":"Table1",
    //        "TableStatus":"CREATING" }

    ddb.listTables({}, function(err, res) {});
    // res: { LastEvaluatedTableName: 'bar',
              TableNames: ['test','foo','bar'] }

    ddb.describeTable('a-table', function(err, res) {});
    // res: { ... }

    // flat [string, number, string array or number array] based json object
    var item = { score: 304,
                 date: (new Date).getTime(),
                 sha: '3d2d6963',
                 usr: 'spolu',
                 lng: ['node', 'c++'] };

    ddb.putItem('a-table', item, {}, function(err, res, cap) {});

    ddb.getItem('a-table', '3d2d6963', null, {}, function(err, res, cap) {});
    // res: { score: 304,
    //        date: 123012398234,
    //        sha: '3d2d6963',
    //        usr: 'spolu',
    //        lng: ['node', 'c++'] };

    ddb.deleteItem('a-table', 'sha', null, {}, function(err, res, cap) {});

    ddb.updateItem('a-table', '3d2d6963', null, { 'usr': { value: 'smthg' } }, {},
                   function(err, res, cap) {});

    ddb.consumedCapacity();

    ddb.scan('test', {}, function(err, res) {
        if(err) {
          console.log(err);
        } else {
          console.log(res);
        }
     });
    // res: { count: 23,
    //        lastEvaluatedKey: { hash: '3d2d6963' },
    //        items: [...] };

    ddb.query('test', hash_id, null, function(err, result) {...});

    //range query EQ, GT, GE, LT, LE, STARTS_WITH, BETWEEN
    //BETWEEN is the only one to take 2 values
    ddb.query('test', hash_id, ['GT', 9000], function(err, result) {...});
    ddb.query('test', hash_id, ['BETWEEN, 9000, 10000], function(err, result) {...});

    // options:
    // count: true - only return a count
    // limit:X - limit to X items
    // attributesToGet: ['attr1', 'attr2', ...] - the attributes to get
    // consistentRead: true - force a consistent read
    // forward: false - get items in reverse order
    // startAfter: [hash, range] - usually used in conjunction with limit and the LastEvaluatedKey value returned from a previous query operation
    ddb.query('test', hash_id, null, {options}, function(err, result) {...})

    // Use batchGetItem to get multiple items from a single table with only a hash key:
    ddb.batchGetItem({table: 'test', keys: ['id1', 'id2', 'id3']}, function(err, result) {...});
    // Use batchGetItem to get multiple items from a single table with a hash key and range key:
    ddb.batchGetItem({table: 'test', keys: [['id1', 'range1'], ['id2', 'range2']]}, function(err, result) {...});
    // Use batchGetItem to get multiple items from a multiple tablesrange key:
    var table1 = {table: 'test1', keys: [['id1', 'range1'], ['id2', 'range2']]};
    var table2 = {table: 'test2', keys: ['id1', 'id2''], attributesToGet: ['name']};
    ddb.batchGetItem([table1, table2],function(err, result) {...});


More complete usage can be found in the examples directory

## Run the Tests

Put in your environment:

    export DYNAMODB_ACCESSKEYID=YOURACCESSKEYID
    export DYNAMODB_SECRETACCESSKEY=YOURSECRETKEYID
    export DYNAMODB_TEST_TABLE=test

Make sure you have a `test` table created and available with `sha` as a hash key (string), then run:

    make test

## Contributors

    @karlseguin (Karl Seguin)
    @imekinox (Juan Carlos del Valle)
    @phstc (Pablo Cantero)
    @cstivers78 (Chris Stivers)
    @garo (Juho Mäkinen)
