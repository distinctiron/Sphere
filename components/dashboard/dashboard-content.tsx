"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { toast } from "sonner";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  DragMoveEvent,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  pointerWithin,
  closestCenter,
  useDroppable,
  CollisionDetection,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { NoveltyCarousel } from "@/components/dashboard/novelty-carousel";
import { PaperListCard } from "@/components/dashboard/paper-list-card";
import { SortablePaperCard } from "@/components/dashboard/sortable-paper-card";
import { DraggablePaperCard } from "@/components/dashboard/draggable-paper-card";
import { SectionDropZone } from "@/components/dashboard/section-drop-zone";
import { CategoryFilter } from "@/components/dashboard/category-filter";
import { Button } from "@/components/ui/button";
import { SketchFrame } from "@/components/sketch";
import { AppHeader } from "@/components/sketch/app-header";
import { useRouter } from "next/navigation";

interface Paper {
  id: string;
  arxivId: string;
  title: string;
  authors: Array<{ name: string }>;
  abstract: string;
  publicationDate: Date | string;
  updatedDate: Date | string;
  categories: string[];
  pdfUrl: string;
  htmlUrl: string;
  noveltyScore: number | null;
  noveltySummary: string | null;
  status: string;
  inLibrary: boolean;
  displayOrder: number | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

interface PapersResponse {
  papers: Paper[];
}

type IncomingScope = "new" | "all";

interface IncomingMeta {
  scope: IncomingScope;
  since: string | null;
  isFirstVisit: boolean;
  total: number;
  pendingScores: number;
}

interface IncomingResponse extends PapersResponse {
  meta?: IncomingMeta;
}

type SectionId = "incoming" | "library";

/** How often to check whether pending novelty scores have been computed */
const SCORE_POLL_INTERVAL_MS = 60_000;

export function DashboardContent() {
  const [incomingPapers, setIncomingPapers] = useState<Paper[]>([]);
  const [libraryPapers, setLibraryPapers] = useState<Paper[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draggedFromSection, setDraggedFromSection] = useState<SectionId | null>(null);
  const [overDropZone, setOverDropZone] = useState<SectionId | null>(null);
  const [incomingScope, setIncomingScope] = useState<IncomingScope>("new");
  const [incomingMeta, setIncomingMeta] = useState<IncomingMeta | null>(null);
  const [incomingLoading, setIncomingLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const initialScrollLeftRef = useRef<number | null>(null);
  const router = useRouter();

  // Configure sensors for drag-and-drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px of movement before drag starts
      },
    })
  );

  // Custom collision detection that behaves differently based on source section
  const customCollisionDetection: CollisionDetection = (args) => {
    const { active, droppableContainers, pointerCoordinates } = args;
    
    // Determine which section we're dragging from
    const activePaper = [...incomingPapers, ...libraryPapers].find(
      (p) => p.id === active.id
    );
    const fromSection = activePaper?.inLibrary ? "library" : "incoming";

    if (fromSection === "incoming") {
      // When dragging from incoming: only check drop zones using pointerWithin
      // Filter to only drop zones
      const dropZones = droppableContainers.filter(
        (container) => 
          container.id === "library-drop-zone" || 
          container.id === "incoming-drop-zone"
      );
      
      // Use pointerWithin to check if pointer is within any drop zone
      return pointerWithin({
        ...args,
        droppableContainers: dropZones,
      });
    } else {
      // When dragging from library: use closestCenter for sortable items only
      // Filter to only sortable items (papers in library)
      const sortableItems = droppableContainers.filter(
        (container) => libraryPapers.some(p => p.id === container.id)
      );
      
      // Use closestCenter on sortable items
      return closestCenter({
        ...args,
        droppableContainers: sortableItems,
      });
    }
  };

  // Fetch both incoming articles and library papers
  useEffect(() => {
    async function fetchPapers() {
      try {
        setLoading(true);
        setError(null);

        // Fetch incoming articles and library papers in parallel
        const [incomingResponse, libraryResponse] = await Promise.all([
          fetch("/api/papers?status=NEW&scope=new"),
          fetch("/api/papers?inLibrary=true"),
        ]);

        if (!incomingResponse.ok || !libraryResponse.ok) {
          throw new Error("Failed to fetch papers");
        }

        const incomingData: IncomingResponse = await incomingResponse.json();
        const libraryData: PapersResponse = await libraryResponse.json();

        setIncomingPapers(incomingData.papers);
        setIncomingMeta(incomingData.meta ?? null);
        
        // Sort library papers: unread papers first, read papers last
        // Within each group, preserve existing ordering (display_order, novelty score, etc.)
        const sortedLibraryPapers = [...libraryData.papers].sort((a, b) => {
          const aIsRead = a.status === "READ";
          const bIsRead = b.status === "READ";
          
          // If both are read or both are unread, preserve existing order
          if (aIsRead === bIsRead) {
            // Preserve display_order if available, otherwise maintain array order
            if (a.displayOrder !== null && b.displayOrder !== null) {
              return a.displayOrder - b.displayOrder;
            }
            return 0; // Maintain original order
          }
          
          // Unread papers come before read papers
          return aIsRead ? 1 : -1;
        });
        
        setLibraryPapers(sortedLibraryPapers);
      } catch (err) {
        console.error("Error fetching papers:", err);
        const errorMessage = "Failed to load papers. Please try again later.";
        setError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setLoading(false);
      }
    }

    fetchPapers();
  }, []);

  // Poll for novelty scores computed in the background (Story 6.4)
  const hasPendingScores = incomingPapers.some((p) => p.noveltyScore === null);
  useEffect(() => {
    if (!hasPendingScores) return;

    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/papers?status=NEW&scope=${incomingScope}`);
        if (!response.ok) return;
        const data: IncomingResponse = await response.json();
        const scores = new Map(data.papers.map((p) => [p.id, p]));
        // Only fill in scores; don't reorder or add cards under the user
        setIncomingPapers((prev) =>
          prev.map((paper) => {
            const updated = scores.get(paper.id);
            return paper.noveltyScore === null && updated?.noveltyScore != null
              ? { ...paper, noveltyScore: updated.noveltyScore, noveltySummary: updated.noveltySummary }
              : paper;
          })
        );
      } catch {
        // Try again next interval
      }
    }, SCORE_POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [hasPendingScores, incomingScope]);

  const handleChangeIncomingScope = async (scope: IncomingScope) => {
    if (scope === incomingScope || incomingLoading) return;
    setIncomingLoading(true);
    try {
      const response = await fetch(`/api/papers?status=NEW&scope=${scope}`);
      if (!response.ok) throw new Error("Failed to fetch papers");
      const data: IncomingResponse = await response.json();
      setIncomingPapers(data.papers);
      setIncomingMeta(data.meta ?? null);
      setIncomingScope(scope);
    } catch (err) {
      console.error("Error fetching incoming papers:", err);
      toast.error("Failed to load papers. Please try again.");
    } finally {
      setIncomingLoading(false);
    }
  };

  // Manually score a paper whose background scoring hasn't completed
  const handleScorePaper = async (paperId: string) => {
    const response = await fetch(`/api/papers/${paperId}/score`, { method: "POST" });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const message =
        response.status === 402
          ? data.message || "Scoring on demand needs a paid plan."
          : data.message || "Scoring is unavailable right now. Please try again later.";
      toast.error(message);
      throw new Error(message);
    }

    setIncomingPapers((prev) =>
      prev.map((paper) =>
        paper.id === paperId
          ? { ...paper, noveltyScore: data.score ?? null, noveltySummary: data.summary ?? null }
          : paper
      )
    );
  };

  const handleViewPaper = (paperId: string) => {
    router.push(`/papers/${paperId}`);
  };

  const handleAddToLibrary = async (paperId: string) => {
    try {
      const response = await fetch(`/api/papers/${paperId}/add-to-list`, {
        method: "POST",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to add paper to library");
      }

      const data = await response.json();

      // If paper was already in library, that's fine - just return
      if (data.alreadyInLibrary) {
        return;
      }

      // Refetch library papers to get updated display_order
      const libraryResponse = await fetch("/api/papers?inLibrary=true");
      if (libraryResponse.ok) {
        const libraryData: PapersResponse = await libraryResponse.json();
        setLibraryPapers(libraryData.papers);
      }

      // Remove from incoming papers
      setIncomingPapers((prev) => prev.filter((paper) => paper.id !== paperId));
      
      toast.success("Paper added to library");
    } catch (error) {
      console.error("Error adding paper to library:", error);
      toast.error("Failed to add paper to library. Please try again.");
      throw error;
    }
  };

  const handleDismiss = async (paperId: string) => {
    try {
      const response = await fetch(`/api/papers/${paperId}/dismiss`, {
        method: "POST",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to dismiss paper");
      }

      // Remove paper from local state immediately
      setIncomingPapers((prev) => prev.filter((paper) => paper.id !== paperId));
      toast.success("Paper dismissed");
    } catch (error) {
      console.error("Error dismissing paper:", error);
      toast.error("Failed to dismiss paper. Please try again.");
      throw error;
    }
  };

  const handleRemoveFromLibrary = async (paperId: string) => {
    // Store original state for potential reversion
    const originalLibraryPapers = libraryPapers;
    
    // Optimistic update: remove from library immediately
    setLibraryPapers((prev) => prev.filter((paper) => paper.id !== paperId));
    
    try {
      const response = await fetch(`/api/papers/${paperId}/remove-from-library`, {
        method: "POST",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to remove paper from library");
      }

      toast.success("Paper removed from library");
    } catch (error) {
      console.error("Error removing paper from library:", error);
      
      // Revert optimistic update on error
      setLibraryPapers(originalLibraryPapers);
      
      // Determine error message based on error type
      let errorMessage = "Failed to remove paper from library. Please try again.";
      if (error instanceof Error) {
        if (error.message.includes("network") || error.message.includes("fetch")) {
          errorMessage = "Network error. Please check your connection and try again.";
        } else {
          errorMessage = error.message;
        }
      }
      
      toast.error(errorMessage);
      throw error;
    }
  };

  const handleReorderLibrary = async (newOrder: Paper[]) => {
    try {
      const paperIds = newOrder.map((paper) => paper.id);
      const response = await fetch("/api/library/reorder", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ paperIds }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to reorder library");
      }

      // Update local state with new order
      setLibraryPapers(newOrder);
      toast.success("Library reordered");
    } catch (error) {
      console.error("Error reordering library:", error);
      toast.error("Failed to reorder library. Reverting changes.");
      // Revert to previous order on error
      const libraryResponse = await fetch("/api/papers?inLibrary=true");
      if (libraryResponse.ok) {
        const libraryData: PapersResponse = await libraryResponse.json();
        setLibraryPapers(libraryData.papers);
      }
      throw error;
    }
  };

  // Drag handlers
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveId(active.id as string);

    // Determine which section the drag started from
    const paper = [...incomingPapers, ...libraryPapers].find(
      (p) => p.id === active.id
    );
    if (paper) {
      setDraggedFromSection(paper.inLibrary ? "library" : "incoming");
    }

    // Store initial horizontal scroll position to prevent horizontal scrolling
    // This prevents BOTH left (negative) and right (positive) horizontal scrolling
    if (containerRef.current) {
      const container = containerRef.current;
      initialScrollLeftRef.current = container.scrollLeft;
      
      // Add scroll event listener to actively prevent horizontal scrolling
      const preventHorizontalScroll = () => {
        if (initialScrollLeftRef.current !== null && container.scrollLeft !== initialScrollLeftRef.current) {
          container.scrollLeft = initialScrollLeftRef.current;
        }
      };
      
      container.addEventListener('scroll', preventHorizontalScroll, { passive: false, capture: true });
      // Store handler reference for cleanup
      (container as any).__preventHorizontalScroll = preventHorizontalScroll;
    }
  };

  const handleDragMove = (event: DragMoveEvent) => {
    const container = containerRef.current;
    const initialScrollLeft = initialScrollLeftRef.current;
    if (!container || initialScrollLeft === null) return;

    // Prevent horizontal scrolling by locking scrollLeft to initial value
    // Check immediately and also in next frame to catch any scroll events
    if (container.scrollLeft !== initialScrollLeft) {
      container.scrollLeft = initialScrollLeft;
    }
    
    // Also use requestAnimationFrame as backup to catch any delayed scroll events
    requestAnimationFrame(() => {
      if (container.scrollLeft !== initialScrollLeft) {
        container.scrollLeft = initialScrollLeft;
      }
    });
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    
    // DEBUG: Log what over contains
    console.log("=== DRAG OVER DEBUG ===");
    console.log("over:", over);
    console.log("over.id:", over?.id);
    console.log("over.data:", over?.data);
    console.log("draggedFromSection:", draggedFromSection);
    
    if (!over) {
      console.log("No over - setting dropZone to null");
      setOverDropZone(null);
      return;
    }

    const overId = over.id as string;
    const fromSection = draggedFromSection;

    console.log("overId:", overId);
    console.log("fromSection:", fromSection);

    // Priority 1: Check drop zones first (most reliable)
    if (overId === "library-drop-zone") {
      console.log("Detected library-drop-zone - setting dropZone to library");
      setOverDropZone("library");
      return;
    }
    
    if (overId === "incoming-drop-zone") {
      console.log("Detected incoming-drop-zone - setting dropZone to incoming");
      setOverDropZone("incoming");
      return;
    }

    // Priority 2: If dragging from incoming, check papers as fallback
    if (fromSection === "incoming") {
      const isOverLibraryPaper = libraryPapers.some(p => p.id === overId);
      console.log("isOverLibraryPaper:", isOverLibraryPaper);
      if (isOverLibraryPaper) {
        console.log("Detected library paper - setting dropZone to library");
        setOverDropZone("library");
        return;
      }
      
      const isOverIncomingPaper = incomingPapers.some(p => p.id === overId);
      console.log("isOverIncomingPaper:", isOverIncomingPaper);
      if (isOverIncomingPaper) {
        console.log("Detected incoming paper - setting dropZone to incoming");
        setOverDropZone("incoming");
        return;
      }
    }

    // Default: no drop zone detected
    console.log("No match - setting dropZone to null");
    setOverDropZone(null);
    console.log("========================");
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    // Preserve overDropZone state for use in drop logic before clearing
    const currentOverDropZone = overDropZone;
    setOverDropZone(null);
    const fromSection = draggedFromSection;
    setDraggedFromSection(null);

    // DEBUG: Log drop zone information
    console.log("=== DRAG END DEBUG ===");
    console.log("fromSection:", fromSection);
    console.log("over:", over ? { id: over.id, data: over.data } : "null");
    console.log("overId:", over ? (over.id as string) : "null");
    console.log("currentOverDropZone:", currentOverDropZone);
    console.log("======================");

    // Remove scroll event listener and reset scroll lock
    if (containerRef.current) {
      const container = containerRef.current;
      const handler = (container as any).__preventHorizontalScroll;
      if (handler) {
        container.removeEventListener('scroll', handler, { capture: true });
        delete (container as any).__preventHorizontalScroll;
      }
    }
    initialScrollLeftRef.current = null;

    if (!over) {
      // Dropped outside any drop zone - cancel
      return;
    }

    const activeId = active.id as string;
    const overId = over.id as string;

    // Find the paper being dragged
    const activePaper = [...incomingPapers, ...libraryPapers].find(
      (p) => p.id === activeId
    );
    if (!activePaper) return;

    // Case 1: Dragging from incoming to library (add to library)
    if (fromSection === "incoming") {
      // ONLY add to library if explicitly dropped on library-drop-zone
      // Do NOT use any fallback logic - it causes incorrect behavior
      if (overId === "library-drop-zone") {
        // Dropped on library drop zone - add to library
        const originalIncoming = incomingPapers;
        const updatedIncoming = incomingPapers.filter((p) => p.id !== activeId);
        setIncomingPapers(updatedIncoming);

        try {
          await handleAddToLibrary(activeId);
        } catch (error) {
          setIncomingPapers(originalIncoming);
          console.error("Failed to add paper to library:", error);
        }
        return;
      }
      
      // For ALL other cases (incoming drop zone, incoming papers, library papers, outside):
      // Cancel - do NOT add to library
      return;
    }

    // Case 2: Reordering within library
    if (fromSection === "library") {
      // Check if dropped on another library paper (reordering)
      const droppedOnLibraryPaper = libraryPapers.some(p => p.id === overId);
      
      if (droppedOnLibraryPaper && overId !== activeId) {
        const oldIndex = libraryPapers.findIndex((p) => p.id === activeId);
        const newIndex = libraryPapers.findIndex((p) => p.id === overId);

        if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
          // Store original state for potential revert
          const originalOrder = libraryPapers;
          
          // Optimistic update: reorder immediately
          const newOrder = arrayMove(libraryPapers, oldIndex, newIndex);
          setLibraryPapers(newOrder);

          // Sync with server
          try {
            await handleReorderLibrary(newOrder);
          } catch (error) {
            // Revert on error
            setLibraryPapers(originalOrder);
            console.error("Failed to reorder library:", error);
          }
        }
        return;
      }
      
      // If dropped on library drop zone or same card, do nothing (cancel)
      if (overId === "library-drop-zone" || overId === activeId) {
        return;
      }
      
      // If dropped outside library section, cancel
      return;
    }
  };

  // Extract all unique categories from both sections
  const availableCategories = useMemo(() => {
    const categorySet = new Set<string>();
    [...incomingPapers, ...libraryPapers].forEach((paper) => {
      if (paper.categories && Array.isArray(paper.categories)) {
        paper.categories.forEach((cat) => categorySet.add(cat));
      }
    });
    return Array.from(categorySet).sort();
  }, [incomingPapers, libraryPapers]);

  // Filter incoming papers by selected categories
  const filteredIncomingPapers = useMemo(() => {
    if (selectedCategories.length === 0) {
      return incomingPapers;
    }
    return incomingPapers.filter((paper) => {
      if (!paper.categories || !Array.isArray(paper.categories)) {
        return false;
      }
      return paper.categories.some((cat) => selectedCategories.includes(cat));
    });
  }, [incomingPapers, selectedCategories]);

  const handleCategoryToggle = (category: string) => {
    setSelectedCategories((prev) => {
      if (prev.includes(category)) {
        return prev.filter((c) => c !== category);
      } else {
        return [...prev, category];
      }
    });
  };

  const handleClearFilters = () => {
    setSelectedCategories([]);
  };

  // Get top 5 papers for carousel (from incoming papers)
  const topNoveltyPapers = [...filteredIncomingPapers]
    .sort((a, b) => {
      if (a.noveltyScore !== null && b.noveltyScore === null) return -1;
      if (a.noveltyScore === null && b.noveltyScore !== null) return 1;
      if (a.noveltyScore !== null && b.noveltyScore !== null) {
        return b.noveltyScore - a.noveltyScore;
      }
      const dateA = new Date(a.publicationDate).getTime();
      const dateB = new Date(b.publicationDate).getTime();
      return dateB - dateA;
    })
    .slice(0, 5);

  // Get active paper for drag overlay
  const activePaper = useMemo(() => {
    return [...incomingPapers, ...libraryPapers].find((p) => p.id === activeId);
  }, [activeId, incomingPapers, libraryPapers]);

  const pageTitle = (
    <div>
      <h1 className="m-0 font-hand text-[64px] font-bold leading-none">Impact Dashboard</h1>
      <svg width="300" height="18" viewBox="0 0 300 18" aria-hidden="true" className="mt-0.5 block max-w-full overflow-visible">
        <path className="sk-draw" pathLength={1} d="M3 10 C 70 4, 150 13, 220 7 S 285 5, 297 9" style={{ animationDelay: ".2s", animationDuration: "1.1s" }} />
        <path className="sk-draw p2" pathLength={1} d="M292 12 C 230 11, 160 15, 90 11 S 20 12, 8 13" style={{ animationDelay: "1s", animationDuration: ".8s" }} />
      </svg>
    </div>
  );

  if (loading) {
    return (
      <div className="mx-auto flex max-w-[1240px] flex-col gap-9 px-6 pb-16 pt-6">
        <AppHeader active="papers" />
        {pageTitle}
        <p className="sk-pulse m-0 font-hand text-[26px] text-pencil">Sharpening pencils… loading papers</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto flex max-w-[1240px] flex-col gap-9 px-6 pb-16 pt-6">
        <AppHeader active="papers" />
        {pageTitle}
        <div role="alert" className="relative max-w-2xl bg-sheet p-4 text-pen">
          <SketchFrame seed="dashboard-error" w={640} h={60} tone="red" />
          <span className="relative">{error}</span>
        </div>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={customCollisionDetection}
      autoScroll={true}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div 
        ref={containerRef}
        className="relative mx-auto flex h-full w-full max-w-[1240px] flex-col gap-9 overflow-y-auto overflow-x-hidden px-6 pb-16 pt-6"
        style={{ 
          overscrollBehaviorX: 'none',
          scrollBehavior: 'auto',
          // Prevent horizontal scroll while allowing vertical auto-scroll
          touchAction: 'pan-y'
        }}
      >
        <AppHeader active="papers" />

        {/* Title */}
        <section className="flex flex-wrap items-end justify-between gap-5">
          <div>
            {pageTitle}
            <p className="m-0 mt-2.5 max-w-[560px] text-pencil">
              {incomingMeta?.scope === "new" && !incomingMeta.isFirstVisit
                ? `${incomingMeta.total} new ${incomingMeta.total === 1 ? "paper" : "papers"} since your last visit.`
                : "Your daily feed of high-novelty research. Drag the ones worth keeping into your library."}
            </p>
          </div>
        </section>

        {/* Novelty Carousel */}
        <NoveltyCarousel
          papers={topNoveltyPapers}
          onViewPaper={handleViewPaper}
        />

        {/* Category Filter */}
        {availableCategories.length > 0 && (
          <CategoryFilter
            categories={availableCategories}
            selectedCategories={selectedCategories}
            onCategoryToggle={handleCategoryToggle}
            onClearFilters={handleClearFilters}
          />
        )}

        {/* Two Sections: Incoming Articles and My Library - Side by Side */}
        <div className="grid grid-cols-1 gap-11 lg:grid-cols-2">
          {/* Incoming Articles Section */}
          <SectionDropZone id="incoming-drop-zone">
            <section className="h-full">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <h2 className="m-0 font-hand text-[40px] font-bold leading-none">
                  {incomingScope === "new" ? "New articles" : "All incoming"}{" "}
                  <span className="text-[26px] text-pencil">({filteredIncomingPapers.length})</span>
                </h2>
                <div role="group" aria-label="Which papers" className="flex">
                  {(["new", "all"] as const).map((scope) => (
                    <button
                      key={scope}
                      type="button"
                      className="sk-seg"
                      aria-pressed={incomingScope === scope}
                      disabled={incomingLoading}
                      onClick={() => incomingScope !== scope && handleChangeIncomingScope(scope)}
                    >
                      <span className="sk-bseg" aria-hidden="true" />
                      <span className="lbl">{scope === "new" ? "Only new" : "Earlier too"}</span>
                    </button>
                  ))}
                </div>
              </div>

              {filteredIncomingPapers.length === 0 ? (
                <div className="relative flex flex-col items-center bg-sheet/60 px-6 py-12 text-center">
                  <SketchFrame seed="incoming-empty" w={576} h={180} dashed faint />
                  <p className="relative m-0 font-hand text-[26px] leading-tight text-pencil">
                    {incomingPapers.length === 0
                      ? incomingScope === "new"
                        ? "No new papers since your last visit."
                        : "No papers available yet. New papers are fetched and scored every hour."
                      : selectedCategories.length > 0
                      ? "No papers found matching the selected filters."
                      : "No papers to display. All papers have been dismissed."}
                  </p>
                  {incomingPapers.length > 0 && selectedCategories.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleClearFilters}
                      className="mt-5"
                    >
                      Clear filters
                    </Button>
                  )}
                  {incomingPapers.length === 0 && incomingScope === "new" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleChangeIncomingScope("all")}
                      className="mt-5"
                    >
                      Show earlier papers
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-[26px]">
                  {filteredIncomingPapers.map((paper) => (
                    <DraggablePaperCard
                      key={paper.id}
                      paper={paper}
                      onViewPaper={handleViewPaper}
                      onAddToLibrary={handleAddToLibrary}
                      onDismiss={handleDismiss}
                      onScore={handleScorePaper}
                    />
                  ))}
                </div>
              )}
            </section>
          </SectionDropZone>

          {/* My Library Section */}
          <SectionDropZone 
            id="library-drop-zone"
            isEmpty={libraryPapers.length === 0}
            emptyMessage="Your library is empty. Drag a paper here, or press + to keep it."
            isManuallyOver={overDropZone === "library" && draggedFromSection === "incoming"}
          >
            <section className="h-full">
              <div className="mb-6 flex min-h-[44px] items-center">
                <h2 className="m-0 font-hand text-[40px] font-bold leading-none">
                  Library <span className="text-[26px] text-pencil">({libraryPapers.length})</span>
                </h2>
              </div>

              {libraryPapers.length === 0 ? null : (
                <SortableContext
                  items={libraryPapers.map((p) => p.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-[26px]">
                    {libraryPapers.map((paper) => (
                      <SortablePaperCard
                        key={paper.id}
                        paper={paper}
                        onViewPaper={handleViewPaper}
                        onAddToLibrary={handleAddToLibrary}
                        onDismiss={handleDismiss}
                        onRemoveFromLibrary={handleRemoveFromLibrary}
                      />
                    ))}
                  </div>
                </SortableContext>
              )}
            </section>
          </SectionDropZone>
        </div>
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {activePaper ? (
          <div className="rotate-1 opacity-80">
            <PaperListCard
              paper={activePaper}
              onViewPaper={handleViewPaper}
              isInLibrary={activePaper.inLibrary}
              onAddToLibrary={handleAddToLibrary}
              onDismiss={handleDismiss}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
