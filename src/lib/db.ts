import mongoose from "mongoose";

const FunctionSchema = new mongoose.Schema({
  name: { type: String, required: true },
  location: { type: String, required: true }, // e.g., "App.tsx:120"
  description: String,
  dependencies: [String],
});

const FileSchema = new mongoose.Schema({
  path: { type: String, required: true },
  functions: [FunctionSchema],
  lastModified: { type: Date, default: Date.now },
});

const ErrorLogSchema = new mongoose.Schema({
  error: { type: String, required: true },
  rootCause: String,
  fix: String,
  timestamp: { type: Date, default: Date.now },
});

const ProjectSchema = new mongoose.Schema({
  projectId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: String,
  githubRepo: String,
  fileMap: [FileSchema],
  errorLogs: [ErrorLogSchema],
  lastSync: { type: Date, default: Date.now },
});

export const Project = mongoose.models.Project || mongoose.model("Project", ProjectSchema);

export async function connectDB() {
  if (mongoose.connection.readyState >= 1) return;
  
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.warn("MONGODB_URI not found. Database features will be disabled.");
    return;
  }

  try {
    await mongoose.connect(uri);
    console.log("Connected to MongoDB");
  } catch (err) {
    console.error("MongoDB connection error:", err);
  }
}
