import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "価値観ランキング | オンラインボードゲーム",
  description: "出題者の価値観を当てるオンラインボードゲーム。2〜6人でわいわい遊ぼう！",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="antialiased">{children}</body>
    </html>
  );
}
