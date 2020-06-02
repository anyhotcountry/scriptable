// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: orange; icon-glyph: magic;
const accountName = Keychain.get('ocr-account');
const accountKey = Keychain.get('ocr-key');
const url = `https://${accountName}.cognitiveservices.azure.com/vision/v3.0/ocr?language=en&detectOrientation=true`;

const cleanNumber = (text) => {
  return text.replaceAll('E', '').replaceAll('l', '1').replaceAll('O', '0').replaceAll('I', '1').replaceAll(',', '');
};

// Perform OCR on an image and return the data in the expected format
module.exports = async (imageData) => {
  const data = [];
  const request = new Request(url);
  request.headers = {
    'Content-Type': 'application/octet-stream',
    'Ocp-Apim-Subscription-Key': accountKey
  };
  request.method = 'POST';
  request.addFileDataToMultipart(imageData, "image/png", "image", "image.png");
  const res = await request.loadJSON();
  const values = res.regions[1].lines;
  const desc = res.regions[0].lines;
  for (let i = 0; i < values.length; i++) {
    const description = desc[i * 2].words.map((w) => w.text).join(' ');
    const date = desc[i * 2 + 1].words.map((w) => w.text);
    date[1] = cleanNumber(date[1]);
    const val = cleanNumber(values[i].words[0].text);
    const value = parseFloat(val);
    data.push({ date: new Date(date.join(' ')), description, value, actual: true });
  }
  return data;
};