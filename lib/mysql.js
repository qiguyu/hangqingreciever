var Client = require('mysql').Client;

var MySqlClient = function(host, port, user, password, database) {
    var self = this;
    self.client = new Client();
    self.client.host = host;
    self.client.port = port;
    self.client.user = user;
    self.client.password = password;
    self.client.database = database;
};
MySqlClient.prototype.insert_micro_blog = function(stock_code, in_time, content, cb) {
    this.client.query('INSERT INTO micro_blog (stock_code,in_time,content) VALUES (?,?,?)', [ stock_code, in_time, content ], function(err, results) {
        if (err) {
            console.log(err);
            cb(0);
        } else {
            cb(results.insertId);
        }
    });
};

exports.MySqlClient = MySqlClient;