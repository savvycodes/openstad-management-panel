const multer            = require('multer');
const upload            = multer();

//middleware
const siteMw            = require('../../middleware/site');
const userClientMw      = require('../../middleware/userClient');

//services
const openstadEnvironmentService = require('../../services/openstad/openstadEnvironmentService');
const importService  = require('../../services/openstad/importService');

//models
const NewSite = require('../../services/openstad/models/newSite');
const cleanUrl                = require('../../utils/cleanUrl');

module.exports = function(app){

  /**
   * Show form
   */
  app.get('/admin/site-import',
    siteMw.withAll,
    (req, res, next) => {
      res.render('site/import-form.html', {existingDomains: req.sites.map(site => site.domain).join(',')});
    }
  );

  /**
   * Import
   */
  app.post(
    '/admin/site/import',
    siteMw.withAll,
    userClientMw.withAll,
    upload.single('import_file'),
    // Todo: It would be nice if we create a controller for this method.
    async (req, res, next) => {
      try {

        let domain = req.body['domain-type'] === 'subdomain' ? `${req.body.domain}.${process.env.WILDCARD_HOST}` : req.body.domain;
        const protocol = req.body.protocol ? req.body.protocol : 'https://';

        // add protocol so in development environments http is allowed
        domain = protocol + cleanUrl(domain);

        domain = domain.toLowerCase();

        const newSite = new NewSite(domain, '', req.body.fromEmail, req.body.fromName);

        const dir = await importService.handleImportFile(newSite, req.file, req.body.fileUrl);

        const siteData = await openstadEnvironmentService.getFromFiles(dir);

        newSite.title = req.body.siteName;

        console.log('creating new site :', newSite.title );

        const site = await openstadEnvironmentService.create(req.user, newSite, siteData.apiData, siteData.cmsData, siteData.oauthData);

        req.flash('success', { msg: 'De site is succesvol aangemaakt'});
        res.redirect('/admin/site/' + site.id);
      } catch(error) {
        console.error('Error ---', error);
        req.flash('error', { msg: 'Het is helaas niet gelukt om de site aan te maken'});
        res.redirect('back');
      }
    },
  );
};
