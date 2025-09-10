import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Spinner } from "@/components/ui/shadcn-io/spinner";
import ReactMarkdown from "react-markdown";
import * as Sentry from "@sentry/react";
import { browserTracingIntegration } from "@sentry/react";

Sentry.init({
   dsn: "https://c25e2f0c4d61719cb5af6c9221d1afe4@o4509991070072832.ingest.us.sentry.io/4509991072366592",
   integrations: [browserTracingIntegration()],
   tracesSampleRate: 1.0,
});

const PromptSchema = z.object({
   prompt: z.string().min(1, "Prompt cannot be empty"),
});

type Message = {
   role: "user" | "assistant";
   content: string;
   loading?: boolean;
};

export default function App() {
   const [prompt, setPrompt] = useState("");
   const [messages, setMessages] = useState<Message[]>([]);
   const [loading, setLoading] = useState(false);
   const [conversationId, setConversationId] = useState<string | null>(null);
   const isLocal = window.location.hostname === "localhost";
   const baseURL = isLocal
      ? "http://localhost:3000/api"
      : "https://chatbot-example-demo.vercel.app/api"; // Replace with your actual backend domain

   // console.log(baseURL);
   // const baseURL = "api";

   const scrollRef = useRef<HTMLDivElement | null>(null);

   useEffect(() => {
      scrollRef.current?.scrollIntoView({ behavior: "smooth" });
   }, [messages]);

   async function sendPrompt() {
      setLoading(true);

      // Always show user message
      setMessages((prev) => [
         ...prev,
         { role: "user", content: prompt },
         { role: "assistant", content: "", loading: true },
      ]);

      const validation = PromptSchema.safeParse({ prompt });

      // If prompt is empty, show red error reply
      if (!validation.success) {
         setMessages((prev) => {
            const updated = [...prev];
            const lastIndex = updated.findIndex(
               (msg) => msg.role === "assistant" && msg.loading
            );
            if (lastIndex !== -1) {
               updated[lastIndex] = {
                  role: "assistant",
                  content: "Message is empty",
               };
            }
            return updated;
         });

         setLoading(false);
         return;
      }

      try {
         const res = await fetch(`${baseURL}/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt, conversationId }),
         });

         const text = await res.text();

         let data;
         try {
            data = JSON.parse(text);
         } catch {
            throw new Error("Invalid JSON response");
         }

         if (!res.ok) throw new Error(data.error || "Unknown error");

         if (!conversationId && data.conversationId) {
            setConversationId(data.conversationId);
         }

         setMessages((prev) => {
            const updated = [...prev];
            const lastIndex = updated.findIndex(
               (msg) => msg.role === "assistant" && msg.loading
            );
            if (lastIndex !== -1) {
               updated[lastIndex] = {
                  role: "assistant",
                  content: data.reply,
               };
            }
            return updated;
         });

         setPrompt("");
         // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (err: any) {
         console.error("Fetch error:", err.message);

         setMessages((prev) => {
            const updated = [...prev];
            const lastIndex = updated.findIndex(
               (msg) => msg.role === "assistant" && msg.loading
            );
            if (lastIndex !== -1) {
               updated[lastIndex] = {
                  role: "assistant",
                  content: `Error: ${err.message}`,
               };
            }
            return updated;
         });
      } finally {
         setLoading(false);
      }
   }

   const copyTypingImprovingPrompt = (e: React.ClipboardEvent) => {
      const selection = window.getSelection()?.toString().trim();
      if (selection) {
         e.preventDefault();
         e.clipboardData.setData("text/plain", selection);
      }
   };

   return (
      <div className="flex flex-col h-screen bg-white">
         <header className="p-4 border-b text-center font-semibold text-lg">
            Chatbot Messenger
         </header>

         <ScrollArea className="flex-1 p-4 overflow-y-auto">
            {messages.map((msg, idx) => (
               <div
                  key={idx}
                  onCopy={copyTypingImprovingPrompt}
                  className={`sm:max-w-[45%] max-w-[50%] px-4 py-2 rounded-lg text-sm mb-4 ${
                     msg.role === "user"
                        ? "bg-blue-500 text-white self-end ml-auto"
                        : "bg-gray-100 text-gray-800 self-start mr-auto"
                  }`}
               >
                  {msg.role === "assistant" ? (
                     <div className="whitespace-pre-line">
                        {msg.loading ? (
                           <Spinner variant="ellipsis" />
                        ) : (
                           <ReactMarkdown
                              components={{
                                 // eslint-disable-next-line @typescript-eslint/no-unused-vars
                                 p: ({ node, ...props }) => (
                                    <p
                                       {...props}
                                       className={
                                          msg.content === "Message is empty"
                                             ? "text-red-500"
                                             : "text-gray-800"
                                       }
                                    />
                                 ),
                              }}
                           >
                              {msg.content}
                           </ReactMarkdown>
                        )}
                     </div>
                  ) : (
                     msg.content
                  )}
               </div>
            ))}
            <div ref={scrollRef} />
         </ScrollArea>

         <form
            onSubmit={(e) => {
               e.preventDefault();
               sendPrompt();
            }}
            className="p-4 border-t flex gap-2 bg-white"
         >
            <Input
               value={prompt}
               // eslint-disable-next-line @typescript-eslint/no-explicit-any
               onChange={(e: any) => setPrompt(e.target.value)}
               placeholder="Type your message…"
               className="flex-1"
               disabled={loading}
            />
            <Button
               type="submit"
               disabled={loading}
               className={loading ? "opacity-50 pointer-events-none" : ""}
            >
               Send
            </Button>
         </form>
      </div>
   );
}
