import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { atomDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Send, Bot, User, Sparkles, Loader2, Database, Cpu, Activity, Terminal, Trash2, AlertCircle, Clock, ChevronDown, ChevronUp, Layers, BookOpen, Copy, Check, Code, BrainCircuit, Info, Maximize2, Minimize2, Sun, Moon, PanelLeft, Plus, Mic, Orbit, CircleDot, X, MoreVertical, Folder, File, Download, Edit3, RotateCcw, Save, Eye, Layout, GripVertical, Settings } from "lucide-react";

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp?: string;
}

interface Checkpoint {
  id: string;
  timestamp: string;
  description: string;
  messages: Message[];
}

interface ProjectData {
  projectId: string;
  name: string;
  description: string;
  githubRepo?: string;
  fileMap: any[];
  errorLogs: any[];
  lastSync?: string;
}

const MODELS = [
  { id: "llama-3.3-70b-versatile", name: "Llama 3.3 70B", desc: "High-performance reasoning for complex logic." },
  { id: "llama-3.1-8b-instant", name: "Llama 3.1 8B", desc: "Optimized for speed and efficient daily tasks." },
  { id: "llama-3.1-70b-versatile", name: "Llama 3.1 70B", desc: "Balanced model for consistent logical flow." },
];

const MODES = [
  { id: "coding", name: "Coding", icon: Code, color: "text-accent-glow" },
  { id: "research", name: "Research", icon: BookOpen, color: "text-ai-primary" },
  { id: "creative", name: "Creative", icon: Sparkles, color: "text-thought-primary" },
];

const MessageSkeleton = () => (
  <div className="flex flex-col gap-10 w-full animate-pulse">
    {[1, 2, 3].map((i) => (
      <div key={i} className={`flex ${i % 2 === 0 ? "justify-end" : "justify-start"}`}>
        <div className={`w-2/3 h-20 bg-white/5 border border-border rounded-2xl ${i % 2 === 0 ? "rounded-br-sm" : "rounded-bl-sm"}`} />
      </div>
    ))}
  </div>
);

const CodeBlock = ({ language, value }: { language: string; value: string }) => {
  const [copied, setCopied] = useState(false);
  const isTerminal = language === "terminal" || language === "bash" || language === "shell";

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`relative group/code my-6 ${isTerminal ? "border-l-2 border-green-500/50" : ""}`}>
      <div className={`flex items-center justify-between px-4 py-2 ${isTerminal ? "bg-black/80" : "bg-bg-surface/50"} border-b border-border/30 rounded-t-lg`}>
        <div className="flex items-center gap-2">
          {isTerminal && <Terminal className="w-3 h-3 text-green-400" />}
          <span className={`text-[10px] font-mono uppercase tracking-widest ${isTerminal ? "text-green-400" : "text-text-dim"}`}>
            {language || "code"}
          </span>
        </div>
        <button
          onClick={handleCopy}
          className="p-1 rounded hover:text-accent-glow transition-colors"
          title="Copy Code"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>
      <div className={`${isTerminal ? "bg-black/90 text-green-400 p-4 font-mono text-[11px] lg:text-sm leading-relaxed overflow-x-auto" : ""}`}>
        {isTerminal ? (
          <pre className="whitespace-pre-wrap">
            <span className="opacity-50 mr-2">$</span>
            {value}
          </pre>
        ) : (
          <SyntaxHighlighter
            style={atomDark}
            language={language || "javascript"}
            PreTag="div"
            className="!bg-transparent !p-4 font-mono text-[11px] lg:text-sm leading-relaxed"
          >
            {value}
          </SyntaxHighlighter>
        )}
      </div>
    </div>
  );
};

const ChatMessage = ({ msg, index, onDelete, isStreaming = false }: { msg: Message; index?: number; onDelete?: (idx: number) => void; isStreaming?: boolean; key?: React.Key }) => {
  const [showThought, setShowThought] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const isArabic = (text: string) => /[\u0600-\u06FF]/.test(text);

  const parseContent = (content: string) => {
    const thoughtMatch = content.match(/<thought>([\s\S]*?)<\/thought>/);
    const thought = thoughtMatch ? thoughtMatch[1] : null;
    const mainContent = content.replace(/<thought>[\s\S]*?<\/thought>/, "").trim();
    return { thought, mainContent };
  };

  const { thought, mainContent } = parseContent(msg.content);
  const time = msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const isMsgArabic = isArabic(mainContent);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(mainContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text:", err);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"} gap-1 w-full px-2 lg:px-0`}
      dir={isMsgArabic ? "rtl" : "ltr"}
    >
      {thought && (
        <div className="w-full max-w-[98%] lg:max-w-[95%] mb-1">
          <button 
            onClick={() => setShowThought(!showThought)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-bg-surface border border-border hover:border-thought-primary/50 transition-all group"
          >
            <BrainCircuit className="w-3.5 h-3.5 text-thought-primary" />
            <span className="text-[10px] uppercase tracking-widest font-bold text-text-dim group-hover:text-thought-primary">Architectural Logic</span>
            {showThought ? <ChevronUp className="w-3 h-3 text-text-dim" /> : <ChevronDown className="w-3 h-3 text-text-dim" />}
          </button>
          <AnimatePresence>
            {showThought && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden mt-1"
              >
                <div className="p-4 bg-bg-surface border border-border rounded-xl text-[11px] font-mono text-text-dim leading-relaxed whitespace-pre-wrap italic">
                  {thought}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      <div className={`w-full lg:w-auto max-w-[98%] lg:max-w-[95%] relative group`}>
        <div className={`p-3 lg:p-5 rounded-xl border ${
          msg.role === "user" 
            ? "bg-user-primary/5 border-user-primary/20 text-text-main" 
            : "bg-bg-surface border-border text-text-main"
        }`}>
          <div className="text-[14px] leading-relaxed prose prose-invert prose-sm max-w-none break-words">
            <ReactMarkdown 
              remarkPlugins={[remarkGfm]}
              components={{
                code({ node, inline, className, children, ...props }: any) {
                  const match = /language-(\w+)/.exec(className || "");
                  return !inline && match ? (
                    <CodeBlock
                      language={match[1]}
                      value={String(children).replace(/\n$/, "")}
                    />
                  ) : (
                    <code className="bg-white/5 px-1.5 py-0.5 rounded text-accent-glow font-mono text-[13px]" {...props}>
                      {children}
                    </code>
                  );
                },
                a({ node, children, href, ...props }: any) {
                  if (href?.startsWith("file://")) {
                    const filename = href.replace("file://", "");
                    return (
                      <button 
                        onClick={() => console.log(`Opening file: ${filename}`)}
                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-accent-glow/10 border border-accent-glow/30 rounded-lg text-accent-glow hover:bg-accent-glow/20 transition-all my-2 font-bold text-[11px] uppercase tracking-widest"
                      >
                        <File className="w-3.5 h-3.5" />
                        Open {filename.split('/').pop()}
                      </button>
                    );
                  }
                  return <a href={href} className="text-accent-glow hover:underline" {...props}>{children}</a>;
                }
              }}
            >
              {mainContent || (isStreaming && !thought ? "..." : "")}
            </ReactMarkdown>
            {isStreaming && <span className="streaming-cursor ml-1" />}
          </div>
        </div>

        <div className={`flex items-center gap-3 mt-1.5 text-[9px] text-text-dim/50 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
          <button onClick={handleCopy} className="hover:text-accent-glow transition-colors flex items-center gap-1">
            {copied ? <Check className="w-2.5 h-2.5" /> : <Copy className="w-2.5 h-2.5" />}
            {copied ? "COPIED" : "COPY"}
          </button>
          {onDelete && index !== undefined && (
            <button onClick={() => onDelete(index)} className="hover:text-red-400 transition-colors flex items-center gap-1">
              <Trash2 className="w-2.5 h-2.5" />
              DELETE
            </button>
          )}
          <span>{time}</span>
        </div>
      </div>
    </motion.div>
  );
};

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [selectedModel, setSelectedModel] = useState(MODELS[0].id);
  const [selectedMode, setSelectedMode] = useState(MODES[0].id);
  const [isTyping, setIsTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [streamingMessage, setStreamingMessage] = useState("");
  const [theme, setTheme] = useState<"dark" | "light">("light");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);
  const [project, setProject] = useState<ProjectData | null>(null);
  const [sessions, setSessions] = useState<{id: string, title: string, date: string}[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [terminalLogs, setTerminalLogs] = useState<{command: string, output: string, time: string}[]>([]);
  const [isTerminalOpen, setIsTerminalOpen] = useState(true);
  const [terminalHeight, setTerminalHeight] = useState(300);
  const [terminalTheme, setTerminalTheme] = useState<"black" | "matrix" | "midnight">("black");
  const [terminalTabs, setTerminalTabs] = useState([{ id: "1", name: "bash" }]);
  const [activeTab, setActiveTab] = useState("1");
  const [isFileExplorerOpen, setIsFileExplorerOpen] = useState(false);
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);

  const createNewSession = () => {
    const id = Math.random().toString(36).substring(7);
    const newSession = { id, title: "New Neural Thread", date: new Date().toISOString() };
    setSessions([newSession, ...sessions]);
    setCurrentSessionId(id);
    setMessages([]);
  };

  const deleteSession = (id: string) => {
    setSessions(sessions.filter(s => s.id !== id));
    if (currentSessionId === id) {
      setCurrentSessionId(null);
      setMessages([]);
    }
  };
  const [isSyncing, setIsSyncing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

  useEffect(() => {
    fetchMessages();
    fetchProject();
    const savedTheme = localStorage.getItem("aether-theme") as "dark" | "light";
    if (savedTheme) setTheme(savedTheme);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("light", theme === "light");
    localStorage.setItem("aether-theme", theme);
  }, [theme]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingMessage]);

  const fetchMessages = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/messages");
      if (!res.ok) throw new Error("Failed to sync with neural network");
      const data = await res.json();
      setMessages(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection failure");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProject = async () => {
    try {
      const res = await fetch("/api/project/nexus-ai-core");
      if (res.ok) {
        const data = await res.json();
        setProject(data);
      }
    } catch (err) {
      console.warn("Failed to fetch project context");
    }
  };

  const syncProject = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch("/api/project/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: "nexus-ai-core",
          name: "Nexus AI Core",
          description: "Advanced Architecture & Long-Term Memory Protocol",
          fileMap: [
            { path: "server.ts", functions: [{ name: "startServer", location: "server.ts:176" }] },
            { path: "App.tsx", functions: [{ name: "App", location: "App.tsx:210" }] }
          ],
          errorLogs: []
        }),
      });
      if (!res.ok) throw new Error("Sync failed");
      const data = await res.json();
      setProject(data);
    } catch (err) {
      setError("Project sync failure");
    } finally {
      setIsSyncing(false);
    }
  };

  const clearMessages = async () => {
    try {
      const res = await fetch("/api/messages", { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to clear memory");
      setMessages([]);
    } catch (err) {
      setError("Failed to clear memory");
    }
  };

  const deleteMessage = async (index: number) => {
    const newMessages = messages.filter((_, i) => i !== index);
    setMessages(newMessages);
    // Optionally sync with backend if needed, but for now local state is faster
    try {
      await fetch(`/api/messages/${index}`, { method: "DELETE" });
    } catch (err) {
      console.error("Failed to delete message from server");
    }
  };

  const downloadChat = () => {
    const chatContent = messages.map(m => `[${m.role.toUpperCase()}] ${m.content}`).join("\n\n");
    const blob = new Blob([chatContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nexus-chat-${new Date().toISOString().slice(0,10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;

    const userMessage = input.trim();
    setInput("");
    setError(null);
    setMessages((prev) => [...prev, { role: "user", content: userMessage, timestamp: new Date().toISOString() }]);
    setIsTyping(true);
    setStreamingMessage("");

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          message: userMessage, 
          model: selectedModel,
          mode: selectedMode
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Neural link failure");
      }

      if (!response.body) return;

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedResponse = "";
      
      // Auto-open preview/terminal for execution visibility
      setIsPreviewOpen(true);
      if (!previewUrl) setPreviewUrl("/");

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const chunkLines = chunk.split("\n");

        for (const line of chunkLines) {
          if (line.startsWith("data: ")) {
            const dataStr = line.slice(6).trim();
            if (dataStr === "[DONE]") break;
            try {
              const data = JSON.parse(dataStr);
              if (data.error) throw new Error(data.error);
              accumulatedResponse += data.content;
              setStreamingMessage(accumulatedResponse);
            } catch (e) {
              if (e instanceof Error && e.message !== "Unexpected end of JSON input") {
                throw e;
              }
            }
          }
        }
      }

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: accumulatedResponse, timestamp: new Date().toISOString() },
      ]);
      
      // Automatic Checkpoint
      if (accumulatedResponse.includes("```") || accumulatedResponse.includes("terminal")) {
        const cp: Checkpoint = {
          id: Math.random().toString(36).substring(7),
          timestamp: new Date().toISOString(),
          description: `Auto: ${userMessage.slice(0, 20)}...`,
          messages: [...messages, { role: "user", content: userMessage }, { role: "assistant", content: accumulatedResponse }]
        };
        setCheckpoints(prev => [cp, ...prev]);
      }

      // Extract terminal logs for the side pane
      const terminalBlocks = accumulatedResponse.match(/```terminal\n([\s\S]*?)```/g);
      if (terminalBlocks) {
        const newLogs = terminalBlocks.map(block => {
          const content = block.replace(/```terminal\n/, "").replace(/```/, "").trim();
          const lines = content.split("\n");
          return {
            command: lines[0] || "system_exec",
            output: lines.slice(1).join("\n") || "Command executed successfully.",
            time: new Date().toLocaleTimeString()
          };
        });
        setTerminalLogs(prev => [...prev, ...newLogs]);
      }

      setStreamingMessage("");
      fetchProject(); // Refresh file map
    } catch (err) {
      setError(err instanceof Error ? err.message : "Neural link failure");
      console.error("Chat error:", err);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex h-screen bg-bg-deep text-text-main font-sans selection:bg-accent-glow/20">
      {/* Sidebar Overlay for Mobile */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <AnimatePresence initial={false}>
        {isSidebarOpen && (
          <motion.aside 
            initial={{ x: -280, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -280, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed lg:relative top-0 left-0 h-full w-[280px] bg-bg-surface border-r border-border p-6 flex flex-col gap-8 z-50 overflow-y-auto custom-scrollbar whitespace-nowrap"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-accent-glow to-accent-muted rounded-lg shadow-lg shadow-accent-glow/10 flex items-center justify-center">
                  <Terminal className="w-4 h-4 text-bg-deep" />
                </div>
                <h1 className="font-serif italic text-xl tracking-tight">Nexus AI</h1>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  className="p-2 rounded-lg bg-bg-surface border border-border text-text-dim hover:text-accent-glow transition-all"
                  title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
                >
                  {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className="lg:hidden p-2 rounded-lg bg-bg-surface border border-border text-text-dim hover:text-red-400 transition-all"
                  title="Close Sidebar"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <button
              onClick={() => {
                clearMessages();
                setIsSidebarOpen(false);
              }}
              className="w-full py-3 px-4 rounded-xl bg-accent-glow/10 border border-accent-glow/20 text-accent-glow flex items-center justify-center gap-3 hover:bg-accent-glow/20 transition-all group"
            >
              <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
              <span className="text-xs font-bold uppercase tracking-widest">New Neural Chat</span>
            </button>

            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center text-[10px] uppercase tracking-[0.15em] text-text-dim">
                <span>Neural Summary</span>
                <BookOpen className="w-3 h-3 opacity-40" />
              </div>
              <div className="p-4 glass border border-border rounded-xl text-xs leading-relaxed text-text-dim shadow-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Info className="w-3.5 h-3.5 text-accent-glow" />
                  <span className="font-mono text-[9px] text-accent-glow uppercase tracking-wider">Active Context</span>
                </div>
                {messages.length > 0 
                  ? `Conversation spans ${messages.length} neural exchanges.`
                  : "No active neural context detected."}
              </div>
            </div>

            {/* Chat History Section */}
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center text-[10px] uppercase tracking-[0.15em] text-text-dim">
                <span>Neural History</span>
                <button 
                  onClick={createNewSession}
                  className="p-1.5 rounded-lg bg-accent-glow/10 text-accent-glow hover:bg-accent-glow/20 transition-all"
                  title="New Thread"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
              
              <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                {sessions.map(session => (
                  <div 
                    key={session.id}
                    className={`group flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                      currentSessionId === session.id 
                        ? "bg-accent-glow/5 border-accent-glow/30 text-accent-glow" 
                        : "bg-white/5 border-transparent hover:border-white/10 text-text-dim hover:text-text-main"
                    }`}
                    onClick={() => setCurrentSessionId(session.id)}
                  >
                    <div className="flex flex-col gap-0.5 overflow-hidden">
                      <span className="text-[11px] font-bold truncate">{session.title}</span>
                      <span className="text-[8px] opacity-40 uppercase tracking-tighter">{new Date(session.date).toLocaleDateString()}</span>
                    </div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteSession(session.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-500/10 hover:text-red-400 rounded-lg transition-all"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {sessions.length === 0 && (
                  <div className="text-center py-8 opacity-20">
                    <Clock className="w-8 h-8 mx-auto mb-2 stroke-[1px]" />
                    <p className="text-[10px] uppercase tracking-widest">No history found</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center text-[10px] uppercase tracking-[0.15em] text-text-dim">
                <span>Persistent Memory</span>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={downloadChat}
                    className="opacity-40 hover:opacity-100 hover:text-accent-glow transition-all flex items-center gap-1"
                    title="Save chat as text"
                  >
                    <Copy className="w-3 h-3" />
                    Save
                  </button>
                  <button 
                    onClick={clearMessages}
                    className="opacity-40 hover:opacity-100 hover:text-red-400 transition-all flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    Clear
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-auto flex flex-col gap-4 pb-8">
              <div className="flex justify-between items-center text-[10px] uppercase tracking-[0.15em] text-text-dim">
                <span>Kernel Status</span>
                <button 
                  onClick={syncProject}
                  disabled={isSyncing}
                  className={`flex items-center gap-1 transition-colors ${isSyncing ? "text-accent-glow animate-pulse" : "hover:text-accent-glow"}`}
                >
                  <Orbit className={`w-3 h-3 ${isSyncing ? "animate-spin" : ""}`} />
                  {isSyncing ? "Syncing..." : "Sync Now"}
                </button>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 font-mono text-[10px] text-text-dim">
                  <Database className="w-3 h-3" />
                  DB <span className="text-green-400 font-bold">CONNECTED</span>
                </div>
                <div className="flex items-center gap-2 font-mono text-[10px] text-text-dim">
                  <Cpu className="w-3 h-3" />
                  LLM <span className="text-green-400 font-bold">READY</span>
                </div>
                {project?.lastSync && (
                  <div className="flex items-center gap-2 font-mono text-[10px] text-accent-glow/70">
                    <Clock className="w-3 h-3" />
                    SYNCED: {new Date(project.lastSync).toLocaleTimeString()}
                  </div>
                )}
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isPreviewOpen && (
          <motion.div
            initial={{ y: "100%", x: 0 }}
            animate={{ y: 0, x: 0 }}
            exit={{ y: "100%", x: 0 }}
            transition={{ type: "spring", damping: 30, stiffness: 200 }}
            className="fixed bottom-0 right-0 h-[80vh] lg:h-full w-full lg:w-[45%] bg-bg-surface border-t lg:border-t-0 lg:border-l border-border z-[60] flex flex-col shadow-2xl rounded-t-3xl lg:rounded-t-none"
          >
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-bg-deep/50 backdrop-blur-md rounded-t-3xl lg:rounded-t-none">
              <div className="w-12 h-1.5 bg-white/10 rounded-full absolute top-2 left-1/2 -translate-x-1/2 lg:hidden" />
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-accent-glow/10 flex items-center justify-center">
                  <Maximize2 className="w-4 h-4 text-accent-glow" />
                </div>
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-widest text-text-main">Neural Preview</h2>
                  <p className="text-[10px] text-text-dim uppercase tracking-wider">Live Sandbox Environment</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setPreviewUrl(previewUrl ? `${previewUrl.split('?')[0]}?t=${Date.now()}` : null)}
                  className="p-2 rounded-lg hover:bg-white/5 text-text-dim hover:text-accent-glow transition-all"
                  title="Refresh Sandbox"
                >
                  <Activity className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setIsPreviewOpen(false)}
                  className="p-2 rounded-lg hover:bg-white/5 text-text-dim hover:text-red-400 transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 bg-white relative">
              {previewUrl ? (
                <iframe 
                  src={previewUrl}
                  className="w-full h-full border-none"
                  title="Nexus Preview"
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-12 bg-bg-deep">
                  <Loader2 className="w-12 h-12 text-accent-glow animate-spin mb-6 opacity-20" />
                  <p className="text-text-dim font-serif italic text-xl opacity-40">Initializing neural sandbox...</p>
                </div>
              )}
            </div>
            
            {/* Embedded Terminal Log */}
            <div className="h-1/3 bg-black border-t border-border flex flex-col">
              <div className="px-4 py-2 border-b border-white/5 flex items-center justify-between bg-white/5">
                <div className="flex items-center gap-2">
                  <Terminal className="w-3 h-3 text-green-400" />
                  <span className="text-[9px] uppercase tracking-widest font-bold text-green-400">System Terminal Log</span>
                </div>
                <button 
                  onClick={() => setTerminalLogs([])}
                  className="text-[8px] uppercase tracking-widest text-text-dim hover:text-red-400 transition-colors"
                >
                  Clear Logs
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 font-mono text-[10px] text-green-400/80 space-y-2 custom-scrollbar">
                {terminalLogs.map((log, i) => (
                  <div key={i} className="border-l border-white/10 pl-3 py-1">
                    <div className="flex items-center gap-2 opacity-40 mb-1">
                      <span className="text-[8px]">{log.time}</span>
                      <span className="text-[8px] text-accent-glow">$ {log.command}</span>
                    </div>
                    <pre className="whitespace-pre-wrap">{log.output}</pre>
                  </div>
                ))}
                {terminalLogs.length === 0 && (
                  <div className="h-full flex items-center justify-center opacity-20 italic">
                    Awaiting system execution...
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Right-Side File Explorer */}
      <AnimatePresence>
        {isFileExplorerOpen && (
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-full lg:w-[280px] bg-bg-surface border-l border-border z-[70] flex flex-col shadow-2xl"
          >
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-bg-deep/50 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <Folder className="w-4 h-4 text-accent-glow" />
                <h2 className="text-sm font-bold uppercase tracking-widest text-text-main">File Explorer</h2>
              </div>
              <button onClick={() => setIsFileExplorerOpen(false)} className="p-1.5 hover:bg-white/5 rounded-lg text-text-dim">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              <div className="space-y-1">
                {project?.fileMap.map((file, i) => (
                  <motion.div 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    key={file.path} 
                    className="group flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <File className="w-3.5 h-3.5 text-text-dim shrink-0" />
                      <span className="text-xs text-text-dim group-hover:text-text-main truncate">{file.path}</span>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-1 hover:text-accent-glow" title="Open in Editor"><Edit3 className="w-3 h-3" /></button>
                      <button className="p-1 hover:text-accent-glow" title="Set as Preview Root"><Eye className="w-3 h-3" /></button>
                      <button className="p-1 hover:text-accent-glow" title="View Changes"><RotateCcw className="w-3 h-3" /></button>
                      <button className="p-1 hover:text-red-400" title="Delete"><Trash2 className="w-3 h-3" /></button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
            
            {/* Checkpoints Section */}
            <div className="border-t border-border p-4 bg-bg-deep/30">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] uppercase tracking-widest font-bold text-text-dim">Checkpoints</span>
                <button 
                  onClick={() => {
                    const cp: Checkpoint = {
                      id: Math.random().toString(36).substring(7),
                      timestamp: new Date().toISOString(),
                      description: "Manual Snapshot",
                      messages: [...messages]
                    };
                    setCheckpoints([cp, ...checkpoints]);
                  }}
                  className="p-1 hover:text-accent-glow"
                >
                  <Save className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="space-y-2 max-h-[150px] overflow-y-auto custom-scrollbar">
                {checkpoints.map(cp => (
                  <div key={cp.id} className="p-2 rounded-lg bg-white/5 border border-white/5 hover:border-accent-glow/30 transition-all cursor-pointer group">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[9px] font-bold text-text-main">{cp.description}</span>
                      <button onClick={() => setMessages(cp.messages)} className="opacity-0 group-hover:opacity-100 text-accent-glow"><RotateCcw className="w-3 h-3" /></button>
                    </div>
                    <span className="text-[8px] text-text-dim uppercase">{new Date(cp.timestamp).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        {/* Header */}
        <header className="px-4 lg:px-8 py-4 border-b border-border flex justify-between items-center bg-bg-deep/80 backdrop-blur-md z-10">
          <div className="flex items-center gap-4 lg:gap-6">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 rounded-lg hover:bg-white/5 text-text-dim hover:text-accent-glow transition-all"
              title="Toggle Sidebar"
            >
              <PanelLeft className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2">
              <button 
                onClick={() => setIsFileExplorerOpen(!isFileExplorerOpen)}
                className={`p-2 rounded-lg transition-all flex items-center gap-2 ${isFileExplorerOpen ? "bg-accent-glow/10 text-accent-glow" : "hover:bg-white/5 text-text-dim hover:text-accent-glow"}`}
                title="Toggle File Explorer"
              >
                <Folder className="w-5 h-5" />
                <span className="hidden sm:inline text-[10px] uppercase tracking-widest font-bold">Files</span>
              </button>

              <button 
                onClick={() => setIsTerminalOpen(!isTerminalOpen)}
                className={`p-2 rounded-lg transition-all flex items-center gap-2 ${isTerminalOpen ? "bg-accent-glow/10 text-accent-glow" : "hover:bg-white/5 text-text-dim hover:text-accent-glow"}`}
                title="Toggle Terminal"
              >
                <Terminal className="w-5 h-5" />
                <span className="hidden sm:inline text-[10px] uppercase tracking-widest font-bold">Terminal</span>
              </button>

              <button 
                onClick={() => {
                  setIsPreviewOpen(!isPreviewOpen);
                  if (!previewUrl) setPreviewUrl("/");
                }}
                className={`p-2 rounded-lg transition-all flex items-center gap-2 ${isPreviewOpen ? "bg-accent-glow/10 text-accent-glow" : "hover:bg-white/5 text-text-dim hover:text-accent-glow"}`}
                title="Toggle Preview Sandbox"
              >
                <Maximize2 className="w-5 h-5" />
                <span className="hidden sm:inline text-[10px] uppercase tracking-widest font-bold">Preview</span>
              </button>
            </div>

            <div className="flex items-center gap-2 text-[10px] lg:text-xs text-text-dim">
              <div className={`w-1 lg:w-1.5 h-1 lg:h-1.5 rounded-full ${error ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" : "bg-accent-glow shadow-[0_0_8px_var(--color-accent-glow)]"}`} />
              <span>{error ? "Neural Link Error" : "Neural Stream Active"}</span>
            </div>
          </div>
          <div className="text-[8px] lg:text-[10px] uppercase tracking-widest text-text-dim/50">Session ID: 0xFD42</div>
        </header>

        {/* Chat History */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-4 lg:p-8 space-y-6 lg:space-y-10 custom-scrollbar"
        >
          <AnimatePresence mode="popLayout">
            {isLoading ? (
              <div key="skeleton">
                <MessageSkeleton />
              </div>
            ) : messages.length === 0 && !streamingMessage ? (
              <motion.div 
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full flex flex-col items-center justify-center text-center opacity-20"
              >
                <Bot className="w-8 h-8 lg:w-12 lg:h-12 stroke-[1px] mb-4" />
                <p className="font-serif italic text-lg lg:text-xl">Awaiting neural input...</p>
              </motion.div>
            ) : (
              <motion.div key="messages" className="space-y-10">
                {messages.map((msg, i) => (
                  <ChatMessage key={i} msg={msg} index={i} onDelete={deleteMessage} />
                ))}

                {streamingMessage && (
                  <ChatMessage msg={{ role: "assistant", content: streamingMessage }} isStreaming={true} />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Error Notification */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="absolute bottom-32 left-8 right-8 z-30"
            >
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 lg:p-4 flex items-center gap-2 lg:gap-3 backdrop-blur-md">
                <AlertCircle className="w-4 h-4 lg:w-5 lg:h-5 text-red-400 shrink-0" />
                <p className="text-[12px] lg:text-sm text-red-200">{error}</p>
                <button 
                  onClick={() => setError(null)}
                  className="ml-auto text-xs uppercase tracking-widest text-red-400 hover:text-red-300"
                >
                  Dismiss
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Multi-Terminal Shell System */}
        <AnimatePresence>
          {isTerminalOpen && (
            <motion.div 
              initial={{ height: 0 }}
              animate={{ height: terminalHeight }}
              exit={{ height: 0 }}
              className={`border-t border-border flex flex-col z-20 relative ${
                terminalTheme === "matrix" ? "bg-black" : 
                terminalTheme === "midnight" ? "bg-[#0a0e14]" : "bg-black"
              }`}
            >
              {/* Resize Handle */}
              <div 
                className="absolute -top-1 left-0 w-full h-2 cursor-ns-resize hover:bg-accent-glow/30 transition-colors z-30 flex items-center justify-center"
                onMouseDown={(e) => {
                  const startY = e.clientY;
                  const startHeight = terminalHeight;
                  const onMouseMove = (moveE: MouseEvent) => {
                    const newHeight = startHeight - (moveE.clientY - startY);
                    setTerminalHeight(Math.max(100, Math.min(window.innerHeight - 200, newHeight)));
                  };
                  const onMouseUp = () => {
                    document.removeEventListener("mousemove", onMouseMove);
                    document.removeEventListener("mouseup", onMouseUp);
                  };
                  document.addEventListener("mousemove", onMouseMove);
                  document.addEventListener("mouseup", onMouseUp);
                }}
              >
                <GripVertical className="w-8 h-1 text-white/10 rotate-90" />
              </div>

              <div className="px-4 py-2 border-b border-white/5 flex items-center justify-between bg-white/5">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Terminal className={`w-3 h-3 ${terminalTheme === "matrix" ? "text-green-500" : "text-accent-glow"}`} />
                    <span className={`text-[9px] uppercase tracking-widest font-bold ${terminalTheme === "matrix" ? "text-green-500" : "text-accent-glow"}`}>
                      Neural Shell
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    {terminalTabs.map(tab => (
                      <button 
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-3 py-1 rounded-t-md text-[9px] font-mono transition-all ${
                          activeTab === tab.id ? "bg-white/10 text-white" : "text-text-dim hover:text-white"
                        }`}
                      >
                        {tab.name}
                      </button>
                    ))}
                    <button 
                      onClick={() => setTerminalTabs([...terminalTabs, { id: Date.now().toString(), name: "sh" }])}
                      className="p-1 hover:text-accent-glow text-text-dim"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => {
                      const text = terminalLogs.map(l => `[${l.time}] $ ${l.command}\n${l.output}`).join("\n\n");
                      navigator.clipboard.writeText(text);
                    }}
                    className="p-1 hover:text-accent-glow text-text-dim"
                    title="Copy Terminal Buffer"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                  <div className="flex items-center gap-1">
                    {["black", "matrix", "midnight"].map(t => (
                      <button 
                        key={t}
                        onClick={() => setTerminalTheme(t as any)}
                        className={`w-2 h-2 rounded-full border border-white/20 ${
                          t === "black" ? "bg-black" : t === "matrix" ? "bg-green-900" : "bg-blue-900"
                        } ${terminalTheme === t ? "ring-1 ring-accent-glow" : ""}`}
                      />
                    ))}
                  </div>
                  <button onClick={() => setIsTerminalOpen(false)} className="p-1 hover:text-red-400 text-text-dim">
                    <Minimize2 className="w-3 h-3" />
                  </button>
                </div>
              </div>

              <div className={`flex-1 overflow-y-auto p-4 font-mono text-[11px] lg:text-sm custom-scrollbar ${
                terminalTheme === "matrix" ? "text-green-500 font-bold" : "text-green-400/80"
              }`}>
                {terminalLogs.map((log, i) => (
                  <div key={i} className="mb-3">
                    <div className="flex items-center gap-2 opacity-40 mb-1">
                      <span className="text-[9px]">{log.time}</span>
                      <span className="text-accent-glow">nexus@core:~$</span>
                      <span className="text-white font-bold">{log.command}</span>
                    </div>
                    <pre className="whitespace-pre-wrap pl-4 border-l border-white/5">{log.output}</pre>
                  </div>
                ))}
                <div className="flex items-center gap-2">
                  <span className="text-accent-glow">nexus@core:~$</span>
                  <span className="w-2 h-4 bg-accent-glow animate-pulse" />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Interaction Area */}
        <div className="p-2 lg:p-8 bg-gradient-to-t from-bg-deep via-bg-deep to-transparent">
          <form onSubmit={handleSubmit} className="max-w-4xl mx-auto relative px-1 lg:px-0">
            <div className="relative flex items-end gap-1 lg:gap-3 p-1.5 lg:p-4 bg-bg-surface rounded-2xl border border-border focus-within:border-accent-glow/50 transition-all">
              <button 
                type="button"
                className="p-2 rounded-lg hover:bg-white/5 text-text-dim hover:text-accent-glow transition-all"
              >
                <Plus className="w-5 h-5" />
              </button>

              <div className="relative">
                <button 
                  type="button"
                  onClick={() => setIsModelMenuOpen(!isModelMenuOpen)}
                  className={`p-2 rounded-lg hover:bg-white/5 transition-all ${isModelMenuOpen ? "text-accent-glow bg-white/5" : "text-text-dim"}`}
                  title="Switch Model/Mode"
                >
                  <Orbit className="w-5 h-5" />
                </button>
                
                <AnimatePresence>
                  {isModelMenuOpen && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute bottom-full left-0 mb-4 w-56 lg:w-64 bg-bg-surface border border-border rounded-xl shadow-2xl z-50 overflow-hidden"
                    >
                      <div className="p-2 lg:p-3 border-b border-border bg-white/5">
                        <span className="text-[9px] lg:text-[10px] uppercase tracking-widest font-bold text-text-dim">Neural Configuration</span>
                      </div>
                      <div className="max-h-[300px] overflow-y-auto p-2 flex flex-col gap-1">
                        <div className="px-2 py-1 text-[8px] lg:text-[9px] uppercase tracking-widest text-accent-glow/50 font-bold">Models</div>
                        {MODELS.map((m) => (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => {
                              setSelectedModel(m.id);
                              setIsModelMenuOpen(false);
                            }}
                            className={`w-full flex flex-col gap-0.5 px-3 py-2 rounded-lg text-left transition-colors ${
                              selectedModel === m.id ? "bg-accent-glow/10 text-accent-glow" : "hover:bg-white/5 text-text-dim"
                            }`}
                          >
                            <span className="text-xs font-bold">{m.name}</span>
                            <span className="text-[9px] opacity-60">{m.desc}</span>
                          </button>
                        ))}
                        <div className="h-px bg-border my-1" />
                        <div className="px-2 py-1 text-[8px] lg:text-[9px] uppercase tracking-widest text-ai-primary/50 font-bold">Operational Modes</div>
                        {MODES.map((mode) => {
                          const ModeIcon = mode.icon;
                          return (
                            <button
                              key={mode.id}
                              type="button"
                              onClick={() => {
                                setSelectedMode(mode.id);
                                setIsModelMenuOpen(false);
                              }}
                              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                                selectedMode === mode.id ? "bg-ai-primary/10 text-ai-primary" : "hover:bg-white/5 text-text-dim"
                              }`}
                            >
                              <ModeIcon className="w-3.5 h-3.5" />
                              <span className="text-xs font-bold">{mode.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
                placeholder="Transmit neural signal..."
                className="flex-1 bg-transparent border-none focus:ring-0 outline-none resize-none py-2 text-sm min-h-[44px] max-h-64 custom-scrollbar"
                rows={1}
              />
              
              <div className="flex items-center gap-2 shrink-0">
                <button 
                  type="button"
                  className="hidden sm:flex p-2 rounded-lg hover:bg-white/5 text-text-dim hover:text-accent-glow transition-all"
                >
                  <Mic className="w-5 h-5" />
                </button>
                <button
                  type="submit"
                  disabled={!input.trim() || isTyping}
                  className={`p-2.5 lg:p-2 rounded-lg transition-all ${
                    input.trim() && !isTyping
                      ? "bg-accent-glow text-bg-deep shadow-[0_0_20px_rgba(0,242,255,0.4)] scale-110 lg:scale-100"
                      : "bg-white/5 text-text-dim cursor-not-allowed"
                  }`}
                >
                  {isTyping ? (
                    <div className="relative flex items-center justify-center">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <Orbit className="absolute w-3 h-3 animate-pulse text-accent-glow" />
                    </div>
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-center gap-3 lg:gap-6 text-[8px] lg:text-[10px] text-text-dim/40 uppercase tracking-[0.15em] lg:tracking-[0.2em]">
              <div className="flex items-center gap-1.5 lg:gap-2">
                <div className="w-1 h-1 rounded-full bg-accent-glow" />
                {MODELS.find(m => m.id === selectedModel)?.name}
              </div>
              <div className="flex items-center gap-1.5 lg:gap-2">
                <div className="w-1 h-1 rounded-full bg-ai-primary" />
                {MODES.find(m => m.id === selectedMode)?.name} Mode
              </div>
              <span className="hidden sm:inline">End-to-End Encryption Active</span>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}


