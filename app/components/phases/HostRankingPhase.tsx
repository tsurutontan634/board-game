"use client";

import React from "react";
import type { RoomView, OptionKey } from "@/lib/types";
import { OPTION_KEYS } from "@/lib/types";
import { RankingSelector } from "../RankingSelector";

type Props = {
  room: RoomView;
  onSubmitRanking: (ranking: [OptionKey, OptionKey, OptionKey]) => void;
};

export function HostRankingPhase({ room, onSubmitRanking }: Props) {
  const host = room.players[room.hostIndex];
  const isHost = host?.id === room.myId;
  const topic = room.currentTopic;

  if (!topic) return null;

  if (isHost) {
    return (
      <div className="space-y-4">
        {/* 出題者バッジ */}
        <div className="flex items-center gap-2">
          <div
            className="w-5 h-5 rounded-full"
            style={{ backgroundColor: host.color }}
          />
          <span className="font-bold text-indigo-700">あなたが出題者です！</span>
        </div>

        {/* お題カード */}
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-2xl p-5 shadow-xl">
          <p className="text-xs font-medium opacity-80 mb-2">📋 お題</p>
          <p className="text-xl font-black">{topic.question}</p>
        </div>

        {/* 選択肢一覧 */}
        <div className="bg-gray-50 rounded-xl p-4 space-y-2">
          {OPTION_KEYS.map((key) => (
            <div key={key} className="flex gap-2 items-start text-sm">
              <span className="font-black text-indigo-600 w-5 flex-shrink-0">{key}</span>
              <span className="text-gray-700">{topic.options[key]}</span>
            </div>
          ))}
        </div>

        {/* ランキング選択 */}
        <div className="bg-white border border-indigo-100 rounded-xl p-4">
          <RankingSelector
            topic={topic}
            onSubmit={onSubmitRanking}
            label="あなたの価値観で1〜3位を選んでください (他の人には見えません)"
            submitLabel="✅ 順位を確定する"
          />
        </div>
      </div>
    );
  }

  // 他のプレイヤー: お題を表示しつつ待機
  return (
    <div className="space-y-4">
      {/* 出題者情報 + 考え中バッジ */}
      <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
        <div
          className="w-5 h-5 rounded-full flex-shrink-0 border-2 border-white shadow"
          style={{ backgroundColor: host.color }}
        />
        <span className="font-bold text-amber-800 flex-1">{host.name} が考え中...</span>
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 bg-amber-400 rounded-full animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>

      {/* お題カード (回答者にも見える) */}
      <div className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-2xl p-5 shadow-xl">
        <p className="text-xs font-medium opacity-80 mb-2">📋 お題</p>
        <p className="text-xl font-black">{topic.question}</p>
      </div>

      {/* 選択肢一覧 */}
      <div className="bg-gray-50 rounded-xl p-4 space-y-2">
        {OPTION_KEYS.map((key) => (
          <div key={key} className="flex gap-2 items-start text-sm">
            <span className="font-black text-indigo-600 w-5 flex-shrink-0">{key}</span>
            <span className="text-gray-700">{topic.options[key]}</span>
          </div>
        ))}
      </div>

      <p className="text-center text-sm text-gray-400">
        {host.name} が1〜3位を選んでいます。予想しておこう！
      </p>
    </div>
  );
}
