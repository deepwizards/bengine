const Flow = require('../../../db/models/Flow');

const FlowController = {
    createFlow: async (req, res) => {
        try {
            const flow = new Flow({ ...req.body, project_id: req.params.projectId, status: 'inactive' });
            await flow.save();
            res.redirect(`/project/${req.params.projectId}`);
        } catch (err) {
            console.error(err);
            res.status(500).send('An error occurred while creating the flow');
        }
    }
};

module.exports = FlowController;
