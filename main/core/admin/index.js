const router = require('express').Router();
const passport = require('passport');
const UserController = require('./controllers/UserController');
const authMiddleware = require('../../helpers/auth');

router.post('/login', passport.authenticate('local', {
    successRedirect: '/dashboard/',
    failureRedirect: '/',
    failureFlash: true,
}));
router.get('/logout', UserController.logout);
router.get('/', authMiddleware.isLoggedIn, authMiddleware.hasRole('admin'), UserController.getAllUsers);
router.post('/new', authMiddleware.isLoggedIn, authMiddleware.hasRole('admin'), UserController.createUser);
router.post('/delete/:userId', authMiddleware.isLoggedIn, authMiddleware.hasRole('admin'), UserController.deleteUser);

module.exports = router;
