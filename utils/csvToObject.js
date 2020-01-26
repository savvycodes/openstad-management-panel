const splitLines = require('./splitLines');

module.exports = (string) => {
  let arr = splitLines(string);
  const jsonObj = [];
  const headers = arr[0].split(',');

  for(var i = 1; i < arr.length; i++) {
    var data = arr[i].split(',');
    var obj = {};
    for(var j = 0; j < data.length; j++) {
       obj[headers[j] ? headers[j].trim() : ''] = data[j] ? data[j].trim() : '';
    }
    jsonObj.push(obj);
  }

  return jsonObj;
};
