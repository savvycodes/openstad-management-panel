const splitLines = require('./splitLines');

module.exports = (string) => {
  let arr = splitLines(string);
  const jsonObj = [];
  const headers = arr[0].split(',');

  for(var i = 1; i < arr.length; i++) {
    var data = arr[i].split(',');
    var obj = {};
    for(var j = 0; j < data.length; j++) {
       var header = headers[j] ? headers[j].replace('"',  '').replace('"',  '') : '';
       if (header) {
         obj[header] = data[j] ? data[j].trim() : '';
       }
    }
    jsonObj.push(obj);
  }

  return jsonObj;
};
