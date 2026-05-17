/**
 * 得点計算ロジック
 *
 * ルール (上から順に判定し、最初に当てはまったものだけを採用):
 * 1. サンレンタン (6点): 1〜3位の選択肢と順位が完全一致
 * 2. サンレンプク (4点): 1〜3位の選択肢3つは合っているが順位が違う
 * 3. ニレンタン   (3点): 1位と2位の選択肢＆順位がぴったり一致
 * 4. プクプク     (2点): 1〜3位のうち選択肢が2つだけ一致 (順位不問)
 * 5. タン         (1点): 1位の選択肢と順位だけ一致
 * 6. なし         (0点): 上記いずれにも当てはまらない
 */

import type { OptionKey, RoundResult } from "./types";

/** 出題者の答えとプレイヤーの予想を比較し、得点と役名を返す */
export function calcScore(
  host: [OptionKey, OptionKey, OptionKey],
  guess: [OptionKey, OptionKey, OptionKey]
): RoundResult {
  // --- サンレンタン: 3つとも順位込みで完全一致 ---
  if (host[0] === guess[0] && host[1] === guess[1] && host[2] === guess[2]) {
    return { score: 6, role: "サンレンタン" };
  }

  // --- サンレンプク: 選択肢3つが同じ集合だが順序が違う ---
  const hostSet = new Set(host);
  const guessSet = new Set(guess);
  const allThreeMatch =
    hostSet.size === 3 &&
    guessSet.size === 3 &&
    [...hostSet].every((k) => guessSet.has(k));

  if (allThreeMatch) {
    return { score: 4, role: "サンレンプク" };
  }

  // --- ニレンタン: 1位と2位が順位込みで一致 ---
  if (host[0] === guess[0] && host[1] === guess[1]) {
    return { score: 3, role: "ニレンタン" };
  }

  // --- プクプク: 選択肢が2つ以上一致 (順位不問) ---
  // ※ここに到達している時点でサンレンプク(3つ一致)ではないので、
  //   選択肢が2つ一致していればプクプク
  const matchCount = host.filter((k) => guessSet.has(k)).length;
  if (matchCount >= 2) {
    return { score: 2, role: "プクプク" };
  }

  // --- タン: 1位の選択肢と順位が一致 ---
  if (host[0] === guess[0]) {
    return { score: 1, role: "タン" };
  }

  // --- なし ---
  return { score: 0, role: "なし" };
}
