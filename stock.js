var settings = require('./etc/settings.json');
var request = require('request');
var weibo = require('./lib/weibo');
var lhb = require('./lib/lhb');
var template = require('./lib/template');
var lhb_interface = [{'url' : 'http://172.16.39.102/Hszqxx.php', 'type' : 'sh'},
                     {'url' : 'http://172.16.39.102/Sszqxx.php', 'type' : 'sz'},
                     {'url' : 'http://172.16.39.102/Sscyb.php', 'type' : 'sz'},
                     {'url' : 'http://172.16.39.102/Sszxb.php', 'type' : 'sz'}];
var pool_interface = { 'long' : {'url':'http://172.16.39.102/zsw/poolml.json', 'type':'长线'},
                       'middle' : {'url':'http://172.16.39.102/zsw/poolsh.json', 'type':'中长线'},
                       'short' : {'url':'http://172.16.39.102/zsw/poolms.json', 'type':'中短线'}};

template.loadTemplates(function(err) {
    if(err) {
        console.log(['[error] load template error:', err]);
        return;
    }
    console.log('[debug] templates load success!');
    stockLhb();
    stockpond();
});

var getDataFromUrl = function(url, cb) {
    request({ uri:url, timeout:60000 }, function (error, response, body) {
        if(error || response.statusCode != 200) {
            console.log('[error] data request error! url:'+url+', message:'+error);
            cb(error, 'stock api request error!');
        } else {
            try {
                var oData = JSON.parse(body);
                cb(null, oData);
            } catch(err) {
                console.log('[error] data parse error! url:'+url+', message:'+err);
                cb(err, 'stock data parse error!');
            }
        }
    });
}

var stockLhb = function() {
    var myDate = new Date();
    var yyyy = myDate.getFullYear().toString();
    var mm = (myDate.getMonth()+1).toString();
    var dd  = myDate.getDate().toString();
    var hh = myDate.getHours();
    var ww = myDate.getDay();
    var date = yyyy + (mm[1]?mm:"0"+mm[0]) + (dd[1]?dd:"0"+dd[0]);
    if(ww > 0 && ww < 6 && hh > 15 && hh < 18) {
        console.log('[debug] lhb running');
        for(var k in lhb_interface) {
            (function(key) {
                getDataFromUrl(lhb_interface[key].url, function(error,data) {
                    if(date == data.datatime) {
                        var keyType = lhb_interface[key].type;
                        if(!error) {
                            for(var i = 0,len = data.datavalue.length;i < len;i++) {
                                (function(pData, pType) {
                                    if(pData.stock != undefined) {
                                        for(var i = 0, len = pData.stock.length;i < len;i++) {
                                            (function(i) {
                                                var stockData = pData.stock;
                                                var lhbData = lhb.formatLhbNumbers(stockData[i], keyType, pType);
                                                var content = template.display('lhb.tpl', lhbData);
                                                lhb.addLhbData(lhbData, keyType, content, function(blogid, contentType, stock_code) {
                                                    if(blogid > 0) {
                                                        console.log('[message] lhb success,blogid:' + blogid + ',content:'+content+',stockcode:'+stock_code);
                                                    } else if(blogid == 0) {
                                                        console.log('[error] lhb failure: code:' + stock_code + ', type:' + contentType);
                                                    }
                                                });
                                            })(i);
                                        }
                                    }
                                })(data.datavalue[i], i);
                            }
                        }
                    }
                });
            })(k);
        }
    }
}

var stockpond = function() {
    var myDate = new Date();
    var yyyy = myDate.getFullYear().toString();
    var mm = (myDate.getMonth()+1).toString();
    var dd  = myDate.getDate().toString();
    var hh = myDate.getHours();
    var ww = myDate.getDay();
    var date = yyyy + (mm[1]?mm:"0"+mm[0]) + (dd[1]?dd:"0"+dd[0]);
    if(ww > 0 && ww < 6 && hh > 8 && hh < 21) {
        console.log('[debug] stock pool running');
        for(var k in pool_interface) {
            (function(key) {
                getDataFromUrl(pool_interface[key].url, function(error,data) {
                    var rawdata = data.datatable.datavalue;
                    if(!error) {
                        for(var i = 0,len = rawdata.length;i < len;i++) {
                            (function(pData) {
                                var poolData = lhb.formatPondNumbers(pData, pool_interface[key].type);
                                if(parseInt(pData[9]) == 0) {
                                    poolData.sellbuy = '买入';
                                } else {
                                    poolData.sellbuy = '卖出';
                                }
                                var content = template.display('pool.tpl', poolData);
                                var stock_code = pData[10]+pData[0];
                                var contentType = 'pool_'+key;
                                lhb.addPondData(poolData, contentType, stock_code, content, function(blogid) {
                                    if(blogid > 0) {
                                        console.log('[message] pool success,blogid:' + blogid + ',content:'+content+',stockcode:'+stock_code);
                                    } else if(blogid == 0) {
                                        console.log('[error] pool failure: code:' + stock_code + ', type:' + contentType);
                                    }
                                });
                            })(rawdata[i]);
                        }
                    } else {
                        console.log('[error] get pool data failure: msg:' + error);
                    }
                });
            })(k);
        }
    }
}

setInterval(function(){
    stockLhb();
    stockpond();
}, 300000);