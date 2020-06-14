// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// always-run-in-app: true; icon-color: deep-blue;
// icon-glyph: credit-card;
const ocr = importModule('lib/ocr');
const bingsearch = importModule('lib/bingsearch');
const clearbitlookup = importModule('lib/clearbit');
const MS_PER_DAY = 86400000;
const settings = {
  transactionsFile: 'transactions.json',
  startDay: 27,
  groceryShops: ['TESCO', 'ALDI', 'ASDA', 'WAITROSE']
};

const fm = FileManager.iCloud();
const state = {
  data: [],
  table: new UITable(),
  rows: [],
  fm,
  dataFolder: fm.bookmarkedPath('tesco-cc'),
  transactionsPath: fm.joinPath(fm.bookmarkedPath('tesco-cc'), settings.transactionsFile),
  dateFormatter: new DateFormatter()
};

state.dateFormatter.dateFormat = 'E d MMM';

// Group the transactions into weeks, with week1 the starting point
const groupByWeek = (xs, week1) => {
  return xs.reduce((rv, x) => {
    let v = Math.max(1, 1 + Math.floor((x.date.getTime() - week1.getTime()) / (MS_PER_DAY * 7)));
    let el = rv.find((r) => r && r.key === v);
    if (el) { el.values.push(x); }
    else { rv.push({ key: v, values: [x] }); }
    return rv;
  }, []);
};

const amountDialog = async (value, action) => {
  const alert = new Alert();
  alert.title = 'Amount?';
  alert.addTextField('', value.toFixed(2));
  alert.addAction(action);
  await alert.presentAlert();
  return parseFloat(alert.textFieldValue(0));
}

// Transaction menu option
const fillAction = async (number) => {
  const { rows: { [number]: obj }, data, fm, transactionsPath } = state;
  const endDate = new Date(data[0].date);
  endDate.setDate(settings.startDay - 1);
  endDate.setMonth(endDate.getMonth() + 1);
  let { date, value, description, hostname } = obj;
  description = '🔸' + description;
  const startDate = new Date(date);
  startDate.setDate(date.getDate() + 7);
  value = await amountDialog(value, 'Fill');

  for (let d = startDate; d.getTime() <= endDate.getTime(); d.setDate(d.getDate() + 7)) {
    data.push({ date: new Date(d), description, value, actual: false, hostname });
  }
  buildTable(data);
  fm.writeString(transactionsPath, JSON.stringify(data));
}

const editAction = async (number) => {
  const { rows: { [number]: obj }, data, fm, transactionsPath } = state;
  obj.value = await amountDialog(obj.value, 'Set');
  buildTable(data);
  fm.writeString(transactionsPath, JSON.stringify(data));
}

// Transaction menu option
const deleteAction = (number) => {
  const { rows: { [number]: obj }, data, fm, transactionsPath } = state;
  const index = data.indexOf(obj);
  data.splice(index, 1);
  buildTable(data);
  fm.writeString(transactionsPath, JSON.stringify(data));
}

// Show menu when clicking on a row in the table
const showRowMenu = async (number) => {
  const { rows: { [number]: { actual } } } = state;
  const action = actual ? (number) => fillAction(number) : (number) => editAction(number);
  const alert = new Alert();
  alert.addAction(actual ? 'Fill Weeks' : 'Edit');
  alert.addDestructiveAction('Delete');
  alert.addCancelAction('Cancel');
  const option = await alert.presentAlert();
  switch (option) {
    case 0:
      action(number);
      break;
    case 1:
      deleteAction(number);
      break;
    default:
      break;
  }
};

// Generic function to build a table row
const buildRow = (c1, c2 = '', c3 = '', obj = {}, hostname = '') => {
  const { rows } = state;
  const row = new UITableRow();
  if (hostname !== '') {
    try {
      const logo = row.addImageAtURL(clearbitlookup(hostname));
      logo.widthWeight = 10;        
    } catch (error) {
    }
  }
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
  const { table } = state;
  let total = 0;
  const header = buildRow(headerText);
  header.isHeader = true;
  table.addRow(header);
  data.forEach((r, i) => {
    const row = buildRow(r.description, '  ' + state.dateFormatter.string(r.date), '£' + r.value.toFixed(2), r, r.hostname);
    table.addRow(row);
    row.onSelect = showRowMenu;
    total += r.value;
  });
  const footer = buildRow(`  ${headerText} Total`, '', '£' + total.toFixed(2));
  footer.isHeader = true;
  table.addRow(footer);
  return total;
}

const daysBetween = (fromDate, toDate) => {
  const ms = toDate.getTime() - fromDate.getTime();
  days = Math.floor(ms / MS_PER_DAY);
  return days;
};

// Build the transactions table
const buildTable = (data) => {
  const { table, rows, fm, transactionsPath } = state;
  table.removeAllRows();
  rows.length = 0;
  data.sort((a, b) => a.date.getTime() - b.date.getTime());
  const periodStartDate = new Date(data[0].date);
  periodStartDate.setDate(settings.startDay);
  const regularWeekly = data.filter((d) => settings.groceryShops.some((s) => d.description.includes(s)));
  const other = data.filter((d) => !settings.groceryShops.some((s) => d.description.includes(s)));
  const groupedWeekly = groupByWeek(regularWeekly, periodStartDate);
  table.showSeparators = true;
  const menu = new UITableRow();
  menu.isHeader = true;
  table.addRow(menu);
  rows.push({});

  let total = 0;
  groupedWeekly.forEach((w) => {
    total += buildSection(`Week ${w.key}`, w.values);
  });

  total += buildSection('Other', other);
  const footer = buildRow('Total', '', '£' + total.toFixed(2));
  footer.isHeader = true;
  table.addRow(footer);
  const isForecast = state.data.some((r) => !r.actual);
  const endDate = new Date(data[0].date);
  endDate.setDate(settings.startDay - 1);
  endDate.setMonth(endDate.getMonth() + 1);
  const now = new Date();
  const summary = menu.addText(isForecast ? `Forecast £${total.toFixed(2)}` : `Spent to date £${total.toFixed(2)}`, 
    `${state.dateFormatter.string(now)} - ${daysBetween(now, endDate)} days left`);
  summary.widthWeight = 80;
  const button = menu.addButton('Reset');
  button.rightAligned();
  button.widthWeight = 20;
  button.onTap = () => {
    state.data = data.filter((r) => r.actual);
    buildTable(state.data);
    fm.writeString(transactionsPath, JSON.stringify(state.data));
  }
  table.reload();
}

// Read transactions from file if exists
if (state.fm.fileExists(state.transactionsPath)) {
  state.fm.downloadFileFromiCloud(state.transactionsPath);
  const json = state.fm.readString(state.transactionsPath);
  const data = JSON.parse(json, (key, value) => key === 'date' ? new Date(value) : value);
  state.data = data;
}

// Perform OCR on screenshots
const files = state.fm.listContents(state.dataFolder).filter((f) => f.endsWith('.png')).map((f) => state.fm.joinPath(state.dataFolder, f));
if (files.length > 0) {
  for (let file of files) {
    await state.fm.downloadFileFromiCloud(file);
    const imageData = await state.fm.read(file);
    const fileData = await ocr(imageData);
    for (const line of fileData) {
      line.hostname = await bingsearch.getHostname(line.description);
    }
    state.data = [...state.data, ...fileData];
    state.fm.remove(file);
  }
  // Find unique values
  const map = new Map(state.data.map((x) => [JSON.stringify(x), x]));
  state.data = [...map.values()];
}

state.fm.writeString(state.transactionsPath, JSON.stringify(state.data));
if (state.data.length > 0) {
  buildTable(state.data);
  await state.table.present(true);
} else {
  const alert = new Alert();
  alert.title = 'No Data!';
  alert.message = `Please copy screenshots to tesco-cc iCloud folder.`;
  await alert.presentAlert();
}

Script.complete();
