const router = require('express').Router();
const passport = require('passport');
const authMiddleware = require('../../helpers/auth');
const User = require('../../db/models/User');

router.post('/login', passport.authenticate('local', {
	successRedirect: '/dashboard/',
	failureRedirect: '/',
	failureFlash: true,
}));

router.get('/logout', function(req, res, next) {
	req.logout(function(err) {
		if (err) { return next(err); }
		res.redirect('/');
	});
});

router.get('/', authMiddleware.isLoggedIn, authMiddleware.hasRole('admin'), (req, res) => {
    User.find({}).populate('roles').exec((err, users) => {
        if (err) {
            res.status(500).send('Internal Server Error');
        } else {
            res.render('user/views/manager', { users });
        }
    });
});

router.post('/new', authMiddleware.isLoggedIn, authMiddleware.hasRole('admin'), (req, res) => {
    const { username, password, role } = req.body;
    const newUser = new User({ username, password, roles: [role] });

    newUser.save((err) => {
        if (err) {
            res.status(500).send('Error creating user');
        } else {
            res.redirect('/user');
        }
    });
});

router.post('/delete/:userId', authMiddleware.isLoggedIn, authMiddleware.hasRole('admin'), (req, res) => {
    User.findByIdAndDelete(req.params.userId, (err) => {
        if (err) {
            res.status(500).send('Error deleting user');
        } else {
            res.redirect('/user');
        }
    });
});

module.exports = router;
