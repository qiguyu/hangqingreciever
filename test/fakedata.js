exports.getData = function(stock, callback){
    var data = {
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
    callback(null ,data);
};

exports.drawZjlxImg = function(data, callback){
    callback(null, data, 'ddd');
}