import { z } from "zod";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const conversations: Record<string, { messages: any[] }> = {};

const HistorySchema = z.object({
   conversationId: z.string().min(1, "conversationId is required"),
});

export default async function handler(req: Request): Promise<Response> {
   if (req.method !== "GET") {
      return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
         status: 405,
         headers: { "Content-Type": "application/json" },
      });
   }

   const url = new URL(req.url);
   const conversationId = url.searchParams.get("conversationId");

   const parsed = HistorySchema.safeParse({ conversationId });

   if (!parsed.success) {
      const errorMessage = parsed.error.issues[0]?.message || "Invalid input";
      return new Response(JSON.stringify({ error: errorMessage }), {
         status: 400,
         headers: { "Content-Type": "application/json" },
      });
   }

   const conversation = conversations[conversationId!];

   if (!conversation) {
      return new Response(JSON.stringify({ error: "Conversation not found" }), {
         status: 404,
         headers: { "Content-Type": "application/json" },
      });
   }

   return new Response(
      JSON.stringify({
         conversationId,
         messages: conversation.messages,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
   );
}
