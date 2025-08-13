const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sendMail = require('./utils/sendMail');
const nodemailer = require('nodemailer');
// const ChatMessage = require("./models/ChatMessage");



dotenv.config();
const app = express();
// app.use(cors());
app.use(cors({
  origin: 'http://localhost:8080',
  credentials: true
}));

app.use(express.json());

// =======================
// Connect to campus_connect DB
// =======================
const campusConnect = mongoose.createConnection(
  process.env.MONGO_URI || 'mongodb+srv://shivampal:K31pB0HEXbRtL3A1@ecombeauty.6z98i.mongodb.net/campus_connect?retryWrites=true&w=majority',
  {
    useNewUrlParser: true,
    useUnifiedTopology: true
  }
);

campusConnect.on('connected', () => {
  console.log('✅ Connected to campus_connect DB');
});

const ChatMessage = require("./models/ChatMessage")(campusConnect);


// =======================
// SCHEMAS and MODELS
// =======================

// Admin Schema
const AdminSchema = new mongoose.Schema({
  email: { type: String, required: true },
  password: { type: String, required: true }
});
const Admin = campusConnect.model('admins', AdminSchema);

// Student Schema
const StudentSchema = new mongoose.Schema({
  name: String,
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  rollNo: { type: String, required: true, unique: true },
  fatherName: String,
  motherName: String,
  mobile: String,
  course: String,
  branch: String,
  year: String,
  dob: String,
  address: String,
  gender: String,
  emergencyContact: String,
  bloodGroup: String
});
StudentSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});
const Student = campusConnect.model('students', StudentSchema);

// Holiday Request Schema
const HolidayRequestSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'students', required: true },
  reason: String,
  fromDate: String,
  toDate: String,
  status: { type: String, default: 'pending' }
});
const HolidayRequest = campusConnect.model('holiday_requests', HolidayRequestSchema);

// =======================
// 1. Student Signup Route
// =======================
app.post('/api/student/signup', async (req, res) => {
  try {
    const {
      name, email, password, rollNo, fatherName, motherName,
      mobile, course, branch, year, dob, address,
      gender, emergencyContact, bloodGroup
    } = req.body;

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();

    const requiredFields = [
      name, trimmedEmail, trimmedPassword, rollNo, fatherName,
      motherName, mobile, course, branch, year, dob, address, gender
    ];
    if (requiredFields.some(field => !field)) {
      return res.status(400).json({ error: 'All required fields must be provided' });
    }

    const existingStudent = await Student.findOne({
      $or: [{ email: trimmedEmail }, { rollNo }]
    });

    if (existingStudent) {
      return res.status(400).json({
        error: existingStudent.email === trimmedEmail
          ? 'Email already exists'
          : 'Roll number already exists'
      });
    }

    const newStudent = new Student({
      name,
      email: trimmedEmail,
      password: trimmedPassword,
      rollNo,
      fatherName,
      motherName,
      mobile,
      course,
      branch,
      year,
      dob,
      address,
      gender,
      emergencyContact,
      bloodGroup
    });

    await newStudent.save();

    await sendMail(
      // 'shivam70712966@gmail.com', // or dynamic if you want
      'shivampalsimmy@gmail.com',
      '📥 New Student Registered',
      `
    <h2>New Student Registration</h2>
    <p><strong>Name:</strong> ${newStudent.name}</p>
    <p><strong>Email:</strong> ${newStudent.email}</p>
    <p><strong>Roll No:</strong> ${newStudent.rollNo}</p>
    <p><strong>Course:</strong> ${newStudent.course}</p>
    <p><strong>Branch:</strong> ${newStudent.branch}</p>
  `
    );


    res.status(201).json({
      message: 'Registration successful',
      student: {
        id: newStudent._id,
        name: newStudent.name,
        email: newStudent.email,
        rollNo: newStudent.rollNo
      }
    });
  } catch (err) {
    console.error("Signup Error:", err);
    res.status(500).json({ error: 'Server error during registration' });
  }
});

// =======================
// 2. Student Login Route
// =======================
app.post('/api/student/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const student = await Student.findOne({ email: email.trim().toLowerCase() });

    if (!student || !(await bcrypt.compare(password.trim(), student.password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // ✅ Generate token for student
    const token = jwt.sign(
      { id: student._id, email: student.email, role: 'student' },  // ✅ Include role
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.status(200).json({
      message: 'Login successful',
      token,
      student: {
        id: student._id,
        name: student.name,
        email: student.email,
        mobile: student.mobile,
        rollNo: student.rollNo,
        fatherName: student.fatherName,
        motherName: student.motherName,
        course: student.course,
        branch: student.branch,
        year: student.year,
        dob: student.dob,
        gender: student.gender,
        bloodGroup: student.bloodGroup,
        emergencyContact: student.emergencyContact,
        address: student.address
      }
    });
  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// ===============================
// 3. Submit Holiday Request Route
// ===============================
app.post('/api/student/holiday-requests', async (req, res) => {
  try {
    const request = new HolidayRequest(req.body);
    await request.save();
    // ✅ Send email to admin
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'shivam70712966@gmail.com', // replace with your email
        pass: 'mzbztvvfgcoqffmv'          // replace with your app-specific password
      }
    });

    const mailOptions = {
      from: 'shivam70712966@gmail.com',
      to: 'shivampalsimmy@gmail.com', // Replace with real admin email
      subject: '📩 New Holiday Request Submitted',
      html: `
        <h2>New Holiday Request</h2>
        <p><strong>Student Id:</strong> ${req.body.studentId}</p>
        <p><strong>From:</strong> ${req.body.fromDate}</p>
        <p><strong>To:</strong> ${req.body.toDate}</p>
        <p><strong>Reason:</strong> ${req.body.reason}</p>
      `
    };

    await transporter.sendMail(mailOptions);
    // res.status(201).json(request);
    res.status(201).json({ newRequest: request });
  } catch (err) {
    console.error("Holiday Request Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// 4. Get Student's Holiday Requests
app.get('/api/student/holiday-requests/:studentId', async (req, res) => {
  try {
    const requests = await HolidayRequest.find({ studentId: req.params.studentId });
    // res.json(requests);
    res.json({ requests });

  } catch (err) {
    res.status(500).json({ error: 'Server error while fetching student requests' });
  }
});

// 5. Admin View All Holiday Requests
const adminAuth = require('./middleware/adminAuth');
app.get('/api/admin/requests', adminAuth, async (req, res) => {
  try {
    const requests = await HolidayRequest.find().populate('studentId');
    // res.json(requests);
    res.json({ requests });
  } catch (err) {
    res.status(500).json({ error: 'Server error while fetching all requests' });
  }
});

// 6. Admin get students 

app.get('/api/admin/students', adminAuth, async (req, res) => {
  try {
    // const students = await Student.find().select('name email rollNo');
    const students = await Student.find(); // Fetches all fields
    res.json({ students });
  } catch (err) {
    res.status(500).json({ error: 'Server error while fetching students' });
  }
});

//5.2 Admin start and view previous chats 
const anyAuth = require('./middleware/anyAuth');

app.get('/api/chat/:studentId', anyAuth, async (req, res) => {
  try {
    const { studentId } = req.params;

    // Fetch messages for this student (roomId = studentId)
    const messages = await ChatMessage.find({ roomId: studentId }).sort({ createdAt: 1 });

    const student = await Student.findById(studentId).select("name");

    res.json({
      messages,
      studentName: student?.name || "Student"
    });
  } catch (err) {
    console.error("Error fetching chat messages:", err);
    res.status(500).json({ error: "Server error while fetching messages" });
  }
});



// 6. Admin Update Holiday Request

// const adminAuth = require('./middleware/adminAuth');
app.put('/api/admin/requests/:id', adminAuth, async (req, res) => {
  try {
    const request = await HolidayRequest.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true }
    ).populate('studentId', 'name email');

    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }
    // ✅ Send email to student
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'shivam70712966@gmail.com', // replace with your email
        pass: 'mzbztvvfgcoqffmv'          // replace with your app-specific password
      }
    });

    const mailOptions = {
      from: 'shivam70712966@gmail.com',
      to: request.studentId.email,
      subject: `Your Holiday Request is ${request.status}`,
      html: `
        <h3>Request ${request.status}</h3>
        <p>Hello ${request.studentId.name},</p>
        <p>Your holiday request has been <strong>${request.status}</strong>.</p>
        <p>Regards,<br/>Admin Team</p>
      `
    };

    await transporter.sendMail(mailOptions);

    res.json(request);
  } catch (err) {
    res.status(500).json({ error: 'Server error while updating request' });
  }
});

// =======================
// 7. Admin Login Route
// =======================
app.post('/api/admin/login', async (req, res) => {
  try {
    const admin = await Admin.findOne({ email: req.body.email });

    if (!admin || !(await bcrypt.compare(req.body.password, admin.password))) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: admin._id, email: admin.email, role: 'admin' },  // ✅ Include role
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.status(200).json({ success: true, token });
  } catch (err) {
    console.error('Admin Login Error:', err);
    res.status(500).json({ success: false, message: 'Server error during admin login' });
  }
});

// ===================
// 8. Start Server
// ===================
// const PORT = process.env.PORT || 5000;
// app.listen(PORT, () => {
//   console.log(`✅ Server running on port ${PORT}`);
// });

const http = require('http').createServer(app);
const { Server } = require('socket.io');
const io = new Server(http, {
  cors: {
    origin: 'http://localhost:8080',
    methods: ['GET', 'POST']
  }
});

// Real-time Chat Logic
io.on('connection', (socket) => {
  console.log('🟢 A user connected:', socket.id);

  // Step 1: Join room
  socket.on('join_room', ({ roomId }) => {
    socket.join(roomId);
  });

  // Step 2: Leave room
  socket.on('leave_room', ({ roomId }) => {
    socket.leave(roomId);
  });

  // ✅ Step 3: Save & emit message
  socket.on('send_message', async (data) => {
    try {
      const newMsg = await ChatMessage.create({
        roomId: data.roomId,
        senderRole: data.senderRole,
        senderName: data.senderName,
        message: data.message,
        timestamp: new Date(), // optional, Mongoose adds createdAt
      });

      // Emit message to the same room
      io.to(data.roomId).emit('receive_message', newMsg);
    } catch (err) {
      console.error("❌ Error saving message:", err);
    }
  });

  socket.on('disconnect', () => {
    console.log('🔴 A user disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;
http.listen(PORT, () => {
  console.log(`✅ Server with Socket.IO running on port ${PORT}`);
});
