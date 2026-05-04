import { CodeAction, ChatResponse, Message } from "@/types";

const COLAB_URL = process.env.COLAB_CLOUDFLARED_URL || "http://localhost:5000";

export async function sendMessageToColab(
  messages: Message[],
  workspaceFiles?: { path: string; content: string }[],
  colabUrl?: string,
  modelName?: string
): Promise<ChatResponse> {
  const baseUrl = (colabUrl || COLAB_URL).replace(/\/+$/, "");
  const model = modelName || "colab-model";

  const systemPrompt = `You are an expert AI coding assistant. When creating/editing files, output ONLY valid JSON:
{"actions":[{"type":"create_file","filePath":"path.ext","content":"file content"}]}
Valid JSON only. Proper quotes, colons, and brackets.`;

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
    const response = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: formattedMessages,
        max_tokens: 4096,
        temperature: 0.7,
      }),
      redirect: "follow",
      signal: AbortSignal.timeout(60000),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Colab API error: ${response.status} - ${errorBody}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "No response from model.";

    const actions = extractActions(content);
    const cleanMessage = removeActionBlocks(content);

    return { message: cleanMessage, actions };
  } catch (error) {
    return {
      message: `Error connecting to model.\n\nDetails: ${error instanceof Error ? error.message : "Unknown error"}`,
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

  const systemPrompt = `You are an expert AI coding assistant. When creating/editing files, output ONLY valid JSON:
{"actions":[{"type":"create_file","filePath":"path.ext","content":"file content"}]}
Valid JSON only. Proper quotes, colons, and brackets.`;

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
    const response = await fetch(fullUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
      throw new Error(`Colab API error: ${response.status} - ${errorBody}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error("No response body");

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
          } catch {}
        }
      }
    }

    return extractActions(fullContent);
  } catch (error) {
    onChunk(
      `\n\nError: ${error instanceof Error ? error.message : "Unknown error"}`
    );
    return [];
  }
}

function extractActions(content: string): CodeAction[] {
  const actions: CodeAction[] = [];

  // 1. Try standard code blocks
  const codeBlockRegex = /```(?:json-actions|json)?\s*([\s\S]*?)```/g;
  let match;
  while ((match = codeBlockRegex.exec(content)) !== null) {
    const result = parseAndFixJson(match[1]);
    if (result && result.actions) {
      const actionList = Array.isArray(result.actions) ? result.actions : [result.actions];
      actions.push(...actionList.map(normalizeAction));
    }
  }

  if (actions.length > 0) return actions;

  // 2. Try finding JSON in the full text (no code blocks)
  const fullTextResult = parseAndFixJson(content);
  if (fullTextResult && fullTextResult.actions) {
    const actionList = Array.isArray(fullTextResult.actions) ? fullTextResult.actions : [fullTextResult.actions];
    actions.push(...actionList.map(normalizeAction));
  }

  if (actions.length > 0) return actions;

  // 3. Regex fallback: extract create_file actions from raw text
  // Looks for patterns like "filePath": "..." and "content": "..."
  const filePathMatch = content.match(/"filePath"\s*:\s*"([^"]+)"/);
  const contentMatch = content.match(/"content"\s*:\s*"([\s\S]*?)"/);

  if (filePathMatch) {
    actions.push({
      type: "create_file",
      filePath: filePathMatch[1],
      content: contentMatch ? unescapeJsonString(contentMatch[1]) : "",
    });
  }

  return actions;
}

function parseAndFixJson(str: string): any {
  try {
    return JSON.parse(str.trim());
  } catch {
    // Fix common model JSON issues
    let fixed = str.trim();

    // Fix missing opening brace
    if (!fixed.startsWith("{")) fixed = "{" + fixed;

    // Fix "actions": { ... } -> "actions": [ { ... } ]
    fixed = fixed.replace(/"actions"\s*:\s*\{([\s\S]*?)\}\s*(,?\s*\})/g, (m, inner, trailing) => {
      return `"actions": [{${inner}}]${trailing}`;
    });

    // Fix missing quotes before colons: "key" value -> "key": "value"
    fixed = fixed.replace(/"([^"]+)"\s+([^\s,}\]:]+)/g, '"$1": "$2"');

    // Fix broken filePath: "filePath":index.html" -> "filePath": "index.html"
    fixed = fixed.replace(/"filePath"\s*:\s*([^"\s,}]+)"/g, '"filePath": "$1"');

    // Fix unclosed strings in content by finding the last valid quote
    fixed = fixUnclosedStrings(fixed);

    // Ensure proper closing
    const openBraces = (fixed.match(/{/g) || []).length;
    const closeBraces = (fixed.match(/}/g) || []).length;
    for (let i = 0; i < openBraces - closeBraces; i++) {
      fixed += "}";
    }

    try {
      return JSON.parse(fixed);
    } catch {
      // Last resort: try eval (safe in Node.js server context for this use case)
      try {
        return JSON.parse(fixed.replace(/,\s*([\]}])/g, "$1"));
      } catch {
        return null;
      }
    }
  }
}

function fixUnclosedStrings(str: string): string {
  // Find "content" key and fix its value
  const contentRegex = /"content"\s*:\s*"([\s\S]*?)$/;
  const match = str.match(contentRegex);
  if (match) {
    let value = match[1];
    // Remove trailing broken HTML tags that break JSON
    if (value.endsWith("\\</body>\\</html")) {
      value += "\"></html>";
    } else if (value.endsWith("</html")) {
      value += "\">";
    } else if (!value.endsWith('"')) {
      value += '"';
    }
    str = str.substring(0, match.index!) + `"content": ${JSON.stringify(value)}`;
  }
  return str;
}

function normalizeAction(action: any): CodeAction {
  return {
    type: action.type || "create_file",
    filePath: action.filePath || "unknown",
    content: action.content,
    searchReplace: action.searchReplace,
  };
}

function unescapeJsonString(str: string): string {
  return str.replace(/\\n/g, "\n").replace(/\\t/g, "\t").replace(/\\"/g, '"').replace(/\\\\/g, "\\");
}

function removeActionBlocks(content: string): string {
  let cleaned = content.replace(/```(?:json-actions|json)?\s*[\s\S]*?```/g, "").trim();
  cleaned = cleaned.replace(/\{[\s]*["']actions["'][\s]*:[\s]*[\s\S]*?\}\s*\}/g, "").trim();
  return cleaned;
}
