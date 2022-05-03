const { Parser }          = require('json2csv');

/**
 * Import middleware
 */
const ideaMw            = require('../../middleware/idea');
const siteMw            = require('../../middleware/site');

/**
 * Set the appclication values
 */
const siteId = process.env.SITE_ID;

module.exports = function(app){
  app.get('/admin/site/:siteId/idea/export',
    siteMw.withOne,
    ideaMw.allForSite,
    (req, res, next) => {
      if (req.ideas.length === 0) {
        req.flash('error', { msg: 'No ideas to export'});
        req.session.save( () => {
          res.redirect(req.header('Referer'));
        });
      } else {
        const exportHeaders = [
          {key: 'id', label: 'ID'},
          {key: 'title', label: 'Title'},
          {key: 'summary', label: 'Summary'},
          {key: 'description', label: 'Description'},
          {key: 'originalId', label: 'Original idea ID', 'extraData': true},
          {key: 'area', label: 'Area', 'extraData': true},
          {key: 'theme', label: 'Theme', 'extraData': true},
          {key: 'advice', label: 'Advice', 'extraData': true},
          {key: 'budget', label: 'Budget'},
          {key: 'ranking', label: 'Ranking', 'extraData': true},
          {key: 'images', label: 'Images', 'extraData': true},
          {key: 'modBreak', label: 'Modbreak'},
          {key: 'firstName', label: 'First name', userData: true},
          {key: 'lastName', label: 'Last name', userData: true},
          {key: 'email', label: 'email', userData: true},
          {key: 'yes', label: 'Votes for'},
          {key: 'no', label: 'Votes against'},
        ];

        const formattedIdeas = req.ideas ? req.ideas.map((idea) => {
          const formattedIdea = {};
          exportHeaders.forEach((header) => {
            if (header.userData) {
              formattedIdea[header.key] = idea.user && idea.user[header.key] ? idea.user[header.key] : '';
            } else {
              formattedIdea[header.key] = header.extraData &&  idea.extraData ? idea.extraData[header.key] : idea[header.key];
            }
          });

          return formattedIdea;
        }) : [];

        const json2csvParser = new Parser(exportHeaders.map((header) => header.label));
        const csvString = json2csvParser.parse(formattedIdeas);

      //  const csvString = csvParser(req.uniqueCodes);
        const filename = `ideas-${req.params.siteId}-${new Date().getTime()}.csv`;
        res.setHeader(`Content-disposition`, `attachment; filename=${filename}`);
        res.set('Content-Type', 'text/csv');
        res.status(200).send(csvString);
      }
  });
}
