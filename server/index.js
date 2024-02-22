const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();
const multer = require("multer");
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

app.use(upload.any());

// Serving uploaded files statically
app.use("/uploads", express.static(__dirname + "/uploads"));

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
