const splitLines = require('./splitLines');

exports.csvToObject = (string) => {
  let arr = splitLines(string);
  const jsonObj = [];
  const headers = arr[0].split(',');

  for(var i = 1; i < arr.length; i++) {
    var data = arr[i].split(',');
    var obj = {};
    for(var j = 0; j < data.length; j++) {
       obj[headers[j].trim()] = data[j].trim();
    }
    jsonObj.push(obj);
  }

  return jsonObj;
};
