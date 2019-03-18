const rp = require('request-promise');
const apiUrl = process.env.API_URL;

exports.allForSite = (req, res, next) => {
  var options = {
      uri: `${apiUrl}/api/site/${req.params.siteId}/idea`,
      headers: {
          'Accept': 'application/json',
  //         "Authorization" : auth
      },
      json: true // Automatically parses the JSON string in the response
  };

  console.log('==> options', options);

  rp(options)
    .then(function (ideas) {
       req.ideas = ideas;
       res.locals.ideas = ideas;
       next();
    })
    .catch(function (err) {
      next();
    });
}

exports.oneForSite  = (req, res, next) => {
  var options = {
      uri: `${apiUrl}/api/site/${req.params.siteId}/idea/${req.params.ideaId}`,
      headers: {
          'Accept': 'application/json',
  //         "Authorization" : auth
      },
      json: true // Automatically parses the JSON string in the response
  };

  rp(options)
    .then(function (idea) {
      req.idea = idea;
      res.locals.idea = idea;
      next();
    })
    .catch(function (err) {
      next();
    });
}
