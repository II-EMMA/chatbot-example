import { v4 as uuidv4 } from "uuid";
import { z } from "zod";

const models = [
   "gpt-5-mini",
   "gpt-4o-mini",
   "gpt-4o",
   "gpt-4.1",
   "gpt-4",
   "gpt-4-0125-preview",
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const conversations: Record<string, { messages: any[] }> = {};

const ChatSchema = z.object({
   prompt: z.string().min(1, "Prompt cannot be empty"),
   conversationId: z.string().nullable().optional(),
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function tryModel(messages: any[], model: string) {
   const res = await fetch("https://api.algion.dev/v1/chat/completions", {
      method: "POST",
      headers: {
         "Content-Type": "application/json",
         Authorization: "Bearer 123123",
      },
      body: JSON.stringify({
         model,
         messages,
      }),
   });

   if (!res.ok) throw new Error(`Model ${model} failed`);
   // eslint-disable-next-line @typescript-eslint/no-explicit-any
   const data: any = await res.json();
   return data.choices?.[0]?.message?.content || null;
}

export default async function handler(req: Request): Promise<Response> {
   if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
         status: 405,
         headers: { "Content-Type": "application/json" },
      });
   }

   try {
      const body = await req.json();
      const parsed = ChatSchema.safeParse(body);

      if (!parsed.success) {
         const errorMessage =
            parsed.error.issues[0]?.message || "Invalid input";
         return new Response(JSON.stringify({ error: errorMessage }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
         });
      }

      const { prompt, conversationId } = parsed.data;
      const id = conversationId || uuidv4();

      if (!conversations[id]) {
         conversations[id] = { messages: [] };
      }

      const history = conversations[id].messages;

      const isPreviousQuestionRequest = prompt
         .toLowerCase()
         .includes("previous question");

      if (isPreviousQuestionRequest) {
         const userMessages = history.filter((msg) => msg.role === "user");
         const lastQuestion =
            userMessages.length >= 1
               ? userMessages[userMessages.length - 1].content
               : null;

         const reply = lastQuestion
            ? `Your previous question was: "${lastQuestion}"`
            : "I couldn't find your previous question.";

         return new Response(
            JSON.stringify({
               reply,
               model: "meta",
               conversationId: id,
               lastResponseId: uuidv4(),
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
         );
      }

      history.push({ role: "user", content: prompt });

      for (const model of models) {
         try {
            const modelHistory = [
               {
                  role: "system",
                  content: `You are a helpful assistant powered by ${model}.`,
               },
               ...history,
            ];

            const reply = await tryModel(modelHistory, model);
            if (reply) {
               history.push({ role: "assistant", content: reply });

               return new Response(
                  JSON.stringify({
                     reply,
                     model,
                     conversationId: id,
                     lastResponseId: uuidv4(),
                  }),
                  {
                     status: 200,
                     headers: { "Content-Type": "application/json" },
                  }
               );
            }
         } catch (err) {
            console.warn(`Model ${model} failed:`, err);
         }
      }

      return new Response(
         JSON.stringify({ error: "All models failed. Try again later." }),
         { status: 500, headers: { "Content-Type": "application/json" } }
      );
   } catch (err) {
      console.error("Server error:", err);
      return new Response(JSON.stringify({ error: "Internal Server Error" }), {
         status: 500,
         headers: { "Content-Type": "application/json" },
      });
   }
}
