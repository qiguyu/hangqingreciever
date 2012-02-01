var settings = require('./etc/settings.json');
var request = require('request');
var weibo = require('./lib/weibo');
var zjlx = require('./lib/zjlx');
var template = require('./lib/template');
var http = require('http');
var fs = require('fs');
var path = require('path');
var express = require('express');
var app = express.createServer();

var accounts; //保存所有有账号的股票代码
weibo.getAccounts(function(err, acc){
    if(err){
        console.log(['load valid stock_code error:', err]);
        return;
    }
    accounts = acc; 
});

var async = require('async');

app.use(express.bodyParser());
app.post('/hangqing', function(req, res) {
    var myDate = new Date();
    var myHour = myDate.getHours();
    var myMin = myDate.getMinutes();
    if(!req.body.stockcode || req.body.name == undefined || req.body.date == undefined || req.body.stockcode.length != 8) {
        res.end('error! invalid stock code or name');
    } else if(myHour > 15 || myHour < 9 || (myHour == 15 && myMin > 30) || (myHour == 9 && myMin < 20)) {
        res.end('not work now!');
    } else {
        if(accounts && !accounts[req.body.stockcode.toLowerCase()]){
            res.end('error! invalid stock code ');
            return;
        }
        hqQueue.push(req.body);
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
            getWeiboPicFolder('', function(imageFolder) {
                var myPic = imageFolder+'/'+stockcode+'_'+nowTime+extName;
                fetchWeiboPic(imageUri, myPic, function() {
                    weibo.addWeibo(req.body.stockcode, req.body.content, myPic, function(blogid) {
                        if(blogid > 0) {
                            res.end('success');
                        } else {
                            res.end('error');
                        }
                    });
                });
            });
        } else {
            weibo.addWeibo(req.body.stockcode, req.body.content, '', function(blogid) {
                if(blogid > 0) {
                    res.end('success');
                } else {
                    res.end('error');
                }
            });
        }
    }
});
app.listen(9559);

var getWeiboPicFolder = function(date, cb) {
    if(typeof date != 'string' || date == '') {
        var myDate = new Date();
        var yyyy = myDate.getFullYear().toString();
        var mm = (myDate.getMonth()+1).toString();
        var dd  = myDate.getDate().toString();
        date = yyyy + (mm[1]?mm:"0"+mm[0]) + (dd[1]?dd:"0"+dd[0]);
    }
    var imageFolder = settings.pic.folder;
    if(imageFolder.substr(0, 1) != '/') {
        imageFolder = __dirname + '/' + imageFolder;
    }
    imageFolder += '/' + date;
    fs.stat(imageFolder, function(err, stats) {
        if(err) {
            fs.mkdir(imageFolder, 0777, function() {
                cb(imageFolder);
            });
        }
        cb(imageFolder);
    });
}

var fetchWeiboPic = function(imageUri, picPath, cb) {
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
var composite = function(body, callback){
    var echoResult = function(blogid){
        if(blogid > 0) {
            console.log('receive hangqing success,blog id is ' + blogid);
        } else {
            console.log('receive hangqing failure:' + JSON.stringify(body));
        }   
        console.log('current queue length:'+hqQueue.length());
        callback();
    }
    var stockcode = body.stockcode.substr(-6);
    var sToday = body.date.substr(0, 8);
    var hqHour = parseInt(body.date.substr(8, 2));
    var hqData = weibo.formatHqNumbers(body);
    if(hqHour < 11) {
        hqData.showtype = '开盘';
    } else if(hqHour > 13) {
        hqData.showtype = '收盘';
    } else {
        hqData.showtype = '午盘';
    }
    if(hqHour < 11) {
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
        weibo.addWeibo(body.stockcode, content, '', function(blogid) {
            echoResult(blogid);
        });
    } else {
        var content = template.display('shoupan.tpl', hqData);
        if( hqData.type == 1) {
            getWeiboPicFolder(sToday, function(imageFolder) {
                var myPic = imageFolder+'/'+stockcode+'_zjlx_'+hqHour+'.png';
                zjlx.drawZjlxImg(stockcode, myPic, function(err) {
                    if(!err) {
                        weibo.addWeibo(body.stockcode, content, myPic, function(blogid) {
                            echoResult(blogid);
                        });
                    } else {
                        echoResult(0);
                    }
                });
            });
        } else {
            weibo.addWeibo(body.stockcode, content, '', function(blogid) {
                echoResult(blogid);
            });
        }
    }   
}

var hqQueue = async.queue(composite, 5);
