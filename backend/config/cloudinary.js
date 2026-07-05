const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const sharp = require('sharp');

const IS_CLOUDINARY_CONFIGURED = 
  process.env.CLOUDINARY_CLOUD_NAME && 
  process.env.CLOUDINARY_API_KEY && 
  process.env.CLOUDINARY_API_SECRET;

if (IS_CLOUDINARY_CONFIGURED) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
}

// Make sure local directories exist
const localUploadDir = path.join(__dirname, '../public/uploads');
if (!fs.existsSync(localUploadDir)) {
  fs.mkdirSync(localUploadDir, { recursive: true });
}

/**
 * Uploads a file buffer to Cloudinary or saves it locally.
 * @param {Buffer} fileBuffer - The file buffer to upload
 * @param {String} folder - Folder name (e.g. 'albums', 'selections', 'chats')
 * @param {String} originalName - Original name of the file to determine extension
 * @returns {Promise<String>} - The access URL of the uploaded resource
 */
const uploadToStorage = async (fileBuffer, folder, originalName) => {
  let processedBuffer = fileBuffer;
  const isImage = /\.(jpg|jpeg|png|webp|gif|tiff)$/i.test(originalName);
  
  if (isImage) {
    try {
      processedBuffer = await sharp(fileBuffer).rotate().toBuffer();
    } catch (err) {
      console.error('Sharp EXIF rotation error:', err.message);
    }
  }
  if (IS_CLOUDINARY_CONFIGURED) {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: `wedding_album/${folder}` },
        (error, result) => {
          if (error) {
            console.error('Cloudinary upload error:', error);
            reject(error);
          } else {
            resolve(result.secure_url);
          }
        }
      );
      uploadStream.end(processedBuffer);
    });
  } else {
    // Local storage fallback
    const fileExt = path.extname(originalName) || '.jpg';
    const filename = `${folder}_${uuidv4()}${fileExt}`;
    const filePath = path.join(localUploadDir, filename);
    
    fs.writeFileSync(filePath, processedBuffer);
    return `/uploads/${filename}`;
  }
};

module.exports = {
  uploadToStorage,
  IS_CLOUDINARY_CONFIGURED
};
