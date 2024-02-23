const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const multer = require("multer");
require("dotenv").config();
const fs = require("fs");

const userRoutes = require("./routes/userRoutes");
const postRoutes = require("./routes/postRoutes");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");

const app = express();

// Middleware to parse JSON bodies
app.use(express.json());

// Middleware to parse URL-encoded bodies
app.use(express.urlencoded({ extended: true }));

// CORS middleware
app.use(
  cors({
    credentials: true,
    origin: "https://mernstackblogbysahidshaikh.netlify.app"
  })
);

// File upload middleware using multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  }
});

const upload = multer({ storage: storage });

app.use(upload.single("thumbnail")); // Assuming "thumbnail" is the name of the file input field

// Serving uploaded files statically
app.use("/uploads", express.static(__dirname + "/uploads"));

// Route to delete uploaded files
app.delete("/api/deleteImage/:imageName", (req, res) => {
  const { imageName } = req.params;
  const imagePath = __dirname + "/uploads/" + imageName;

  // Check if the file exists
  if (fs.existsSync(imagePath)) {
    fs.unlinkSync(imagePath); // Delete the file
    res.status(200).json({ message: "Image deleted successfully" });
  } else {
    res.status(404).json({ message: "Image not found" });
  }
});

// Routes
app.use("/api/users", userRoutes);
app.use("/api/posts", postRoutes);

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log(`Database Is Successfully Connected`))
  .catch((e) => console.log(e));

// Start the server
app.listen(process.env.PORT || 5000, () => {
  console.log(`Server running on port ${process.env.PORT || 5000}`);
});
