const userMw = require('../middleware/user');
const userApiService = require('../services/userApi');

module.exports = function(app){
  app.get('/admin/users',
    userMw.withAll,
    (req, res) => {
      res.render('users/overview.html');
    }
  );

  app.get('/admin/user',
    (req, res) => {
      res.render('users/form.html');
    }
  );

  app.get('/admin/user/:userId',
    userMw.withOne,
    (req, res) => {
      res.render('users/form.html');
    }
  );

  app.post('/admin/user',
    (req, res) => {
      userApiService
        .create(req.session.jwt, req.body)
        .then((response) => {
          req.flash('success', { msg: 'Created user!' });
          res.redirect('/admin/users');
        })
        .catch((err) => {
          console.log('==> err', err);
          req.flash('error', { msg: 'Error: '+ err.msg });
          res.redirect('/admin/user');
        })
    }
  );

  app.post('/admin/user/:userId',
    (req, res) => {
      userApiService
        .update(req.session.jwt, req.params.userId, req.body)
        .then((response) => {
          req.flash('success', { msg: 'Updated user!' });
          res.redirect('/admin/user/' + req.params.userId);
        })
        .catch((err) => {
          console.log('==> err', err);
          req.flash('error', { msg: 'Error: '+ err.msg });
          res.redirect('/admin/user/' + req.params.userId);
        })
    }
  );

  app.post('/admin/user/:userId/delete',
    (req, res) => {
      userApiService
        .delete(req.session.jwt, req.params.userId)
        .then((response) => {
          req.flash('success', { msg: 'Updated user!' });
          res.redirect('/admin/users');
        })
        .catch((err) => {
          console.log('==> err', err);
          req.flash('error', { msg: 'Error: '+ err.msg });
          res.redirect('/admin/users');
        })
    }
  );


}
