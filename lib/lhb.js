var settings = require('../etc/settings.json');
var Queue = require('./redis');
var redis = new Queue( settings.redis.port, settings.redis.host );
var Canvas = require('canvas');
var util = require('./util');
var weibo = require('./weibo');
var fs = require('fs');

var showTypes = {'sh': ['涨幅偏离值达7%的证券', '跌幅偏离值达7%的证券', '振幅达到15%的证券', '换手率达到20%的证券', '无价格涨跌幅限制的证券', 
                        '连续三个交易日涨幅偏离值累计达20%的证券', '连续三个交易日跌幅偏离值累计达20%的证券', 'ST、*ST连续三个交易日涨幅偏离值累计达15%的证券', 
                        'ST、*ST连续三个交易日跌幅偏离值累计达15%的证券', '连续三个交易日内的日均换手率与前五个交易日日均换手率的比值到达30倍', 
                        '无价格涨跌幅限制且盘中交易价格较当日开盘价上涨30％以上', '无价格涨跌幅限制的股票且盘中交易价格较当日开盘价下跌30％以上',
                        '连续2个交易日触及涨幅限制，在这2个交易日中同一营业部净买入股数占当日总成交股数的比重30％以上', 
                        '连续2个交易日触及跌幅限制，在这2个交易日中同一营业部净卖出股数占当日总成交股数的比重30％以上', 
                        'S、ST、*ST连续三个交易日盘中价格触及涨幅限制', 'S、ST、*ST连续三个交易日盘中价格触及跌幅限制',
                        '融资买入数量达到当日该证券总交易量的50％以上', '融券卖出数量达到当日该证券总交易量的50％以上', '实施特别停牌的证券'],
                 'sz': ['涨幅偏离值达7%的证券', '跌幅偏离值达7%的证券', '振幅达到15%的证券', '换手率达到20%的证券', '无价格涨跌幅限制的证券', 
                        '连续三个交易日涨幅偏离值累计达20%的证券', '连续三个交易日跌幅偏离值累计达20%的证券', 'ST、*ST连续三个交易日涨幅偏离值累计达12%的证券', 
                        'ST、*ST连续三个交易日跌幅偏离值累计达12%的证券', '连续三个交易日内的日均换手率与前五个交易日日均换手率的比值到达30倍', '其它异常波动的证券']};

var drawLhbSH = function(ctx,data) {
    ctx.beginPath();
    ctx.lineWidth = 1;
    ctx.font = '12px "Songti"';
    ctx.patternQuality = 'fast';
    ctx.fillStyle = '#000000';
    ctx.fillText(data['stockname'] + '(' + data['stockcode'] + ')  成交量:' + data['hqVolume'] + '手  成交金额: ' + data['hqAmount'] + '元', 10, 20);
    ctx.fillText('买入营业部名称:', 10, 50);
    ctx.textAlign = 'right';
    ctx.fillText('累计买入金额(元)', 440, 50);
    for(var i = 0, len = data['buy'].length;i < len;i++) {
        (function(i) {
            ctx.textAlign = 'left';
            ctx.fillText(data['buy'][i]['name'], 10, 70 + i * 17);
            ctx.textAlign = 'right';
            ctx.fillText(data['buy'][i]['tamount'], 430, 70 + i * 17);
        })(i)
    }
    ctx.textAlign = 'left';
    ctx.fillText('卖出营业部名称:', 10, 170);
    ctx.textAlign = 'right';
    ctx.fillText('累计卖出金额(元)', 440, 170);
    for(var i = 0, len = data['sell'].length;i < len;i++) {
        (function(i) {
            ctx.textAlign = 'left';
            ctx.fillText(data['sell'][i]['name'], 10, 190 + i * 17);
            ctx.textAlign = 'right';
            ctx.fillText(data['sell'][i]['tamount'], 430, 190 + i * 17);
        })(i)
    }
};

var drawLhbSZ = function(ctx,data) {
    ctx.beginPath();
    ctx.lineWidth = 1;
    ctx.font = '12px "Songti"';
    ctx.patternQuality = 'fast';
    ctx.fillStyle = '#000000';
    ctx.fillText(data['stockname'] + '(' + data['stockcode'] + ')  成交量:' + data['hqVolume'] + '手  成交金额: ' + data['hqAmount'] + '元', 10, 20);
    ctx.fillText('买入金额最大的前5名', 10, 50);
    ctx.fillText('营业部或交易单元名称:', 10, 80);
    ctx.textAlign = 'right';
    ctx.fillText('买入金额(元)', 435, 80);
    ctx.fillText('卖出金额(元)', 520, 80);
    for(var i = 0, len = data['buy'].length;i < len;i++) {
        (function(i) {
            ctx.textAlign = 'left';
            ctx.fillText(data['buy'][i]['name'], 10, 100 + i * 17);
            ctx.textAlign = 'right';
            ctx.fillText(data['buy'][i]['buyamount'], 430, 100 + i * 17);
            ctx.fillText(data['buy'][i]['sellamount'], 520, 100 + i * 17);
        })(i)
    }
    ctx.textAlign = 'left';
    ctx.fillText('卖出金额最大的前5名', 10, 200);
    ctx.fillText('营业部或交易单元名称:', 10, 230);
    ctx.textAlign = 'right';
    ctx.fillText('买入金额(元)', 435, 230);
    ctx.fillText('卖出金额(元)', 520, 230);
    for(var i = 0, len = data['sell'].length;i < len;i++) {
        (function(i) {
            ctx.textAlign = 'left';
            ctx.fillText(data['sell'][i]['name'], 10, 250 + i * 17);
            ctx.textAlign = 'right';
            ctx.fillText(data['sell'][i]['buyamount'], 430, 250 + i * 17);
            ctx.fillText(data['sell'][i]['sellamount'], 520, 250 + i * 17);
        })(i)
    }
};

exports.formatLhbNumbers = function(pData, market, type) {
    if(market.toLowerCase() == 'sh') {
        return formatLhbNumbersSH(pData, type);
    } else {
        return formatLhbNumbersSZ(pData, type);
    }
};

var formatLhbNumbersSH = function(pData, type) {
    var lhbData = {};
    for(var x in pData){
        lhbData[x] = pData[x];
    }
    var volume = parseFloat(pData['volume']);
    volume = volume / 100;
    lhbData.hqVolume = util.shortnumber(volume);
    var amount = parseFloat(pData['amount']);
    amount = amount * 10000;
    lhbData.hqAmount = util.shortnumber(amount);
    lhbData.showtype = showTypes['sh'][type];
    return lhbData;
};

var formatLhbNumbersSZ = function(pData, type) {
    var lhbData = {};
    for(var x in pData){
        lhbData[x] = pData[x];
    }
    var volume = parseInt(pData['volume']);
    volume = volume * 100;
    lhbData.hqVolume = util.shortnumber(volume);
    var amount = parseInt(pData['amount']);
    amount = amount * 10000;
    lhbData.hqAmount = util.shortnumber(amount);
    lhbData.showtype = showTypes['sz'][type];
    return lhbData;
};

var drawLhbImg  = function(lhbData, market, cb) {
    if(market.toLowerCase() == 'sh') {
        drawLhbImgSH(lhbData, cb);
    } else {
        drawLhbImgSZ(lhbData, cb);
    }
};

var drawLhbImgSH  = function(lhbData, cb) {
    var canvas = new Canvas(500, 320);
    var ctx = canvas.getContext('2d');
    try {
        weibo.getWeiboPicFolder(function(imageFolder) {
            var imgFile = imageFolder+'/'+lhbData['stockcode']+'_lhb.png';
            drawLhbSH(ctx, lhbData);
            var stream = canvas.createPNGStream();
            var buffers = [], size = 0;
        
            stream.on('data', function(chunk){
                buffers.push(chunk);
                size += chunk.length;
            });
            stream.on('end', function(){
                var buffer = new Buffer(size), pos = 0;
                for(var i = 0, len = buffers.length; i < len; i++) {
                    buffers[i].copy(buffer, pos);
                    pos += buffers[i].length;
                }
                fs.writeFileSync(imgFile, buffer);
                cb(null, imgFile);
            });
        });
    } catch(err) {
        console.log('[error] draw shlhb image error! code:'+lhbData['stockcode']+', message:'+err);
        cb(err, 'draw shlhb image error!');
    }
};

var drawLhbImgSZ  = function(lhbData, cb) {
    var canvas = new Canvas(550, 380);
    var ctx = canvas.getContext('2d');
    try {
        weibo.getWeiboPicFolder(function(imageFolder) {
            var imgFile = imageFolder+'/'+lhbData['stockcode']+'_lhb.png';
            drawLhbSZ(ctx, lhbData);
            var stream = canvas.createPNGStream();
            var buffers = [], size = 0;
        
            stream.on('data', function(chunk){
                buffers.push(chunk);
                size += chunk.length;
            });
            stream.on('end', function(){
                var buffer = new Buffer(size), pos = 0;
                for(var i = 0, len = buffers.length; i < len; i++) {
                    buffers[i].copy(buffer, pos);
                    pos += buffers[i].length;
                }
                fs.writeFileSync(imgFile, buffer);
                cb(null, imgFile);
            });
        });
    } catch(err) {
        console.log('[error] draw szlhb image error! code:'+lhbData['stockcode']+', message:'+err);
        cb(err, 'draw szlhb image error!');
    }
};

exports.addLhbData = function(lhbData, keyType, content, cb) {
    var stockcode = lhbData['stockcode'];
    redis.client.get(stockcode+'-lhb', function(error, result) {
        if(error) {
            console.log('[error] redis get error! stockcode:'+stockcode+', type:lhb, error:'+error);
            cb(-1);
        } else {
            if(!result) {
                drawLhbImg(lhbData, keyType, function(error, imgFile) {
                    if(error) {
                        imgFile = '';
                    }
                    var stock_code = keyType+stockcode;
                    var contentType = 'lhb';
                    weibo.addWeibo(stock_code, content, imgFile, contentType, function(blogid) {
                        if(blogid > 0) {
                            redis.client.setex(stockcode+'-lhb', 18000, JSON.stringify(lhbData), function(err) {
                                if(err) {
                                    console.log('[error] redis set error! error:'+err);
                                }
                                cb(blogid, contentType, stock_code);
                            });
                        } else {
                            cb(0, contentType, stock_code);
                        }
                    });
                });
            } else {
                cb(-2);
            }
        }
    });
}