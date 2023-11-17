const router = require('express').Router();
const moment = require('moment');
const archiver = require('archiver');
const _ = require('lodash');
const fs = require('fs');
const path = require('path');
const Flow = require('../../db/models/Flow.js');
const Job = require('../../db/models/Job.js');
const Service = require('../../db/models/Service.js');
const Output = require('../../db/models/Output.js');
const Data = require('../../db/models/Data.js');

function sanitizeOutputBody(body) {
    // Replace escaped newlines and tabs with real ones
    let output = body.replace(/\\n/g, '\n').replace(/\\t/g, '\t');
    // Remove leading and trailing quotes
    output = output.replace(/^"|"$/g, '');
    // Remove markdown code block (```) and code format identifier
    output = output.replace(/^```[a-z]*\n|```$/g, '');
    return output;
}

router.get('/', async (req, res) => {
    let items = await Flow.find({});
    res.render('flow/views/index', {
        title: 'flow',
        items: items,
    });
});

router.get('/new', async (req, res) => {
    res.render('flow/views/new', {
        title: 'Create Flow',
    });
});

router.post('/create', async (req, res) => {
    const flow = new Flow({ ...req.body, status: 'inactive' });
    await flow.save();
    res.redirect(`/flow/${flow._id}`);
});

router.get('/:id', async (req, res) => {
    const flow = await Flow.findById(req.params.id)
    const jobs = await Job.find({ flow_id: flow._id })
        .populate({ path: 'service_id', model: Service })
        .populate({ path: 'data', model: Data })
        .populate({ path: 'dependencies', model: Job }); // jobs can be their own dependencies
    const outputs = await Job.find({ flow_id: flow._id, flow_output: true })
        .populate({ path: 'outputs', model: Output });
    const services = await Service.find({});
    const allFlowDeps = await Flow.find({ _id: { $ne: flow._id } });
    const flowDeps = await Flow.find({ _id: flow._id }).populate('dependencies').exec();
    const data = [];
    const dependencies = [];
    jobs.forEach(job => {
        job.data.forEach(datum => {
            if (!data.find(d => d._id.equals(datum._id))) data.push(datum);
        });
        job.dependencies.forEach(dep => {
            if (!dependencies.find(d => d._id.equals(dep._id))) dependencies.push(dep);
        });
    });
    const allData = await Data.find({});
    const allDeps = jobs; // All jobs in the current flow can be potential dependencies
    res.render('flow/views/single', {
        title: 'Flow',
        flow,
        jobs,
        services,
        moment,
        outputs,
        data,
        dependencies,
        allData,
        allDeps,
        flowDeps,
        allFlowDeps
    });
});

router.get('/edit/:id', async (req, res) => {
    let item = await Flow.findById(req.params.id);
    res.render('flow/views/edit', {
        title: 'Edit Flow',
        item,
    });
});

router.get('/activate/:id', async (req, res) => {
    const flow = await Flow.findByIdAndUpdate(req.params.id, { status: 'active' });
    if (flow && flow.jobs && flow.jobs.length > 0) {
        for (const jobId of flow.jobs) {
            await Job.findByIdAndUpdate(jobId, { flow_id: flow._id, status: 'open' });
        }
    }
    res.redirect(`/dashboard`);
});

router.post('/update/:id', async (req, res) => {
    try {
        const flow = await Flow.findById(req.params.id);
        if (!flow) {
            return res.status(404).send({ message: 'Flow not found' });
        }
        const { action } = req.body;
        if (action) {
            switch (action) {
                case 'cancel':
                    flow.status = 'inactive';
                    const jobs = await Job.find({ flow_id: flow._id });
                    for (const job of jobs) {
                        job.status = 'inactive';
                        await job.save();
                    }
                    break;
                case 'rerun':
                    flow.status = 'open';
                    const jobs2 = await Job.find({ flow_id: flow._id });
                    for (const job of jobs2) {
                        job.status = 'open';
                        await job.save();
                    }
                    break;
                default:
                    return res.status(400).send({ message: 'Invalid action' });
            }
        } else {
            const updateableFields = ['name', 'description', 'status', 'project_id', 'data', 'dependencies', 'outputs', 'loop', 'loops'];
            updateableFields.forEach(field => {
                if (req.body[field] !== undefined) {
                    if (field === 'data' || field === 'dependencies' || field === 'outputs') {
                        flow[field] = Array.isArray(req.body[field]) ? req.body[field] : [req.body[field]];
                    } else {
                        flow[field] = req.body[field];
                    }
                }
            });
        }
        await flow.save();
        return res.redirect(`/flow/${req.params.id}`);
    } catch (err) {
        console.error(err);
        return res.status(500).send({ message: 'An error occurred while updating the flow.' });
    }
});

router.post('/replace/data/:flow_id', async (req, res) => {
    try {
        const flow = await Flow.findById(req.params.flow_id);
        await flow.replaceData(req.body.oldId, req.body.newId);
        res.redirect(`/flow/${flow._id}`);
    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred while replacing data');
    }
});

router.post('/replace/dependencies/:flow_id', async (req, res) => {
    try {
        const flow = await Flow.findById(req.params.flow_id);
        await flow.replaceDependencies(req.body.oldId, req.body.newId);
        res.redirect(`/flow/${flow._id}`);
    } catch (err) {
        console.error(err);
        res.status(500).send
    }
});

router.post('/duplicate/:flow_id', async (req, res) => {
    try {
        const flow = await Flow.findById(req.params.flow_id);
        const newFlow = await flow.duplicateFlow();
        res.redirect(`/flow/${newFlow._id}`);
    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred while duplicating the flow');
    }
});

router.get('/mergeOutputs/:flowId', async (req, res) => {
    try {
        const flow = await Flow.findById(req.params.flowId);
        if (!flow) {
            return res.status(404).send('Flow not found');
        }
        const jobs = await Job.find({ flow_id: flow._id, flow_output: true })
            .populate({ path: 'outputs', model: Output });
        // Merge all output bodies into a single string
        let mergedOutput = '';
        jobs.forEach((job) => {
            job.outputs.forEach((output) => {
                // Sanitize output body
                const sanitizedBody = sanitizeOutputBody(output.body);
                mergedOutput += sanitizedBody + '\n';
            });
        });
        // Create a single file with the merged output
        const mergedFileName = `${flow.name.replace(/ /g, '_')}_merged_${Date.now()}.txt`;
        const mergedFilePath = path.join(__dirname, mergedFileName);
        fs.writeFileSync(mergedFilePath, mergedOutput);
        res.download(mergedFilePath, (err) => {
            if (err) {
                console.error(err);
                res.status(500).send('An error occurred while downloading the file');
            }
            // Remove the merged file from server after download
            fs.unlink(mergedFilePath, (err) => {
                if (err) console.error(err);
            });
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred while processing your request');
    }
});

router.get('/downloadOutputs/:flowId', async (req, res) => {
    try {
        const flow = await Flow.findById(req.params.flowId);
        if (!flow) {
            return res.status(404).send('Flow not found');
        }
        const jobs = await Job.find({ flow_id: flow._id, flow_output: true })
            .populate({ path: 'outputs', model: Output });
        const archive = archiver('zip', {
            zlib: { level: 9 } // Sets the compression level
        });
        const zipFileName = `outputs_${Date.now()}.zip`;
        const outputFilePath = path.join(__dirname, zipFileName);
        const output = fs.createWriteStream(outputFilePath);
        archive.pipe(output);
        const fileNameCounts = {};
        jobs.forEach((job) => {
            job.outputs.forEach((output) => {
                // If job.filename is empty or undefined, use a fallback filename
                let originalFileName = job.filename || `${job.name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}.txt`;
                // Increase the count for the original filename
                fileNameCounts[originalFileName] = (fileNameCounts[originalFileName] || 0) + 1;
                let fileName = originalFileName;
                // If the filename count is greater than 1, append the count to the filename
                if (fileNameCounts[originalFileName] > 1) {
                    const fileExt = path.extname(originalFileName);
                    const baseName = path.basename(originalFileName, fileExt);
                    fileName = `${baseName}(${fileNameCounts[originalFileName] - 1})${fileExt}`;
                }
                const sanitizedBody = sanitizeOutputBody(output.body);
                archive.append(sanitizedBody, { name: fileName });
            });
        });
        // Finalize the archive (i.e., finish appending files)
        // 'close' event is fired only when a file descriptor is involved
        archive.finalize();
        output.on('close', () => {
            res.download(outputFilePath, (err) => {
                if (err) {
                    console.error(err);
                    res.status(500).send('An error occurred while downloading the file');
                }
                // Remove the zip file from server after download
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
    await Flow.findByIdAndDelete(req.params.id);
    res.redirect('/flow');
});

module.exports = router;
