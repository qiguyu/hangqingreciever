var settings = require('../etc/settings.json');
var Queue = require('./redis');
var redis = new Queue( settings.redis.port, settings.redis.host );
var queue = require('queuer');
var q = queue.getQueue(settings.queue.host, settings.queue.contentqueue);
var template = require('./template');
var weibo = require('./weibo');
var MySqlClient = require('./mysql').MySqlClient;
var mysql = new MySqlClient(settings.mysql);

exports.sendYdtx = function(stockcode, content, cb) {
    mysql.insert_micro_blog(stockcode.toLowerCase(), content, '', 5, function(blogid) {
        if(blogid > 0) {
            q.enqueue('mysql://'+settings.mysql.host+':'+settings.mysql.port+'/'+settings.mysql.database+'?micro_blog#'+blogid);
            cb(blogid);
        } else {
            cb(0);
        }
    });
}

exports.addYdtx = function(stockcode, content) {
    redis.client.get(stockcode+'-'+content.datatype, function(error, result) {
        if(error) {
            console.log('[error] redis get error! stockcode:'+stockcode+', error:'+error);
        } else {
            if(!result) {
                addYdtxWeibo(content);
                redis.client.setex(stockcode+'-'+content.datatype, 18000, JSON.stringify(content), function(err) {
                    if(err) {
                        console.log('[error] redis set error! error:'+err);
                    }
                });
            }
        }
    });
}

var addYdtxWeibo = function(data) {
    var ydData = formatYdNumbers(data);
    switch(ydData.datatype) {
        case 1:
            ydData.showtype = '涨跌';
            ydData.showtext = '涨幅';
            break;
        case 2:
            ydData.showtype = '振幅';
            ydData.showtext = '振幅';
            break;
        case 3:
            ydData.showtype = '换手';
            ydData.showtext = '换手';
            break;
        default:
            ydData.showtype = '涨跌';
            ydData.showtext = '涨幅';
            console.log('[error][ydtx] datatype error! received data:'+JSON.stringify(data));
    }
    var tplName = 'ydtx.tpl';
    var content = template.display(tplName, ydData);
    weibo.addWeibo(ydData.stock_code, content, '', 5, function(blogid) {
        if(blogid > 0) {
            console.log('[message] receive yidong success,blogid:' + blogid + ',content:'+content+',stockcode:'+ydData.stockcode);
        } else {
            console.log('[error][ydtx] receive ydtx failure:'+JSON.stringify(data));
        }
    });
}

var formatYdNumbers = function(content) {
    var keyElem = {
        'datatype' : 'int',
        'currentprice' : 'float',
        'flag' : 'int'
    };
    var ydData = {};
    for(var x in content){
        ydData[x] = content[x];
        if(keyElem[x] == undefined) {
            continue;
        } else if(keyElem[x] == 'int' && typeof ydData[x] == 'string') {
            ydData[x] = parseInt(ydData[x]);
        } else if(keyElem[x] == 'float' && typeof ydData[x] == 'string') {
            ydData[x] = parseFloat(ydData[x]);
        }
        if(keyElem[x] == 'float') {
            ydData[x] = ydData[x].toFixed(2);
        }
    }
    return ydData;
}