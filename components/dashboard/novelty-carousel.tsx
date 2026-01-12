"use client";

import { useState, useEffect } from "react";

interface Paper {
  id: string;
  title: string;
  authors: Array<{ name: string }>;
  abstract?: string;
  noveltyScore: number | null;
  noveltySummary: string | null;
  categories?: string[];
  publicationDate?: Date | string;
}

interface NoveltyCarouselProps {
  papers: Paper[];
  onViewPaper?: (paperId: string) => void;
}

export function NoveltyCarousel({ papers, onViewPaper }: NoveltyCarouselProps) {
  const [state, setState] = useState(0);
  
  // Get first 5 papers (A, B, C, D, E)
  const displayPapers = papers.slice(0, 5);
  
  // Widths: [processed, focused, pending] = [1, 4, 2]
  const widthValues = ['10vw', '40vw', '20vw'];
  const height = '40vh';
  const gap = '1.5vw';

  // Auto-transition: state 0 -> state 1 after 4s, then cycle 1-5 every 4s
  useEffect(() => {
    if (state === 0) {
      const timer = setTimeout(() => setState(1), 4000);
      return () => clearTimeout(timer);
    } else {
      const timer = setTimeout(() => {
        setState((prev) => (prev >= 5 ? 1 : prev + 1));
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [state]);

  // State configuration: maps position (1-5) to {cardIndex, role}
  const getStateConfig = () => {
    const configs: Record<number, Array<{ cardIndex: number; role: 'focused' | 'pending' | 'processed' | 'out-of-sight' }>> = {
      0: [
        { cardIndex: 0, role: 'focused' },    // A at position 1
        { cardIndex: 1, role: 'pending' },    // B at position 2
        { cardIndex: 2, role: 'processed' },  // C at position 3
        { cardIndex: 3, role: 'out-of-sight' }, // D at position 4
        { cardIndex: 4, role: 'out-of-sight' }, // E at position 5
      ],
      1: [
        { cardIndex: 0, role: 'processed' },   // A at position 1
        { cardIndex: 1, role: 'focused' },    // B at position 2
        { cardIndex: 2, role: 'pending' },     // C at position 3
        { cardIndex: 3, role: 'out-of-sight' }, // D at position 4
        { cardIndex: 4, role: 'out-of-sight' }, // E at position 5
      ],
      2: [
        { cardIndex: 1, role: 'processed' },   // B at position 1
        { cardIndex: 2, role: 'focused' },     // C at position 2
        { cardIndex: 3, role: 'pending' },      // D at position 3
        { cardIndex: 4, role: 'out-of-sight' }, // E at position 1 (but A is at 5)
        { cardIndex: 0, role: 'out-of-sight' }, // A at position 5
      ],
      3: [
        { cardIndex: 2, role: 'processed' },   // C at position 1
        { cardIndex: 3, role: 'focused' },     // D at position 2
        { cardIndex: 4, role: 'pending' },      // E at position 3
        { cardIndex: 0, role: 'out-of-sight' }, // A at position 4
        { cardIndex: 1, role: 'out-of-sight' }, // B at position 5
      ],
      4: [
        { cardIndex: 3, role: 'processed' },   // D at position 1
        { cardIndex: 4, role: 'focused' },     // E at position 2
        { cardIndex: 0, role: 'pending' },     // A at position 3
        { cardIndex: 1, role: 'out-of-sight' }, // B at position 4
        { cardIndex: 2, role: 'out-of-sight' }, // C at position 5
      ],
      5: [
        { cardIndex: 4, role: 'processed' },    // E at position 1
        { cardIndex: 0, role: 'focused' },     // A at position 2
        { cardIndex: 1, role: 'pending' },     // B at position 3
        { cardIndex: 2, role: 'out-of-sight' }, // C at position 4
        { cardIndex: 3, role: 'out-of-sight' }, // D at position 5
      ],
    };
    return configs[state] || configs[0];
  };

  // Get card info for a specific card index
  const getCardInfo = (cardIndex: number) => {
    const config = getStateConfig();
    const positionInfo = config.find(p => p.cardIndex === cardIndex);
    if (!positionInfo) {
      return { position: 6, role: 'out-of-sight' as const };
    }
    const position = config.indexOf(positionInfo) + 1;
    return { position, role: positionInfo.role };
  };

  // Calculate width based on role
  const getWidth = (cardIndex: number) => {
    const { role } = getCardInfo(cardIndex);
    if (role === 'out-of-sight') return '0px';
    if (state === 0) {
      // State 0: (4,2,1)
      if (role === 'focused') return widthValues[1]; // 40vw
      if (role === 'pending') return widthValues[2]; // 20vw
      return widthValues[0]; // 10vw
    }
    // States 1-5: (1,4,2)
    if (role === 'focused') return widthValues[1]; // 40vw
    if (role === 'pending') return widthValues[2]; // 20vw
    return widthValues[0]; // 10vw
  };

  // Calculate CSS order to position cards correctly
  const getOrder = (cardIndex: number) => {
    const { position } = getCardInfo(cardIndex);
    return position;
  };

  return (
    <div className="relative overflow-visible py-8">
      <div
        className="flex gap-6 transition-transform duration-1000 ease-out"
        style={{
          gap: gap,
        }}
      >
        {displayPapers.map((paper, index) => {
          const { role } = getCardInfo(index);
          const isFocused = role === 'focused';
          const isPending = role === 'pending';
          const isProcessed = role === 'processed';
          const isOutOfSight = role === 'out-of-sight';

          return (
            <div
              key={paper.id}
              className={`rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-700 text-white transition-all duration-1000 flex-shrink-0 pl-4 pt-8 pr-4`}
              style={{
                width: getWidth(index),
                height: height,
                opacity: isOutOfSight ? 0 : isProcessed  ? 0.4 : isPending ? 0.7 : 1,
                order: getOrder(index),
              }}
            >
              <div className="flex justify-between items-start mb-6"
              style={{
                opacity: isOutOfSight ? 0 : 1,
              }}>
                <span className="bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full text-sm font-semibold">
                  {paper.noveltyScore !== null
                    ? `Novelty: ${paper.noveltyScore.toFixed(1)}`
                    : "Novelty: —"}
                </span>
              </div>
              <h3 
                className={`font-bold text-2xl mb-3 leading-tight transition-opacity duration-200 ${isFocused ? 'delay-500' : '' }`}
                style={{
                  opacity: isProcessed || isOutOfSight ? 0 : isPending ? 0.3 : 1,
                }}
              >
                {paper.title}
              </h3>
              <div 
                className={`pt-4 border-t border-white/20 transition-opacity duration-500 ${isFocused ? 'delay-700' : '' }`}
                style={{
                  opacity: isFocused ? 1 : 0,
                }}
              >
                <p className="text-xs text-indigo-200 font-medium mb-2">Why Novel?</p>
                <p className="text-sm text-white/90 leading-relaxed">
                  {paper.noveltySummary || "This paper presents innovative approaches that advance the current state of research in its field, offering novel methodologies and insights that could significantly impact future developments."}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
