import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { PaperStatus } from "@prisma/client";
import { PaperReader } from "@/components/papers/paper-reader";

export default async function PaperReaderPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth();

  if (!session?.user?.email) {
    redirect(`/login?callbackUrl=/papers/${params.id}`);
  }

  // Get user from database
  const user = await db.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });

  if (!user) {
    redirect("/login");
  }

  // Fetch paper from database
  const paper = await db.paper.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      arxivId: true,
      title: true,
      authors: true,
      abstract: true,
      htmlUrl: true,
      pdfUrl: true,
      publicationDate: true,
      categories: true,
    },
  });

  if (!paper) {
    redirect("/dashboard");
  }

  // Check existing state and conditionally update/create
  // AC: Only update NEW → BEING_PROCESSED, preserve BEING_PROCESSED and READ
  const existingState = await db.userPaperState.findUnique({
    where: {
      userId_paperId: {
        userId: user.id,
        paperId: paper.id,
      },
    },
  });

  let currentStatus = PaperStatus.NEW;
  if (!existingState) {
    // No state exists → create new record with BEING_PROCESSED
    await db.userPaperState.create({
      data: {
        userId: user.id,
        paperId: paper.id,
        status: PaperStatus.BEING_PROCESSED,
        inLibrary: false,
      },
    });
    currentStatus = PaperStatus.BEING_PROCESSED;
  } else if (existingState.status === PaperStatus.NEW) {
    // State exists with NEW → update to BEING_PROCESSED
    await db.userPaperState.update({
      where: {
        userId_paperId: {
          userId: user.id,
          paperId: paper.id,
        },
      },
      data: {
        status: PaperStatus.BEING_PROCESSED,
      },
    });
    currentStatus = PaperStatus.BEING_PROCESSED;
  } else {
    // If state is BEING_PROCESSED or READ, leave unchanged (no update needed)
    currentStatus = existingState.status;
  }

  return (
    <PaperReader
      paper={{
        id: paper.id,
        arxivId: paper.arxivId,
        title: paper.title,
        authors: paper.authors as Array<{ name: string }>,
        abstract: paper.abstract,
        htmlUrl: paper.htmlUrl,
        pdfUrl: paper.pdfUrl,
        publicationDate: paper.publicationDate,
        categories: paper.categories as string[],
      }}
      initialStatus={currentStatus}
    />
  );
}

