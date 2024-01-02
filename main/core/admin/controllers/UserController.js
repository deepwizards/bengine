const User = require('../../../db/models/User');

const UserController = {
    logout: async (req, res, next) => {
        try {
            await req.logout();
            res.redirect('/');
        } catch (err) {
            next(err);
        }
    },

    getAllUsers: async (req, res) => {
        try {
            const users = await User.find({}).populate('roles').exec();
            res.render('user/views/manager', { users });
        } catch (err) {
            res.status(500).send('Failed to retrieve users: ' + err.message);
        }
    },

    createUser: async (req, res) => {
        try {
            const { username, password, role } = req.body;
            const newUser = new User({ username, password, roles: [role] });
            await newUser.save();
            res.redirect('/user');
        } catch (err) {
            res.status(500).send('Error creating user: ' + err.message);
        }
    },

    deleteUser: async (req, res) => {
        try {
            await User.findByIdAndDelete(req.params.userId);
            res.redirect('/user');
        } catch (err) {
            res.status(500).send('Error deleting user: ' + err.message);
        }
    }
};

module.exports = UserController;
