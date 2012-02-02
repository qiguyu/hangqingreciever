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

var drawZjlx = function(ctx, data) {
    var jigouquantity = data.stock.jigou.jigouquantity;
    var dahuquantity = data.stock.dahu.dahuquantity;
    var sanhuquantity = data.stock.sanhu.sanhuquantity;
    var colors = ["#ffdc6e", "#6db3f1", "#7e6ef4"];
    var datas = [jigouquantity, dahuquantity, sanhuquantity];
    
    var stock_name_code = data.stock.stockname + '(' + data.stock.stockcode + '):资金流向';
    var x1 = 330;
    var datamax = datas.max;
    ctx.beginPath();
    ctx.lineWidth = 1;
    ctx.font = '20px "Songti"';
    ctx.patternQuality = 'fast';
    ctx.fillStyle = '#000000';
    ctx.fillText(stock_name_code, 12, 29);
    ctx.fillText('单位:万元', 269, 29);
    ctx.fillText('机构', 45, 220);
    ctx.fillText('大户', 110, 220);
    ctx.fillText('散户', 175, 220);
    ctx.fillText(0, 20, 125);
    ctx.stroke();
    //x轴
    ctx.moveTo(36, 118);
    ctx.lineTo(306, 118);
    //y轴
    ctx.moveTo(37, 37);
    ctx.lineTo(37, 198);
    ctx.stroke();
    for(var i = 0,len = colors.length;i < len;i++) {
        var rheight = 0;
        if(datamax != 0) {
            rheight = datas[i]*50/datamax;
        }
        ctx.fillStyle = colors[i];
        ctx.fillRect(24+i*65, 203, 18, 20);
        ctx.fillRect(64+i*96, 118-rheight, 35, rheight);
        ctx.fillStyle = '#000000';
        var textLoc = 5;
        if(rheight < 0) {
            textLoc = -18;
        }
        ctx.fillText(datas[i], 60+i*96, 118-rheight-textLoc);
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


exports.drawZjlxImg  = function(stockcode, cb) {
    var canvas = new Canvas(380, 244);
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
                    drawZjlx(ctx, oData);
                    var out = fs.createWriteStream(imgFile),
                        stream = canvas.createPNGStream();
                
                    stream.on('data', function(chunk){
                        out.write(chunk);
                    });
                    stream.on('end', function(){
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