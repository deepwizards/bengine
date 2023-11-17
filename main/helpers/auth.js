function isLoggedIn(req, res, next) {
	if (req.isAuthenticated()) {
		return next();
	}
	res.redirect('/');
}

function isAdmin(req, res, next) {
	if (req.user && req.user.role === 'admin') {
		return next();
	}
	res.redirect('/');
}

module.exports = { isLoggedIn, isAdmin };
	