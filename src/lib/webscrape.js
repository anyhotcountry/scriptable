// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// always-run-in-app: true; icon-color: deep-blue;
// icon-glyph: credit-card;
const webscrape = async () => {
  const toTransaction = (text) => {
    const [rawDate, rawValue, description, direction] = text.split('\n');
    const value = parseFloat(rawValue.replace(/[^0-9.-]+/g, ''));
    return {
      description,
      value: direction.startsWith('IN') ? -value : value,
      date: new Date(rawDate),
      actual: true,
      ignore: false,
    };
  };

  const url = 'https://www.tescobank.com/banking-overview/welcome';
  const wv = new WebView();
  await wv.loadURL(url);
  await wv.present();
  const transactions = await wv.evaluateJavaScript(
    "[...document.getElementsByClassName('transaction-group')].splice(0,2).map(e => [...e.getElementsByClassName('transaction-tile__content')].map(e2 => e2.innerText)).flat(1)"
  );
  return transactions.map(toTransaction);
};

export default webscrape;
