const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const Flow = require('../../../db/models/Flow.js');
const Job = require('../../../db/models/Job.js');
const Output = require('../../../db/models/Output.js');

const sanitizeOutputBody = (body) => body.replace(/\\[nt]/g, m => m === '\\n' ? '\n' : '\t')
                                        .replace(/^"|"$/g, '')
                                        .replace(/^```[a-z]*\n|```$/g, '');

exports.mergeOutputs = async (req, res) => {
    try {
        const flow = await Flow.findById(req.params.flowId);
        if (!flow) {
            return res.status(404).send('Flow not found');
        }

        const jobs = await Job.find({ flow_id: flow._id, flow_output: true })
            .populate({ path: 'outputs', model: Output });

        let mergedOutput = '';
        jobs.forEach(job => {
            job.outputs.forEach(output => {
                const sanitizedBody = sanitizeOutputBody(output.body);
                mergedOutput += sanitizedBody + '\n';
            });
        });

        const mergedFileName = `${flow.name.replace(/ /g, '_')}_merged_${Date.now()}.txt`;
        const mergedFilePath = path.join(__dirname, '../../uploads', mergedFileName);
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
        res.status(500).send('An error occurred while merging outputs');
    }
};

exports.downloadOutputs = async (req, res) => {
    try {
        const flow = await Flow.findById(req.params.flowId);
        if (!flow) {
            return res.status(404).send('Flow not found');
        }

        const jobs = await Job.find({ flow_id: flow._id, flow_output: true })
            .populate({ path: 'outputs', model: Output });

        const archive = archiver('zip', { zlib: { level: 9 } });
        const zipFileName = `outputs_${Date.now()}.zip`;
        const outputFilePath = path.join(__dirname, '../../uploads', zipFileName);

        const output = fs.createWriteStream(outputFilePath);
        archive.pipe(output);

        jobs.forEach(job => {
            job.outputs.forEach(output => {
                const sanitizedBody = sanitizeOutputBody(output.body);
                archive.append(sanitizedBody, { name: output.filename });
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
};

module.exports = exports;
