import { CodeAction, ChatResponse, Message } from "@/types";

const COLAB_URL = process.env.COLAB_CLOUDFLARED_URL || "http://localhost:5000";

export async function sendMessageToColab(
  messages: Message[],
  workspaceFiles?: { path: string; content: string }[]
): Promise<ChatResponse> {
  const systemPrompt = `You are an expert AI coding assistant integrated into a vibe coding IDE. You can read and write code automatically.

When responding:
1. Provide helpful explanations in natural language
2. When code changes are needed, use the following JSON format for actions:

For creating a new file:
{"actions": [{"type": "create_file", "filePath": "path/to/file.ext", "content": "full file content"}]}

For editing an existing file (using search and replace):
{"actions": [{"type": "edit_file", "filePath": "path/to/file.ext", "searchReplace": [{"search": "code to find", "replace": "code to replace with"}]}]}

For deleting a file:
{"actions": [{"type": "delete_file", "filePath": "path/to/file.ext"}]}

You can combine multiple actions in one response. Always wrap actions in a JSON code block with the language set to "json-actions".

Be concise and helpful. Write production-quality code.`;

  const formattedMessages = [
    { role: "system", content: systemPrompt },
    ...messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
  ];

  if (workspaceFiles && workspaceFiles.length > 0) {
    const filesContext = workspaceFiles
      .map((f) => `File: ${f.path}\n\`\`\`\n${f.content}\n\`\`\``)
      .join("\n\n");
    formattedMessages.push({
      role: "system",
      content: `Current workspace files:\n${filesContext}`,
    });
  }

  try {
    const response = await fetch(`${COLAB_URL}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "colab-model",
        messages: formattedMessages,
        max_tokens: 4096,
        temperature: 0.7,
      }),
      signal: AbortSignal.timeout(60000),
    });

    if (!response.ok) {
      throw new Error(`Colab API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "No response from model.";

    const actions = extractActions(content);
    const cleanMessage = removeActionBlocks(content);

    return {
      message: cleanMessage,
      actions,
    };
  } catch (error) {
    console.error("Error calling Colab model:", error);
    return {
      message: `Error connecting to model. Make sure your Cloudflared tunnel is running and the URL is configured correctly.\n\nDetails: ${error instanceof Error ? error.message : "Unknown error"}`,
      actions: [],
    };
  }
}

export async function streamChatResponse(
  messages: Message[],
  onChunk: (chunk: string) => void,
  workspaceFiles?: { path: string; content: string }[],
  colabUrl?: string,
  modelName?: string
): Promise<CodeAction[]> {
  const baseUrl = (colabUrl || process.env.COLAB_CLOUDFLARED_URL || "http://localhost:5000").replace(/\/+$/, "");
  const model = modelName || "colab-model";
  const fullUrl = `${baseUrl}/v1/chat/completions`;

  console.log("[Colab Client] Fetching:", fullUrl, "Model:", model);

  const systemPrompt = `You are an expert AI coding assistant integrated into a vibe coding IDE. You can read and write code automatically.

When responding:
1. Provide helpful explanations in natural language
2. When code changes are needed, use the following JSON format for actions:

For creating a new file:
{"actions": [{"type": "create_file", "filePath": "path/to/file.ext", "content": "full file content"}]}

For editing an existing file:
{"actions": [{"type": "edit_file", "filePath": "path/to/file.ext", "searchReplace": [{"search": "code to find", "replace": "code to replace with"}]}]}

For deleting a file:
{"actions": [{"type": "delete_file", "filePath": "path/to/file.ext"}]}

Always wrap actions in a JSON code block with the language set to "json-actions".`;

  const formattedMessages = [
    { role: "system", content: systemPrompt },
    ...messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
  ];

  try {
    const response = await fetch(fullUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: formattedMessages,
        max_tokens: 4096,
        temperature: 0.7,
        stream: true,
      }),
      redirect: "follow",
      signal: AbortSignal.timeout(120000),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("[Colab Client] Error response:", response.status, errorBody);
      throw new Error(`Colab API error: ${response.status} - ${errorBody}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("No response body");
    }

    const decoder = new TextDecoder();
    let fullContent = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n").filter((line) => line.trim());

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6).trim();
          if (data === "[DONE]") break;

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content || "";
            if (content) {
              fullContent += content;
              onChunk(content);
            }
          } catch {
            // Skip malformed JSON
          }
        }
      }
    }

    return extractActions(fullContent);
  } catch (error) {
    console.error("Error streaming from Colab model:", error);
    onChunk(
      `\n\nError connecting to model. Make sure your Cloudflared tunnel is running.\n\nDetails: ${error instanceof Error ? error.message : "Unknown error"}`
    );
    return [];
  }
}

function extractActions(content: string): CodeAction[] {
  const actions: CodeAction[] = [];
  const jsonBlockRegex = /```json-actions\n([\s\S]*?)```/g;
  let match;

  while ((match = jsonBlockRegex.exec(content)) !== null) {
    try {
      const parsed = JSON.parse(match[1].trim());
      if (parsed.actions && Array.isArray(parsed.actions)) {
        actions.push(...parsed.actions);
      }
    } catch {
      // Skip malformed JSON
    }
  }

  return actions;
}

function removeActionBlocks(content: string): string {
  return content.replace(/```json-actions\n[\s\S]*?```/g, "").trim();
}
