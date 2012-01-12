var settings = require('./etc/settings.json');
var request = require('request');
var weibo = require('./lib/weibo');
var express = require('express');
var app = express.createServer();

app.use(express.bodyParser());
app.post('/hangqing', function(req, res) {
    var myDate = new Date();
    var myHour = myDate.getHours();
    var myMin = myDate.getMinutes();
    if(req.body.stockcode == undefined || req.body.name == undefined || req.body.date == undefined) {
        res.end('error! invalid stock code or name');
    } else if(myHour > 15 || myHour < 9 || (myHour == 15 && myMin > 30) || (myHour == 9 && myMin < 20)) {
        res.end('not work now!');
    } else {
        var sToday = req.body.date.substr(0, 8);
        var myHour = parseInt(req.body.date.substr(8, 2));
        if(myHour < 11) {
            var showtype = '开盘';
        } else if(myHour > 13) {
            var showtype = '收盘';
        } else {
            var showtype = '午盘';
        }
        var volum = weibo.shortnumber(req.body.volum);
        volum += '手';
        var amount = weibo.shortnumber(req.body.amount);
        amount += '元';
        var openupdown = req.body.open - req.body.close;
        var openmarkup = (req.body.open - req.body.close) * 100 / req.body.close;
        openmarkup = openmarkup.toFixed(2);
        var content = '【'+showtype+'播报】最新：'+req.body.price.toFixed(2)+'（'+req.body.updown.toFixed(2)+'，'+req.body.markup.toFixed(2)+'%），今开：'+req.body.open.toFixed(2)+'（'+openupdown.toFixed(2)+'，'+openmarkup+'%）';
        if(myHour > 10) {
            var highmarkup = (req.body.high - req.body.close) * 100 / req.body.close;
            highmarkup = highmarkup.toFixed(2);
            var lowmarkup = (req.body.low - req.body.close) * 100 / req.body.close;
            lowmarkup = lowmarkup.toFixed(2);
            content += '，最高：'+req.body.high.toFixed(2)+'（'+highmarkup+'%），最低：'+req.body.low.toFixed(2)+'（'+lowmarkup+'%）';
        }
        content += '，成交：'+volum+'（'+amount+'），换手率：'+req.body.swaprate.toFixed(2)+'%';
        if( myHour > 10 && req.body.type == 1) {
            var stockcode = req.body.stockcode.substr(-6);
            request({ uri:settings.zjlx+stockcode }, function (error, response, body) {
                if(error || response.statusCode != 200) {
                    console.log('request error:'+stockcode);
                }
                try {
                    var oData = JSON.parse(body);
                    if(oData.message == undefined || oData.stock.datetime.substr(0, 8) == sToday) {
                        content += '【资金流向】净流量:' + oData.stock.fundquantity.toFixed(2) + '万元（机构：'+oData.stock.jigou.jigouquantity.toFixed(2)+'万元，大户'+oData.stock.dahu.dahuquantity.toFixed(2)+'万元，散户'+oData.stock.sanhu.sanhuquantity.toFixed(2)+'万元）';
                    }
                } catch(err) {
                    console.log('parse error12:'+stockcode);
                }
                weibo.addWeibo(req.body.stockcode, content, function(blogid) {
                    if(blogid > 0) {
                        res.end('success');
                    } else {
                        res.end('error');
                    }
                });
            });
        } else {
            weibo.addWeibo(req.body.stockcode, content, function(blogid) {
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
    if(req.body.stockcode == undefined || req.body.content == undefined) {
        res.end('invalied stockcode or content!');
    } else {
        weibo.addWeibo(req.body.stockcode, req.body.content, function(blogid) {
            if(blogid > 0) {
                res.end('success');
            } else {
                res.end('error');
            }
        });
    }
});
app.listen(9559);