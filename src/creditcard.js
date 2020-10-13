// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// always-run-in-app: true; icon-color: deep-blue;
// icon-glyph: credit-card;
import store from './lib/cc-model';
import presenterModule from './lib/cc-presenter';
import viewModule from './lib/cc-view';

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
