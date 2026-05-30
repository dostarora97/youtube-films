import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;
  
  app.use(express.json());

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/chat", async (req, res) => {
    try {
      const { messages, playlistContext } = req.body;
      if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: "messages array is required" });
      }

      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: "GEMINI_API_KEY environment variable is required" });
      }

      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const systemInstruction = `You are a knowledgeable and helpful assistant. 
You are currently chatting with a user about their YouTube playlist.
The playlist has the following context:
Title: ${playlistContext.title}
Description: ${playlistContext.description}
Total items: ${playlistContext.items.length}

Here is the complete list of original titles of videos from the playlist:
${playlistContext.items.map((t: string, i: number) => `${i + 1}. ${t}`).join('\n')}

Help the user by recommending videos from this list, categorizing them, or answering their queries about them neutrally and intelligently. Keep your responses concise, helpful, and easily readable with Markdown if needed. If the user asks about something else, you can answer but politely try to guide them back to the playlist context if appropriate.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: messages,
        config: {
          systemInstruction,
        }
      });

      res.json({ text: response.text });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message || "Failed to generate chat response" });
    }
  });

  app.post("/api/parse-title", async (req, res) => {
    try {
      const { title } = req.body;
      if (!title) {
        return res.status(400).json({ error: "Title is required" });
      }

      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: "GEMINI_API_KEY environment variable is required" });
      }

      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `Parse the following media title into "<media-title> <year(s)>". Keep it very concise. If year is missing, just "<media-title>". No extra text.
Input: ${title}`,
        config: {
          systemInstruction: "You are a helpful assistant parsing media titles.",
        }
      });
      
      const parsedText = response.text?.trim() || "";
      res.json({ parsedTitle: parsedText });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message || "Failed to parse title" });
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
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
