var fwk = require('fwk');
var config = fwk.baseConfig(); 

config['DYNAMODB_ACCESSKEYID']     = 'REPLACE_IN_ENV_OR_ARGS';
config['DYNAMODB_SECRETACCESSKEY'] = 'REPLACE_IN_ENV_OR_ARGS';
config['DYNAMODB_TEST_TABLE']      = 'REPLACE_IN_ENV_OR_ARGS';

exports.config = config;
