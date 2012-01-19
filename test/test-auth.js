var ddb = require('../lib/ddb.js').ddb({ accessKeyId: '',
                                         secretAccessKey: '' });

ddb.listTables({}, function(err, res) {
    if(err) 
      console.log(err);
    else {
      console.log('ListTable:');
      console.log(res);
    }
  });

ddb.describeTable('teleportd-core', function(err, res) {
    if(err)
      console.log(err);
    else
      console.log('DescribeTable:');
      console.log(res);
  });

var item = { dte: 304,
             sha: '12301039120jkqdfjsdvy87312f7y',
             usr: 'spolu' };
  
ddb.putItem('teleportd-core', item, {}, function(err, res, cap) {
    if(err)
      console.log(err);
    else {
      console.log('PutItem: ' + cap);
      console.log(res);
    }

    ddb.getItem('teleportd-core', '12301039120jkqdfjsdvy87312f7y', null, {},
                function(err, res, cap) {
                  if(err)
                    console.log(err);
                  else {
                    console.log('GetItem: ' + cap);
                    console.log(res);
                    
                    ddb.deleteItem('teleportd-core', '12301039120jkqdfjsdvy87312f7y', null, {},
                                   function(err, res, cap) {
                                     if(err)
                                       console.log(err);
                                     else {
                                       console.log('DeleteItem: ' + cap);
                                       console.log(res);
                                     }
                                   });
                    
                  }
                });
  });
