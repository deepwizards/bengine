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

router.get('/', authMiddleware.isLoggedIn, authMiddleware.isAdmin, (req, res) => {
	User.find({}, (err, users) => {
		if (err) {
			res.status(500).send(err);
		} else {
			res.render('user/views/manager', { users });
		}
	});
});

router.post('/new', authMiddleware.isLoggedIn, authMiddleware.isAdmin, (req, res) => {
	const { username, password, role } = req.body;
	const newUser = new User({ username, password, role });

	newUser.save((err) => {
		if (err) {
			res.status(500).send(err);
		} else {
			res.redirect('/user');
		}
	});
});
	
router.post('/delete/:userId', authMiddleware.isLoggedIn, authMiddleware.isAdmin, (req, res) => {
	User.findByIdAndDelete(req.params.userId, (err) => {
		if (err) {
			res.status(500).send(err);
		} else {
			res.redirect('/user');
		}
	});
});

module.exports = router;
