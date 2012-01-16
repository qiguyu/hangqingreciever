var request =require('request');
var assert = require('assert');
var qs = require('querystring');
var vows = require('vows');

var clone = function (a){
    var b = {};
    for(var x in a){
        b[x] = a[x];   
    }
    return b;
}


var host = '172.16.33.237';
var port = '9559';

var hqUrl = 'http://' + host + ":" + port + "/hangqing";
var weiboUrl = 'http://' + host + ":" + port + "/weibo";

var send = function(body, cb){
    request( { method : 'POST',
             uri    : hqUrl,
             headers:{'Content-Type': 'application/json'},
             body   : body 
            },  function(err, res, result){
                cb(err, result);
            });   
};

var sendWeibo = function(body, cb){
    var body = qs.stringify(body);
    request( { method : 'POST',
             uri    : weiboUrl,
             headers:{'Content-Type': 'application/x-www-form-urlencoded'},
             body   : body 
            },  function(err, res, result){
                cb(err, result);
            });   
}

var tpl = {"stockcode":"SZ184699","name":"基金同盛","date":"20120113150000","type":3,"open":0.872,"high":0.873,"low":0.852,"close":0.873,"price":0.857,"updown":-0.016,"markup":-1.83,"amount":6567450.34,"volum":76271,"swaprate":0.0};
var weiboTpl = {stockcode:'sz900000', content:'this is a test message'};

var assertWeiboInvalid = function(err, body){
    assert.isNull(err); 
    assert.equal(body, 'invalied stockcode or content!');
}

var sendAble = function(){
    var myDate = new Date();
    var myHour = myDate.getHours();
    var myMin = myDate.getMinutes();

    if( myHour > 15 || myHour < 9 || (myHour == 15 && myMin > 30) || (myHour == 9 && myMin < 20)) {
        return false;   
    }  
    return true;
}

vows.describe('Receiver').addBatch({
    "success:":{
        topic:function(){
            var data = clone(tpl);  
            data = JSON.stringify(data);
            send(data, this.callback);
        },
        'callback':function(err, body){
            assert.isNull(err);
            if( !sendAble()) {
                assert.equal(body, 'not work now!');
            }else{
                assert.equal(body, 'success');    
            }
        }
     },
     
     "stock code is empty string":{
        topic:function(){
            var data = clone(tpl);
            data.stockcode = '';
            data = JSON.stringify(data);
            send(data, this.callback);
        },
        'callback':function(err, body){
            assert.isNull(err);
            assert.equal(body, 'error! invalid stock code or name');
        }
     },
     
     "stock code is undefined":{
        topic:function(){
            var data = clone(tpl);
            delete data.stockcode;
            data = JSON.stringify(data);   
            send(data,  this.callback);
        },
        'request':function(err, body){
            assert.isNull(err);
            assert.equal(body, 'error! invalid stock code or name');
        }
    },
    
    "stock code is format error":{
        topic:function(){
            var data = clone(tpl);
            data.stockcode = '600000';
            data = JSON.stringify(data);   
            send(data,  this.callback);
        },
        'request':function(err, body){
            assert.isNull(err);
            assert.equal(body, 'error! invalid stock code or name');
        }
    },
    
    "stock name is undefined":{
        topic:function(){
            var data = clone(tpl);
            delete data.name;
            data = JSON.stringify(data); 
            send(data,  this.callback);  
        },
        'callback':function(err, body){
            assert.isNull(err);
            assert.equal(body, 'error! invalid stock code or name');  
        }
    },
    
    "stock code is undefined":{
        topic:function(){
            var data = clone(tpl);
            delete data.stockcode;
            data = JSON.stringify(data);   
            send(data,  this.callback);
        },
        'request':function(err, body){
            assert.isNull(err);
            assert.equal(body, 'error! invalid stock code or name');
        }
    },
    
    "weibo - success":{
        topic:function(){
            sendWeibo(weiboTpl, this.callback);   
        },
        'callback':function(err, body){
            assert.isNull(err);
            assert.equal(body, 'success');
        }
    },
    "weibo - stock code is unefined":{
        topic:function(){
            var data = clone(weiboTpl);
            delete data.stockcode;
            sendWeibo(data, this.callback);   
        },
        'callback':assertWeiboInvalid
    },
    
    "weibo - stock code is empty string":{
        topic:function(){
            var data = clone(weiboTpl);
            data.stockcode = '';
            sendWeibo(data, this.callback);   
        },
        'callback':assertWeiboInvalid
    },
    
    "weibo - stock code length is not 8":{
        topic:function(){
            var data = clone(weiboTpl);
            data.stockcode = 'szsdd';
            sendWeibo(data, this.callback);   
        },
        'callback':assertWeiboInvalid
    },
    
    "weibo - content is is empty  string":{
        topic:function(){
            var data = clone(weiboTpl);
            data.content = '';
            sendWeibo(data, this.callback);   
        },
        'callback':assertWeiboInvalid
    },
    "weibo - content is is undefined":{
        topic:function(){
            var data = clone(weiboTpl);
            delete data.content;
            sendWeibo(data, this.callback);   
        },
        'callback':assertWeiboInvalid
    },
    "weibo - content is more than 140":{
        topic:function(){
            var data = clone(weiboTpl);
            data.content = '因广东佛山2岁女童遭汽车碾压而路人漠视的“小悦悦事件”，舆论再次将矛头指向4年前已和解结案的南京“彭宇案”，认为是此案错判产生的负面效应，导致人们不愿做好事甚至见死不救。一些地方出现老人摔倒无人搀扶、做好事反被诬告等现象，也屡被归咎为“彭宇案”的影响。针对舆情反映，南京市委常委、市政法委书记伟近日接受《瞭望》新闻周刊记者独家专访时指出，舆论和公众认知的“彭宇案”，并非事实真相。由于多重因素被误读和放大的这起普通民事案件，不应成为社会“道德滑坡”的“标志性事件”。';
            sendWeibo(data, this.callback);   
        },
        'callback':assertWeiboInvalid
    }
}).run();
