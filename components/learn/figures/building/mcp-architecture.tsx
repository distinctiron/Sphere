"use client";

import { C, FONT } from "../kit";
import { appear, flash } from "./anim";

/**
 * The Model Context Protocol (C7). Staged loop, 12 s.
 * A host application (the harness) runs one MCP client per server. On connect
 * each client asks its server what it offers; the tool definitions are added to
 * the model's context. Later the model emits an ordinary tool call; the harness
 * routes it through the right client to the server, and the result returns as
 * an ordinary tool result.
 */

const CYCLE = 12;
const SERVERS = [
  { name: "Issue tracker", tool: "create_issue", y: 58 },
  { name: "Database", tool: "run_query", y: 158 },
  { name: "Docs search", tool: "search_docs", y: 258 },
];
const T_LIST = 0.4;
const T_TOOLS = 2.2;
const T_CALL = 5.0;
const T_ROUTE = 6.0;
const T_RESULT = 7.6;
const T_BACK = 8.6;

export default function McpArchitectureFigure() {
  const css = [
    `${flash("mcp-list", CYCLE, T_LIST, 1.8)} .mcp-list { opacity: 0; animation: mcp-list ${CYCLE}s linear infinite }`,
    ...SERVERS.map((_, i) => `${appear(`mcp-t${i}`, CYCLE, T_TOOLS + i * 0.3)} .mcp-t${i} { animation: mcp-t${i} ${CYCLE}s linear infinite }`),
    `${appear("mcp-call", CYCLE, T_CALL)} .mcp-call { animation: mcp-call ${CYCLE}s linear infinite }`,
    `${flash("mcp-route", CYCLE, T_ROUTE, 1.6)} .mcp-route { opacity: 0; animation: mcp-route ${CYCLE}s linear infinite }`,
    `${flash("mcp-res", CYCLE, T_RESULT, 1.3)} .mcp-res { opacity: 0; animation: mcp-res ${CYCLE}s linear infinite }`,
    `${appear("mcp-back", CYCLE, T_BACK)} .mcp-back { animation: mcp-back ${CYCLE}s linear infinite }`,
  ].join("\n");

  const clientX = 300;
  const serverX = 460;

  return (
    <div>
      <style>{css}</style>
      <svg viewBox="0 0 680 350" role="img" aria-label="A host application with a model and three MCP clients, each connected to an MCP server. The servers' tools are listed into the model's context; a tool call from the model is routed through a client to the database server and the result comes back." className="block h-auto w-full" style={{ fontFamily: FONT.sans }}>
        {/* Host */}
        <rect x={8} y={30} width={362} height={306} rx={12} fill={C.wash} stroke={C.ink} strokeWidth={1.5} />
        <text x={22} y={22} fontSize={13} fontWeight={700} fill={C.ink} letterSpacing="0.06em">
          HOST · the harness (IDE, chat app, agent)
        </text>
        {/* Model context */}
        <rect x={22} y={46} width={216} height={276} rx={8} fill="white" stroke={C.primary} strokeWidth={1.5} />
        <text x={130} y={68} textAnchor="middle" fontSize={14} fontWeight={700} fill={C.primary}>
          Model context
        </text>
        <text x={34} y={96} fontSize={13} fill={C.muted}>
          tools available:
        </text>
        {SERVERS.map((s, i) => (
          <g key={s.tool} className={`mcp-t${i}`}>
            <rect x={34} y={106 + i * 30} width={192} height={24} rx={4} fill={C.primaryWash} />
            <text x={42} y={123 + i * 30} fontSize={13} fill={C.primary} fontFamily={FONT.mono}>
              {s.tool}
            </text>
          </g>
        ))}
        <g className="mcp-call">
          <rect x={34} y={212} width={192} height={24} rx={4} fill={C.active} />
          <text x={42} y={229} fontSize={13} fill="white" fontFamily={FONT.mono}>
            call run_query(…)
          </text>
        </g>
        <g className="mcp-back">
          <rect x={34} y={244} width={192} height={24} rx={4} fill={C.goodSoft} />
          <text x={42} y={261} fontSize={13} fill={C.ink} fontFamily={FONT.mono}>
            result: 42 rows
          </text>
        </g>

        {SERVERS.map((s, i) => {
          const cy = s.y + 40;
          const isDb = i === 1;
          return (
            <g key={s.name}>
              {/* client */}
              <rect x={clientX - 44} y={cy - 18} width={88} height={36} rx={6} fill="white" stroke={C.ink} />
              <text x={clientX} y={cy + 5} textAnchor="middle" fontSize={13} fill={C.ink} fontWeight={600}>
                client
              </text>
              <line x1={238} y1={cy} x2={clientX - 44} y2={cy} stroke={C.line} strokeWidth={1.5} />
              {/* protocol link */}
              <line x1={clientX + 44} y1={cy} x2={serverX} y2={cy} stroke={C.line} strokeWidth={2} strokeDasharray="5 4" />
              <line x1={clientX + 44} y1={cy} x2={serverX} y2={cy} stroke={C.primary} strokeWidth={3} className="mcp-list" />
              {isDb && (
                <>
                  <line x1={238} y1={cy} x2={serverX} y2={cy} stroke={C.active} strokeWidth={3.5} className="mcp-route" />
                  <line x1={238} y1={cy} x2={serverX} y2={cy} stroke={C.good} strokeWidth={3.5} className="mcp-res" />
                </>
              )}
              {/* server */}
              <rect x={serverX} y={s.y} width={210} height={80} rx={8} fill="white" stroke={C.good} strokeWidth={1.5} />
              <text x={serverX + 12} y={s.y + 24} fontSize={14} fontWeight={700} fill={C.good}>
                {s.name} server
              </text>
              <text x={serverX + 12} y={s.y + 46} fontSize={13} fill={C.text}>
                tools · resources · prompts
              </text>
              <text x={serverX + 12} y={s.y + 66} fontSize={13} fill={C.muted}>
                {i === 0 ? "remote, over HTTP" : i === 1 ? "local process" : "remote, over HTTP"}
              </text>
            </g>
          );
        })}
        <text x={(clientX + 44 + serverX) / 2} y={44} textAnchor="middle" fontSize={13} fill={C.muted}>
          MCP
        </text>
      </svg>
    </div>
  );
}
