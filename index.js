const express = require("express");
const multer = require("multer");
const AWS = require("aws-sdk");
const { MongoClient } = require("mongodb");
const cors = require("cors");
require("dotenv").config(); // Load environment variables from .env file

const app = express();

// Set up AWS S3 configuration
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

// Set up AWS S3 and MongoDB connection details
const s3 = new AWS.S3();
const mongoURI = process.env.MONGO_DB_URI;
const dbName = process.env.MONGO_DATABASE_NAME;
const collectionName = process.env.MONGO_COLLECTION_NAME;

// Configure multer for file upload
const upload = multer({ dest: "uploads/" });

app.use(cors()); // Enable CORS

app.get("/", (req, res) => {
  res.send("Lmao");
});

// Handle file upload
app.post("/api/upload", upload.single("file"), async (req, res) => {
  const file = req.file;
  let mongoClient = null; // Declare mongoClient variable outside the try block

  try {
    // Upload file to S3
    const s3UploadParams = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: file.originalname,
      Body: require("fs").createReadStream(file.path),
      ACL: "public-read", // Allow public access to the file
    };
    const s3Response = await s3.upload(s3UploadParams).promise();

    // Delete the temporary file
    require("fs").unlinkSync(file.path);

    // Store public URL in MongoDB
    mongoClient = new MongoClient(mongoURI);
    await mongoClient.connect();
    const db = mongoClient.db(dbName);
    const collection = db.collection(collectionName);
    const document = { fileName: file.originalname, url: s3Response.Location };
    await collection.insertOne(document);

    res.json({ publicURL: s3Response.Location });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ error: "An error occurred during file upload." });
  } finally {
    if (mongoClient) {
      mongoClient.close(); // Close MongoDB connection
    }
  }
});

// Start the server
app.listen(3000, () => {
  console.log("Server listening on port 3000");
});
