// import mongoose from 'mongoose';
const mongoose = require('mongoose');


const HolidayRequestSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  studentName: { type: String, required: true },
  studentEmail: { type: String, required: true },
  leaveType: { type: String, required: true },
  fromDate: { type: String, required: true },
  toDate: { type: String, required: true },
  reason: { type: String, required: true },
  status: { type: String, enum: ['Pending', 'Accepted', 'Declined'], default: 'Pending' },
  submittedAt: { type: Date, default: Date.now }
},{ timestamps: true });

// export default mongoose.model('HolidayRequest', HolidayRequestSchema);
module.exports = mongoose.model('HolidayRequest', HolidayRequestSchema);
