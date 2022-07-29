import mongoose from 'mongoose'
const Schema = mongoose.Schema;
const registered = new Schema({
    email:String,
    address:String,
    image:String,
    username:String,
    approved:Boolean
})
export default mongoose.model('Registered', registered);