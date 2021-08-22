const ingress = require('../services/k8/ingress')
const siteMw = require('../middleware/site');

module.exports = function(app){

  /**
   * Overview of users
   */
  app.get('/admin/server',
  //  userMw.withAll,
    async (req, res) => {
      const ingresses = await ingress.getAll();

      console.log('All ingresses found, ingresses', ingresses)

      res.render('server/overview.html', {
        ingresses: ingresses
      });
    }
  );


  app.post('/admin/set-ingress',
    siteMw.withAll,
    async (req, res) => {
      console.log('Set ingress for all sites', req.sites)

      const ingresses = await ingress.ensureIngressForAllDomains(req.sites.filter(site => !!site.domain).map((site) => {
        console.log('site.domain', site.domain)
        return site.domain;
      }));

      req.flash('success', { msg: 'Checked ingress' });
      res.redirect('/admin/server');
    }
  );


}
