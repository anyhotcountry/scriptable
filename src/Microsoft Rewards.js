// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: pink; icon-glyph: magic;
const ua = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_4) AppleWebKit/604.3.5 (KHTML, like Gecko) Version/10.1 Safari/602.1 EdgiOS/45.8.14';
const req = new Request('https://gist.githubusercontent.com/deekayen/4148741/raw/98d35708fa344717d8eee15d11987de6c8e26d7d/1-1000.txt');

const res = await req.loadString();
const words = res.split(/\r?\n/);
const wv = new WebView();
for (let i = 0; i < 20; i++) {
  const word1 = words[Math.floor(Math.random() * words.length)];
  const word2 = words[Math.floor(Math.random() * words.length)];
  const url = `https://www.bing.com/search?q=${word1}+${word2}`;
  const request = new Request(url);
  request.headers = { 'User-Agent': ua };
  await wv.loadRequest(request);
  await wv.present(true);
  console.log(`${i}: ${word1} ${word2}`);
}