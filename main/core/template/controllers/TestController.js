const axios = require('axios');

const Template = require('../../../db/models/Template');
const Test = require('../../../db/models/Test');
const Data = require('../../../db/models/Data');

const TestController = {
    testTemplate: async (req, res) => {
        try {
            const templateId = req.params.templateId;
            const template = await Template.findById(templateId).populate('inputs.block');
            
            if (!template) {
                return res.status(404).json({ success: false, message: "Template not found." });
            }

            const blocks = template.inputs.map(input => input.block);
            const processedData = await processBlocks(blocks);

            const gptResponse = await axios.post(
                'http://localhost:3001/gpt', { 
                    data: { 
                        prompt: processedData 
                    }
                }
            );
            const promptOutput = gptResponse.data;

            const newTest = new Test({
                template_id: template._id,
                template_version: template.current_version || 'alpha',
                result: JSON.stringify(promptOutput)
            });

            await newTest.save();

            res.status(201).json({
                success: true,
                data: {
                    testId: newTest._id, // or the appropriate identifier for the test
                    created_at: newTest.createdAt || new Date().toISOString(), // Assuming your model has a createdAt field
                    template_version: newTest.template_version,
                    template_id: newTest.template_id,
                    result: promptOutput // Including the result if needed on the frontend
                }
            });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    testDetails: async (req, res) => {
        try {
            const testId = req.params.testId;
            const test = await Test.findById(testId);
            if (!test) {
                return res.status(404).json({ success: false, message: "Test not found." });
            }
            res.status(200).json({ success: true, data: test });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
};

const processBlocks = async (blocks) => {
    let result = "";
    for (const block of blocks) {
        switch (block.type.toString()) {
            case 'data':
                const blockData = await Data.findById(block.data);
                if (!blockData) {
                    throw new Error("Data block not found.");
                }
                result += blockData.body;
                break;
            case 'text':
                result += block.body;
                break;
            default:
                throw new Error(`Unsupported block type: ${block.type}`);
        }
    }
    return result;
};

module.exports = TestController;
