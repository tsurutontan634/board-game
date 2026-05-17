"use client";

import React from "react";
import type { Player } from "@/lib/types";
import { BOARD_SIZE } from "@/lib/types";

type Props = {
  players: Player[];
};

export function Board({ players }: Props) {
  const COLS = 10;
  const ROWS = Math.ceil(BOARD_SIZE / COLS);

  // マス番号ごとに乗っているプレイヤーを集計
  const playersByCell: Map<number, Player[]> = new Map();
  for (const player of players) {
    const pos = player.position; // 0 = START
    const existing = playersByCell.get(pos) ?? [];
    playersByCell.set(pos, [...existing, player]);
  }

  // セルのインデックス→表示番号のマッピング
  const cells: { displayNum: number; cellIndex: number }[] = [];
  // START (index=0) を含む50マスを生成
  for (let i = 0; i < BOARD_SIZE; i++) {
    cells.push({ displayNum: i === 0 ? 0 : i, cellIndex: i });
  }

  return (
    <div className="w-full overflow-x-auto">
      <div
        className="grid gap-0.5"
        style={{
          gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))`,
          minWidth: "320px",
        }}
      >
        {/* 全マスを描画 */}
        {Array.from({ length: ROWS * COLS }, (_, linearIdx) => {
          // 蛇行パターンから実際のセルインデックスを逆算
          const row = Math.floor(linearIdx / COLS);
          const colInRow = linearIdx % COLS;
          const actualCol = row % 2 === 0 ? colInRow : COLS - 1 - colInRow;
          const cellIndex = row * COLS + actualCol;

          if (cellIndex >= BOARD_SIZE) {
            // 端数マス (空白)
            return <div key={linearIdx} />;
          }

          const playersOnCell = playersByCell.get(cellIndex) ?? [];
          const isStart = cellIndex === 0;

          return (
            <div
              key={linearIdx}
              className={`
                relative aspect-square flex flex-col items-center justify-center
                border border-gray-300 rounded text-xs
                ${isStart ? "bg-yellow-100" : cellIndex % 10 === 0 ? "bg-blue-50" : "bg-white"}
              `}
            >
              {/* マス番号 */}
              <span className="text-gray-400 text-[9px] leading-none">
                {isStart ? "S" : cellIndex}
              </span>

              {/* コマ表示 */}
              {playersOnCell.length > 0 && (
                <div className="flex flex-wrap justify-center gap-0.5 mt-0.5">
                  {playersOnCell.map((p) => (
                    <div
                      key={p.id}
                      className="w-3 h-3 rounded-full border border-white shadow-sm"
                      style={{ backgroundColor: p.color }}
                      title={p.name}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 凡例 */}
      <div className="mt-2 flex flex-wrap gap-2">
        {players.map((p) => (
          <div key={p.id} className="flex items-center gap-1 text-xs text-gray-600">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: p.color }}
            />
            <span>{p.name}</span>
            <span className="text-gray-400">({p.position}/{BOARD_SIZE})</span>
          </div>
        ))}
      </div>
    </div>
  );
}
