import { NextRequest, NextResponse } from "next/server";
import { listFiles, readFile, writeFile, deleteFile, ensureWorkspace } from "@/lib/fileSystem";

export async function GET(request: NextRequest) {
  const workspaceDir = request.headers.get("x-workspace-dir") || "workspace";
  await ensureWorkspace(workspaceDir);

  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get("action");
  const filePath = searchParams.get("path");

  if (action === "list") {
    const tree = await listFiles(filePath || "", workspaceDir);
    return NextResponse.json({ tree });
  }

  if (action === "read" && filePath) {
    try {
      const content = await readFile(filePath, workspaceDir);
      return NextResponse.json({ content });
    } catch {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

export async function POST(request: NextRequest) {
  const workspaceDir = request.headers.get("x-workspace-dir") || "workspace";
  await ensureWorkspace(workspaceDir);

  const { action, path: filePath, content } = await request.json();

  if (action === "write" && filePath) {
    await writeFile(filePath, content || "", workspaceDir);
    return NextResponse.json({ success: true });
  }

  if (action === "delete" && filePath) {
    try {
      await deleteFile(filePath, workspaceDir);
      return NextResponse.json({ success: true });
    } catch {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
