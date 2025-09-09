import { v4 as uuidv4 } from "uuid";
import { z } from "zod";

const schema = z.object({
   prompt: z.string().min(1, "Prompt cannot be empty"),
   conversationId: z.string().optional(),
});

export default async function handler(req: Request): Promise<Response> {
   try {
      if (req.method !== "POST") {
         return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
            status: 405,
            headers: {
               "Content-Type": "application/json",
               "Access-Control-Allow-Origin": "*",
            },
         });
      }

      const body = await req.json();
      const parsed = schema.safeParse(body);

      if (!parsed.success) {
         console.warn("Validation failed:", parsed.error.flatten());
         return new Response(JSON.stringify({ error: "Invalid input" }), {
            status: 400,
            headers: {
               "Content-Type": "application/json",
               "Access-Control-Allow-Origin": "*",
            },
         });
      }

      const { prompt, conversationId } = parsed.data;

      // Simulate a response (replace with actual logic later)
      const reply = `Echo: ${prompt}`;
      const id = conversationId ?? uuidv4();

      return new Response(JSON.stringify({ reply, conversationId: id }), {
         status: 200,
         headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
         },
      });
   } catch (err) {
      console.error("Server error:", err);
      return new Response(JSON.stringify({ error: "Internal Server Error" }), {
         status: 500,
         headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
         },
      });
   }
}
