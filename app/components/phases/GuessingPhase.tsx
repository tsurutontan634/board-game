"use client";

import React from "react";
import type { RoomView, OptionKey } from "@/lib/types";
import { OPTION_KEYS } from "@/lib/types";
import { RankingSelector } from "../RankingSelector";

type Props = {
  room: RoomView;
  onSubmitGuess: (guess: [OptionKey, OptionKey, OptionKey]) => void;
};

export function GuessingPhase({ room, onSubmitGuess }: Props) {
  const host = room.players[room.hostIndex];
  const isHost = host?.id === room.myId;
  const topic = room.currentTopic;

  if (!topic) return null;

  // 自分の提出状況
  const mySubmitted = Boolean(room.guesses[room.myId]);

  // 提出済みプレイヤー数
  const nonHostPlayers = room.players.filter((p) => p.id !== host.id);
  const submittedCount = nonHostPlayers.filter((p) => Boolean(room.guesses[p.id])).length;

  // お題カード
  const TopicCard = (
    <div className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-2xl p-5 shadow-xl">
      <div className="flex items-center gap-2 mb-2">
        <div
          className="w-5 h-5 rounded-full border-2 border-white"
          style={{ backgroundColor: host.color }}
        />
        <span className="text-sm font-medium opacity-80">{host.name} のお題</span>
      </div>
      <p className="text-xl font-black">{topic.question}</p>
    </div>
  );

  // 選択肢一覧
  const OptionList = (
    <div className="bg-gray-50 rounded-xl p-4 space-y-2">
      {OPTION_KEYS.map((key) => (
        <div key={key} className="flex gap-2 items-start text-sm">
          <span className="font-black text-indigo-600 w-5 flex-shrink-0">{key}</span>
          <span className="text-gray-700">{topic.options[key]}</span>
        </div>
      ))}
    </div>
  );

  // 出題者の場合
  if (isHost) {
    return (
      <div className="space-y-4">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-amber-800 text-sm font-medium">
          ⏳ 他のプレイヤーが予想中です...
        </div>
        {TopicCard}
        {OptionList}

        {/* 進捗 */}
        <div className="text-center">
          <span className="text-sm text-gray-500">
            提出済み: {submittedCount} / {nonHostPlayers.length} 人
          </span>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
            <div
              className="bg-indigo-500 h-2 rounded-full transition-all duration-500"
              style={{
                width: `${nonHostPlayers.length > 0
                  ? (submittedCount / nonHostPlayers.length) * 100
                  : 0}%`,
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  // 提出済みの場合
  if (mySubmitted) {
    return (
      <div className="space-y-4">
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-green-800 text-sm font-medium flex items-center gap-2">
          ✅ 予想を提出しました！他の人の提出を待っています
        </div>
        {TopicCard}
        {OptionList}

        {/* 進捗 */}
        <div className="text-center">
          <span className="text-sm text-gray-500">
            提出済み: {submittedCount} / {nonHostPlayers.length} 人
          </span>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
            <div
              className="bg-green-500 h-2 rounded-full transition-all duration-500"
              style={{
                width: `${nonHostPlayers.length > 0
                  ? (submittedCount / nonHostPlayers.length) * 100
                  : 0}%`,
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  // 未提出の場合
  return (
    <div className="space-y-4">
      {TopicCard}
      {OptionList}

      <div className="bg-white border border-indigo-100 rounded-xl p-4">
        <RankingSelector
          topic={topic}
          onSubmit={onSubmitGuess}
          label={`${host.name} の1〜3位を予想しよう！`}
          submitLabel="🎯 予想を提出する"
        />
      </div>
    </div>
  );
}
