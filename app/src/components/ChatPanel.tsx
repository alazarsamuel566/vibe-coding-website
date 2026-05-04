"use client";

import { useState, useRef, useEffect } from "react";
import { SendIcon, Loader2Icon, Code2Icon, FilePlusIcon, PencilIcon, Trash2Icon } from "lucide-react";
import clsx from "clsx";
import ReactMarkdown from "react-markdown";
import { Message, CodeAction } from "@/types";

interface ChatPanelProps {
  onAction: (actions: CodeAction[]) => void;
  headers?: Record<string, string>;
}

export function ChatPanel({ onAction, headers = {} }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    setStreamingContent("");

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...headers,
        },
        body: JSON.stringify({
          messages: [...messages, userMessage],
        }),
      });

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let fullContent = "";
      let actions: CodeAction[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n").filter((line) => line.trim());

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6).trim();
            if (data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data);
              if (parsed.chunk) {
                fullContent += parsed.chunk;
                setStreamingContent(fullContent);
              }
              if (parsed.done) {
                actions = parsed.actions || [];
              }
            } catch {
              // Skip malformed JSON
            }
          }
        }
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: fullContent,
        timestamp: new Date(),
        actions: actions.length > 0 ? actions : undefined,
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setStreamingContent("");

      if (actions.length > 0) {
        onAction(actions);
      }
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Sorry, something went wrong. Please try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const getActionIcon = (type: string) => {
    switch (type) {
      case "create_file":
        return <FilePlusIcon size={14} className="text-green-400" />;
      case "edit_file":
        return <PencilIcon size={14} className="text-blue-400" />;
      case "delete_file":
        return <Trash2Icon size={14} className="text-red-400" />;
      default:
        return <Code2Icon size={14} />;
    }
  };

  return (
    <div className="flex flex-col h-full bg-zinc-900">
      <div className="flex items-center justify-between p-3 border-b border-zinc-800">
        <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">AI Chat</h2>
        {messages.length > 0 && (
          <span className="text-xs text-zinc-600">{messages.length} messages</span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-12 text-zinc-500">
            <Code2Icon size={48} className="mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">Start Building</p>
            <p className="text-sm mt-2">Describe what you want to build and the AI will write the code for you</p>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={clsx(
              "flex",
              message.role === "user" ? "justify-end" : "justify-start"
            )}
          >
            <div
              className={clsx(
                "max-w-[85%] rounded-lg p-3",
                message.role === "user"
                  ? "bg-blue-600 text-white"
                  : "bg-zinc-800 text-zinc-200"
              )}
            >
              <div className="prose prose-sm prose-invert max-w-none">
                <ReactMarkdown>{message.content}</ReactMarkdown>
              </div>
              {message.actions && message.actions.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  {message.actions.map((action, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 text-xs bg-zinc-900/50 rounded px-2 py-1.5"
                    >
                      {getActionIcon(action.type)}
                      <span className="text-zinc-400">
                        {action.type.replace("_", " ")}:{" "}
                        <span className="text-zinc-300 font-mono">{action.filePath}</span>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {streamingContent && (
          <div className="flex justify-start">
            <div className="max-w-[85%] rounded-lg p-3 bg-zinc-800 text-zinc-200">
              <div className="prose prose-sm prose-invert max-w-none">
                <ReactMarkdown>{streamingContent}</ReactMarkdown>
              </div>
            </div>
          </div>
        )}

        {isLoading && !streamingContent && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 text-zinc-400">
              <Loader2Icon size={16} className="animate-spin" />
              <span className="text-sm">Thinking...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="p-3 border-t border-zinc-800">
        <div className="flex items-end gap-2 bg-zinc-800 rounded-lg p-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask me to build something..."
            className="flex-1 bg-transparent text-zinc-200 placeholder-zinc-500 resize-none outline-none text-sm px-2 py-1 max-h-32 min-h-[36px]"
            rows={1}
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="p-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors"
          >
            {isLoading ? (
              <Loader2Icon size={18} className="animate-spin text-white" />
            ) : (
              <SendIcon size={18} className="text-white" />
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
