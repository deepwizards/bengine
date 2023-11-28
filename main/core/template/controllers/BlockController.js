const mongoose = require('mongoose');

const Block = require('../../../db/models/Block');
const Template = require('../../../db/models/Template');

const BlockController = {
    handleBlockAction: async (req, res) => {
        const templateId = req.params.templateId;
        const { action, blockId, type, name, body } = req.body;

        if (!mongoose.Types.ObjectId.isValid(templateId)) {
            return res.status(400).json({ success: false, message: "Invalid template ID." });
        }

        let template;
        try {
            template = await Template.findById(templateId);
            if (!template) {
                return res.status(404).json({ success: false, message: "Template not found." });
            }
            template.inputs.sort((a, b) => a.order - b.order);
        } catch (error) {
            return res.status(500).json({ success: false, message: "Error fetching template: " + error.message });
        }

        if (!action) {
            try {
                let newBlock;
                if (blockId) {
                    const existingBlock = await Block.findById(blockId);
                    if (!existingBlock) {
                        return res.status(404).json({ success: false, message: "Block not found." });
                    }
                    newBlock = new Block({
                        name: existingBlock.name,
                        body: existingBlock.body,
                        type: existingBlock.type
                    });
                } else {
                    newBlock = new Block({
                        name: name || "New Block",
                        body: body || "Edit this block...",
                        type
                    });
                }
                await newBlock.save();
                template.inputs.push({
                    block: newBlock._id,
                    order: template.inputs.length + 1
                });
                await template.save();
                return res.json({ success: true, message: "Block added successfully." });
            } catch (error) {
                return res.status(500).json({ success: false, message: "Error adding block: " + error.message });
            }
        } else {
            try {
                const blockIndex = template.inputs.findIndex(b => b.block.toString() === blockId);
                if (blockIndex === -1) {
                    return res.status(404).json({ success: false, message: "Block not found in template." });
                }

                switch (action) {
                    case 'moveUp':
                        if (blockIndex > 0) {
                            [template.inputs[blockIndex].order, template.inputs[blockIndex - 1].order] = [template.inputs[blockIndex - 1].order, template.inputs[blockIndex].order];
                        }
                        break;
                    case 'moveDown':
                        if (blockIndex < template.inputs.length - 1) {
                            [template.inputs[blockIndex].order, template.inputs[blockIndex + 1].order] = [template.inputs[blockIndex + 1].order, template.inputs[blockIndex].order];
                        }
                        break;
                    case 'delete':
                        template.inputs.splice(blockIndex, 1);
                        await Block.findByIdAndDelete(blockId);
                        for (let i = blockIndex; i < template.inputs.length; i++) {
                            template.inputs[i].order = i + 1;
                        }
                        break;
                    default:
                        return res.status(400).json({ success: false, message: "Invalid action provided." });
                }
                await template.save();
                return res.json({ success: true, message: "Action processed successfully." });
            } catch (error) {
                return res.status(500).json({ success: false, message: "Error processing action: " + error.message });
            }
        }
    },

    updateBlock: async (req, res) => {
        const { blockId } = req.params;
        const { body, name } = req.body;

        if (!mongoose.Types.ObjectId.isValid(blockId)) {
            return res.status(400).json({ success: false, message: "Invalid block ID." });
        }

        try {
            const block = await Block.findById(blockId);
            if (!block) {
                return res.status(404).json({ success: false, message: "Block not found." });
            }

            block.body = body !== undefined ? body : block.body;
            block.name = name !== undefined ? name : block.name;

            await block.save();
            res.json({ success: true, message: "Block updated successfully." });
        } catch (error) {
            res.status(500).json({ success: false, message: "Error updating block: " + error.message });
        }
    }
};

module.exports = BlockController;
