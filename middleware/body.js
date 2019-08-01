/*
  Parse boolean values in nested body,
  so value="true" will be true instead of 'true'
  should be called after body-parser json() call
 */
 const formatBoolean = (obj) => {
     // Loop through this object's properties
     Object.keys(obj).forEach(function(key) {
         // Get this property's value
         var value = obj[key];
         // If not falsy (null, empty string, etc.)...
         if (value) {
             // What is it?
             switch (typeof value) {
                 case "object":
                     // It's an object, recurse
                     formatBoolean(value);
                     break;
                 case "string":
                     // It's a string, decrypt
                     if (obj[key] === 'true' || obj[key] === 'false' ) {
                       obj[key] = obj[key] === 'true' ?  true : false;
                     }

                     break;
             }
         }
     })

     return obj;
 }

exports.parseBoolean = (req, res, next) => {
  if (req.body) {
    req.body = formatBoolean(req.body);
  }
  next();
}
