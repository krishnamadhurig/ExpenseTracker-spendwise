const mongoose = require('mongoose');
const itemSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true
        },
        name: {
            type: String, required: true, trim: true, maxlength: 120
        },
        amount: {
            type: Number, required: true, min: 0.01
        },
        category: {
            type: String, required: true, trim: true, default: "Other"
        },
        date: {
            type: Date, default: Date.now
        }
    },
    { timestamps: true }

);
module.exports = mongoose.model('Item', itemSchema);