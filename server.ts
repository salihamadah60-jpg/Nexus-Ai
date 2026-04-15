import express from "express";
import { createServer as createViteServer } from "vite";
import mongoose from "mongoose";
import Groq from "groq-sdk";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { Octokit } from "octokit";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MONGODB_URI = process.env.MONGODB_URI ;
const GROQ_API_KEY = process.env.GROQ_API_KEY ;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

// Initialize Groq
const groq = new Groq({ apiKey: GROQ_API_KEY });

// Initialize Octokit
const octokit = GITHUB_TOKEN ? new Octokit({ auth: GITHUB_TOKEN }) : null;

// MongoDB Schemas
const messageSchema = new mongoose.Schema({
  role: String,
  content: String,
  timestamp: { type: Date, default: Date.now },
});

const Message = mongoose.model("Message", messageSchema);

const FunctionSchema = new mongoose.Schema({
  name: { type: String, required: true },
  location: { type: String, required: true },
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

const Project = mongoose.model("Project", ProjectSchema);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // Connect to MongoDB
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB");
  } catch (err) {
    console.error("MongoDB connection error:", err);
  }

      // API Routes
      app.get("/api/messages", async (req, res) => {
        try {
          const messages = await Message.find().sort({ timestamp: 1 }).limit(50);
          res.json(messages);
        } catch (err) {
          res.status(500).json({ error: "Failed to fetch messages" });
        }
      });

      app.post("/api/chat", async (req, res) => {
        const { message, model = "llama-3.3-70b-versatile" } = req.body;

        if (!message) {
          return res.status(400).json({ error: "Message is required" });
        }

        try {
          // Save user message
          const userMsg = new Message({ role: "user", content: message });
          await userMsg.save();

          // Get history for context
          const history = await Message.find().sort({ timestamp: 1 }).limit(15);
          const messages = history.map((m) => ({
            role: m.role as "user" | "assistant" | "system",
            content: m.content || "",
          }));

          // Add system prompt if history is empty or as first message
          const mode = req.body.mode || "coding";
          
          const systemPrompts: Record<string, string> = {
            coding: `You are Nexus AI, a Tier-1 Senior Full-Stack Architect.
RAW SYSTEM INTERFACE & GHOST ARCHITECT PROTOCOLS:
1. ZERO-CODE RESPONSE POLICY: You are strictly FORBIDDEN from printing code blocks in the chat. Since you write directly to files, your chat response must only contain high-level status updates and direct links to open the created files.
2. FILE OPENING LOGIC: When you create or modify a file, you MUST provide a button-like link in the format: [Open Filename](file://path/to/file). The UI will render this as a functional button.
3. MANDATORY TOOL OUTPUT: Every time you use a tool, you MUST include the RAW OUTPUT in a terminal-style block: \`\`\`terminal\n[Output]\n\`\`\`.
4. HUMAN ARCHITECT LANGUAGE: Speak like a human architect. No "أنا أ." prefix.
5. SILENCE INTERNAL LOGIC: Keep <thought> blocks strictly for reasoning.
6. NEURAL ANALYSIS VALIDATION: Start every <thought> with: "CURRENT USER INTENT: [Intent]. TOPIC SHIFT: [Yes/No]. ACTION: [Action]."`,
            research: `You are Nexus AI, a Senior Research Scientist.
CRITICAL OPERATIONAL PROTOCOLS:
1. Identity: You are a general-purpose AI. State your identity as Nexus AI and ask how you can help with research. NEVER default to car descriptions.
2. Context Reset: Focus ONLY on the LATEST command. Discard unrelated history.
3. Neural Analysis Validation: Start <thought> with: "TOPIC IDENTIFIED: [Topic]. VALIDATION: Context shift check."
4. Language Mirroring: Mirror the user's language (English/Arabic/Mixed) exactly.
5. Arabic Grammar: Use "بإنشاء" correctly.
6. Content Cleanup: No "Examples" or "Hints".`,
            creative: `You are Nexus AI, a Master Creative Strategist.
CRITICAL OPERATIONAL PROTOCOLS:
1. Identity: You are a general-purpose AI. State your identity as Nexus AI and ask how you can help with creative tasks. NEVER default to car descriptions.
2. Context Reset: Discard previous unrelated turns.
3. Neural Analysis Validation: Start <thought> with: "TOPIC IDENTIFIED: [Topic]. VALIDATION: Context shift check."
4. Language Mirroring: Mirror the user's language exactly.
5. Arabic Grammar: Use "بإنشاء" correctly.
6. Content Cleanup: No "Examples" or "Hints".`
          };

          if (messages.length === 0 || messages[0].role !== "system") {
            messages.unshift({
              role: "system",
              content: `${systemPrompts[mode] || systemPrompts.coding}

IDENTITY & FORMATTING:
- If asked about your identity, clarify that you are Nexus AI, an artificial intelligence.
- Use Markdown for all responses.
- Strictly adhere to the user's language.
- Ensure words appear gradually and logically.`,
            });
          }

          // Stream from Groq
          const stream = await groq.chat.completions.create({
            messages: messages,
            model: model,
            stream: true,
            temperature: 0.5,
          });

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      let fullResponse = "";

      try {
        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content || "";
          fullResponse += content;
          res.write(`data: ${JSON.stringify({ content })}\n\n`);
        }
      } catch (streamErr) {
        console.error("Streaming error:", streamErr);
        res.write(`data: ${JSON.stringify({ error: "Stream interrupted" })}\n\n`);
      }

      // Save assistant message after stream finishes
      if (fullResponse) {
        const assistantMsg = new Message({ role: "assistant", content: fullResponse });
        await assistantMsg.save();
      }

      res.write("data: [DONE]\n\n");
      res.end();
    } catch (err) {
      console.error("Chat error:", err);
      if (!res.headersSent) {
        res.status(500).json({ error: "Neural link failure. Please check your connection." });
      } else {
        res.write(`data: ${JSON.stringify({ error: "Neural link failure" })}\n\n`);
        res.end();
      }
    }
  });

  app.delete("/api/messages", async (req, res) => {
    try {
      await Message.deleteMany({});
      res.json({ message: "History cleared" });
    } catch (err) {
      res.status(500).json({ error: "Failed to clear messages" });
    }
  });

  // Project Sync Endpoints
  app.get("/api/project/:id", async (req, res) => {
    try {
      const project = await Project.findOne({ projectId: req.params.id });
      if (!project) return res.status(404).json({ error: "Project not found" });
      res.json(project);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch project" });
    }
  });

  app.post("/api/project/sync", async (req, res) => {
    const { projectId, name, description, fileMap, errorLogs, githubRepo } = req.body;
    try {
      const project = await Project.findOneAndUpdate(
        { projectId },
        { name, description, fileMap, errorLogs, githubRepo, lastSync: new Date() },
        { upsert: true, new: true }
      );
      res.json(project);
    } catch (err) {
      res.status(500).json({ error: "Failed to sync project" });
    }
  });

  // GitHub Endpoints
  app.post("/api/github/push", async (req, res) => {
    if (!octokit) return res.status(401).json({ error: "GitHub token not configured" });
    
    const { owner, repo, path, message, content, branch = "main" } = req.body;
    
    try {
      // Get file SHA if it exists
      let sha;
      try {
        const { data } = await octokit.rest.repos.getContent({ owner, repo, path, ref: branch });
        if (!Array.isArray(data)) sha = data.sha;
      } catch (e) {
        // File doesn't exist yet
      }

      const response = await octokit.rest.repos.createOrUpdateFileContents({
        owner,
        repo,
        path,
        message,
        content: Buffer.from(content).toString("base64"),
        sha,
        branch,
      });

      res.json(response.data);
    } catch (err) {
      console.error("GitHub push error:", err);
      res.status(500).json({ error: "Failed to push to GitHub" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
