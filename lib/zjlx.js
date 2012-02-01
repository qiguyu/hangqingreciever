var settings = require('../etc/settings.json');
var request = require('request');
var Canvas = require('canvas');
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
    var diff = x1/135;
    var datamax = datas.max;
    ctx.beginPath();
    ctx.lineWidth = 1;
    ctx.font = '20px "Songti"';
    ctx.patternQuality = 'fast';
    ctx.fillStyle = '#000000';
    ctx.fillText(stock_name_code, 5*diff, 12*diff);
    ctx.fillText('单位:万元', 110*diff, 12*diff);
    ctx.fillText('机构', 37*diff, 90*diff);
    ctx.fillText('大户', 61*diff, 90*diff);
    ctx.fillText('散户', 85*diff, 90*diff);
    ctx.fillText(0, 10*diff, 51*diff);
    ctx.stroke();
    //x轴
    ctx.moveTo(15*diff, 48*diff);
    ctx.lineTo(125*diff, 48*diff);
    //y轴
    ctx.moveTo(15*diff, 15*diff);
    ctx.lineTo(15*diff, 81*diff);
    ctx.stroke();
    for(var i = 0,len = colors.length;i < len;i++) {
        var rheight = 0;
        if(datamax != 0) {
            rheight = 16*datas[i]*diff/datamax;
        }
        ctx.fillStyle = colors[i];
        ctx.fillRect((24*i+30)*diff, 83*diff, 18, 20);
        ctx.fillRect((35+i*25-9+i*14)*diff, 48*diff-rheight, 35, rheight);
        ctx.fillStyle = '#000000';
        var textLoc = 5;
        if(rheight < 0) {
            textLoc = -18;
        }
        ctx.fillText(datas[i], (35+i*25-9+i*14)*diff, 48*diff-rheight-textLoc);
        ctx.stroke();
    }
    ctx.restore();
};


exports.drawZjlxImg  = function(stockcode, imgFile, cb) {
    var canvas = new Canvas(380, 244);
    var ctx = canvas.getContext('2d');
    var oData = JSON.parse('{"stock":{"stockcode":"002233","stockname":"\u5854\u724c\u96c6\u56e2","datetime":"20120131150023","fundin":"736.37","fundout":"1163.61","fundquantity":"-427.24","netinflow":"-0.1","jigou":{"jigouin":"560.16","jigouout":"860.08","jigouquantity":"-299.92","jigouzzb":"9.73"},"dahu":{"dahuin":"176.22","dahuout":"303.54","dahuquantity":"-127.32","dahuzzb":"3.29"},"sanhu":{"sanhuin":"6565.19","sanhuout":"6137.94","sanhuquantity":"427.25","sanhuzzb":"86.99"}}}');
    request({ uri:settings.zjlx.api+stockcode }, function (error, response, body) {
        if(error || response.statusCode != 200) {
            console.log('request error:'+stockcode);
        }
        try {
            var oData = JSON.parse(body);
            drawZjlx(ctx, oData);
            var out = fs.createWriteStream(imgFile),
                stream = canvas.createPNGStream();
        
            stream.on('data', function(chunk){
                out.write(chunk);
                cb();
            });
        } catch(err) {
            console.log('parse error12:'+stockcode);
        }
    });
};