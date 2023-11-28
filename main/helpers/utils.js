const mongoose = require('mongoose');

const fs = require('fs');
const path = require('path');

const Utils = {
    sanitizeOutputBody: (body) => {
        let output = body.replace(/\\n/g, '\n').replace(/\\t/g, '\t');
        output = output.replace(/^"|"$/g, '');
        output = output.replace(/^```[a-z]*\n|```$/g, '');
        return output;
    },

    downloadFile: (filePath, res) => {
        if (!filePath) {
            res.status(400).send('File path is required.');
            return;
        }

        if (!fs.existsSync(filePath)) {
            res.status(404).send('File not found.');
            return;
        }

        res.download(filePath, (err) => {
            if (err) {
                console.error('Error during file download:', err);
                res.status(500).send('Error during file download.');
                return;
            }

            fs.unlink(filePath, (unlinkErr) => {
                if (unlinkErr) {
                    console.error('Error during file deletion:', unlinkErr);
                }
            });
        });
    },

    validateObjectId: (req, res, next) => {
        const id = req.params.id || req.params.templateId || req.params.blockId || req.params.versionId;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).send('Invalid ID format');
        }
        next();
    }
};

module.exports = Utils;
