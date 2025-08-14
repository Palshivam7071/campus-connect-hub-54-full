// import mongoose from 'mongoose';
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs'); // Add this line at top


const StudentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  rollNo: { type: String, required: true, unique: true },
  fatherName: { type: String, required: true },
  // fatherMobile: { type: String, required: true }, // Added from screenshot
  motherName: { type: String, required: true },
  mobile: { type: String, required: true },
  course: { type: String, required: true }, // BCA from screenshot
  branch: { type: String, required: true }, // Information Technology
  year: { type: String, required: true }, // 3rd Year
  dob: { type: String, required: true }, // 15-01-1995
  address: { type: String, required: true }, // Duwa
  gender: { type: String, required: true }, // Female
  emergencyContact: { type: String }, // 5456346436
  bloodGroup: { type: String } // AB+
}, { timestamps: true });

// Hash password before saving
StudentSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// export default mongoose.model('Student', StudentSchema);
module.exports = mongoose.model('Student', StudentSchema);