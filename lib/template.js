var fs = require('fs');
var path = require('path');

String.sprintf = function(src, data){
    return src.replace(/\{([^}]+)\}/g, function(m,i){
        return data[i];
    });
};
exports.display = function(filename, values) {
    var myFolder = path.dirname(__dirname);
    var tplFile = myFolder + '/template/' + filename;
    try {
        var data = fs.readFileSync(tplFile, 'UTF-8');
        return String.sprintf(data, values);
    } catch(err) {
        return '';
    }
}