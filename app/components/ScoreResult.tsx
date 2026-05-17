"use client";

import React from "react";
import type { ScoreRole } from "@/lib/types";

type Props = {
  role: ScoreRole;
  score: number;
};

const ROLE_STYLES: Record<ScoreRole, { bg: string; text: string; emoji: string }> = {
  サンレンタン: { bg: "from-yellow-400 to-orange-500", text: "text-white", emoji: "🎯" },
  サンレンプク: { bg: "from-purple-400 to-pink-500",  text: "text-white", emoji: "✨" },
  ニレンタン:   { bg: "from-blue-400 to-cyan-500",    text: "text-white", emoji: "🎉" },
  プクプク:     { bg: "from-green-400 to-teal-500",   text: "text-white", emoji: "👍" },
  タン:         { bg: "from-indigo-300 to-blue-400",  text: "text-white", emoji: "👌" },
  なし:         { bg: "from-gray-200 to-gray-300",    text: "text-gray-600", emoji: "😅" },
};

export function ScoreResult({ role, score }: Props) {
  const style = ROLE_STYLES[role];

  return (
    <div
      className={`
        inline-flex flex-col items-center justify-center
        rounded-xl px-4 py-2 bg-gradient-to-br ${style.bg} shadow-md
        min-w-[90px]
      `}
    >
      <span className="text-xl">{style.emoji}</span>
      <span className={`font-black text-sm ${style.text}`}>{role}</span>
      <span className={`font-black text-2xl ${style.text}`}>+{score}点</span>
    </div>
  );
}
