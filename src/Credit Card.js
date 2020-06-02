// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: deep-blue; icon-glyph: credit-card;
const ocr = importModule('ocr');
const store = {
  data: [],
  transactionsFile: 'transactions.json',
  startDay: 27,
  bigShops: ['TESCO', 'ALDI', 'ASDA', 'WAITROSE']
};
const table = new UITable();
const rows = [];
const fm = FileManager.iCloud();
const dataFolder = fm.bookmarkedPath('tesco-cc');
const transactionsPath = fm.joinPath(dataFolder, store.transactionsFile);
const dateFormatter = new DateFormatter();
dateFormatter.dateFormat = 'E d MMM';

// Group the transactions into weeks, with week1 the starting point
const groupByWeek = (xs, week1) => {
  return xs.reduce((rv, x) => {
    let v = Math.max(1, 1 + Math.floor((x.date.getTime() - week1.getTime()) / (86400000 * 7)));
    let el = rv.find((r) => r && r.key === v);
    if (el) { el.values.push(x); }
    else { rv.push({ key: v, values: [x] }); }
    return rv;
  }, []);
};

// Transaction menu option
const fillWeeks = async (number) => {
  const endDate = new Date(store.data[0].date);
  endDate.setDate(store.startDay - 1);
  endDate.setMonth(endDate.getMonth() + 1);
  const { date } = rows[number];
  let { value, description } = rows[number];
  description = '🔸' + description;
  const startDate = new Date(date);
  startDate.setDate(date.getDate() + 7);
  try {
    const alert = new Alert();
    alert.title = 'Amount?';
    alert.addTextField('', value.toFixed(2));
    alert.addAction('Fill');
    await alert.presentAlert();
    value = parseFloat(alert.textFieldValue(0));
  } catch (error) {
    console.log(error);
  }

  for (let d = startDate; d.getTime() <= endDate.getTime(); d.setDate(d.getDate() + 7)) {
    store.data.push({ date: new Date(d), description, value, actual: false });
  }
  table.removeAllRows();
  rows.length = 0;
  buildTable(store.data);
  table.reload();
  fm.writeString(transactionsPath, JSON.stringify(store.data));
}

// Transaction menu option
const  deleteRow = (number) => {
  const obj = rows[number];
  const index = store.data.indexOf(obj);
  store.data.splice(index, 1);
  table.removeAllRows();
  rows.length = 0;
  buildTable(store.data);
  table.reload();
  fm.writeString(transactionsPath, JSON.stringify(store.data));
}

// Show menu when clicking on a row in the table
const showAlert = async (number) => {
  const alert = new Alert();
  //alert.title = 'Hello';
  //alert.message = 'What do you want to do?';
  alert.addAction('Fill Weeks');
  alert.addDestructiveAction('Delete');
  alert.addCancelAction('Cancel');

  const option = await alert.presentAlert();
  switch (option) {
    case 0:
      fillWeeks(number);
      break;
    case 1:
      deleteRow(number);
      break;
    default:
      break;
  }
};

// Generic function to build a table row
const buildRow = (c1, c2 = '', c3 = '', obj = {}) => {
  const row = new UITableRow();
  const descCell = row.addText(c1, c2);
  descCell.subtitleColor = Color.blue();
  descCell.widthWeight = 75;
  if (c3 !== '') {
    const valCell = row.addText(c3);
    valCell.rightAligned();
    valCell.widthWeight = 25;
  }
  row.dismissOnSelect = false;
  rows.push(obj);
  return row;
}

// A function to build a section in the table for a week or for other category
const buildSection = (headerText, data) => {
  let total = 0;
  const header = buildRow(headerText);
  header.isHeader = true;
  const button = header.addButton('➡️');
  button.rightAligned();
  button.widthWeight = 25;
  table.addRow(header);
  data.forEach((r, i) => {
    const row = buildRow('  ' + r.description, '  ' + dateFormatter.string(r.date), '£' + r.value.toFixed(2), r);
    table.addRow(row);
    row.onSelect = showAlert;
    total += r.value;
  });
  const footer = buildRow('  Total', '', '£' + total.toFixed(2));
  footer.isHeader = true;
  table.addRow(footer);
  return total;
}

// Build the transactions table
const buildTable = (data) => {
  store.data.sort((a, b) => a.date.getTime() - b.date.getTime());
  const periodStartDate = new Date(store.data[0].date);
  periodStartDate.setDate(store.startDay);
  const regularWeekly = data.filter((d) => store.bigShops.some((s) => d.description.includes(s)));
  const other = data.filter((d) => !store.bigShops.some((s) => d.description.includes(s)));
  const groupedWeekly = groupByWeek(regularWeekly, periodStartDate);
  table.showSeparators = true;
  const header = buildRow('Transaction', '', 'Amount');
  header.isHeader = true;
  table.addRow(header);
  let total = 0;
  groupedWeekly.forEach((w) => {
    total += buildSection(`Week ${w.key}`, w.values);
  });

  total += buildSection('Other', other);
  const footer = buildRow('Total', '', '£' + total.toFixed(2));
  footer.isHeader = true;
  table.addRow(footer);
}

// Read transactions from file if exists
if (fm.fileExists(transactionsPath)) {
  fm.downloadFileFromiCloud(transactionsPath);
  const json = fm.readString(transactionsPath);
  const data = JSON.parse(json, (key, value) => key === 'date' ? new Date(value) : value);
  store.data = data;
}

// Perform OCR on screenshots
const files = fm.listContents(dataFolder).filter((f) => f.endsWith('.png')).map((f) => fm.joinPath(dataFolder, f));
for (let file of files) {
  await fm.downloadFileFromiCloud(file);
  const imageData = await fm.read(file);
  const fileData = await ocr(imageData);
  store.data = [...store.data, ...fileData];
  fm.remove(file);
}

fm.writeString(transactionsPath, JSON.stringify(store.data));
buildTable(store.data);

await table.present(true);
Script.complete();
