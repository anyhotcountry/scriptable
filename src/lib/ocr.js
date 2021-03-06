// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// always-run-in-app: true; icon-color: deep-blue;
// icon-glyph: credit-card;
const ocr = async (imageData) => {
  const accountName = Keychain.get('ocr-account');
  const accountKey = Keychain.get('ocr-key');
  const url = `https://${accountName}.cognitiveservices.azure.com/vision/v3.0/read/analyze`;

  const waitForNextCall = () => {
    return new Promise((resolve) => Timer.schedule(400, false, resolve));
  };

  const toTransaction = (description, rawValue, rawDate) => {
    const value = parseFloat(rawValue.replace(/[^0-9.-]+/g, ''));
    return {
      description,
      value,
      date: new Date(rawDate),
      actual: true,
      ignore: false,
    };
  };

  const regex = /^(Out|In)/;
  const reduceFn = (acc, cur, idx, arr) =>
    regex.test(cur.text)
      ? [
          ...acc,
          ...[
            toTransaction(
              arr[idx + 1].text,
              arr[idx + 2].text,
              arr[idx + 3].text
            ),
          ],
        ]
      : acc;

  try {
    const request = new Request(url);
    request.headers = {
      'Content-Type': 'application/octet-stream',
      'Ocp-Apim-Subscription-Key': accountKey,
    };
    request.method = 'POST';
    request.body = imageData;
    await request.load();
    const response = request.response;
    const resultUrl = response.headers['Operation-Location'];
    var resRequest = new Request(resultUrl);
    resRequest.headers = {
      'Ocp-Apim-Subscription-Key': accountKey,
    };
    let status = 'running';
    let res = {};
    while (status === 'running') {
      await waitForNextCall();
      res = await resRequest.loadJSON();
      status = res.status;
    }
    //   const data = res
    if (status === 'succeeded') {
      const {
        analyzeResult: {
          readResults: [{ lines }],
        },
      } = res;
      const data = lines.reduce(reduceFn, []);
      return data;
    }
    return [];
  } catch (e) {
    console.error(e);
  }
};

export default ocr;
