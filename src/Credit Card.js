// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// always-run-in-app: true; icon-color: deep-blue;
// icon-glyph: credit-card; share-sheet-inputs: image;
const ocr = importModule('lib/ocr');
const bingsearch = importModule('lib/bingsearch');
const store = importModule('lib/store');
const tableManager = importModule('lib/tableManager');

const main = async () => {
  const transactions = store('transactions');
  await transactions.load();
  const startDay = 27;

  // Perform OCR on screenshots
  if (args.images.length > 0) {
    for (let image of args.images) {
      const fileData = await ocr(Data.fromPNG(image));
      for (const line of fileData) {
        line.domain = await bingsearch.getDomain(line.description);
        transactions.add(line);
      }
    }
    transactions.removeDuplicates();
    transactions.save();
  }

  const table = tableManager(transactions, startDay).buildTable();
  await table.present(true);
}

main().then(() => Script.complete());
