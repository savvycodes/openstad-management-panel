const splitLines = require('./splitLines');

module.exports = (string) => {
  let arr = splitLines(string);
  const jsonObj = [];
  const headers = arr[0].split(',');

  for(var i = 1; i < arr.length; i++) {
    var data = arr[i].split(',');
    var obj = {};
    for(var j = 0; j < data.length; j++) {
       // ...also grab the relevant header (the RegExp in both of these removes quotes)
       var header = headers[j];

       if (header) {
         header = header.replace(/^"|"$/g,'');
         var propValue = data[j].replace(/^"|"$/g,'');
         obj[header] = propValue ? propValue.trim() : '';
       }
    }
    jsonObj.push(obj);
  }

  return jsonObj;
};
