const Role = require('../db/models/Role');

exports.getRoleIdByName = async (roleName) => {
    try {
        const role = await Role.findOne({ name: roleName });
        return role ? role._id : null;
    } catch (error) {
        console.error(`Error fetching role ID for role ${roleName}: ${error}`);
        throw error;
    }
};

exports.isLoggedIn = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }
    res.status(401).send('Unauthorized');
};

exports.hasRole = (roleName) => {
    return async (req, res, next) => {
        if (!req.user) {
            return res.status(401).send('Unauthorized');
        }

        try {
            const roleId = await getRoleIdByName(roleName);
            const user = await User.findById(req.user._id).populate('roles');

            if (roleId && user.roles.some(role => role._id.equals(roleId))) {
                return next();
            }

            return res.status(403).send('Forbidden');
        } catch (error) {
            console.error(`Error in hasRole middleware: ${error}`);
            return res.status(500).send('Internal Server Error');
        }
    };
};

exports.hasPermission = (permission) => {
    return async (req, res, next) => {
        if (!req.user) {
            return res.status(401).send('Unauthorized');
        }

        // Check for permission in the user's roles
        const hasPermission = req.user.roles.some(role => 
            role.permissions.includes(permission)
        );

        if (hasPermission) {
            return next();
        }

        return res.status(403).send('Forbidden');
    };
};
	