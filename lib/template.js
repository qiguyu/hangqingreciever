var fs = require('fs');
var path = require('path');
var tplArray = {};

exports.loadTemplates = function(cb) {
    var myFolder = path.dirname(__dirname);
    myFolder += '/template';
    fs.readdir(myFolder, function(err, files) {
        if(err) {
            console.log('[error] template folder reads error! path:'+myFolder+', message:'+err);
            cb(err);
        } else {
            for(var i = 0,len = files.length;i < len;i++) {
                var tplFile = myFolder + '/' + files[i];
                try {
                    var data = fs.readFileSync(tplFile, 'UTF-8');
                    tplArray[files[i]] = data;
                } catch(err) {
                    console.log('[error] template file reads error! file:'+files[i]+', message:'+err);
                    cb(err);
                    break;
                }
            }
            cb(null);
        }
    });
}

String.sprintf = function(src, data){
    return src.replace(/\{([^}]+)\}/g, function(m,i){
        return data[i];
    });
};
exports.display = function(filename, values) {
    try {
        var data = tplArray[filename];
        return String.sprintf(data, values);
    } catch(err) {
        console.log('[error] template array reads error! file:'+filename+', message:'+err);
        return '';
    }
}