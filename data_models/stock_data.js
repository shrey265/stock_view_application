const mongoose = require('mongoose');
const {Schema,model} = mongoose;

const StockSchema = new Schema({
    code:String,
    name:String,
    open:String,
    high:String,
    low:String,
    close:String,
    date:String,
},{
    timestamps: true,
})
StockSchema.index({ code: 1, name:1, date: 1 }, { unique: true });

const StockModel = model('Stock',StockSchema);

module.exports =  StockModel;