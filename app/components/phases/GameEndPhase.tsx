"use client";

import React from "react";
import type { RoomView } from "@/lib/types";

type Props = {
  room: RoomView;
};

export function GameEndPhase({ room }: Props) {
  const sorted = [...room.players].sort((a, b) => b.score - a.score);
  const winner = sorted[0];
  const isWinner = winner?.id === room.myId;

  const RANK_ICONS = ["🥇", "🥈", "🥉"];

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="text-center space-y-2">
        <div className="text-6xl">{isWinner ? "🎉" : "🏁"}</div>
        <h2 className="text-2xl font-black text-gray-800">ゲーム終了！</h2>
        {winner && (
          <p className="text-lg text-yellow-600 font-bold">
            🏆 優勝: {winner.name}
          </p>
        )}
        {isWinner && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3">
            <p className="font-bold text-yellow-700">おめでとう！あなたが優勝です！🎊</p>
          </div>
        )}
      </div>

      {/* 最終ランキング */}
      <div>
        <h3 className="text-sm font-bold text-gray-700 mb-3">最終ランキング</h3>
        <div className="space-y-2">
          {sorted.map((p, rank) => (
            <div
              key={p.id}
              className={`
                flex items-center gap-3 rounded-xl px-4 py-3
                ${rank === 0
                  ? "bg-gradient-to-r from-yellow-100 to-orange-100 border border-yellow-300"
                  : rank === 1
                  ? "bg-gray-100 border border-gray-200"
                  : rank === 2
                  ? "bg-orange-50 border border-orange-200"
                  : "bg-white border border-gray-100"
                }
              `}
            >
              <span className="text-2xl w-8 text-center">
                {RANK_ICONS[rank] ?? `${rank + 1}`}
              </span>
              <div
                className="w-8 h-8 rounded-full border-2 border-white shadow"
                style={{ backgroundColor: p.color }}
              />
              <span className="flex-1 font-bold text-gray-800">
                {p.name}
                {p.id === room.myId && (
                  <span className="text-xs text-blue-600 ml-1">(あなた)</span>
                )}
              </span>
              <div className="text-right">
                <div className="font-black text-xl text-indigo-700">{p.score}点</div>
                <div className="text-xs text-gray-400">
                  マス {p.position}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* もう一度遊ぶ */}
      <button
        onClick={() => window.location.reload()}
        className="w-full py-4 rounded-xl font-black text-lg bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95 transition-all shadow-lg"
      >
        🔄 もう一度遊ぶ
      </button>
    </div>
  );
}
