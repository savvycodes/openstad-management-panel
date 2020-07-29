const fs = require('fs').promises;


//middleware
const siteMw = require('../../middleware/site');

//services
const openstadEnvironmentService = require('../../services/openstad/openstadEnvironmentService');
const exportService = require('../../services/openstad/exportService');

const tmpDir = process.env.TMPDIR || './tmp';

module.exports = function(app){

  /**
   * Export
   */
  app.post(
    '/admin/site/:siteId/export',
    siteMw.withOne,
    //siteMw.addAuthClientId,
    (req, res, next) => {
      // prepare
      console.log('Export prepare');
      let id = Math.round(new Date().getTime() / 1000);
      req.export = {
        id,
        dir: tmpDir + '/' + id,
        filename: tmpDir + '/' + id + '.export.tgz',
        dbName: req.site.config && req.site.config.cms && req.site.config.cms.dbName,
        site: req.site,
      };
      if (!req.export.dbName) return next('site not found');
      fs.mkdir(req.export.dir)
        .then(res => {
          return fs.mkdir(req.export.dir + '/oauth')
        })
        .then(res => {
          return fs.mkdir(req.export.dir + '/attachments')
        })
        .then(res => {
          return fs.mkdir(req.export.dir + '/api')
        })
        .then(res => next())
        .catch(next);
    },
    async (req, res, next) => {
      try {
        // Get all site data
        const uniqueSiteId = Math.round(new Date().getTime() / 1000);
        const siteData = await openstadEnvironmentService.get(uniqueSiteId, req.params.siteId, req.body['choice-guides'], req.body['cms-attachments']);
        
        const fileName = await exportService.export(siteData, req.export.site.domain, req.body, req.export.dir, req.export.filename);

        res.download(fileName);
      } catch (error) {
        console.log(error);
        req.flash('error', { msg: error.message});
        res.redirect('back');
      }
    }
  );
};
