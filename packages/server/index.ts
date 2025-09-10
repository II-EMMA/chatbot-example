import type { Request, Response } from "express";
import express from "express";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import * as Sentry from "@sentry/bun";
import cors from "cors";

const app = express();
app.use(express.json());

const port = 3000;
app.listen(port, () => {
   console.log(`Server listening on port ${port}`);
});

app.use(
   cors({
      origin: "http://localhost:5173",
      methods: ["GET", "POST", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
   })
);

// const models = [
//   "gpt-4o",                // Most advanced: multimodal, fast, high-quality
//   "gpt-4-0125-preview",    // GPT-4 turbo variant, optimized for speed and cost
//   "gpt-4.1",               // High-quality reasoning, large context window
//   "gpt-4",                 // Original GPT-4, slower but strong
//   "gpt-4o-mini",           // Lightweight version of GPT-4o, fast and efficient
//   "gpt-5-mini",            // Experimental, newer but less proven
//   "gpt-3.5-turbo"          // Fastest and most stable fallback
// ];

// const models = [
//   "gpt-3.5-turbo",       // Fastest, most stable, widely supported, low resource
//   "gpt-5-mini",          // Lightweight, experimental, good fallback
//   "gpt-4o-mini",         // Fast and efficient, optimized for frontend use
//   "gpt-4o",              // Powerful and fast, but heavier and may be throttled
//   "gpt-4.1",             // High-quality reasoning, slower and more costly
//   "gpt-4-0125-preview",  // Turbo variant, good balance but less available
//   "gpt-4"                // Original GPT-4, slowest and most restricted
// ];

// ==>Here

// const models = [
//    "gpt-4o-mini",
//    "gpt-4",
//    "gpt-5-mini",
//    "gpt-4o",
//    "gpt-4.1",
//    "gpt-4-0125-preview",
//    "gpt-3.5-turbo",
// ];

// In-memory conversation store

// const models = [
//    "gpt-4o-mini",
//    "gpt-4",
//    "gpt-5-mini",
//    "gpt-4o",
//    "gpt-4.1",
//    "gpt-4-0125-preview",
//    "gpt-3.5-turbo",
// ];

const models = [
   "gpt-5-mini",
   "gpt-4o-mini",
   "gpt-4o",
   "gpt-4.1",
   "gpt-4",
   "gpt-4-0125-preview",
];

Sentry.init({
   dsn: "https://yourPublicKey@o0.ingest.sentry.io/0",
   tracesSampleRate: 1.0,
});
try {
   throw new Error("Something went wrong");
} catch (err) {
   Sentry.captureException(err);
}

// In-memory conversation store
const conversations: Record<string, { messages: any[] }> = {};

// Zod schemas
const ChatSchema = z.object({
   prompt: z.string().min(1, "Prompt cannot be empty"),
   conversationId: z.string().nullable().optional(),
});

const HistorySchema = z.object({
   conversationId: z.string().min(1, "conversationId is required"),
});

async function tryModel(messages: any[], model: string) {
   const res = await fetch("https://api.algion.dev/v1/chat/completions", {
      method: "POST",
      headers: {
         "Content-Type": "application/json",
         Authorization: "Bearer 123123",
      },
      body: JSON.stringify({
         model,
         // temperature: 0.2,
         // max_tokens: 100,
         messages,
      }),
   });

   if (!res.ok) throw new Error(`Model ${model} failed`);
   const data: any = await res.json();
   return data.choices?.[0]?.message?.content || null;
}

// POST /api/chat
app.post("/api/chat", async (req, res) => {
   const parseResult = ChatSchema.safeParse(req.body);

   if (!parseResult.success) {
      const errorMessage =
         parseResult.error.issues[0]?.message || "Invalid input";
      return res.status(400).json({ error: errorMessage });
   }

   const { prompt, conversationId } = parseResult.data;
   const id = conversationId || uuidv4();

   if (!conversations[id]) {
      conversations[id] = { messages: [] };
   }

   const history = conversations[id].messages;

   // Detect "previous question" BEFORE adding current prompt
   const isPreviousQuestionRequest = prompt
      .toLowerCase()
      .includes("previous question");

   if (isPreviousQuestionRequest) {
      const userMessages = history.filter((msg) => msg.role === "user");

      // Get the second-to-last user message (true previous question)
      const lastQuestion =
         userMessages.length >= 1
            ? userMessages[userMessages.length - 1].content
            : null;

      const reply = lastQuestion
         ? `Your previous question was: "${lastQuestion}"`
         : "I couldn't find your previous question.";

      return res.json({
         reply,
         model: "meta",
         conversationId: id,
         lastResponseId: uuidv4(),
      });
   }

   // Add current user prompt to history AFTER checking for previous question
   history.push({ role: "user", content: prompt });

   for (const model of models) {
      try {
         // Clone history to avoid mutating the original
         const modelHistory = [...history];

         // Inject system prompt for model identity
         modelHistory.unshift({
            role: "system",
            content: `You are a helpful assistant powered by ${model}. If asked about your identity, respond with that model name.`,
         });

         const reply = await tryModel(modelHistory, model);
         if (reply) {
            history.push({ role: "assistant", content: reply });

            return res.json({
               reply,
               model,
               conversationId: id,
               lastResponseId: uuidv4(),
            });
         }
      } catch (err: any) {
         console.warn(`Model ${model} failed:`, err.message);
      }
   }
   const sentryEventId = Sentry.captureException(
      new Error("All models failed to respond")
   );

   res.status(500).json({
      error: "All models failed. Try again later.",
      sentryEventId,
   });
});

// GET /api/history
app.get("/api/history", (req, res) => {
   const parseResult = HistorySchema.safeParse(req.query);

   if (!parseResult.success) {
      const errorMessage =
         parseResult.error.issues[0]?.message || "Invalid input";
      return res.status(400).json({ error: errorMessage });
   }

   const { conversationId } = parseResult.data;
   const conversation = conversations[conversationId];

   if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
   }

   res.json({
      conversationId,
      messages: conversation.messages,
   });
});

app.use((err: any, res: Response) => {
   const eventId = Sentry.captureException(err);
   res.status(500).json({
      error: "Unexpected server error",
      sentryEventId: eventId,
   });
});
