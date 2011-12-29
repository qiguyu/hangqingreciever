var queue = require('../queuer/lib/queue');
var q = queue.getQueue('http://127.0.0.1:3000/queue', 'weibo_send_hangqing');
var eyes = require('eyes');
var express = require('express');
var request = require('request');
var app = express.createServer();
app.use(express.bodyParser());
var MySqlClient = require('./lib/mysql').MySqlClient;
var mysql = new MySqlClient('172.16.33.237', 3306, 'stockradar', 'stockradar', 'stock_radar');

app.post('/hangqing', function(req, res) {
    var myDate = new Date();
    var iTimestring = Date.parse(myDate) / 1000;
    var myHour = myDate.getHours();
    if(myHour < 11) {
        var showtype = '开盘';
    } else if(myHour > 14) {
        var showtype = '收盘';
    } else {
        var showtype = '午盘';
    }
    var amount = req.body.amount;
    if(amount > 100000) {
        amount = amount / 10000;
        amount.toFixed(2);
        amount += '万';
    }
    amount += '手';
    var volum = req.body.volum;
    if(volum > 100000) {
        volum = volum / 10000;
        volum.toFixed(2);
        volum += '万';
    } else if (volum > 100000000) {
        volum = volum / 100000000;
        volum.toFixed(2);
        volum += '亿';
    }
    volum += '元';
    var content = '【'+req.body.name+showtype+'播报】昨收：'+req.body.close+'，今开：'+req.body.open+'，最高：'+req.body.high+'，最低：'+req.body.low+'，最新：'+req.body.price+'，涨跌额：'+req.body.updown+'，涨跌幅：'+req.body.markup+'%，总量：'+volum+'，金额：'+amount+'。';
    if( myHour > 11 && req.body.type == 0) {
        var stockcode = req.body.stockcode.substr(-6);
        request({ uri:'http://172.16.39.102/interface_zjlxjiekou.php?code='+stockcode }, function (error, response, body) {
            if(error) {
                console.log('request error:'+stockcode);
                res.end('error! request error:'+stockcode);
                return;
            }
            if(response.statusCode != 200) {
                res.end('error! status error:'+stockcode);
                return;
            }
            try {
                var oData = JSON.parse(body);
                content += '【资金流向】净流量:' + oData.stock.fundquantity + '万元，其中机构：'+oData.stock.jigou.jigouquantity+'万元，大户'+oData.stock.dahu.dahuquantity+'万元，散户'+oData.stock.sanhu.sanhuquantity+'万元。';
                mysql.insert_micro_blog(req.body.stockcode, iTimestring, content, function(blogid) {
                    if(blogid > 0) {
                        q.enqueue('mysql://172.16.33.237:3306/stock_radar?micro_blog#'+blogid);
                        res.end('success');
                    } else {
                        res.end('error! insert error:'+stockcode);
                    }
                });
            } catch(err) {
                console.log('parse error12:'+stockcode);
                res.end('error! parse error:'+stockcode);
                return;
            }
        });
    } else {
        mysql.insert_micro_blog(req.body.stockcode, iTimestring, content, function(blogid) {
            if(blogid > 0) {
                q.enqueue('mysql://172.16.33.237:3306/stock_radar?micro_blog#'+blogid);
                res.end('success');
            } else {
                res.end('error! insert error:'+stockcode);
            }
        });
    }
});

app.listen(9559);

