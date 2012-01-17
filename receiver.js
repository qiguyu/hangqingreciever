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
    } else if(myHour > 25 || myHour < 9 || (myHour == 15 && myMin > 30) || (myHour == 9 && myMin < 20)) {
        res.end('not work now!');
    } else {
        var sToday = req.body.date.substr(0, 8);
        var hqHour = parseInt(req.body.date.substr(8, 2));
        if(hqHour < 11) {
            var showtype = '开盘';
        } else if(hqHour > 13) {
            var showtype = '收盘';
        } else {
            var showtype = '午盘';
        }
        var volum = weibo.shortnumber(req.body.volum);
        volum += '手';
        var amount = weibo.shortnumber(req.body.amount);
        amount += '元';
        var openUpown = req.body.open - req.body.close;
        var openMarkup = (req.body.open - req.body.close) * 100 / req.body.close;
        openMarkup = openMarkup.toFixed(2);
        var hqPrice = req.body.price;
        if(typeof hqPrice == 'string') {
            hqPrice = parseFloat(hqPrice);
        }
        var hqUpdown = req.body.updown;
        if(typeof hqUpdown == 'string') {
            hqUpdown = parseFloat(hqUpdown);
        }
        var hqMarkup = req.body.markup;
        if(typeof hqMarkup == 'string') {
            hqMarkup = parseFloat(hqMarkup);
        }
        var hqOpen = req.body.open;
        if(typeof hqOpen == 'string') {
            hqOpen = parseFloat(hqOpen);
        }
        var hqSwaprate = req.body.swaprate;
        if(typeof hqSwaprate == 'string') {
            hqSwaprate = parseFloat(hqSwaprate);
        }
        var hqOpenPrefix = '';
        if(openUpown > 0) {
            hqOpenPrefix = '+';
        }
        var hqPricePrefix = '';
        if(hqUpdown > 0) {
            hqPricePrefix = '+';
        }
        var content = '【'+showtype+'播报】最新：'+hqPrice.toFixed(2)+'（'+hqPricePrefix+hqUpdown.toFixed(2)+'，'+hqPricePrefix+hqMarkup.toFixed(2)+'%），今开：'+hqOpen.toFixed(2)+'（'+hqOpenPrefix+openUpown.toFixed(2)+'，'+hqOpenPrefix+openMarkup+'%）';
        if(hqHour > 10) {
            var highmarkup = (req.body.high - req.body.close) * 100 / req.body.close;
            highmarkup = highmarkup.toFixed(2);
            var lowmarkup = (req.body.low - req.body.close) * 100 / req.body.close;
            lowmarkup = lowmarkup.toFixed(2);
            var hqHigh = req.body.high;
            if(typeof hqHigh == 'string') {
                hqHigh = parseFloat(hqHigh);
            }
            var hqLow = req.body.low;
            if(typeof hqLow == 'string') {
                hqLow = parseFloat(hqLow);
            }
            var hqHighPrefix = '';
            if(highmarkup > 0) {
                hqHighPrefix = '+';
            }
            var hqLowPrefix = '';
            if(lowmarkup > 0) {
                hqLowPrefix = '+';
            }
            content += '，最高：'+hqHigh.toFixed(2)+'（'+hqHighPrefix+highmarkup+'%），最低：'+hqLow.toFixed(2)+'（'+hqLowPrefix+lowmarkup+'%）';
        }
        content += '，成交：'+volum+'（'+amount+'），换手率：'+hqSwaprate.toFixed(2)+'%';
        if( hqHour > 10 && req.body.type == 1) {
            var stockcode = req.body.stockcode.substr(-6);
            request({ uri:settings.zjlx.api+stockcode }, function (error, response, body) {
                if(error || response.statusCode != 200) {
                    console.log('request error:'+stockcode);
                }
                try {
                    var oData = JSON.parse(body);
                    if(oData.message == undefined || oData.stock.datetime.substr(0, 8) == sToday) {
                        var myPic = '';
                        var zjQuantiti = oData.stock.fundquantity;
                        if(typeof zjQuantiti == 'string') {
                            zjQuantiti = parseFloat(zjQuantiti);
                        }
                        var zjJgQuantiti = oData.stock.jigou.jigouquantity;
                        if(typeof zjJgQuantiti == 'string') {
                            zjJgQuantiti = parseFloat(zjJgQuantiti);
                        }
                        var zjDhQuantiti = oData.stock.dahu.dahuquantity;
                        if(typeof zjDhQuantiti == 'string') {
                            zjDhQuantiti = parseFloat(zjDhQuantiti);
                        }
                        var zjShQuantiti = oData.stock.sanhu.sanhuquantity;
                        if(typeof zjShQuantiti == 'string') {
                            zjShQuantiti = parseFloat(zjShQuantiti);
                        }
                        content += '【资金流向】净流量：' + zjQuantiti.toFixed(2) + '万元（机构：'+zjJgQuantiti.toFixed(2)+'万元，大户：'+zjDhQuantiti.toFixed(2)+'万元，散户：'+zjShQuantiti.toFixed(2)+'万元）';
                        var imageUri = weibo.parseUrltoObj(settings.zjlx.image + stockcode + ".png");
                        getWeiboPicFolder(sToday, function(imageFolder) {
                            http.get(imageUri, function(resp) {
                                var buffers = [], size = 0;
                                resp.on('data', function(buffer) {
                                    buffers.push(buffer);
                                    size += buffer.length;
                                });
                                resp.on('end', function() {
                                    myPic = imageFolder+'/'+stockcode+'_zjlx_'+hqHour+'.png';
                                    var buffer = new Buffer(size), pos = 0;
                                    for(var i = 0, len = buffers.length; i < len; i++) {
                                        buffers[i].copy(buffer, pos);
                                        pos += buffers[i].length;
                                    }
                                    fs.writeFile(myPic, buffer);
                                    weibo.addWeibo(req.body.stockcode, content, myPic, function(blogid) {
                                        if(blogid > 0) {
                                            res.end('success');
                                        } else {
                                            res.end('error');
                                        }
                                    });
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
                http.get(imageUri, function(resp) {
                    var buffers = [], size = 0;
                    resp.on('data', function(buffer) {
                        buffers.push(buffer);
                        size += buffer.length;
                    });
                    resp.on('end', function() {
                        myPic = imageFolder+'/'+stockcode+'_'+nowTime+extName;
                        var buffer = new Buffer(size), pos = 0;
                        for(var i = 0, len = buffers.length; i < len; i++) {
                            buffers[i].copy(buffer, pos);
                            pos += buffers[i].length;
                        }
                        fs.writeFile(myPic, buffer);
                        weibo.addWeibo(req.body.stockcode, req.body.content, myPic, function(blogid) {
                            if(blogid > 0) {
                                res.end('success');
                            } else {
                                res.end('error');
                            }
                        });
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