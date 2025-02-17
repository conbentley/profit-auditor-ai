
import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Dashboard/Header";
import Sidebar from "@/components/Dashboard/Sidebar";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Json } from "@/integrations/supabase/types";
import { ChatMessage } from "@/components/Chat/ChatMessage";
import { ChatInput } from "@/components/Chat/ChatInput";
import { ClearChatDialog } from "@/components/Chat/ClearChatDialog";

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatHistory {
  id: string;
  messages: ChatMessage[];
  audit_id?: string | null;
  created_at: string;
  updated_at: string;
}

// Safely converts raw JSON data into ChatMessage array
function parseMessages(rawMessages: Json): ChatMessage[] {
  if (!Array.isArray(rawMessages)) return [];
  
  return rawMessages.reduce<ChatMessage[]>((acc, msg) => {
    // Skip if msg is not an object
    if (typeof msg !== 'object' || msg === null) return acc;
    
    const messageObj = msg as Record<string, unknown>;
    const role = messageObj.role;
    const content = messageObj.content;
    
    // Only add message if it has valid role and content
    if (
      (role === 'user' || role === 'assistant') &&
      typeof content === 'string'
    ) {
      acc.push({
        role: role as 'user' | 'assistant',
        content
      });
    }
    
    return acc;
  }, []);
}

export default function AIProfitChat() {
  const [query, setQuery] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // Fetch latest chat history
  const { data: chatHistory, isLoading: isLoadingHistory } = useQuery({
    queryKey: ['chat-history'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from('chat_history')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      
      if (!data) return null;
      
      return {
        ...data,
        messages: parseMessages(data.messages)
      } as ChatHistory;
    }
  });

  // Create or update chat history
  const updateChat = useMutation({
    mutationFn: async (messages: ChatMessage[]) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Convert messages to a format that matches the Json type
      const jsonMessages = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      })) as unknown as Json;

      if (chatHistory) {
        // Update existing chat
        const { error } = await supabase
          .from('chat_history')
          .update({ 
            messages: jsonMessages
          })
          .eq('id', chatHistory.id);

        if (error) throw error;
      } else {
        // Create new chat
        const { error } = await supabase
          .from('chat_history')
          .insert({
            user_id: user.id,
            messages: jsonMessages
          });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-history'] });
    }
  });

  const handleSendMessage = async () => {
    if (!query.trim()) return;

    setIsChatLoading(true);
    const userMessage = query.trim();
    setQuery("");

    const newMessages = [
      ...(chatHistory?.messages || []),
      { role: 'user' as const, content: userMessage }
    ];

    try {
      // Get latest audit for context
      const { data: latestAudit } = await supabase
        .from('financial_audits')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      // Send message to AI
      const response = await supabase.functions.invoke('chat-with-audit', {
        body: {
          query: userMessage,
          auditContext: latestAudit,
        },
      });

      if (response.error) throw response.error;

      // Update messages with AI response
      const updatedMessages = [
        ...newMessages,
        { role: 'assistant' as const, content: response.data.response }
      ];

      await updateChat.mutateAsync(updatedMessages);
    } catch (error) {
      console.error("Failed to get AI response:", error);
      toast.error("Failed to get AI response");
    } finally {
      setIsChatLoading(false);
    }
  };

  const clearChat = async () => {
    try {
      await updateChat.mutateAsync([]);
      toast.success("Chat history cleared");
      setShowClearConfirm(false);
    } catch (error) {
      console.error("Failed to clear chat:", error);
      toast.error("Failed to clear chat history");
    }
  };

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollArea = scrollAreaRef.current;
      scrollArea.scrollTop = scrollArea.scrollHeight;
    }
  }, [chatHistory?.messages]);

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1">
        <Header />
        <main className="p-0 md:p-6 mt-16 md:mt-0">
          <Card className="border-0 md:border">
            <div className="flex justify-between items-center mb-8 px-4 md:px-6 pt-4 md:pt-6 pb-4 bg-primary">
              <h2 className="text-2xl font-semibold whitespace-nowrap overflow-hidden text-ellipsis text-white">AI Profit Assistant</h2>
              {chatHistory?.messages?.length > 0 && (
                <Button
                  variant="ghost"
                  onClick={() => setShowClearConfirm(true)}
                  className="md:flex md:items-center md:gap-2 p-2 md:p-2 hover:bg-primary/20"
                  disabled={updateChat.isPending}
                >
                  <Trash2 className="h-4 w-4 text-white" />
                  <span className="hidden md:inline text-white">Clear Chat</span>
                </Button>
              )}
            </div>

            {/* Chat Messages */}
            <ScrollArea 
              className="h-[600px] px-4 md:px-6 mb-4" 
              ref={scrollAreaRef}
            >
              <div className="space-y-4">
                {!isLoadingHistory && chatHistory?.messages?.map((message, index) => (
                  <ChatMessage key={index} role={message.role}>
                    {message.content}
                  </ChatMessage>
                ))}
                {(isChatLoading || updateChat.isPending) && (
                  <div className="flex justify-start">
                    <div className="bg-muted p-3 rounded-lg mr-4">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Chat Input */}
            <div className="px-4 md:px-6 pb-4 md:pb-6">
              <ChatInput
                query={query}
                setQuery={setQuery}
                onSend={handleSendMessage}
                isLoading={isChatLoading || updateChat.isPending}
              />
            </div>
          </Card>
        </main>
      </div>

      <ClearChatDialog
        open={showClearConfirm}
        onOpenChange={setShowClearConfirm}
        onConfirm={clearChat}
      />
    </div>
  );
}
