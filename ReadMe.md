## Basics

A Simple, efficient and complete DynamoDB driver for Node.js, with:

- Syntactic sweeteners/mapping to handle Amazon DynamoDB's JSON format in NodeJS
- Efficient and transparent authentication and authentication refresh using Amazon STS
- Integrated retry logic similar to Amazon's own PhP, Java libraries
- Currently in production in multiple independent organizations with more than 80 write/s, 60 read/s
- Support for all exposed DynamoDB operations

Discussion Group: http://groups.google.com/group/node-dynamodb

## Usage

    var ddb = require('dynamodb').ddb({ accessKeyId: '',
                                        secretAccessKey: '' });

Available options for the constructor are the following:

- `accessKeyId`: the AWS AccessKeyId to use
- `secretAccessKey`: the AWS SecretAccessKey associated
- `endpoint`: the Region endpoint to use (defaults to: `dynamodb.us-east-1.amazonaws.com`)
- `agent`: The NodeJS http.Agent to use (defaults to: `undefined`)
- `sessionToken`: forced temporary session credential (defaults to: `undefined`)
- `sessionExpires`: forced temeporary session credential (defaults to: `undefined`)


### CreateTable

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

### ListTables 

    ddb.listTables({}, function(err, res) {});
    
    // res: { LastEvaluatedTableName: 'bar',
              TableNames: ['test','foo','bar'] }

### DescribeTable

    ddb.describeTable('a-table', function(err, res) {});

    // res: { ... }

### PutItem

    // flat [string, number, string array or number array] based json object
    var item = { score: 304,
                 date: (new Date).getTime(),
                 sha: '3d2d6963',
                 usr: 'spolu',
                 lng: ['node', 'c++'] };

    ddb.putItem('a-table', item, {}, function(err, res, cap) {});

### GetItem

    ddb.getItem('a-table', '3d2d6963', null, {}, function(err, res, cap) {});
 
    // res: { score: 304,
    //        date: 123012398234,
    //        sha: '3d2d6963',
    //        usr: 'spolu',
    //        lng: ['node', 'c++'] };
    
### DeleteItem 

    ddb.deleteItem('a-table', 'sha', null, {}, function(err, res, cap) {});
    
### UpdateItem 

    ddb.updateItem('a-table', '3d2d6963', null, { 'usr': { value: 'smthg' } }, {},
                   function(err, res, cap) {});

    ddb.consumedCapacity();

### BatchGetItem

    ddb.batchGetItem({'table': { keys: ['foo', 'bar'] }}, function(err, res) {
        if(err) {
          console.log(err);
        } else {
          console.log(res);
        }
     });
    
    // res: { ConsumedCapacityUnits: 1.5,
              items: [...] };

### BatchWriteItem
    
    //ddb.batchWriteItem(PutRequest, DeleteRequest, cb)
    ddb.batchWriteItem({'table': [item1, item2]}, {'table': ['foo', 'bar']}, function(err, res) {
        if(err) {
          console.log(err);
        } else {
          console.log(res);
        }
     });
    
    // res: { UnprocessedItems: { ... } };

### Query          

    ddb.query('test', '3d2d6963', {}, function(err, res, cap) {...});
    
    // res: { count: 23,
    //        lastEvaluatedKey: { hash: '3d2d6963' },
    //        items: [...] };

### Scan

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



More complete usage can be found in the examples directory

## Run the Tests

Put in your environment:

    export DYNAMODB_ACCESSKEYID=YOURACCESSKEYID
    export DYNAMODB_SECRETACCESSKEY=YOURSECRETKEYID
    export DYNAMODB_TEST_TABLE1=test

Make sure you have a `test` table created and available with `sha` as a hash key (string), then run:

    make test

## License

Distributed under the MIT License.

## Contributors

    @karlseguin (Karl Seguin)
    @imekinox (Juan Carlos del Valle)
    @phstc (Pablo Cantero)
    @cstivers78 (Chris Stivers)
    @garo (Juho Mäkinen)
    @tax (Paul Tax)
    @alexbosworth (Alex Bosworth)
    @jimbly (Jimb Esser)
    @n1t0 (Anthony Moi)
    @krasin
    @aws-ew-dev
