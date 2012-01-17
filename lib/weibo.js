var settings = require('../etc/settings.json');
var queue = require('queuer');
var q = queue.getQueue(settings.queue.host, settings.queue.contentqueue);
var url = require('url');
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

exports.addWeibo = function(stockcode, content, pic, cb) {
    mysql.insert_micro_blog(stockcode, content, pic, function(blogid) {
        if(blogid > 0) {
            q.enqueue('mysql://'+settings.mysql.host+':'+settings.mysql.port+'/'+settings.mysql.database+'?micro_blog#'+blogid);
            cb(blogid);
        } else {
            cb(0);
        }
    });
}

exports.parseUrltoObj = function(pUrl) {
    var grabOption = url.parse(pUrl);
    if(typeof grabOption.port == 'undefined') {
        grabOption.port = 80;
    }
    if(typeof grabOption.path == 'undefined') {
        grabOption.path = '';
    }
    if(typeof grabOption.search == 'undefined') {
        grabOption.search = '';
    }
    var options = {
        host: grabOption.hostname,
        port: grabOption.port,
        path: grabOption.pathname + grabOption.search
    };
    return options;
};