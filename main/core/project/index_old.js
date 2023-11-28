const router = require('express').Router();
const Project = require('../../db/models/Project.js');
const Flow = require('../../db/models/Flow.js');
const Job = require('../../db/models/Job.js');
const Output = require('../../db/models/Output.js');
const Data = require('../../db/models/Data.js');
const Group = require('../../db/models/Group.js')
const Service = require('../../db/models/Service.js')
const moment = require('moment');
const archiver = require('archiver');
const _ = require('lodash');
const fs = require('fs');
const path = require('path');

function sanitizeOutputBody(body) {
    let output = body.replace(/\\n/g, '\n').replace(/\\t/g, '\t');
    output = output.replace(/^"|"$/g, '');
    output = output.replace(/^```[a-z]*\n|```$/g, '');
    return output;
}

router.get('/', async (req, res) => {
    let items = await Project.find({})
        .populate({ path: 'flows', model: Flow })
        .populate({ path: 'outputs', model: Output });
    res.render('project/views/index', {
        title: 'project',
        items: items,
    });
});

router.get('/new', async (req, res) => {
    res.render('project/views/new', {
        title: 'Create Project',
    });
});

router.post('/create', async (req, res) => {
    const project = new Project({ ...req.body, status: 'inactive' });
    await project.save();
    res.redirect(`/project/${project._id}`);
});

router.get('/api/jobs/:flowId', async (req, res) => {
    try {
        const flow = await Flow.findById(req.params.flowId)
        if (!flow) {
            res.status(404).json({ message: 'Flow not found' });
        }
        const jobs = await Job.find({ flow_id: flow._id })
            .populate({
                path: 'template',
                populate: {
                    path: 'service',
                    model: 'Service'
                }
            })
            .populate({ path: 'data', model: Data })
            .populate({ path: 'dependencies', model: Job }).exec();
        res.json(jobs);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

router.get('/api/job/:id', async (req, res) => {
    try {
        const job = await Job.findById(req.params.id)
            .populate({
                path: 'template',
                populate: {
                    path: 'service',
                    model: 'Service'
                }
            })
            .populate('data')
            .populate('dependencies');
        res.json(job);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/:id', async (req, res) => {
    let project = await Project.findById(req.params.id);
    let flows = await Flow.find({project_id: req.params.id});
    let selectFlows = await Flow.find({});
    const currentProjectId = req.params.id;
    let services = await Service.find({})
    let groups = await Group.find({type: 'Project'}).populate({
        path: 'list',
        model: 'Project',
        select: 'name _id'
    });
    let allProjects = await Project.find({}, 'name _id');
    res.render('project/views/single', {
        title: 'Project',
        project,
        flows,
        selectFlows,
        moment,
        groups,
        allProjects,
        currentProjectId,
        services
    });
});

router.post('/flow/new/:projectId', async (req, res) => {
    const flow = new Flow({ ...req.body, project_id: req.params.projectId, status: 'inactive' });
    await flow.save();
    res.redirect(`/project/${req.params.projectId}`);
});

router.get('/edit/:id', async (req, res) => {
    let item = await Project.findById(req.params.id);
    res.render('project/views/edit', {
        title: 'Edit Project',
        item,
    });
});

router.get('/activate/:id', async (req, res) => {
    try {
        await Project.findByIdAndUpdate(req.params.id, { status: 'active' });
        const flows = await Flow.find({ project_id: req.params.id });
        for (const flow of flows) {
            await Flow.findByIdAndUpdate(flow._id, { status: 'active' });
            const jobs = await Job.find({ flow_id: flow._id });
            for (const job of jobs) {
                await Job.findByIdAndUpdate(job._id, { status: 'open' });
            }
        }
        res.redirect('/queue');
    } catch (error) {
        res.status(500).send(error.message);
    }
});

router.get('/cancel/:id', async (req, res) => {
    try {
        await Project.findByIdAndUpdate(req.params.id, { status: 'inactive' });
        const flows = await Flow.find({ project_id: req.params.id });
        for (const flow of flows) {
            await Flow.findByIdAndUpdate(flow._id, { status: 'inactive' });
            const jobs = await Job.find({ flow_id: flow._id });
            for (const job of jobs) {
                await Job.findByIdAndUpdate(job._id, { status: 'inactive' });
            }
        }
        res.redirect('/project/' + req.params.id);
    } catch (error) {
        res.status(500).send(error.message);
    }
});

router.post('/update/:id', async (req, res) => {
    const { selectedFlow } = req.body;
    await Project.findByIdAndUpdate(req.params.id, 
        { $push: { flows: selectedFlow } },
        { new: true, useFindAndModify: false }
    );
    res.redirect(`/project/${req.params.id}`);
});

router.post('/replace/data/:project_id', async (req, res) => {
    try {
        const project = await Project.findById(req.params.project_id);
        await project.replaceData(req.body.oldId, req.body.newId);
        res.redirect(`/project/${project._id}`);
    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred while replacing data');
    }
});

router.post('/replace/dependencies/:project_id', async (req, res) => {
    try {
        const project = await Project.findById(req.params.project_id);
        await project.replaceDependencies(req.body.oldId, req.body.newId);
        res.redirect(`/project/${project._id}`);
    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred while replacing dependencies');
    }
});

router.post('/duplicate/:project_id', async (req, res) => {
    try {
        const project = await Project.findById(req.params.project_id);
        const newProject = await project.duplicateProject();
        res.redirect(`/project/${newProject._id}`);
    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred while duplicating the project');
    }
});

router.get('/mergeOutputs/:projectId', async (req, res) => {
    try {
        const project = await Project.findById(req.params.projectId);
        if (!project) {
            return res.status(404).send('Project not found');
        }
        const flows = await Flow.find({ project_id: project._id, project_output: true })
            .populate({ path: 'outputs', model: Output });
        let mergedOutput = '';
        flows.forEach((flow) => {
            flow.outputs.forEach((output) => {
                const sanitizedBody = sanitizeOutputBody(output.body);
                mergedOutput += sanitizedBody + '\n';
            });
        });
        const mergedFileName = `${project.name.replace(/ /g, '_')}_merged_${Date.now()}.txt`;
        const mergedFilePath = path.join(__dirname, mergedFileName);
        fs.writeFileSync(mergedFilePath, mergedOutput);
        res.download(mergedFilePath, (err) => {
            if (err) {
                console.error(err);
                res.status(500).send('An error occurred while downloading the file');
            }
            fs.unlink(mergedFilePath, (err) => {
                if (err) console.error(err);
            });
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred while processing your request');
    }
});

router.get('/downloadOutputs/:projectId', async (req, res) => {
    try {
        const project = await Project.findById(req.params.projectId);
        if (!project) {
            return res.status(404).send('Project not found');
        }
        const flows = await Flow.find({ project_id: project._id, project_output: true })
            .populate({ path: 'outputs', model: Output });
        const archive = archiver('zip', {
            zlib: { level: 9 }
        });
        const zipFileName = `outputs_${Date.now()}.zip`;
        const outputFilePath = path.join(__dirname, zipFileName);
        const output = fs.createWriteStream(outputFilePath);
        archive.pipe(output);
        const fileNameCounts = {};
        flows.forEach((flow) => {
            flow.outputs.forEach((output) => {
                let originalFileName = flow.filename || `${flow.name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}.txt`;
                fileNameCounts[originalFileName] = (fileNameCounts[originalFileName] || 0) + 1;
                let fileName = originalFileName;
                if (fileNameCounts[originalFileName] > 1) {
                    const fileExt = path.extname(originalFileName);
                    const baseName = path.basename(originalFileName, fileExt);
                    fileName = `${baseName}(${fileNameCounts[originalFileName] - 1})${fileExt}`;
                }
                const sanitizedBody = sanitizeOutputBody(output.body);
                archive.append(sanitizedBody, { name: fileName });
            });
        });
        archive.finalize();
        output.on('close', () => {
            res.download(outputFilePath, (err) => {
                if (err) {
                    console.error(err);
                    res.status(500).send('An error occurred while downloading the file');
                }
                fs.unlink(outputFilePath, (err) => {
                    if (err) console.error(err);
                });
            });
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred while processing your request');
    }
});

router.post('/delete/:id', async (req, res) => {
    await Project.findByIdAndDelete(req.params.id);
    res.redirect('/project');
});

module.exports = router;
