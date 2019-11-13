const userMw = require('../middleware/user');
const clientMw = require('../middleware/userClient');
const roleMw = require('../middleware/role');
const userApiService = require('../services/userApi');

module.exports = function(app){
  app.get('/admin/users',
    userMw.withAll,
    (req, res) => {
      res.render('users/overview.html');
    }
  );

  app.get('/admin/user',
    clientMw.withAll,
    roleMw.withAll,
    (req, res) => {
      res.render('users/form.html');
    }
  );

  app.get('/admin/user/:userId',
    clientMw.withAll,
    roleMw.withAll,
    userMw.withOne,
    (req, res) => {
      const userRoles = req.editUser.roles;

      // set user clients to role
      const userApiClients = req.userApiClients.map((client) => {
        client.userRole =  userRoles ? userRoles.find(userRole => userRole.clientId === client.id) : {};
        return client;
      });

      res.render('users/form.html', {
        userApiClients: userApiClients
      });
    }
  );

  app.post('/admin/user',
    (req, res) => {
      userApiService
        .create(req.body)
        .then((response) => {
          req.flash('success', { msg: 'Created user!' });
          res.redirect('/admin/users');
        })
        .catch((err) => {
          let message = err && err.error && err.error.message ?  'Er gaat iets mis: '+ err.error.message : 'Er gaat iets mis!';
          req.flash('error', { msg: message });
          res.redirect('/admin/user');
        })
    }
  );

  app.post('/admin/user/:userId',
    clientMw.withAll,
    roleMw.withAll,
    (req, res) => {
      userApiService
        .update(req.params.userId, req.body)
        .then((response) => {
          req.flash('success', { msg: 'Updated user!' });
          res.redirect('/admin/user/' + req.params.userId);
        })
        .catch((err) => {
          let message = err && err.error && err.error.message ?  'Er gaat iets mis: '+ err.error.message : 'Er gaat iets mis!';
          req.flash('error', { msg: message });
          res.redirect('/admin/user/' + req.params.userId);
        })
    }
  );

  app.post('/admin/user/:userId/delete',
    (req, res) => {
      userApiService
        .delete(req.params.userId)
        .then((response) => {
          req.flash('success', { msg: 'Updated user!' });
          res.redirect('/admin/users');
        })
        .catch((err) => {
          let message = err && err.error && err.error.message ?  'Er gaat iets mis: '+ err.error.message : 'Er gaat iets mis!';
          req.flash('error', { msg: message });
          res.redirect('/admin/users');
        })
    }
  );
}
