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

  // 他のプレイヤー
  return (
    <div className="space-y-4">
      {/* 出題者情報 */}
      <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
        <div
          className="w-5 h-5 rounded-full flex-shrink-0"
          style={{ backgroundColor: host.color }}
        />
        <span className="font-bold text-amber-800">
          {host.name} が出題者です
        </span>
      </div>

      {/* 待機アニメーション */}
      <div className="flex flex-col items-center justify-center py-10 text-gray-500 space-y-3">
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-3 h-3 bg-indigo-400 rounded-full animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
        <p className="font-medium text-gray-600">
          <span className="font-bold text-indigo-600">{host.name}</span>
          が考え中...
        </p>
        <p className="text-sm text-gray-400">
          1〜3位の順位を選んでいます
        </p>
      </div>
    </div>
  );
}
