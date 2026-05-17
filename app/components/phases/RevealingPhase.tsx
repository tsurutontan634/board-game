"use client";

import React from "react";
import type { RoomView } from "@/lib/types";

type Props = {
  room: RoomView;
  onRevealNext: () => void;
};

export function RevealingPhase({ room, onRevealNext }: Props) {
  const host = room.players[room.hostIndex];
  const topic = room.currentTopic;

  if (!topic || !host) return null;

  const { revealOrder, revealedCount, guesses, players } = room;

  // 現在公開待ちのプレイヤーID
  const nextRevealId = revealOrder[revealedCount] ?? null;
  const nextPlayer = nextRevealId
    ? players.find((p) => p.id === nextRevealId)
    : null;

  const allRevealed = revealedCount >= revealOrder.length;

  return (
    <div className="space-y-4">
      {/* お題確認 */}
      <div className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-2xl p-4 shadow-xl">
        <p className="text-xs opacity-80 mb-1">📋 お題</p>
        <p className="text-lg font-black">{topic.question}</p>
      </div>

      {/* 公開済みの予想 */}
      <div className="space-y-2">
        <h3 className="text-sm font-bold text-gray-700">公開済みの予想</h3>
        {revealOrder.slice(0, revealedCount).map((pid) => {
          const player = players.find((p) => p.id === pid);
          const guess = guesses[pid];
          if (!player || !guess) return null;

          return (
            <div
              key={pid}
              className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm"
            >
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: player.color }}
                />
                <span className="font-bold text-sm text-gray-800">{player.name}</span>
                {pid === room.myId && (
                  <span className="text-xs text-blue-600 font-medium">(あなた)</span>
                )}
              </div>
              <div className="flex gap-3">
                {guess.map((key, i) => (
                  <div key={i} className="text-sm">
                    <span className="text-gray-400 text-xs">{i + 1}位: </span>
                    <span className="font-bold text-indigo-700">{key}</span>
                    <span className="text-gray-600 text-xs ml-1">
                      {topic.options[key]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* 次に公開するプレイヤー */}
      {!allRevealed && nextPlayer && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
          <p className="text-sm text-amber-700 font-medium mb-1">次の公開</p>
          <div className="flex items-center justify-center gap-2 mb-3">
            <div
              className="w-6 h-6 rounded-full"
              style={{ backgroundColor: nextPlayer.color }}
            />
            <span className="font-black text-lg text-amber-900">{nextPlayer.name}</span>
            {nextPlayer.id === room.myId && (
              <span className="text-sm text-blue-600">(あなた)</span>
            )}
          </div>
          {/* カード (まだめくっていない) */}
          <div className="bg-amber-200 rounded-xl p-6 mb-3 cursor-pointer hover:bg-amber-300 transition-colors"
            onClick={onRevealNext}
          >
            <p className="text-4xl">❓</p>
            <p className="text-sm text-amber-700 mt-2">クリックでめくる</p>
          </div>
          <button
            onClick={onRevealNext}
            className="w-full bg-amber-500 text-white font-bold py-3 rounded-xl hover:bg-amber-600 active:scale-95 transition-all shadow-md"
          >
            🔍 予想をめくる
          </button>
        </div>
      )}

      {/* 全員公開済み */}
      {allRevealed && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
          <p className="text-2xl mb-2">✅</p>
          <p className="font-bold text-green-800">全員の予想を公開しました！</p>
          <p className="text-sm text-green-600 mt-1">
            得点を計算して結果を確認してください
          </p>
          <p className="text-xs text-gray-400 mt-2">
            結果は自動で表示されます...
          </p>
        </div>
      )}

      {/* 未公開プレイヤーのリスト */}
      {revealOrder.length > revealedCount + 1 && (
        <div>
          <h3 className="text-xs font-medium text-gray-400 mb-1">残りの公開待ち</h3>
          <div className="flex flex-wrap gap-2">
            {revealOrder.slice(revealedCount + 1).map((pid) => {
              const p = players.find((pl) => pl.id === pid);
              if (!p) return null;
              return (
                <div key={pid} className="flex items-center gap-1 text-xs text-gray-500">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: p.color }}
                  />
                  <span>{p.name}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
