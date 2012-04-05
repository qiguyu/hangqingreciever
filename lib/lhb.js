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
    if(stockcode == undefined) {
        console.log('[error] lhb data ectract error!');
        cb(-1);
    } else {
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
}

exports.formatPondNumbers = function(pData, type) {
    var zjlxvalue = pData[4], zjlxprefix = '';
    if(typeof zjlxvalue == 'string') {
        zjlxvalue = parseInt(zjlxvalue);
    }
    if(zjlxvalue < 0) {
        zjlxprefix = '-';
    }
    var pondData = {'type' : type,
                    'name' : pData[1],
                    'code' : pData[0],
                    'price' : pData[2],
                    'markup' : pData[3],
                    'volum' : util.shortnumber(pData[5]),
                    'amount' : util.shortnumber(pData[6]*10000)};
    pondData['zjlx'] = zjlxprefix + util.shortnumber(Math.abs(zjlxvalue+0));
    if(typeof pondData.price == 'string') {
        pondData.price = parseFloat(pondData.price);
        pondData.price = pondData.price.toFixed(2);
    }
    if(typeof pondData.markup == 'string') {
        pondData.markup = parseFloat(pondData.markup);
        pondData.markup = pondData.markup.toFixed(2);
    }
    return pondData;
}

exports.addPondData = function(poolData, contentType, stock_code, content, cb) {
    var stockcode = poolData['code'];
    if(stockcode == undefined) {
        console.log('[error] pool data ectract error!');
        cb(-1);
    } else {
        redis.client.get(stockcode+'-'+contentType, function(error, result) {
            if(error) {
                console.log('[error] redis get error! stockcode:'+stockcode+', type:'+contentType+', error:'+error);
                cb(-1);
            } else {
                if(!result) {
                    weibo.addWeibo(stock_code, content, '', contentType, function(blogid) {
                        if(blogid > 0) {
                            redis.client.setex(stockcode+'-'+contentType, 18000, JSON.stringify(poolData), function(err) {
                                if(err) {
                                    console.log('[error] redis pool data set error! error:'+err);
                                }
                                cb(blogid);
                            });
                        } else {
                            cb(0);
                        }
                    });
                } else {
                    cb(-2);
                }
            }
        });
    }
}

var getWave2Limit = function(stockcode, cb) {
    redis.client.get(stockcode+'-wave2limit', function(error, result) {
        if(error) {
            console.log('[error] redis get wave2limit error! stockcode:'+stockcode+', error:'+error);
            cb({'gejia':100000, 'jigou':100000});
        } else {
            if(!result) {
                cb({'gejia':100000, 'jigou':100000});
            } else {
                result = JSON.parse(result);
                cb(result);
            }
        }
    });
}

exports.formatWave2Numbers = function(stockcode, pData, cb) {
    var wave2Data = new Array();
    if(pData.length == 0) {
        cb(wave2Data);
        return;
    }
    var iTime = pData[0][3];
    if(typeof iTime != 'string') {
        iTime += '';
    }
    if(iTime.length < 6) {
        iTime = '0' + iTime;
    }
    getWave2Limit(stockcode, function(limitNumber) {
        redis.client.get(stockcode+'-wave2', function(error, result) {
            if(error) {
                console.log('[error] redis get error! stockcode:'+stockcode+', type:'+contentType+', error:'+error);
                cb(wave2Data);
            } else {
                if(!result) {
//                    wave2Data[wave2Data.length] = {'type' : '特大被动单',
//                                    'content_type' : 'teda',
//                                    'ddHour' : iTime.substr(0,2),
//                                    'ddMin' : iTime.substr(2,2),
//                                    'buyvolum' : util.shortnumber(parseInt(pData[0][29]/100)),
//                                    'buyamount' : util.shortnumber(pData[0][30]),
//                                    'sellvolum' : util.shortnumber(parseInt(pData[0][32]/100)),
//                                    'sellamount' : util.shortnumber(pData[0][33])};
                    if((pData[0][36]/pData[0][34]) > limitNumber['gejia'] || (pData[0][39]/pData[0][37]) > limitNumber['gejia']) {
                        wave2Data[wave2Data.length] = {'type' : '隔价主动单',
                                    'content_type' : 'gejia',
                                    'ddHour' : iTime.substr(0,2),
                                    'ddMin' : iTime.substr(2,2),
                                    'buyvolum' : util.shortnumber(parseInt(pData[0][35]/100)),
                                    'buyamount' : util.shortnumber(pData[0][36]),
                                    'sellvolum' : util.shortnumber(parseInt(pData[0][38]/100)),
                                    'sellamount' : util.shortnumber(pData[0][39])};
                    }
                    if((pData[0][42]/pData[0][40]) > limitNumber['jigou'] || (pData[0][45]/pData[0][43]) > limitNumber['jigou']) {
                        wave2Data[wave2Data.length] = {'type' : '机构单',
                                    'content_type' : 'jigou',
                                    'ddHour' : iTime.substr(0,2),
                                    'ddMin' : iTime.substr(2,2),
                                    'buyvolum' : util.shortnumber(parseInt(pData[0][41]/100)),
                                    'buyamount' : util.shortnumber(pData[0][42]),
                                    'sellvolum' : util.shortnumber(parseInt(pData[0][44]/100)),
                                    'sellamount' : util.shortnumber(pData[0][45])};
                    }
                } else {
                    result = JSON.parse(result);
//                    if((result[30] != pData[0][30] && ((pData[0][30]-result[30])/(pData[0][28]-result[28])) > limitNumber['gejia']) || result[33] != pData[0][33]) {
//                        wave2Data[wave2Data.length] = {'type' : '特大被动单',
//                                    'content_type' : 'teda',
//                                    'ddHour' : iTime.substr(0,2),
//                                    'ddMin' : iTime.substr(2,2),
//                                    'buyvolum' : util.shortnumber(parseInt(pData[0][29]/100)),
//                                    'buyamount' : util.shortnumber(pData[0][30]),
//                                    'sellvolum' : util.shortnumber(parseInt(pData[0][32]/100)),
//                                    'sellamount' : util.shortnumber(pData[0][33])};
//                    }
                    if((result[36] != pData[0][36] && (pData[0][36]-result[36])/(pData[0][34]-result[34]) > limitNumber['gejia']) || (result[39] != pData[0][39] && (pData[0][39]-result[39])/(pData[0][37]-result[37]) > limitNumber['gejia'])) {
                        wave2Data[wave2Data.length] = {'type' : '隔价主动单',
                                    'content_type' : 'gejia',
                                    'ddHour' : iTime.substr(0,2),
                                    'ddMin' : iTime.substr(2,2),
                                    'buyvolum' : util.shortnumber(parseInt(pData[0][35]/100)),
                                    'buyamount' : util.shortnumber(pData[0][36]),
                                    'sellvolum' : util.shortnumber(parseInt(pData[0][38]/100)),
                                    'sellamount' : util.shortnumber(pData[0][39])};
                    }
                    if((result[42] != pData[0][42] && (pData[0][42]-result[42])/(pData[0][40]-result[40]) > limitNumber['jigou']) || (result[45] != pData[0][45] && (pData[0][45]-result[45])/(pData[0][43]-result[43]) > limitNumber['jigou'])) {
                        wave2Data[wave2Datata.length] = {'type' : '机构单',
                                    'content_type' : 'jigou',
                                    'ddHour' : iTime.substr(0,2),
                                    'ddMin' : iTime.substr(2,2),
                                    'buyvolum' : util.shortnumber(parseInt(pData[0][41]/100)),
                                    'buyamount' : util.shortnumber(pData[0][42]),
                                    'sellvolum' : util.shortnumber(parseInt(pData[0][44]/100)),
                                    'sellamount' : util.shortnumber(pData[0][45])};
                    }
                }
                redis.client.setex(stockcode+'-wave2', 18000, JSON.stringify(pData[0]), function(err) {
                    if(err) {
                        console.log('[error] redis pool data set error! error:'+err);
                    }
                    cb(wave2Data);
                });
            }
        });
    });
}

exports.addWave2Data = function(wave2Data, contentType, stockcode, content, cb) {
    weibo.addWeibo(stockcode, content, '', contentType, function(blogid) {
        if(blogid > 0) {
            cb(blogid);
        } else {
            cb(0);
        }
    });
}