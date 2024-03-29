const mongoose = require('mongoose');
const {Schema,model} = mongoose;

const UserSchema = new Schema({
    username: {type: String, required: true, min: 4,unique: true},
    password: {type: String, required: true},
    favourite: {type: [], required: true},
    token: {type: String,required: true}
},{
    timestamps: true,
})

const UserModel = model('User',UserSchema);

module.exports =  UserModel;