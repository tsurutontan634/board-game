// AI秘書コックピット ビルドスクリプト
// snapshot.json を dashboard.html の <script id="snapshot"> ブロックに埋め込む。
// 使い方: node tools/cockpit/generate.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = dirname(fileURLToPath(import.meta.url));
const htmlPath = join(dir, 'dashboard.html');

const snapshot = JSON.parse(readFileSync(join(dir, 'snapshot.json'), 'utf8'));
// </script> でHTMLが壊れないよう "</" をエスケープして埋め込む
const payload = JSON.stringify(snapshot).replaceAll('</', '<\\/');

const html = readFileSync(htmlPath, 'utf8');
const replaced = html.replace(
  /(<script id="snapshot" type="application\/json">)[\s\S]*?(<\/script>)/,
  `$1${payload}$2`,
);
if (replaced === html && !html.includes('__SNAPSHOT_JSON__')) {
  console.error('snapshot ブロックが見つかりませんでした');
  process.exit(1);
}
writeFileSync(htmlPath, replaced.replace('__SNAPSHOT_JSON__', payload));
console.log(`OK: dashboard.html を snapshot ${snapshot.generatedAt} で更新しました`);
