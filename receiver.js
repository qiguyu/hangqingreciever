var settings = require('./etc/settings.json');
var request = require('request');
var weibo = require('./lib/weibo');
var http = require('http');
var fs = require('fs');
var path = require('path');
var express = require('express');
var app = express.createServer();

app.use(express.bodyParser());
app.post('/hangqing', function(req, res) {
    var myDate = new Date();
    var myHour = myDate.getHours();
    var myMin = myDate.getMinutes();
    if(req.body.stockcode == undefined || req.body.name == undefined || req.body.date == undefined || req.body.stockcode.length != 8) {
        res.end('error! invalid stock code or name');
    } else if(myHour > 15 || myHour < 9 || (myHour == 15 && myMin > 30) || (myHour == 9 && myMin < 20)) {
        res.end('not work now!');
    } else {
        var stockcode = req.body.stockcode.substr(-6);
        var sToday = req.body.date.substr(0, 8);
        var hqHour = parseInt(req.body.date.substr(8, 2));
        if(hqHour < 11) {
            var showtype = '开盘';
        } else if(hqHour > 13) {
            var showtype = '收盘';
        } else {
            var showtype = '午盘';
        }
        var hqData = weibo.formatHqNumbers(req.body);
        if(hqHour < 11) {
            var sDate = req.body.date.substr(4, 2)+'月'+req.body.date.substr(6, 2)+'日';
            if(Math.abs(hqData.hqMarkup) < 1) {
                var fudu = '微幅';
                if(hqData.hqMarkup < 0) {
                    fudu += '下跌';
                } else {
                    fudu += '上涨';
                }
            } else {
                var fudu = '跳空';
                if(hqData.hqMarkup < 0) {
                    fudu += '低开';
                } else {
                    fudu += '高开';
                }
                if(Math.abs(hqData.hqMarkup) > 3) {
                    fudu = '大幅' + fudu;
                }
            }
            var content = '【开盘播报】'+req.body.name+'（'+stockcode+'）'+sDate+'开盘报'+hqData.hqPrice+'，较前一交易日'+fudu+hqData.hqUpdown+'元（'+hqData.hqPricePrefix+hqData.hqMarkup+'%）';
            weibo.addWeibo(req.body.stockcode, content, '', function(blogid) {
                if(blogid > 0) {
                    res.end('success');
                } else {
                    res.end('error');
                }
            });
        } else {
            var content = '【'+showtype+'播报】最新：'+hqData.hqPrice+'（'+hqData.hqPricePrefix+hqData.hqUpdown+'，'+hqData.hqPricePrefix+hqData.hqMarkup+'%），今开：'+hqData.hqOpen+'（'+hqData.hqOpenPrefix+hqData.openUpown+'，'+hqData.hqOpenPrefix+hqData.openMarkup+'%）';
            content += '，最高：'+hqData.hqHigh+'（'+hqData.hqHighPrefix+hqData.highmarkup+'%），最低：'+hqData.hqLow+'（'+hqData.hqLowPrefix+hqData.lowmarkup+'%）';
            content += '，成交：'+hqData.volum+'（'+hqData.amount+'），换手率：'+hqData.hqSwaprate+'%';
            if( req.body.type == 1) {
                request({ uri:settings.zjlx.api+stockcode }, function (error, response, body) {
                    if(error || response.statusCode != 200) {
                        console.log('request error:'+stockcode);
                    }
                    try {
                        var oData = JSON.parse(body);
                        if(oData.message == undefined || oData.stock.datetime.substr(0, 8) == sToday) {
                            var myPic = '';
                            var zjData = weibo.formatZjlxNumbers(oData);
                            content += '【资金流向】净流量：' + zjData.zjQuantiti + '万元（机构：'+zjData.zjJgQuantiti+'万元，大户：'+zjData.zjDhQuantiti+'万元，散户：'+zjData.zjShQuantiti+'万元）';
                            var imageUri = weibo.parseUrltoObj(settings.zjlx.image + stockcode);
                            getWeiboPicFolder(sToday, function(imageFolder) {
                                myPic = imageFolder+'/'+stockcode+'_zjlx_'+hqHour+'.png';
                                fetchWeiboPic(imageUri, myPic, function() {
                                    weibo.addWeibo(req.body.stockcode, content, myPic, function(blogid) {
                                        if(blogid > 0) {
                                            res.end('success');
                                        } else {
                                            res.end('error');
                                        }
                                    });
                                });
                            });
                        }
                    } catch(err) {
                        console.log('parse error12:'+stockcode);
                        weibo.addWeibo(req.body.stockcode, content, '', function(blogid) {
                            if(blogid > 0) {
                                res.end('success');
                            } else {
                                res.end('error');
                            }
                        });
                    }
                });
            } else {
                weibo.addWeibo(req.body.stockcode, content, '', function(blogid) {
                    if(blogid > 0) {
                        res.end('success');
                    } else {
                        res.end('error');
                    }
                });
            }
        }
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