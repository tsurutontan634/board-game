"use client";

import React from "react";
import type { Phase } from "@/lib/types";

const PHASE_INFO: Record<Phase, { label: string; color: string; icon: string }> = {
  WAITING:      { label: "ロビー待機中",         color: "bg-gray-400",   icon: "⏳" },
  HOST_RANKING: { label: "出題者が考え中...",     color: "bg-amber-500",  icon: "🤔" },
  GUESSING:     { label: "みんな予想中...",       color: "bg-blue-500",   icon: "🎯" },
  REVEALING:    { label: "答え合わせ中",          color: "bg-purple-500", icon: "🔍" },
  ROUND_RESULT: { label: "ラウンド結果",          color: "bg-green-500",  icon: "📊" },
  GAME_END:     { label: "ゲーム終了！",          color: "bg-yellow-500", icon: "🏆" },
};

type Props = {
  phase: Phase;
  round?: number;
  maxRounds?: number;
};

export function PhaseIndicator({ phase, round, maxRounds }: Props) {
  const info = PHASE_INFO[phase];

  return (
    <div className="flex items-center gap-2">
      <span
        className={`
          ${info.color} text-white text-xs font-bold
          px-3 py-1 rounded-full inline-flex items-center gap-1
        `}
      >
        <span>{info.icon}</span>
        <span>{info.label}</span>
      </span>
      {round !== undefined && maxRounds !== undefined && (
        <span className="text-xs text-gray-500">
          ラウンド {round} / {maxRounds}
        </span>
      )}
    </div>
  );
}
