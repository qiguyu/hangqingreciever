var settings = require('../etc/settings.json');
var queue = require('queuer');
var q = queue.getQueue(settings.queue.host, settings.queue.contentqueue);
var MySqlClient = require('./mysql').MySqlClient;
var mysql = new MySqlClient(settings.mysql);

exports.shortnumber = function(number) {
    var sNumber = number;
    if (number > 100000000) {
        number = number / 100000000;
        sNumber = number.toFixed(2);
        sNumber += '亿';
    } else if(number > 100000) {
        number = number / 10000;
        sNumber = number.toFixed(2);
        sNumber += '万';
    }
    return sNumber;
}

exports.addWeibo = function(stockcode, content, cb) {
    mysql.insert_micro_blog(stockcode, content, function(blogid) {
        if(blogid > 0) {
            q.enqueue('mysql://'+settings.mysql.host+':'+settings.mysql.port+'/'+settings.mysql.database+'?micro_blog#'+blogid);
            cb(blogid);
        } else {
            cb(0);
        }
    });
}