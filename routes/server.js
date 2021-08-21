const ingress = require('../services/k8/ingress')
const siteMw = require('../middleware/site');

module.exports = function(app){
  const ingresses = ingress.getAll();

  /**
   * Overview of users
   */
  app.get('/admin/server',
  //  userMw.withAll,
    (req, res) => {
      res.render('server/overview.html', {
        ingresses: ingresses
      });
    }
  );


  app.post('/admin/set-ingress',
    siteMw.withAll,
    async (req, res) => {
      const ingresses = await ingress.getAll(req.sites.map((site) => {
        return site.domain;
      }));

      req.flash('success', { msg: 'Checked ingress' });
      res.redirect('/admin/server');
    }
  );


}
