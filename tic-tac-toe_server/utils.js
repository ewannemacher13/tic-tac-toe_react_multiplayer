exports.getConnectionId = function(strLength,startchar='a',endchar='z') {
    var str = '';
    
    for (var i = 0; i < strLength;i++) {
        str += randChar(startchar,endchar);
    }

    return str;
}

function randChar(start,end) {
    let startChar = start.charCodeAt();
    let endChar = (end).charCodeAt()+1;

    let rand = Math.random();

    let num = Math.floor(valMap(rand,0,1,startChar,endChar));
    return String.fromCharCode(num);
}

function valMap(val,in_min,in_max,out_min,out_max) {
    return (val-in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
}