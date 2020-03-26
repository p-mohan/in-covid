const mongoose = require('mongoose');
const Schema = mongoose.Schema;


let InfectionSchema = new Schema({
    state: {type: String, required: true, max: 100},
    current: {type: Number, required: true},
    cured: {type: Number},
    death: {type: Number}

});

let DaySchema = new Schema({
    infections: [InfectionSchema],
    updatedAt: Date

});
// Export the model
module.exports = mongoose.model('DayInfection', DaySchema);