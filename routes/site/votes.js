const rp                  = require('request-promise');

//middleware
const ideaMw            = require('../../middleware/idea');
const siteMw            = require('../../middleware/site');
const voteMw            = require('../../middleware/vote');
const userClientMw      = require('../../middleware/userClient');

//ENV constants
const apiUrl            = process.env.API_URL;
const appUrl            = process.env.APP_URL;

module.exports = function(app) {
  /**
   * Display all votes
   */
  app.get('/admin/site/:siteId/votes',
    ideaMw.allForSite,
    siteMw.withOne,
    voteMw.allForSite,
    userClientMw.withOneForSite,
    (req, res, next) => {
      res.render(`site/votes.html`);
    }
  );

  /**
   * Call openstad API to toggle the validity of the vote
   * Used for invalidating real or test votes
   */
  app.get('/admin/site/:siteId/vote/:voteId/toggle',
    (req, res, next) => {
      const options = {
          uri: `${apiUrl}/api/site/${req.params.siteId}/vote/${req.params.voteId}/toggle`,
          headers: {
              'Accept': 'application/json',
              "X-Authorization": process.env.SITE_API_KEY
          },
          json: true // Automatically parses the JSON string in the response
      };

      rp(options)
        .then(function (votes) {
          req.flash('success', { msg: 'Updated!'});
          req.session.save( () => {
            res.redirect(req.header('Referer')  || appUrl);
            next();
          });
        })
        .catch(function (err) {
          req.flash('error', { msg: 'Something whent wrong!'});
          req.session.save( () => {
            res.redirect(req.header('Referer')  || appUrl);
            next();
          });
        });
  });
}
