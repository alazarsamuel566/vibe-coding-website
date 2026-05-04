import { NextRequest, NextResponse } from "next/server";
import { streamChatResponse } from "@/lib/colabClient";
import { getAllFilesContent } from "@/lib/fileSystem";
import { Message } from "@/types";

export async function POST(request: NextRequest) {
  const { messages } = await request.json();
  let colabUrl = request.headers.get("x-colab-url") || process.env.COLAB_CLOUDFLARED_URL || "http://localhost:5000";
  const workspaceDir = request.headers.get("x-workspace-dir") || "workspace";
  const modelName = request.headers.get("x-model-name") || "colab-model";

  colabUrl = colabUrl.replace(/\/+$/, "");

  console.log("[Chat API] Colab URL:", colabUrl);
  console.log("[Chat API] Workspace:", workspaceDir);

  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  const workspaceFiles = await getAllFilesContent("", workspaceDir);

  streamChatResponse(
    messages as Message[],
    (chunk) => {
      writer.write(encoder.encode(`data: ${JSON.stringify({ chunk })}\n\n`));
    },
    workspaceFiles,
    colabUrl,
    modelName
  )
    .then((actions) => {
      writer.write(
        encoder.encode(
          `data: ${JSON.stringify({ done: true, actions })}\n\n`
        )
      );
      writer.write(encoder.encode("data: [DONE]\n\n"));
      writer.close();
    })
    .catch((error) => {
      writer.write(
        encoder.encode(
          `data: ${JSON.stringify({ error: error.message })}\n\n`
        )
      );
      writer.close();
    });

  return new Response(stream.readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
