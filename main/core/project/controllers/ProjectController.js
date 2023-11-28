const fs = require('fs');
const path = require('path');

const moment = require('moment');
const archiver = require('archiver');

const Project = require('../../../db/models/Project');
const Flow = require('../../../db/models/Flow');
const Job = require('../../../db/models/Job');
const Output = require('../../../db/models/Output');
const Data = require('../../../db/models/Data');
const Group = require('../../../db/models/Group');
const Service = require('../../../db/models/Service');

const { sanitizeOutputBody, downloadFile } = require('../../../helpers/utils');

const ProjectController = {
    getAllProjects: async (req, res) => {
        try {
            let projects = await Project.find({})
                .populate({ path: 'flows', model: Flow })
                .populate({ path: 'outputs', model: Output });
            res.render('project/views/index', {
                title: 'project',
                items: projects,
            });
        } catch (err) {
            console.error(err);
            res.status(500).send('An error occurred while fetching projects');
        }
    },

    getNewProject: async (req, res) => {
        res.render('project/views/new', {
            title: 'Create Project',
        });
    },

    createProject: async (req, res) => {
        try {
            const project = new Project({ ...req.body, status: 'inactive' });
            await project.save();
            res.redirect(`/project/${project._id}`);
        } catch (err) {
            console.error(err);
            res.status(500).send('An error occurred while creating the project');
        }
    },

    getProjectById: async (req, res) => {
        try {
            let project = await Project.findById(req.params.id);
            let flows = await Flow.find({ project_id: req.params.id });
            let selectFlows = await Flow.find({});
            let services = await Service.find({});
            let groups = await Group.find({ type: 'Project' }).populate({
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
                currentProjectId: req.params.id,
                services
            });
        } catch (err) {
            console.error(err);
            res.status(500).send('An error occurred while fetching the project');
        }
    },

    editProject: async (req, res) => {
        try {
            let project = await Project.findById(req.params.id);
            res.render('project/views/edit', {
                title: 'Edit Project',
                item: project,
            });
        } catch (err) {
            console.error(err);
            res.status(500).send('An error occurred while editing the project');
        }
    },

    activateProject: async (req, res) => {
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
        } catch (err) {
            console.error(err);
            res.status(500).send('An error occurred while activating the project');
        }
    },

    cancelProject: async (req, res) => {
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
            res.redirect(`/project/${req.params.id}`);
        } catch (err) {
            console.error(err);
            res.status(500).send('An error occurred while canceling the project');
        }
    },

    updateProject: async (req, res) => {
        try {
            const { selectedFlow } = req.body;
            await Project.findByIdAndUpdate(req.params.id, 
                { $push: { flows: selectedFlow } },
                { new: true, useFindAndModify: false }
            );
            res.redirect(`/project/${req.params.id}`);
        } catch (err) {
            console.error(err);
            res.status(500).send('An error occurred while updating the project');
        }
    },

    replaceData: async (req, res) => {
        try {
            const project = await Project.findById(req.params.project_id);
            await project.replaceData(req.body.oldId, req.body.newId);
            res.redirect(`/project/${project._id}`);
        } catch (err) {
            console.error(err);
            res.status(500).send('An error occurred while replacing data');
        }
    },

    replaceDependencies: async (req, res) => {
        try {
            const project = await Project.findById(req.params.project_id);
            await project.replaceDependencies(req.body.oldId, req.body.newId);
            res.redirect(`/project/${project._id}`);
        } catch (err) {
            console.error(err);
            res.status(500).send('An error occurred while replacing dependencies');
        }
    },

    duplicateProject: async (req, res) => {
        try {
            const project = await Project.findById(req.params.project_id);
            const newProject = await project.duplicateProject();
            res.redirect(`/project/${newProject._id}`);
        } catch (err) {
            console.error(err);
            res.status(500).send('An error occurred while duplicating the project');
        }
    },

    mergeOutputs: async (req, res) => {
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
    },

    downloadOutputs: async (req, res) => {
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
    },

    deleteProject: async (req, res) => {
        try {
            await Project.findByIdAndDelete(req.params.id);
            res.redirect('/project');
        } catch (err) {
            console.error(err);
            res.status(500).send('An error occurred while deleting the project');
        }
    }
};

module.exports = ProjectController;
