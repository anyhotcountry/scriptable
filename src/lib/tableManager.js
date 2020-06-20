// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// always-run-in-app: true; icon-color: light-gray;
// icon-glyph: cogs;
const clearbitlookup = importModule('clearbit');
module.exports = (transactions, startDay) => {
  const MS_PER_DAY = 86400000;
  const dateFormatter = new DateFormatter();
  dateFormatter.dateFormat = 'E d MMM';
  const rows = [];
  const table = new UITable();

  const inputDialog = async (value, title, action) => {
    const alert = new Alert();
    alert.title = title;
    alert.addTextField('', value);
    alert.addAction(action);
    await alert.presentAlert();
    return alert.textFieldValue(0);
  };

  // Transaction menu option
  const fillAction = async (number) => {
    const obj = rows[number];
    const endDate = new Date(transactions.data[0].date);
    endDate.setDate(startDay - 1);
    endDate.setMonth(endDate.getMonth() + 1);
    let { date, value, description, domain } = obj;
    description = '🔸' + description;
    const startDate = new Date(date);
    startDate.setDate(date.getDate() + 7);
    const input = await inputDialog(value.toFixed(2), 'Amount', 'Fill');
    value = parseFloat(input);
    for (
      let d = startDate;
      d.getTime() <= endDate.getTime();
      d.setDate(d.getDate() + 7)
    ) {
      transactions.add({
        date: new Date(d),
        description,
        value,
        actual: false,
        domain,
      });
    }
    buildTable();
    transactions.save();
  };

  // Transaction menu option
  const editAction = async (number) => {
    const obj = rows[number];
    const input = await inputDialog(obj.value.toFixed(2), 'Amount', 'Set');
    const value = parseFloat(input);
    transactions.update(obj, { value });
    buildTable();
    transactions.save();
  };

  // Transaction menu option
  const deleteAction = (number) => {
    const obj = rows[number];
    transactions.remove(obj);
    buildTable();
    transactions.save();
  };

  const domainAction = async (number) => {
    const obj = rows[number];
    const { domain } = obj;
    const input = await inputDialog(domain, 'Domain', 'Update');
    for (let line of transactions.data.filter((l) => l.domain === domain)) {
      transactions.update(line, { domain: input });
    }
    buildTable();
    transactions.save();
  };

  // Show menu when clicking on a row in the table
  const showRowMenu = async (number) => {
    const {
      [number]: { actual },
    } = rows;
    const actions = [];
    const alert = new Alert();
    if (actual) {
      alert.addAction('Fill Weeks');
      actions.push(fillAction);
      alert.addAction('Update Company');
      actions.push(domainAction);
    } else {
      alert.addAction('Edit');
      actions.push(editAction);
    }
    alert.addDestructiveAction('Delete');
    actions.push(deleteAction);
    alert.addCancelAction('Cancel');
    actions.push((n) => null);
    const option = await alert.presentAlert();
    actions[option](number);
  };

  // Generic function to build a table row
  const buildRow = (c1, c2 = '', c3 = '', obj = {}, domain = '') => {
    const row = new UITableRow();
    if (domain !== '') {
      const logo = row.addImageAtURL(clearbitlookup(domain));
      logo.widthWeight = 10;
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
  };

  // A function to build a section in the table for a week or for other category
  const buildSection = (headerText, data) => {
    let total = 0;
    const header = buildRow(headerText);
    header.isHeader = true;
    table.addRow(header);
    data.forEach((r, i) => {
      const row = buildRow(
        r.description,
        dateFormatter.string(r.date),
        '£' + r.value.toFixed(2),
        r,
        r.domain
      );
      table.addRow(row);
      row.onSelect = showRowMenu;
      total += r.value;
    });
    const footer = buildRow(`  Total`, '', '£' + total.toFixed(2));
    footer.isHeader = true;
    table.addRow(footer);
    return total;
  };

  const daysBetween = (fromDate, toDate) => {
    const ms = toDate.getTime() - fromDate.getTime();
    days = Math.floor(ms / MS_PER_DAY);
    return days;
  };

  // Build the transactions table
  const buildTable = () => {
    table.removeAllRows();
    rows.length = 0;
    transactions.sort();
    const periodStartDate = transactions.data[0]
      ? new Date(transactions.data[0].date)
      : new Date();
    periodStartDate.setDate(startDay);
    const other = transactions.other();
    const groupedWeekly = transactions.groupByWeek(periodStartDate);
    table.showSeparators = true;
    const menu = new UITableRow();
    menu.isHeader = true;
    table.addRow(menu);
    rows.push({});

    let total = 0;
    groupedWeekly.forEach((w) => {
      const weekStart = new Date(
        periodStartDate.getTime() + (w.key - 1) * MS_PER_DAY * 7
      );
      total += buildSection(
        `Week ${w.key} (${dateFormatter.string(weekStart)})`,
        w.values
      );
    });

    total += buildSection('Other', other);
    const footer = buildRow('Total', '', '£' + total.toFixed(2));
    footer.isHeader = true;
    table.addRow(footer);
    const isForecast = transactions.data.some((r) => !r.actual);
    const endDate = new Date(periodStartDate);
    endDate.setDate(startDay - 1);
    endDate.setMonth(endDate.getMonth() + 1);
    const now = new Date();
    const summary = menu.addText(
      isForecast
        ? `Forecast £${total.toFixed(2)}`
        : `Spent to date £${total.toFixed(2)}`,
      `${dateFormatter.string(now)} - ${daysBetween(now, endDate)} days left`
    );
    summary.widthWeight = 80;
    const button = menu.addButton('Reset');
    button.rightAligned();
    button.widthWeight = 20;
    button.onTap = () => {
      transactions.reset();
      buildTable();
      transactions.save();
    };
    table.reload();
    return table;
  };

  return { buildTable };
};
