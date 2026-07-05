const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { USE_MONGODB, JSONModel } = require('../config/db');

let UserModel;

if (USE_MONGODB) {
  const UserSchema = new mongoose.Schema({
    name: { type: String, default: '' },
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['admin', 'user'], default: 'user' },
    status: { type: String, enum: ['active', 'blocked'], default: 'active' },
    createdAt: { type: Date, default: Date.now }
  });

  UserSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  });

  UserModel = mongoose.model('User', UserSchema);
} else {
  UserModel = new JSONModel('users');
}

// Function to seed admin user if not exists
const seedAdmin = async () => {
  const adminEmail = 'admin@wedding.com';
  const adminPasswordPlain = 'Admin@123';
  
  if (USE_MONGODB) {
    const adminExists = await UserModel.findOne({ email: adminEmail });
    if (!adminExists) {
      // Let Mongoose pre-save hook handle hashing automatically
      await UserModel.create({
        name: 'System Admin',
        email: adminEmail,
        phone: '9999999999',
        password: adminPasswordPlain,
        role: 'admin',
        status: 'active'
      });
      console.log('Predefined Admin User seeded in MongoDB.');
    } else {
      // Check if password hash is valid
      const isMatch = await bcrypt.compare(adminPasswordPlain, adminExists.password);
      if (!isMatch) {
        adminExists.password = adminPasswordPlain;
        await adminExists.save();
        console.log('Admin password corrected/reset in MongoDB.');
      }
    }
  } else {
    const adminExists = await UserModel.findOne({ email: adminEmail });
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash(adminPasswordPlain, 10);
      await UserModel.create({
        name: 'System Admin',
        email: adminEmail,
        phone: '9999999999',
        password: hashedPassword,
        role: 'admin',
        status: 'active'
      });
      console.log('Predefined Admin User seeded in local JSON database.');
    } else {
      const isMatch = await bcrypt.compare(adminPasswordPlain, adminExists.password);
      if (!isMatch) {
        const hashedPassword = await bcrypt.hash(adminPasswordPlain, 10);
        await UserModel.findByIdAndUpdate(adminExists._id, { password: hashedPassword });
        console.log('Admin password corrected/reset in local JSON database.');
      }
    }
  }
};

// Execute seed Admin
setTimeout(seedAdmin, 1000);

module.exports = UserModel;
