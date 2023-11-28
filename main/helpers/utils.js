const mongoose = require('mongoose');

const validateObjectId = (req, res, next) => {
    const id = req.params.id || req.params.templateId || req.params.blockId || req.params.versionId;
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).send('Invalid ID format');
    }
    next();
};

module.exports = validateObjectId;
