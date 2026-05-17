"use client";

import React from "react";
import type { RoomView } from "@/lib/types";
import { OPTION_KEYS } from "@/lib/types";

type Props = {
  room: RoomView;
  onRevealNext: () => void;
};

export function RevealingPhase({ room, onRevealNext }: Props) {
  const host = room.players[room.hostIndex];
  const topic = room.currentTopic;

  if (!topic || !host) return null;

  const { revealOrder, revealedCount, guesses, players, hostRanking } = room;

  // revealedCount は「回答者の公開数」
  // 全回答者を公開し終えた後、さらに +1 で「出題者の正解」を公開する
  const allGuessesRevealed = revealedCount >= revealOrder.length;
  const hostAnswerRevealed = revealedCount > revealOrder.length; // サーバーは >length で ROUND_RESULT へ遷移
  const showHostReveal     = allGuessesRevealed && !hostAnswerRevealed;

  // (nextRevealId / nextPlayer はリスト内インライン判定で使うため不要)

  return (
    <div className="space-y-4">
      {/* お題確認 */}
      <div className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-2xl p-4 shadow-xl">
        <p className="text-xs opacity-80 mb-1">📋 お題</p>
        <p className="text-lg font-black">{topic.question}</p>
      </div>

      {/* ---- 出題者の正解カード (全回答者公開後) ---- */}
      <div>
        <h3 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-1">
          <span
            className="w-4 h-4 rounded-full inline-block border-2 border-white shadow flex-shrink-0"
            style={{ backgroundColor: host.color }}
          />
          {host.name} の正解
        </h3>

        {hostAnswerRevealed && hostRanking ? (
          /* 正解を公開済み */
          <div className="bg-gradient-to-br from-yellow-400 to-orange-500 text-white rounded-2xl p-4 shadow-lg">
            <div className="flex justify-around">
              {hostRanking.map((key, i) => (
                <div key={i} className="text-center">
                  <div className="text-xs opacity-80 mb-1">{i + 1}位</div>
                  <div className="text-3xl font-black">{key}</div>
                  <div className="text-xs opacity-90 mt-1 max-w-[72px] leading-tight break-words">
                    {topic.options[key]}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : showHostReveal ? (
          /* 全回答者公開済み → 正解をめくれる状態 */
          <div
            className="bg-gradient-to-br from-yellow-300 to-orange-400 rounded-2xl p-6 text-center cursor-pointer hover:from-yellow-400 hover:to-orange-500 transition-all shadow-lg active:scale-95"
            onClick={onRevealNext}
          >
            <p className="text-4xl mb-2">🎯</p>
            <p className="font-black text-white text-lg">正解をめくる！</p>
            <p className="text-sm text-yellow-100 mt-1">タップして出題者の答えを確認</p>
          </div>
        ) : (
          /* まだ回答者を公開中 → 伏せたまま */
          <div className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-2xl p-5 text-center">
            <p className="text-3xl mb-1">🔒</p>
            <p className="text-sm text-gray-400 font-medium">全員の予想公開後にめくれます</p>
          </div>
        )}
      </div>

      {/* ---- 回答者の予想リスト ---- */}
      <div>
        <h3 className="text-sm font-bold text-gray-700 mb-2">
          みんなの予想
          <span className="ml-2 text-xs font-normal text-gray-400">
            {revealedCount} / {revealOrder.length} 人公開済み
          </span>
        </h3>

        <div className="space-y-2">
          {revealOrder.map((pid, idx) => {
            const player  = players.find((p) => p.id === pid);
            const guess   = guesses[pid];
            const revealed = idx < revealedCount;
            if (!player) return null;

            return (
              <div
                key={pid}
                className={`rounded-xl border transition-all ${
                  revealed
                    ? "bg-white border-gray-200 shadow-sm"
                    : "bg-gray-50 border-gray-100"
                }`}
              >
                {revealed ? (
                  /* 公開済み */
                  <div className="p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <div
                        className="w-4 h-4 rounded-full flex-shrink-0"
                        style={{ backgroundColor: player.color }}
                      />
                      <span className="font-bold text-sm text-gray-800">{player.name}</span>
                      {pid === room.myId && (
                        <span className="text-xs text-blue-600 font-medium">(あなた)</span>
                      )}
                    </div>
                    {guess && (
                      <div className="flex flex-wrap gap-2">
                        {guess.map((key, i) => (
                          <div
                            key={i}
                            className="flex items-center gap-1 bg-indigo-50 rounded-lg px-2 py-1 text-xs"
                          >
                            <span className="text-gray-400">{i + 1}位:</span>
                            <span className="font-black text-indigo-700">{key}</span>
                            <span className="text-gray-600">{topic.options[key]}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : idx === revealedCount ? (
                  /* 次にめくるカード */
                  <div
                    className="p-4 flex items-center gap-3 cursor-pointer hover:bg-amber-50 hover:border-amber-300 rounded-xl transition-colors"
                    onClick={onRevealNext}
                  >
                    <div
                      className="w-8 h-8 rounded-full flex-shrink-0 border-2 border-white shadow"
                      style={{ backgroundColor: player.color }}
                    />
                    <div className="flex-1">
                      <span className="font-bold text-sm text-gray-700">{player.name}</span>
                      {pid === room.myId && (
                        <span className="text-xs text-blue-600 ml-1">(あなた)</span>
                      )}
                      <p className="text-xs text-gray-400 mt-0.5">タップでめくる ❓</p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); onRevealNext(); }}
                      className="bg-amber-400 hover:bg-amber-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
                    >
                      めくる
                    </button>
                  </div>
                ) : (
                  /* まだ順番待ち */
                  <div className="p-3 flex items-center gap-3 opacity-50">
                    <div
                      className="w-7 h-7 rounded-full flex-shrink-0"
                      style={{ backgroundColor: player.color }}
                    />
                    <span className="text-sm text-gray-500">{player.name}</span>
                    <span className="ml-auto text-xs text-gray-300">待機中</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 選択肢一覧（照らし合わせ用） */}
      <details className="bg-gray-50 rounded-xl border border-gray-200">
        <summary className="px-4 py-3 text-sm font-medium text-gray-600 cursor-pointer select-none list-none flex items-center justify-between">
          <span>📖 選択肢を確認する</span>
          <span className="text-gray-400">▾</span>
        </summary>
        <div className="px-4 pb-3 space-y-1.5 border-t border-gray-100 pt-3">
          {OPTION_KEYS.filter((k) => topic.options[k]?.trim()).map((key) => (
            <div key={key} className="flex gap-2 items-start text-sm">
              <span className="font-black text-indigo-600 w-5 flex-shrink-0">{key}</span>
              <span className="text-gray-700">{topic.options[key]}</span>
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}
