const mongoose = require('mongoose');
const { USE_MONGODB, JSONModel } = require('../config/db');

let ServiceModel;

if (USE_MONGODB) {
  const ServiceSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String, required: true },
    hidden: { type: Boolean, default: false }
  });

  ServiceModel = mongoose.model('Service', ServiceSchema);
} else {
  ServiceModel = new JSONModel('services');
}

// Seed predefined services
const seedServices = async () => {
  const defaultServices = [
    {
      
      name: 'Premium Photo Book Printing',
      description: 'Elegant custom-designed wedding albums with lay-flat pages, fine-art paper, and high-definition color reproduction. Available in 12x36 and other custom sizes.',
      hidden: false
    },
    {
      
      name: 'Cinematic Wedding Videography',
      description: 'High-definition video coverage, cinematic storytelling, and digital delivery. Features full event documentation, highlight reels, and background music integration.',
      hidden: false
    }
  ];

  for (let svc of defaultServices) {
    const exists = await ServiceModel.findOne({ name: svc.name });
    if (!exists) {
      await ServiceModel.create(svc);
      console.log(`Predefined Service "${svc.name}" seeded.`);
    }
  }
};

setTimeout(seedServices, 1000);

module.exports = ServiceModel;
