var settings = require('../etc/settings.json');
var request = require('request');
var Canvas = require('canvas');
var weibo = require('./weibo');
var fs = require('fs');

Object.defineProperty(Array.prototype, 'max', {
  get : function() {
    var max = 0;
    for ( var i = 0, len = this.length; i < len; i++) {
      if (i == 0) {
        max = Math.abs(this[i]);
        continue;
      }
      var n = Math.abs(this[i]);
      if (n > max) {
        max = n;
      }
    }
    return max;
  }
});

var drawZjlx = function(ctx, data, hqData) {
    var jigouquantity = data.stock.jigou.jigouquantity;
    var dahuquantity = data.stock.dahu.dahuquantity;
    var sanhuquantity = data.stock.sanhu.sanhuquantity;
    var colors = ["#ffdc6e", "#6db3f1", "#99cc33"];
    var datas = [jigouquantity, dahuquantity, sanhuquantity];
    
    var stock_name_code = data.stock.stockname + '(' + data.stock.stockcode + ')';
    var x1 = 330;
    var datamax = datas.max;
    ctx.beginPath();
    ctx.lineWidth = 1;
    ctx.font = '20px "Songti"';
    ctx.patternQuality = 'fast';
    ctx.fillStyle = '#000000';
    ctx.fillText(stock_name_code, 12, 29);
    ctx.font = '15px "Songti"';
    ctx.fillText('资金流向(单位:万元)', 12, 55);
    ctx.fillText('现价:'+hqData.price+'元', 250, 29);
    ctx.fillText(hqData.sDate, 205, 55);
    ctx.font = '20px "Songti"';
    ctx.fillText('机构', 45, 250);
    ctx.fillText('大户', 110, 250);
    ctx.fillText('散户', 175, 250);
    ctx.fillText(0, 20, 155);
    ctx.stroke();
    //x轴
    ctx.moveTo(36, 148);
    ctx.lineTo(306, 148);
    //y轴
    ctx.moveTo(37, 67);
    ctx.lineTo(37, 228);
    ctx.stroke();
    for(var i = 0,len = colors.length;i < len;i++) {
        var rheight = 0;
        if(datamax != 0) {
            rheight = datas[i]*50/datamax;
        }
        ctx.fillStyle = colors[i];
        ctx.fillRect(24+i*65, 233, 18, 20);
        ctx.fillRect(64+i*96, 148-rheight, 35, rheight);
        ctx.fillStyle = '#000000';
        var textLoc = 5;
        if(rheight < 0) {
            textLoc = -18;
        }
        ctx.fillText(datas[i], 60+i*96, 148-rheight-textLoc);
        ctx.stroke();
    }
    ctx.restore();
};

var getZjlxData = function(stockcode, cb) {
    request({ uri:settings.zjlx.api+stockcode, timeout:30000 }, function (error, response, body) {
        if(error || response.statusCode != 200) {
            console.log('[error] zjlx request error! code:'+stockcode+', message:'+error);
            cb(error, 'zjlx api request error!');
        } else {
            try {
                var oData = JSON.parse(body);
                cb(null, oData);
            } catch(err) {
                console.log('[error] zjlx parse error! code:'+stockcode+', message:'+err);
                cb(err, 'zjlx data parse error!');
            }
        }
    });
}


exports.drawZjlxImg  = function(stockcode, hqData, cb) {
    var canvas = new Canvas(380, 275);
    var ctx = canvas.getContext('2d');
    getZjlxData(stockcode, function(err, oData) {
        if(err) {
            cb(err, 'zjlx data parse error!');
        } else {
            try {
                weibo.getWeiboPicFolder(function(imageFolder) {
                    var myDate = new Date();
                    var hh = myDate.getHours().toString();
                    var imgFile = imageFolder+'/'+stockcode+'_zjlx_'+hh+'.png';
                    drawZjlx(ctx, oData, hqData);
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
                        cb(null, oData, imgFile);
                    });
                });
            } catch(err) {
                console.log('[error] draw zjlx image error! code:'+stockcode+', message:'+err);
                cb(err, 'draw zjlx image error!');
            }
        }
    });
};

exports.getData = getZjlxData;