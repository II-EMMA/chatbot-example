import { v4 as uuidv4 } from "uuid";
import { z } from "zod";

export default async function handler(req: Request): Promise<Response> {
   if (req.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
   }

   try {
      const body = await req.json();

      const schema = z.object({
         prompt: z.string(),
         conversationId: z.string().optional(),
      });

      const parsed = schema.safeParse(body);
      if (!parsed.success) {
         return new Response("Invalid input", { status: 400 });
      }

      const { prompt, conversationId } = parsed.data;

      // Simulate a response (replace with your actual logic)
      const reply = `Echo: ${prompt}`;
      const id = conversationId ?? uuidv4();

      return new Response(JSON.stringify({ reply, id }), {
         status: 200,
         headers: { "Content-Type": "application/json" },
      });
   } catch (err) {
      console.error("API error:", err);
      return new Response("Internal Server Error", { status: 500 });
   }
}
