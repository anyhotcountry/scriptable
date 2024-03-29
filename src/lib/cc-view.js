// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// always-run-in-app: true; icon-color: deep-blue;
// icon-glyph: credit-card;

export default (presenter) => {
  const dateFormatter = new DateFormatter();
  dateFormatter.dateFormat = 'E d MMM';
  const rows = [];
  const table = new UITable();

  const getValue = async (value, title, action) => {
    const alert = new Alert();
    alert.title = title;
    alert.addTextField('', value);
    alert.addAction(action);
    await alert.presentAlert();
    return alert.textFieldValue(0);
  };

  const showRowMenu = async (number) => {
    const row = rows[number];
    const { actual } = row;
    const actions = [];
    const alert = new Alert();
    if (actual) {
      alert.addAction('Fill Weeks');
      actions.push(presenter.fillAction);
      alert.addAction('Update Company');
      actions.push(presenter.domainAction);
    } else {
      alert.addAction('Edit');
      actions.push(presenter.editAction);
    }
    alert.addDestructiveAction('Delete');
    actions.push(presenter.deleteAction);
    alert.addCancelAction('Cancel');
    actions.push((n) => null);
    const option = await alert.presentSheet();
    await actions[option](row);
  };

  const showMainMenu = async () => {
    const actions = [];
    const alert = new Alert();
    alert.addAction('Import');
    actions.push(presenter.importAction);
    alert.addAction('Reset');
    actions.push(presenter.resetAction);
    alert.addAction('Reset Month');
    actions.push(presenter.resetMonthAction);
    alert.addCancelAction('Cancel');
    actions.push((n) => null);
    const option = await alert.presentSheet();
    actions[option]();
  };

  const showMessage = (msg) => {
    table.removeAllRows();
    table.showSeparators = false;
    const row = new UITableRow();
    row.isHeader = false;
    row.height = 200;
    table.addRow(row);

    row.addText(msg);
    table.reload();
  };

  // Generic function to build a table row
  const buildRow = (c1, c2 = '', c3 = '', obj = {}, domain = '') => {
    const row = new UITableRow();
    if (domain !== '') {
      const logo = row.addImage(SFSymbol.named(`${domain}.square.fill`).image);
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
    header.backgroundColor = Color.lightGray();
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
      row.onSelect = presenter.onRowSelect;
      total += r.value;
    });
    const valCell = header.addText(`£${total.toFixed(2)}`);
    valCell.rightAligned();
    valCell.widthWeight = 25;
    return total;
  };

  const buildTable = (weekly, other, daysLeft, isForecast) => {
    table.removeAllRows();
    rows.length = 0;
    table.showSeparators = true;
    const menu = new UITableRow();
    menu.isHeader = true;
    table.addRow(menu);
    rows.push({});

    let total = 0;
    weekly.forEach((w) => {
      total += buildSection(
        `Week ${w.number} (${dateFormatter.string(w.start)})`,
        w.values
      );
    });

    total += buildSection('Other', other);
    const footer = buildRow('Total', '', '£' + total.toFixed(2));
    footer.isHeader = true;
    table.addRow(footer);

    const now = new Date();
    const summary = menu.addText(
      isForecast
        ? `Forecast £${total.toFixed(2)}`
        : `Spent to date £${total.toFixed(2)}`,
      `${dateFormatter.string(now)} - ${daysLeft} days left`
    );
    summary.widthWeight = 70;
    const menuButton = menu.addButton('☰');
    menuButton.rightAligned();
    menuButton.widthWeight = 15;
    menuButton.onTap = showMainMenu;
    table.reload();
  };

  const show = async () => {
    await presenter.init();
    await table.present(true);
  };

  const view = {
    buildTable,
    showRowMenu,
    showMessage,
    show,
    getValue,
  };
  presenter.setView(view);
  return view;
};
