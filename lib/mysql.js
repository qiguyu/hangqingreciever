var mysql = require('mysql');

var MySqlClient = function(options) {
    var self = this;
    self.client = mysql.createClient(options);
};
MySqlClient.prototype.insert_micro_blog = function(stock_code, content, pic, ctype, cb) {
    if(typeof content != 'string' || content.length == 0) {
        console.log('[error] invalid content to insert! code:'+stock_code);
        cb(0);
    } else {
        this.client.query('INSERT INTO micro_blog (stock_code,in_time,content,pic,source,content_type) VALUES (?,UNIX_TIMESTAMP(),?,?,\'netgen\',?)', [ stock_code, content, pic, ctype ], function(err, results) {
            if (err) {
                console.log('[error] mysql insert data error! code:'+stock_code+', message:'+err);
                cb(0);
            } else {
                cb(results.insertId);
            }
        });
    }
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

MySqlClient.prototype._select = function(table, page, pagesize, column, condition, group, order, cb) {
    var scondition = '';
    if(condition != null && condition != '') {
        scondition = ' WHERE ' + condition;
    }
    var groupby = '';
    if(group != null && group != '') {
        groupby = ' GROUP BY ' + group;
    }
    var orderby = '';
    if(order != null && order != '') {
        orderby = ' ORDER BY ' + order;
    }
    var limit = '';
    if(page > 0) {
        limit = ' LIMIT '+((page - 1) * pagesize)+','+pagesize;
    }
    var sql = 'SELECT '+column+' FROM '+table+scondition+groupby+orderby+limit;
    this.client.query(sql, function(error, results) {
        if (error) {
            console.log('[error] mysql select data error! sql:'+sql+', message:'+error);
            cb('error', error);
        } else {
            cb(null, results);
        }
    });
};

MySqlClient.prototype.getFollowers = function(cb) {
    var followers = {};
    this.client.query('SELECT stock_code,cnt FROM (SELECT * FROM followers ORDER BY id DESC) AS t GROUP BY stock_code', function(err, results) {
        if (err) {
            cb(err);
        } else {
            for(var i = 0; i < results.length; i++){
                followers[results[i].stock_code] = results[i].cnt;
            }
            cb(null, followers);
        }
    });
};

exports.MySqlClient = MySqlClient;