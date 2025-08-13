const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

dotenv.config();

// ✅ Use the same DB name: campus_connect
const campusConnect = mongoose.createConnection(process.env.MONGO_URI, {
  dbName: 'campus_connect',
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// ✅ Define the Admin schema inline here
const AdminSchema = new mongoose.Schema({
  email: { type: String, required: true },
  password: { type: String, required: true }
});

// ✅ Use the correct model from the correct DB
const Admin = campusConnect.model('admins', AdminSchema);

// ✅ Wait for connection then create admin
campusConnect.on('connected', async () => {
  console.log("✅ Connected to campus_connect DB");

  try {
    const email = 'shivam1@gmail.com';
    const password = 'admin@123';

    const existing = await Admin.findOne({ email });
    if (existing) {
      console.log('⚠️ Admin already exists');
      process.exit(0);
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newAdmin = new Admin({ email, password: hashedPassword });

    await newAdmin.save();
    console.log('✅ Admin created successfully');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error creating admin:', err);
    process.exit(1);
  }
});

campusConnect.on('error', (err) => {
  console.error('❌ DB connection failed:', err);
});
