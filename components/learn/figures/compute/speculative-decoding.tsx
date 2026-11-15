"use client";

import { C, FONT } from "../kit";

/**
 * Speculative decoding (B9). Staged loop, 11 s.
 * 0.6–2.4 s: a small draft model proposes four tokens one at a time ("the cat sat in").
 * 3.2–4.6 s: the large target model runs ONE forward pass over all four positions.
 * 5.0 s: verdicts appear together: the first three match what the target would
 * produce, the fourth does not. 6.0 s: the target's own token ("on") replaces it.
 * 6.8 s: four tokens were produced for one pass of the target model.
 * Base layer (no animation): the final state.
 */

const CYCLE = 11;
const DRAFT = ["the", "cat", "sat", "in"];
const OK = [true, true, true, false];
const TX = 176;
const TP = 118;
const TW = 100;

const pct = (t: number) => ((t / CYCLE) * 100).toFixed(2);
const show = (name: string, t: number) =>
  `@keyframes ${name} { 0%, ${pct(t)}% { opacity: 0 } ${pct(t + 0.15)}%, 94% { opacity: 1 } 99%, 100% { opacity: 0 } }
.${name} { animation: ${name} ${CYCLE}s ease-out infinite; }`;

function keyframes() {
  const parts = DRAFT.map((_, i) => show(`sd-d${i}`, 0.6 + i * 0.6));
  parts.push(show("sd-v", 5.0), show("sd-fix", 6.0), show("sd-res", 6.8), show("sd-pass", 3.2));
  parts.push(`@keyframes sd-sweep { 0%, ${pct(3.2)}% { transform: scaleX(0.001); opacity: 1 } ${pct(4.6)}% { transform: scaleX(1); opacity: 1 } 94% { transform: scaleX(1); opacity: 1 } 99%, 100% { opacity: 0 } }
.sd-sweep { transform-box: fill-box; transform-origin: left center; animation: sd-sweep ${CYCLE}s linear infinite; }
@keyframes sd-strike { 0%, ${pct(6.0)}% { opacity: 1 } ${pct(6.15)}%, 94% { opacity: 0.35 } 99%, 100% { opacity: 1 } }
.sd-strike { animation: sd-strike ${CYCLE}s ease-out infinite; }`);
  return parts.join("\n");
}

export default function SpeculativeDecodingFigure() {
  const rowDraft = 44;
  const rowTarget = 118;
  const rowVerdict = 176;
  const rowResult = 250;
  return (
    <div>
      <style>{keyframes()}</style>
      <svg viewBox="0 0 680 300" role="img" aria-label="A small draft model proposes four tokens; the large model checks all four in one pass, accepts three and corrects the fourth, producing four tokens for one expensive pass" className="block h-auto w-full" style={{ fontFamily: FONT.sans }}>
        {/* Labels */}
        <text x={8} y={rowDraft + 20} fontSize={14} fontWeight={700} fill={C.ink}>
          Draft model
        </text>
        <text x={8} y={rowDraft + 38} fontSize={13} fill={C.muted}>
          small, one at a time
        </text>
        <text x={8} y={rowTarget + 16} fontSize={14} fontWeight={700} fill={C.ink}>
          Target model
        </text>
        <text x={8} y={rowTarget + 34} fontSize={13} fill={C.muted}>
          one pass, all four
        </text>
        <text x={8} y={rowResult + 20} fontSize={14} fontWeight={700} fill={C.ink}>
          Output
        </text>
        <text x={TX} y={24} fontSize={13} fill={C.muted}>
          prompt: “…and the dog lay by the fire, and”
        </text>

        {/* Draft tokens */}
        {DRAFT.map((w, i) => (
          <g key={w} className={`sd-d${i}`}>
            <rect x={TX + i * TP} y={rowDraft} width={TW} height={40} rx={6} fill={C.primaryWash} stroke={C.primarySoft} strokeWidth={1.5} />
            <text x={TX + i * TP + TW / 2} y={rowDraft + 26} textAnchor="middle" fontSize={17} fontFamily={FONT.mono} fill={C.ink} className={OK[i] ? undefined : "sd-strike"}>
              {w}
            </text>
          </g>
        ))}

        {/* Target pass */}
        <rect x={TX} y={rowTarget} width={3 * TP + TW} height={36} rx={8} fill={C.wash} stroke={C.line} />
        <rect x={TX} y={rowTarget} width={3 * TP + TW} height={36} rx={8} fill={C.active} opacity={0.85} className="sd-sweep" />
        <text x={TX + (3 * TP + TW) / 2} y={rowTarget + 23} textAnchor="middle" fontSize={14} fontWeight={700} fill="white" className="sd-pass">
          reads all the weights once, scores 4 positions
        </text>

        {/* Verdicts */}
        {OK.map((ok, i) => {
          const cx = TX + i * TP + TW / 2;
          return (
            <g key={i} className="sd-v">
              <circle cx={cx} cy={rowVerdict + 16} r={15} fill={ok ? C.good : C.warn} />
              {ok ? (
                <path d={`M ${cx - 7} ${rowVerdict + 16} l 5 5 l 9 -10`} fill="none" stroke="white" strokeWidth={3} />
              ) : (
                <path d={`M ${cx - 6} ${rowVerdict + 10} l 12 12 M ${cx + 6} ${rowVerdict + 10} l -12 12`} stroke="white" strokeWidth={3} />
              )}
            </g>
          );
        })}
        <g className="sd-fix">
          <text x={TX + 3 * TP + TW / 2} y={rowVerdict + 54} textAnchor="middle" fontSize={13} fill={C.warn}>
            target says “on”
          </text>
        </g>

        {/* Result */}
        <g className="sd-res">
          {["the", "cat", "sat", "on"].map((w, i) => (
            <g key={w}>
              <rect x={TX + i * TP} y={rowResult} width={TW} height={36} rx={6} fill={i < 3 ? C.good : C.primary} />
              <text x={TX + i * TP + TW / 2} y={rowResult + 24} textAnchor="middle" fontSize={17} fontWeight={700} fontFamily={FONT.mono} fill="white">
                {w}
              </text>
            </g>
          ))}
        </g>
      </svg>
      <p className="mt-1 text-xs leading-relaxed text-pencil">
        Four tokens for one pass of the large model. Plain decoding would have needed four passes, each streaming all the weights. Accepted tokens
        (green) are exactly what the target would have produced; the first rejected position is replaced by the target&apos;s own choice.
      </p>
    </div>
  );
}
