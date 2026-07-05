const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const USE_MONGODB = process.env.MONGODB_URI && process.env.MONGODB_URI.trim() !== '';

// Create mock database directory if not exists
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Simple in-memory / JSON database model wrapper to emulate Mongoose
class JSONModel {
  constructor(collectionName, defaults = []) {
    this.filePath = path.join(dataDir, `${collectionName}.json`);
    this.collectionName = collectionName;
    if (!fs.existsSync(this.filePath)) {
      fs.writeFileSync(this.filePath, JSON.stringify(defaults, null, 2));
    }
  }

  read() {
    try {
      const content = fs.readFileSync(this.filePath, 'utf8');
      return JSON.parse(content);
    } catch (e) {
      return [];
    }
  }

  write(data) {
    fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2));
  }

  async find(query = {}) {
    let items = this.read();
    return items.filter(item => {
      for (let key in query) {
        if (query[key] !== undefined && item[key] !== query[key]) {
          return false;
        }
      }
      return true;
    });
  }

  async findOne(query = {}) {
    const items = this.read();
    return items.find(item => {
      for (let key in query) {
        if (query[key] !== undefined && item[key] !== query[key]) {
          return false;
        }
      }
      return true;
    }) || null;
  }

  async findById(id) {
    const items = this.read();
    return items.find(item => item._id === id || item.id === id) || null;
  }

  async create(data) {
    const items = this.read();
    const newItem = {
      _id: Math.random().toString(36).substr(2, 9),
      createdAt: new Date().toISOString(),
      ...data
    };
    items.push(newItem);
    this.write(items);
    return newItem;
  }

  async findByIdAndUpdate(id, update, options = { new: true }) {
    let items = this.read();
    const index = items.findIndex(item => item._id === id || item.id === id);
    if (index === -1) return null;
    
    // Support update operators like $set, $push, etc., or standard object updates
    if (update.$set) {
      items[index] = { ...items[index], ...update.$set };
    } else if (update.$push) {
      for (let key in update.$push) {
        if (!items[index][key]) items[index][key] = [];
        items[index][key].push(update.$push[key]);
      }
    } else {
      items[index] = { ...items[index], ...update };
    }
    
    this.write(items);
    return items[index];
  }

  async findOneAndUpdate(query, update, options = { new: true }) {
    let items = this.read();
    const index = items.findIndex(item => {
      for (let key in query) {
        if (item[key] !== query[key]) return false;
      }
      return true;
    });
    if (index === -1) return null;
    items[index] = { ...items[index], ...update };
    this.write(items);
    return items[index];
  }

  async findByIdAndDelete(id) {
    let items = this.read();
    const item = items.find(i => i._id === id || i.id === id);
    if (!item) return null;
    items = items.filter(i => i._id !== id && i.id !== id);
    this.write(items);
    return item;
  }

  async deleteOne(query) {
    let items = this.read();
    const initialLen = items.length;
    items = items.filter(item => {
      for (let key in query) {
        if (item[key] === query[key]) return false;
      }
      return true;
    });
    this.write(items);
    return { deletedCount: initialLen - items.length };
  }
}

// Connect function
const connectDB = async () => {
  if (USE_MONGODB) {
    try {
      await mongoose.connect(process.env.MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      console.log('MongoDB connected successfully.');
    } catch (err) {
      console.error('MongoDB connection failed. Falling back to local JSON database.', err.message);
    }
  } else {
    console.log('Using local JSON-file Database Fallback.');
  }
};

module.exports = {
  connectDB,
  USE_MONGODB,
  JSONModel
};
