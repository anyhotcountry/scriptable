// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// always-run-in-app: true; icon-color: deep-blue;
// icon-glyph: credit-card;
const store = importModule('lib/cc-model');
const presenterModule = importModule('lib/cc-presenter');
const viewModule = importModule('lib/cc-view');

const main = async () => {
  const transactions = store('transactions');
  const presenter = presenterModule(transactions);
  const view = viewModule(presenter);
  await view.show();
};

main().then(
  () => Script.complete(),
  (e) => console.error(e)
);
