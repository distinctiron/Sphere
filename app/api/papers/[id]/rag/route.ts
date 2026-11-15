import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ensurePaperIndexed } from "@/lib/rag/indexer";

export const runtime = "nodejs";

async function getStatus(paperId: string) {
  const paper = await db.paper.findUnique({
    where: { id: paperId },
    select: { ragStatus: true, ragIndexedAt: true, ragError: true, _count: { select: { chunks: true } } },
  });
  if (!paper) return null;
  return {
    ragStatus: paper.ragStatus,
    chunkCount: paper._count.chunks,
    indexedAt: paper.ragIndexedAt,
    error: paper.ragError,
  };
}

/**
 * GET /api/papers/[id]/rag
 * RAG index status for a paper
 */
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const status = await getStatus(params.id);
  if (!status) return NextResponse.json({ error: "Paper not found" }, { status: 404 });
  return NextResponse.json(status);
}

/**
 * POST /api/papers/[id]/rag
 * Start chunking + embedding a paper (Stories 7.2/7.3). Called by the reader
 * when a paper is opened so retrieval is ready before the first question.
 * Returns immediately (202); pass { "wait": true } to wait for completion,
 * or { "force": true } to re-index even if the index looks current.
 */
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const force = body?.force === true;
  const wait = body?.wait === true;

  const exists = await db.paper.findUnique({ where: { id: params.id }, select: { id: true } });
  if (!exists) return NextResponse.json({ error: "Paper not found" }, { status: 404 });

  const indexing = ensurePaperIndexed(params.id, { force });
  if (!wait) {
    indexing.catch((error) => console.error(`RAG indexing failed for paper ${params.id}:`, error));
    return NextResponse.json({ status: "indexing" }, { status: 202 });
  }

  try {
    const result = await indexing;
    return NextResponse.json({ result, ...(await getStatus(params.id)) });
  } catch (error) {
    console.error(`RAG indexing failed for paper ${params.id}:`, error);
    return NextResponse.json({ error: "Indexing failed" }, { status: 500 });
  }
}
