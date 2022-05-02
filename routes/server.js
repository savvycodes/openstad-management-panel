const ingress = require('../services/k8/ingress')
const siteMw = require('../middleware/site');

module.exports = function(app){

  /**
   * Overview of users
   */
  app.get('/admin/server',
  //  userMw.withAll,
    async (req, res) => {

      const ingresses =  !!process.env.KUBERNETES_NAMESPACE ? await ingress.getAll() : [];

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

      const ingresses = await ingress.ensureIngressForAllDomains(req.sites);

      req.flash('success', { msg: 'Checked ingress' });
      res.redirect('/admin/server');
    }
  );


}
