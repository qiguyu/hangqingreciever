var mysql = require('mysql');

var MySqlClient = function(options) {
    var self = this;
    self.client = mysql.createClient(options);
};
MySqlClient.prototype.insert_micro_blog = function(stock_code, content, pic, cb) {
    this.client.query('INSERT INTO micro_blog (stock_code,in_time,content,pic) VALUES (?,UNIX_TIMESTAMP(),?,?)', [ stock_code, content, pic ], function(err, results) {
        if (err) {
            console.log(err);
            cb(0);
        } else {
            cb(results.insertId);
        }
    });
};

MySqlClient.prototype.getAccounts = function(cb) {
    var accounts = {};
    this.client.query('SELECT stock_code FROM account', function(err, results) {
        if (err) {
            cb(err);
            return;
        }
        for(var i = 0; i < results.length; i++){
            accounts[results[i].stock_code] = '1';    
        }
        
        cb(null, accounts);    
    });
};

exports.MySqlClient = MySqlClient;
