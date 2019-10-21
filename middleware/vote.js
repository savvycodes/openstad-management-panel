const rp = require('request-promise');
const apiUrl = process.env.API_URL;

exports.allForSite = (req, res, next) => {
  var options = {
      uri: `${apiUrl}/api/site/${req.params.siteId}/vote`,
      headers: {
          'Accept': 'application/json',
  //         "Authorization" : auth
      },
      json: true // Automatically parses the JSON string in the response
  };


  rp(options)
    .then(function (votes) {
       const allVotes = votes;
       const userVotedCount = votes;

       req.ideas = req.ideas.map((idea) => {
         idea.votes = allVotes.filter(vote => vote.ideaId === idea.id);
         idea.voteCountFor = idea.votes.filter(vote => vote.opinion === 'yes').length;
         idea.voteCountAgainst =  idea.votes.filter(vote => vote.opinion === 'no').length;
         return idea;
       });

       req.votes = allVotes;
       res.locals.votes = allVotes;
       next();
    })
    .catch(function (err) {
      console.log('-->>>> err', err);
      next();
    });
}
