var assert = require('assert');
var qs = require('querystring');
var vows = require('vows');
var fs = require('fs');

var zjlx = require('lib/zjlx');
var stocks = ['000768', '300132', '600503', '002371', '600588'];

var zjlxDemo = {
    "stock":{
        "stockcode":"000001","stockname":"\u6df1\u53d1\u5c55\uff21","datetime":"20120202150021","fundin":"23172.31","fundout":"17656.70","fundquantity":"5515.61","netinflow":"0.11",
        "jigou":{
            "jigouin":"21072.53","jigouout":"14484.32","jigouquantity":"6588.21","jigouzzb":"43.35"
        },
        "dahu":{
            "dahuin":"2099.78","dahuout":"3172.38","dahuquantity":"-1072.60","dahuzzb":"6.43"
        },
        "sanhu":{
            "sanhuin":"17837.90","sanhuout":"23353.57","sanhuquantity":"-5515.68","sanhuzzb":"50.22"
        }
    }
};

var imgPath = __dirname + "/zjlx_img/";

var isFloat = function(x){
    try{
        return x.toString().match(/\-?\d+(\.\d+)?/) ? true : false;
    }catch(e){
        console.log([x, e]);    
    };
}


var zjlxDataTest = vows.describe('ZjlxData');

var addDataTest = function(stock){
    var tc = {};
    tc["Test the "+stock+" zjlx data"] = {
            topic:function(){
                zjlx.getData(stock, this.callback);
            },
            "test the zjlx format":function(err, data){
                assert.isNull(err);
                assert.isObject(data);
                assert.isObject(data.stock);
                assert.isObject(data.stock.jigou);
                assert.isObject(data.stock.dahu);
                assert.isObject(data.stock.sanhu);
                
                var m = 0, n = 0, k = 0;
                for(var x in data.stock.jigou){
                    assert.isTrue(isFloat(data.stock.jigou[x]));
                    m += 1;
                }
                assert.equal(4, m);
                
                for(var x in data.stock.dahu){
                    assert.isTrue(isFloat(data.stock.dahu[x]));
                    n += 1;
                }
                assert.equal(4, n);
                
                for(var x in data.stock.sanhu){
                    assert.isTrue(isFloat(data.stock.sanhu[x]));
                    k += 1;
                }
                assert.equal(4, k);   
            }
    };
    zjlxDataTest.addBatch(tc);  
}

for(var i = 0; i < stocks.length;i++){
    addDataTest(stocks[i]);       
}
zjlxDataTest.run();

vows.describe('ZjlxImg').addBatch({
    "Test zjlx img":{
        topic:function(){
            zjlx.drawZjlxImg(zjlxDemo, this.callback);  
        },
        "test the img stats":function(err, data, img){
            console.log([err, data, img]);
            assert.isNull(err);
            fs.stat(img, function(err1, stats){
                assert.isNull(err1);
                assert.isObject(stats);
                assert.isTrue(stats.size > 5000);
            });
        }    
    }
}).run();
