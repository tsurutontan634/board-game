/** @type {import('next').NextConfig} */
const nextConfig = {
  // カスタムサーバーを使うため standalone 出力を推奨
  // Socket.IO の WebSocket はカスタムサーバーで処理するため
  // Next.js の API Routes への WebSocket ルーティングは不要
};

export default nextConfig;
