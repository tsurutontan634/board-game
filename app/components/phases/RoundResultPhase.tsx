"use client";

import React from "react";
import type { RoomView } from "@/lib/types";
import { ScoreResult } from "../ScoreResult";

type Props = {
  room: RoomView;
  onNextRound: () => void;
};

export function RoundResultPhase({ room, onNextRound }: Props) {
  const host = room.players[room.hostIndex];
  const topic = room.currentTopic;
  const results = room.lastResults;
  const isLastRound = room.round >= room.maxRounds;

  if (!topic || !host) return null;

  return (
    <div className="space-y-4">
      {/* 正解発表 */}
      <div className="bg-gradient-to-br from-yellow-400 to-orange-500 text-white rounded-2xl p-5 shadow-xl text-center">
        <p className="text-sm font-medium opacity-90 mb-1">🎯 出題者の正解</p>
        <p className="text-lg font-bold mb-3">{topic.question}</p>
        <div className="flex justify-center gap-4">
          {room.hostRanking
            ? room.hostRanking.map((key, i) => (
                <div key={i} className="text-center">
                  <div className="text-xs opacity-80">{i + 1}位</div>
                  <div className="text-2xl font-black">{key}</div>
                  <div className="text-xs opacity-90 max-w-[70px] break-words">
                    {topic.options[key]}
                  </div>
                </div>
              ))
            : (
              <div className="text-sm opacity-80">正解を取得中...</div>
            )}
        </div>
      </div>

      {/* 各プレイヤーの結果 */}
      <div>
        <h3 className="text-sm font-bold text-gray-700 mb-2">今ラウンドの結果</h3>
        <div className="space-y-2">
          {room.revealOrder.map((pid) => {
            const player = room.players.find((p) => p.id === pid);
            const result = results?.[pid];
            const guess = room.guesses[pid];
            if (!player) return null;

            return (
              <div
                key={pid}
                className="bg-white border border-gray-200 rounded-xl p-3 flex items-center gap-3 shadow-sm"
              >
                {/* アバター */}
                <div
                  className="w-8 h-8 rounded-full flex-shrink-0 border-2 border-white shadow"
                  style={{ backgroundColor: player.color }}
                />

                {/* 名前 */}
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm text-gray-800">
                    {player.name}
                    {pid === room.myId && (
                      <span className="text-xs text-blue-600 ml-1">(あなた)</span>
                    )}
                  </div>
                  {/* 予想 */}
                  {guess && (
                    <div className="text-xs text-gray-500 mt-0.5">
                      予想: {guess.map((k, i) => `${i+1}位→${k}`).join(" / ")}
                    </div>
                  )}
                </div>

                {/* 得点結果 */}
                {result ? (
                  <ScoreResult role={result.role} score={result.score} />
                ) : (
                  <div className="text-xs text-gray-400">-</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 現在のスコアランキング */}
      <div>
        <h3 className="text-sm font-bold text-gray-700 mb-2">現在のスコア</h3>
        <div className="space-y-1.5">
          {[...room.players]
            .sort((a, b) => b.score - a.score)
            .map((p, rank) => (
              <div
                key={p.id}
                className={`
                  flex items-center gap-2 rounded-lg px-3 py-2 text-sm
                  ${rank === 0 ? "bg-yellow-50 border border-yellow-200" : "bg-gray-50"}
                `}
              >
                <span className="w-5 text-center font-bold text-gray-500">
                  {rank === 0 ? "🥇" : rank === 1 ? "🥈" : rank === 2 ? "🥉" : `${rank + 1}`}
                </span>
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: p.color }}
                />
                <span className="flex-1 font-medium text-gray-800">{p.name}</span>
                <span className="font-black text-indigo-600">{p.score}点</span>
                <span className="text-xs text-gray-400">
                  マス{p.position}
                </span>
              </div>
            ))}
        </div>
      </div>

      {/* 次へボタン */}
      <button
        onClick={onNextRound}
        className="w-full py-4 rounded-xl font-black text-lg bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95 transition-all shadow-lg"
      >
        {isLastRound ? "🏆 結果を見る" : "➡ 次のラウンドへ"}
      </button>
    </div>
  );
}
