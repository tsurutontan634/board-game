import { describe, it, expect } from "vitest";
import { calcScore } from "../lib/scoring";
import type { OptionKey } from "../lib/types";

// ヘルパー
const h = (...keys: string[]) => keys as [OptionKey, OptionKey, OptionKey];

describe("calcScore", () => {
  // -------------------------------------------------------
  // サンレンタン: 完全一致 (6点)
  // -------------------------------------------------------
  it("サンレンタン: 3つとも順位込みで完全一致 → 6点", () => {
    const result = calcScore(h("A", "B", "C"), h("A", "B", "C"));
    expect(result.score).toBe(6);
    expect(result.role).toBe("サンレンタン");
  });

  it("サンレンタン: 別の組み合わせでも完全一致 → 6点", () => {
    const result = calcScore(h("G", "E", "D"), h("G", "E", "D"));
    expect(result.score).toBe(6);
    expect(result.role).toBe("サンレンタン");
  });

  // -------------------------------------------------------
  // サンレンプク: 3つ全部含まれるが順序違い (4点)
  // -------------------------------------------------------
  it("サンレンプク: 選択肢3つ一致・順位違い → 4点", () => {
    const result = calcScore(h("A", "B", "C"), h("C", "A", "B"));
    expect(result.score).toBe(4);
    expect(result.role).toBe("サンレンプク");
  });

  it("サンレンプク: 1位だけ位置が違う → 4点", () => {
    const result = calcScore(h("A", "B", "C"), h("B", "C", "A"));
    expect(result.score).toBe(4);
    expect(result.role).toBe("サンレンプク");
  });

  // -------------------------------------------------------
  // ニレンタン: 1位・2位の選択肢＆順位一致 (3点)
  // -------------------------------------------------------
  it("ニレンタン: 1位と2位が一致、3位が違う → 3点", () => {
    const result = calcScore(h("A", "B", "C"), h("A", "B", "D"));
    expect(result.score).toBe(3);
    expect(result.role).toBe("ニレンタン");
  });

  it("ニレンタン: 1位と2位が一致、3位は全く別 → 3点", () => {
    const result = calcScore(h("F", "G", "C"), h("F", "G", "A"));
    expect(result.score).toBe(3);
    expect(result.role).toBe("ニレンタン");
  });

  // -------------------------------------------------------
  // プクプク: 選択肢2つ一致(順位不問) (2点)
  // -------------------------------------------------------
  it("プクプク: 選択肢2つ一致・順位ずれ → 2点", () => {
    const result = calcScore(h("A", "B", "C"), h("B", "A", "E"));
    expect(result.score).toBe(2);
    expect(result.role).toBe("プクプク");
  });

  it("プクプク: 1位違い・2位3位が別の位置に入る → 2点", () => {
    const result = calcScore(h("A", "B", "C"), h("D", "C", "B"));
    expect(result.score).toBe(2);
    expect(result.role).toBe("プクプク");
  });

  // -------------------------------------------------------
  // タン: 1位だけ一致 (1点)
  // -------------------------------------------------------
  it("タン: 1位だけ一致・他は完全不一致 → 1点", () => {
    const result = calcScore(h("A", "B", "C"), h("A", "D", "E"));
    expect(result.score).toBe(1);
    expect(result.role).toBe("タン");
  });

  it("タン: 1位一致・2位と3位はどこにも含まれない → 1点", () => {
    const result = calcScore(h("G", "A", "B"), h("G", "C", "D"));
    expect(result.score).toBe(1);
    expect(result.role).toBe("タン");
  });

  // -------------------------------------------------------
  // なし: 0点
  // -------------------------------------------------------
  it("なし: 1つも一致しない → 0点", () => {
    const result = calcScore(h("A", "B", "C"), h("D", "E", "F"));
    expect(result.score).toBe(0);
    expect(result.role).toBe("なし");
  });

  it("なし: 選択肢1つだけ一致するが1位でない → 0点", () => {
    // Aがhostの2位に入っているが、guessの1位ではないのでタンにならない
    // 一致選択肢は1つだけなのでプクプクにもならない
    const result = calcScore(h("B", "A", "C"), h("D", "E", "A"));
    expect(result.score).toBe(0);
    expect(result.role).toBe("なし");
  });

  // -------------------------------------------------------
  // 境界ケース: プクプクとタンが両方当てはまる場合はプクプク
  // -------------------------------------------------------
  it("境界: 1位一致 & 選択肢が2つ以上一致 → プクプク(2点)が優先", () => {
    // host = [A, B, C], guess = [A, C, E]
    // → 1位A一致 (タン条件) + A・Cの2択一致 (プクプク条件)
    // → プクプクが上位なので2点
    const result = calcScore(h("A", "B", "C"), h("A", "C", "E"));
    expect(result.score).toBe(2);
    expect(result.role).toBe("プクプク");
  });

  it("境界: 2位も一致 & 3位は別の選択肢 → ニレンタン(3点)が優先", () => {
    // host = [A, B, C], guess = [A, B, G]
    // → 1位A・2位B一致 (ニレンタン) + 選択肢2つ一致 (プクプク)
    // → ニレンタンが上位なので3点
    const result = calcScore(h("A", "B", "C"), h("A", "B", "G"));
    expect(result.score).toBe(3);
    expect(result.role).toBe("ニレンタン");
  });

  it("境界: 3つ全部含まれる & 1位2位一致 → サンレンプク or サンレンタン の確認", () => {
    // host = [A, B, C], guess = [A, B, C] → サンレンタン
    // host = [A, B, C], guess = [A, C, B] → A, B, C 全部あり: サンレンプク
    //   ただし 1位A一致, 2位C(B≠C) → ニレンタンにならない
    const result1 = calcScore(h("A", "B", "C"), h("A", "B", "C"));
    expect(result1.role).toBe("サンレンタン");

    const result2 = calcScore(h("A", "B", "C"), h("A", "C", "B"));
    expect(result2.role).toBe("サンレンプク");
  });

  // -------------------------------------------------------
  // 追加: 特殊ケース
  // -------------------------------------------------------
  it("全部違う選択肢・1位も違う → なし 0点", () => {
    const result = calcScore(h("A", "B", "C"), h("E", "F", "G"));
    expect(result.score).toBe(0);
    expect(result.role).toBe("なし");
  });
});
