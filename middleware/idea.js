const rp = require('request-promise');
const apiUrl = process.env.API_URL;
const siteApiKey =  process.env.SITE_API_KEY;

exports.allForSite = (req, res, next) => {
  var options = {
      uri: `${apiUrl}/api/site/${req.params.siteId}/idea?includeVoteCount=1&includeUserVote=1`,
      headers: {
          'Accept': 'application/json',
          "X-Authorization": siteApiKey
      },
      json: true // Automatically parses the JSON string in the response
  };


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
      uri: `${apiUrl}/api/site/${req.params.siteId}/idea/${req.params.ideaId}?includeVoteCount=1&includeUserVote=1`,
      headers: {
          'Accept': 'application/json',
          "X-Authorization": siteApiKey
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
