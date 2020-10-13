// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// always-run-in-app: true; icon-color: deep-blue;
// icon-glyph: credit-card;
const accountName = Keychain.get('bing-account');
const accountKey = Keychain.get('bing-key');
const baseUrl = `https://${accountName}.cognitiveservices.azure.com/bing/v7.0/search?count=1&offset=0&mkt=en-gb&safesearch=Strict&responseFilter=Webpages`;
const callInterval = 334;
let lastCall = new Date().getTime() - 1000;
const cache = new Map();

function waitForNextCall() {
  const now = new Date().getTime();
  if (now - lastCall > callInterval) {
    return new Promise((resolve) => resolve());
  }
  const ms = callInterval - (now - lastCall);
  return new Promise((resolve) => Timer.schedule(ms, false, resolve));
}

const getDomain = async (description) => {
  const query = description.split(/[^a-zA-Z\.\s]/)[0];
  if (cache.has(query)) {
    return cache.get(query);
  }
  const url = `${baseUrl}&q=${encodeURI(query)}`;
  const request = new Request(url);
  request.headers = {
    'Ocp-Apim-Subscription-Key': accountKey,
  };
  request.method = 'GET';
  await waitForNextCall();
  const res = await request.loadJSON();
  lastCall = new Date().getTime();
  try {
    const resultUrl = res.webPages.value[0].url;
    const [, domain] = resultUrl.match(/^https?:\/\/(?:www\.)?([^\/:]+)/);
    cache.set(query, domain);
    return domain;
  } catch (err) {
    console.log(res);
    return '';
  }
};

export { getDomain };
