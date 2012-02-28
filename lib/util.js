exports.shortnumber = function(number) {
    var sNumber = number;
    if (number > 100000000) {
        number = number / 100000000;
        sNumber = number.toFixed(2);
        sNumber += '亿';
    } else if(number > 100000) {
        number = number / 10000;
        sNumber = number.toFixed(2);
        sNumber += '万';
    }
    return sNumber;
}