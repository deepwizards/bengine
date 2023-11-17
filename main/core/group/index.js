const router = require('express').Router();
const Group = require('../../db/models/Group');

const schemas = ['Data', 'Output', 'Flow', 'Project', 'Job', 'Block', 'Template', 'Group', 'Service', 'Module'];

const models = schemas.reduce((acc, schema) => {
	try {
		acc[schema] = require(`../../db/models/${schema}`);
	} catch (e) {
		console.error(`Failed to require model for schema: ${schema}`, e);
	}
	return acc;
}, {});

async function getAllGroupsAndModels() {
	const groups = await Group.find().sort({ updatedAt: -1 });
	await Promise.all(
		groups.map(async (group) => {
			const model = models[group.type];
			if (model && typeof model.find === 'function') {
				group.list = await model
					.find()
					.sort({ updatedAt: -1 })
					.where('_id')
					.in(group.list)
					.exec();
			} else {
				console.error(`Invalid group type or model does not have a find function: ${group.type}`);
			}
		})
	);
	const modelsData = await Promise.all(
		schemas.map(async (schema) => {
			const model = models[schema];
			if (model && typeof model.find === 'function') {
				return {
					name: schema,
					items: await model.find().sort({ updatedAt: -1 }),
				};
			} else {
				console.error(`Invalid schema or model does not have a find function: ${schema}`);
				return null;
			}
		})
	);
	return { groups, modelsData: modelsData.filter(Boolean) };
}

router.get('/', async (req, res, next) => {
	try {
		const { groups, modelsData } = await getAllGroupsAndModels();
		req.flash('success', 'Groups retrieved successfully!');
		res.render('group/views/index', {
			title: 'group',
			groups,
			schemas,
			models: modelsData,
		});
	} catch (err) {
		req.flash('error', err.message);
		next(err);
	}
});

router.post('/', async (req, res, next) => {
	try {
		const group = new Group(req.body);
		await group.save();
		req.flash('success', 'Group saved successfully!');
		res.redirect('/group');
	} catch (err) {
		req.flash('error', err.message);
		next(err);
	}
});

router.get('/all', async (req, res, next) => {
	try {
		const groups = await Group.find().sort({updatedAt: -1});
		await Promise.all(
			groups.map(async (group) => {
				if (!models[group.type]) {
					console.error(`Model not found for group type: ${group.type}`);
					return;
				}
				group.list = await models[group.type]
					.find()
					.sort({updatedAt: -1})
					.where('_id')
					.in(group.list)
					.exec();
			})
		);
		req.flash('success', 'All groups retrieved successfully!');
		res.json(groups);
	} catch (err) {
		req.flash('error', err.message);
		next(err);
	}
});

router.get('/:id', async (req, res, next) => {
	try {
		const group = await Group.findById(req.params.id);
		if (!group) throw new Error('Group not found');
		group.list = await models[group.type]
			.find()
			.sort({updatedAt: -1})
			.where('_id')
			.in(group.list)
			.exec();
		req.flash('success', 'Group retrieved successfully!');
		res.json(group);
	} catch (err) {
		req.flash('error', err.message);
		next(err);
	}
});

router.post('/:groupId/items', async (req, res, next) => {
		try {
			const { groupId } = req.params;
			const { itemIds } = req.body;
			const group = await Group.findById(groupId);
			group.list = [...group.list, ...itemIds];
			await group.save();
			req.flash('success', 'Items added to group successfully!');
			res.redirect('/group');
		} catch (err) {
			req.flash('error', err.message);
			next(err);
		}
	});

router.post('/:groupId/remove-items', async (req, res, next) => {
	try {
		const { groupId } = req.params;
		const { itemIds } = req.body;
		const group = await Group.findById(groupId);
		group.list = group.list.filter(id => !itemIds.includes(id));
		await group.save();
		req.flash('success', 'Items removed from group successfully!');
		res.redirect('/group');
	} catch (err) {
		req.flash('error', err.message);
		next(err);
	}
});

router.use((err, req, res, next) => {
	console.error(err.stack);
	req.flash('error', err.message);
	if (req.path.startsWith('/all') || req.path.match(/^\/\w+$/)) {
		res.status(500).json({ error: err.message });
	} else {
		res.redirect('/group');
	}
});

module.exports = router;
