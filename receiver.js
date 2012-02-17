var settings = require('./etc/settings.json');
var weibo = require('./lib/weibo');
var zjlx = require('./lib/zjlx');
var ydtx = require('./lib/ydtx');
var template = require('./lib/template');
var http = require('http');
var path = require('path');
var express = require('express');
var app = express.createServer();

var accounts; //保存所有有账号的股票代码
weibo.getAccounts(function(err, acc){
    if(err){
        console.log(['[error] load valid stock_code error:', err]);
        return;
    }
    accounts = acc;
    console.log('[debug] accounts load success!');
});
template.loadTemplates(function(err) {
    if(err) {
        console.log(['[error] load template error:', err]);
        return;
    }
    console.log('[debug] templates load success!');
});

var async = require('async');

app.use(express.bodyParser());
app.post('/hangqing', function(req, res) {
    var myDate = new Date();
    var myHour = myDate.getHours();
    var myMin = myDate.getMinutes();
    if(!req.body.stockcode || req.body.name == undefined || req.body.date == undefined || req.body.stockcode.length != 8) {
        console.log('[error] invalid stock code or name:', JSON.stringify(req.body));
        res.end('error! invalid stock code or name');
    } else if(myHour > 15 || myHour < 9 || (myHour == 15 && myMin > 30) || (myHour == 9 && myMin < 20)) {
        res.end('not work now!');
    } else {
        if(accounts && accounts[req.body.stockcode.toLowerCase()]){
            hqQueue.push(req.body);
        }
        res.end('success');
    }
});
app.post('/yidong', function(req, res) {
    var myDate = new Date();
    var myHour = myDate.getHours();
    var myMin = myDate.getMinutes();
    var ydBody = {};
    for(var k in req.body) {
        try {
            ydBody = JSON.parse(k);
        } catch(err) {
            ydBody = req.body;
            break;
        }
    }
    if(!ydBody.stockcode || ydBody.stockname == undefined || ydBody.date == undefined || ydBody.stockcode.length != 6) {
        console.log('[error][yidong] invalid stock code or name:', JSON.stringify(ydBody));
        res.end('error! invalid stock code or name');
    } else if(myHour > 15 || myHour < 9 || (myHour == 15 && myMin > 30) || (myHour == 9 && myMin < 20)) {
        res.end('not work now!');
    } else {
        ydBody['stock_code'] = ydBody.market.toLowerCase() + ydBody.stockcode.toLowerCase();
        if(accounts && accounts[ydBody['stock_code']]){
            ydtx.addYdtx(ydBody['stock_code'], ydBody);
        }
        res.end('success');
    }
});
app.post('/weibo', function(req, res) {
    if(req.body.stockcode == undefined || req.body.content == undefined || req.body.stockcode.length != 8) {
        res.end('invalied stockcode or content!');
    } else {
        if(typeof req.body.pic != 'undefined' && req.body.pic != '') {
            var imageUri = weibo.parseUrltoObj(req.body.pic);
            var stockcode = req.body.stockcode.substr(-6);
            var nowTime = new Date().getTime();
            var extName = path.extname(path.basename(req.body.pic));
            weibo.getWeiboPicFolder(function(imageFolder) {
                var myPic = imageFolder+'/'+stockcode+'_'+nowTime+extName;
                weibo.fetchWeiboPic(imageUri, myPic, function() {
                    weibo.addWeibo(req.body.stockcode, req.body.content, myPic, 1, function(blogid) {
                        if(blogid > 0) {
                            res.end('success');
                        } else {
                            res.end('error');
                        }
                    });
                });
            });
        } else {
            weibo.addWeibo(req.body.stockcode, req.body.content, '', 1, function(blogid) {
                if(blogid > 0) {
                    res.end('success');
                } else {
                    res.end('error');
                }
            });
        }
    }
});
app.get('/latest', function(req, res) {
    weibo.getLatest(req.query, function(error, data) {
        if(error) {
            res.send(JSON.stringify({'error':1, 'msg':error}));
        } else {
            res.send(data);
        }
    });
});
app.listen(9559);

var composite = function(body, callback){
    var echoResult = function(blogid, content, image){
        if(blogid > 0) {
            console.log('[message] receive hangqing success,blogid:' + blogid + ',content:'+content+',image:'+image+',stockcode:'+stockcode);
        } else {
            console.log('[error] receive hangqing failure:' + JSON.stringify(body));
        }
        console.log('[debug] current queue length:'+hqQueue.length());
        callback();
    }
    var stockcode = body.stockcode.substr(-6);
    var sToday = body.date.substr(0, 8);
    var hqHour = parseInt(body.date.substr(8, 2));
    var hqData = weibo.formatHqNumbers(body);
    if(hqHour < 11) {
        hqData.showtype = '开盘';
        var contentType = 'hq_kaipan';
    } else if(hqHour > 13) {
        hqData.showtype = '收盘';
        var contentType = 'hq_shoupan';
    } else {
        hqData.showtype = '午盘';
        var contentType = 'hq_wupan';
    }
    if(hqHour < 11) {
        if(hqData.open == 0.00) {
            console.log('[warning] open is zero! body:' + JSON.stringify(body));
        } else {
            hqData.code = stockcode;
            hqData.sDate = body.date.substr(4, 2)+'月'+body.date.substr(6, 2)+'日';
            var tplName = 'kaipan.tpl';
            if(hqData.openUpown == 0) {
                var tplName = 'pingkai.tpl';
            } else if(Math.abs(hqData.openMarkup) < 1) {
                hqData.fudu = '微幅';
                if(hqData.openMarkup < 0) {
                    hqData.fudu += '下跌';
                } else {
                    hqData.fudu += '上涨';
                }
            } else {
                hqData.fudu = '跳空';
                if(hqData.openMarkup < 0) {
                    hqData.fudu += '低开';
                } else {
                    hqData.fudu += '高开';
                }
                if(Math.abs(hqData.openMarkup) > 3) {
                    hqData.fudu = '大幅' + hqData.fudu;
                }
            }
            hqData.openUpown = Math.abs(hqData.openUpown).toFixed(2);
            hqData.openMarkup = Math.abs(hqData.openMarkup).toFixed(2);
            var content = template.display(tplName, hqData);
            weibo.addWeibo(body.stockcode, content, '', contentType, function(blogid) {
                echoResult(blogid, content, '');
            });
        }
    } else {
        var content = template.display('shoupan.tpl', hqData);
        if( hqData.type == 1) {
            hqData.sDate = body.date.substr(0, 4)+'-'+body.date.substr(4, 2)+'-'+body.date.substr(6, 2)+' '+body.date.substr(8, 2)+':'+body.date.substr(10, 2)+':00';
            zjlx.drawZjlxImg(stockcode, hqData, function(err, oData, myPic) {
                if(!err) {
                    var zjData = weibo.formatZjlxNumbers(oData);
                    content += template.display('zjlx.tpl', zjData);
                    weibo.addWeibo(body.stockcode, content, myPic, contentType, function(blogid) {
                        echoResult(blogid, content, myPic);
                    });
                } else {
                    weibo.addWeibo(body.stockcode, content, '', contentType, function(blogid) {
                        echoResult(blogid, content, '');
                    });
                }
            });
        } else {
            weibo.addWeibo(body.stockcode, content, '', contentType, function(blogid) {
                echoResult(blogid, content, '');
            });
        }
    }
}

var hqQueue = async.queue(composite, 5);
console.log('[debug] service start success!');