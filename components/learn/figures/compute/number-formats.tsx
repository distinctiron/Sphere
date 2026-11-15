"use client";

import { C, FONT } from "../kit";

/**
 * Static diagram (B4): floating-point formats used in AI, drawn bit by bit
 * (sign, exponent, mantissa), with the memory a 70-billion-parameter model's
 * weights need in each: 70e9 × bits / 8. FP4 (E2M1) is used with a shared scale
 * per block of 16–32 values, adding roughly 0.25–0.5 bits per value (not drawn).
 * Formats: FP32 1-8-23, BF16 1-8-7, FP16 1-5-10, FP8 E4M3 1-4-3, FP4 E2M1 1-2-1.
 */

const FORMATS = [
  { name: "FP32", bits: [1, 8, 23], gb: "280 GB" },
  { name: "BF16", bits: [1, 8, 7], gb: "140 GB" },
  { name: "FP16", bits: [1, 5, 10], gb: "140 GB" },
  { name: "FP8", bits: [1, 4, 3], gb: "70 GB" },
  { name: "FP4", bits: [1, 2, 1], gb: "35 GB*" },
];

const BX = 76;
const BW = 14.5;
const ROW = 46;
const Y0 = 44;
const COLORS = [C.muted, C.primary, C.good];

export default function NumberFormatsFigure() {
  return (
    <div>
      <svg
        viewBox={`0 0 680 ${Y0 + FORMATS.length * ROW + 6}`}
        role="img"
        aria-label="Bit layouts of FP32, BF16, FP16, FP8 and FP4, and the memory a 70-billion-parameter model needs in each: 280, 140, 140, 70 and about 35 gigabytes"
        className="block h-auto w-full"
        style={{ fontFamily: FONT.sans }}
      >
        <text x={BX} y={22} fontSize={13} fill={C.muted}>
          one number, bit by bit
        </text>
        <text x={672} y={22} textAnchor="end" fontSize={13} fill={C.muted}>
          70B weights
        </text>
        {FORMATS.map((f, i) => {
          const y = Y0 + i * ROW;
          let x = BX;
          const total = f.bits.reduce((a, b) => a + b, 0);
          return (
            <g key={f.name}>
              <text x={8} y={y + 19} fontSize={15} fontWeight={700} fill={C.ink}>
                {f.name}
              </text>
              {f.bits.map((n, part) =>
                Array.from({ length: n }, (_, k) => {
                  const el = <rect key={`${part}-${k}`} x={x} y={y + 2} width={BW - 2} height={24} rx={2} fill={COLORS[part]} opacity={part === 0 ? 0.7 : 0.9} />;
                  x += BW;
                  return el;
                })
              )}
              <text x={BX + total * BW + 8} y={y + 19} fontSize={13} fill={C.muted} fontFamily={FONT.mono}>
                {total} bits
              </text>
              <text x={672} y={y + 19} textAnchor="end" fontSize={15} fontWeight={700} fill={C.ink} fontFamily={FONT.mono}>
                {f.gb}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
        <span className="text-pencil">■ sign</span>
        <span className="text-[#2b6ec4]">■ exponent: range (how large or small)</span>
        <span className="text-emerald-700">■ mantissa: precision (how many steps)</span>
      </div>
      <p className="mt-1 text-xs leading-relaxed text-pencil">
        BF16 keeps FP32&apos;s 8 exponent bits, so it covers the same range with less precision. FP4 can represent only 15 distinct values
        (0, ±0.5, ±1, ±1.5, ±2, ±3, ±4, ±6), so it is used with a shared scale factor per small block of numbers. *That scale adds roughly
        0.25–0.5 bits per value, about 2–4 GB here.
      </p>
    </div>
  );
}
