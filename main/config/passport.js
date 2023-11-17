const LocalStrategy = require('passport-local').Strategy;
const User = require('../db/models/User');

module.exports = function (passport) {
	passport.use(new LocalStrategy(async (username, password, done) => {
		try {
			const user = await User.findOne({ username });
			if (!user) {
				return done(null, false, { message: 'Incorrect username.' });
			}
			const isValidPassword = await user.comparePassword(password);
			if (!isValidPassword) {
				return done(null, false, { message: 'Incorrect password.' });
			}
			return done(null, user);
		} catch (err) {
			return done(err);
		}
	}));

	passport.serializeUser((user, done) => {
		done(null, user.id);
	});

	passport.deserializeUser(async (id, done) => {
		try {
			const user = await User.findById(id);
			done(null, user);
		} catch (err) {
			done(err, null);
		}
	});
};
