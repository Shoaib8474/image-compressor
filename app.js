const express = require("express");
const multer = require("multer");
const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

const app = express();
const port = 3000;

// Configure multer for file upload
const upload = multer({
  dest: "uploads/",
  fileFilter: (req, file, cb) => {
    // Accept jpeg, jpg, and png files
    const filetypes = /jpeg|jpg|png/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(
      path.extname(file.originalname).toLowerCase()
    );

    if (mimetype && extname) {
      return cb(null, true);
    }

    cb(new Error("Only jpeg, jpg, and png image files are allowed!"));
  },
});

// Set up view engine
app.set("view engine", "ejs");
app.use(express.static("public"));
app.use("/uploads", express.static("uploads"));

// Routes
app.get("/", (req, res) => {
  res.render("index");
});

app.post("/compress", upload.single("image"), async (req, res) => {
  if (!req.file) {
    return res.status(400).send("No file uploaded.");
  }

  try {
    // Generate unique filename
    const { size: targetSize } = req.body; // Target file size in KB
    const originalSize = req.file.size;
    const inputPath = req.file.path;
    const originalFileName = req.file.originalname;
    const fileExtension = path.extname(originalFileName);
    const baseFileName = path.basename(originalFileName, fileExtension);
    const timestamp = Date.now();
    const compressedFileName = `${baseFileName}-compressed-${timestamp}${fileExtension}`;
    const outputPath = path.join("uploads", compressedFileName);
    // const outputPath = path.join("uploads", "compressed-" + req.file.filename);

    // Get file sizes
    // const compressedSize = fs.statSync(compressedPath).size;
    // const compressionRatio = ((originalSize - compressedSize) / originalSize * 100).toFixed(2);

    // // Get compression quality from form (default to 70 if not specified)
    // const quality = parseInt(req.body.quality) || 70;

    // // Compress image using Sharp
    // await sharp(req.file.path)
    //   .jpeg({ quality: quality }) // Compress JPEG
    //   .toFile(compressedPath);

    // // Remove the temporary uploaded file
    // // fs.unlinkSync(req.file.path);

    //Upgraded compression algorithm
    let quality = 80; // Start with 80% quality
    let width = 800; // Initial width for resizing
    let outputBuffer;
    let fileSizeKB;

    // Loop to resize and compress until the target size is achieved
    while (true) {
      // Resize the image
      const image = sharp(inputPath).resize(width, null, {
        fit: "inside",
        withoutEnlargement: true,
      });

      // Compress the image with the current quality
      outputBuffer = await image.jpeg({ quality }).toBuffer();

      // Check if the file size is within the target range
           fileSizeKB = outputBuffer.length / 1024;
      if (fileSizeKB <= targetSize || quality <= 10 || width <= 100) {
        break; // Exit the loop if the target size is met or limits are reached
      }

      // Reduce dimensions and quality for the next iteration
      width -= 50; // Reduce width by 100px
      quality -= 5; // Reduce quality by 5%
    }

    // Save the compressed image
    fs.writeFileSync(outputPath, outputBuffer);

    // Send the compressed image path to the client
    // res.json({ compressedImage: outputPath.replace("public/", "") });

    // Render results
    res.render("result", {
      originalImage: req.file.originalname,
      compressedImage: compressedFileName,
      originalSize: (originalSize / 1024).toFixed(2),
      compressedSize: fileSizeKB.toFixed(2),
    });
  } catch (error) {
    console.error("Compression error:", error);
    res.status(500).send("Error compressing image");
  }
});

// Start server
app.listen(port, () => {
  console.log(`Image compression app listening at http://localhost:${port}`);

  // Ensure uploads directory exists
  if (!fs.existsSync("uploads")) {
    fs.mkdirSync("uploads");
  }
});
