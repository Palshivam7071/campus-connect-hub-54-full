const mongoose = require('mongoose');
const { campusConnect } = require('../db');

const AdminSchema = new mongoose.Schema({
  email: { type: String, required: true },
  password: { type: String, required: true }
});

const AdminModel = campusConnect.model('admins', AdminSchema);
module.exports = AdminModel;
