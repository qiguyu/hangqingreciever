var settings = require('../etc/settings.json');
var queue = require('queuer');
var q = queue.getQueue(settings.queue.host, settings.queue.contentqueue);
var fs = require('fs');
var url = require('url');
var path = require('path');
var MySqlClient = require('./mysql').MySqlClient;
var mysql = new MySqlClient(settings.mysql);

var shortnumber = function(number) {
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

var keyElem = {
    'open' : 'float',
    'high' : 'float',
    'low' : 'float',
    'close' : 'float',
    'price' : 'float',
    'updown' : 'float',
    'markup' : 'float',
    'volum' : '',
    'amount' : '',
    'swaprate' : 'float',
    'type' : ''
};

exports.addWeibo = function(stockcode, content, pic, ctype, cb) {
    mysql.insert_micro_blog(stockcode.toLowerCase(), content, pic, ctype, function(blogid) {
        if(blogid > 0) {
            q.enqueue('mysql://'+settings.mysql.host+':'+settings.mysql.port+'/'+settings.mysql.database+'?micro_blog#'+blogid);
            cb(blogid);
        } else {
            cb(0);
        }
    });
}

exports.getAccounts = function(cb){
    mysql.getAccounts(cb);
};

exports.formatHqNumbers = function(pObj) {
    var hqData = {};
    for(var x in pObj){
        hqData[x] = pObj[x];
    }
    for(var x in keyElem) {
        if(hqData[x] == undefined) {
            hqData[x] = 0;
        }
        if(typeof hqData[x] == 'string' && keyElem[x] == 'float') {
            hqData[x] = parseFloat(hqData[x]);
        }
        if(keyElem[x] == 'float') {
            hqData[x] = hqData[x].toFixed(2);
        }
    }
    hqData.type = parseInt(hqData.type);
    //开盘涨跌额
    var openUpown = hqData.open - hqData.close;
    hqData.openUpown = openUpown.toFixed(2);
    //开盘涨跌幅
    var openMarkup = (hqData.open - hqData.close) * 100 / hqData.close;
    hqData.openMarkup = openMarkup.toFixed(2);
    //开盘涨跌前缀
    hqData.hqOpenPrefix = '';
    if(openUpown > 0) {
        hqData.hqOpenPrefix = '+';
    }
    //行情涨跌额
    var hqUpown = hqData.price - hqData.close;
    hqData.hqUpown = hqUpown.toFixed(2);
    //行情涨跌幅
    var hqMarkup = (hqData.price - hqData.close) * 100 / hqData.close;
    hqData.hqMarkup = hqMarkup.toFixed(2);
    //行情涨跌前缀
    hqData.hqPricePrefix = '';
    if(hqData.updown > 0) {
        hqData.hqPricePrefix = '+';
    }
    //最高涨跌幅
    var highmarkup = (hqData.high - hqData.close) * 100 / hqData.close;
    hqData.highmarkup = highmarkup.toFixed(2);
    //最低涨跌幅
    var lowmarkup = (hqData.low - hqData.close) * 100 / hqData.close;
    hqData.lowmarkup = lowmarkup.toFixed(2);
    //最高涨跌前缀
    hqData.hqHighPrefix = '';
    if(highmarkup > 0) {
        hqData.hqHighPrefix = '+';
    }
    //最低涨跌前缀
    hqData.hqLowPrefix = '';
    if(lowmarkup > 0) {
        hqData.hqLowPrefix = '+';
    }
    //成交量
    var volum = shortnumber(hqData.volum);
    volum += '手';
    hqData.volum = volum;
    //成交额
    var amount = shortnumber(hqData.amount);
    amount += '元';
    hqData.amount = amount;
    return hqData;
};

exports.formatZjlxNumbers = function(pObj) {
    var zjData = {};
    //资金流量
    var zjQuantiti = pObj.stock.fundquantity;
    if(typeof zjQuantiti == 'string') {
        zjQuantiti = parseFloat(zjQuantiti);
    }
    zjData.zjQuantiti = zjQuantiti.toFixed(2);
    //机构
    var zjJgQuantiti = pObj.stock.jigou.jigouquantity;
    if(typeof zjJgQuantiti == 'string') {
        zjJgQuantiti = parseFloat(zjJgQuantiti);
    }
    zjData.zjJgQuantiti = zjJgQuantiti.toFixed(2);
    //大户
    var zjDhQuantiti = pObj.stock.dahu.dahuquantity;
    if(typeof zjDhQuantiti == 'string') {
        zjDhQuantiti = parseFloat(zjDhQuantiti);
    }
    zjData.zjDhQuantiti = zjDhQuantiti.toFixed(2);
    //散户
    var zjShQuantiti = pObj.stock.sanhu.sanhuquantity;
    if(typeof zjShQuantiti == 'string') {
        zjShQuantiti = parseFloat(zjShQuantiti);
    }
    zjData.zjShQuantiti = zjShQuantiti.toFixed(2);
    return zjData;
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

exports.getWeiboPicFolder = function(cb) {
    var myDate = new Date();
    var yyyy = myDate.getFullYear().toString();
    var mm = (myDate.getMonth()+1).toString();
    var dd  = myDate.getDate().toString();
    date = yyyy + (mm[1]?mm:"0"+mm[0]) + (dd[1]?dd:"0"+dd[0]);
    var imageFolder = settings.pic.folder;
    if(imageFolder.substr(0, 1) != '/') {
        imageFolder = path.dirname(__dirname) + '/' + imageFolder;
    }
    imageFolder += '/' + date;
    fs.stat(imageFolder, function(err, stats) {
        if(err) {
            console.log('[error] image folder stats error! folder:'+imageFolder+', message:'+err);
            fs.mkdir(imageFolder, 0777, function(err) {
                if(err) {
                    console.log('[error] image folder create error! folder:'+imageFolder+', message:'+err);
                }
                cb(imageFolder);
            });
        }
        cb(imageFolder);
    });
}

exports.fetchWeiboPic = function(imageUri, picPath, cb) {
    http.get(imageUri, function(resp) {
        var buffers = [], size = 0;
        resp.on('data', function(buffer) {
            buffers.push(buffer);
            size += buffer.length;
        });
        resp.on('end', function() {
            var buffer = new Buffer(size), pos = 0;
            for(var i = 0, len = buffers.length; i < len; i++) {
                buffers[i].copy(buffer, pos);
                pos += buffers[i].length;
            }
            fs.writeFile(picPath, buffer);
            cb();
        });
    });
}
