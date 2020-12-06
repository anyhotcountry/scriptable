// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// always-run-in-app: true; icon-color: deep-blue;
// icon-glyph: credit-card;
import webscrape from './webscrape';
import { getDomain } from './bingsearch';

export default (model, startDay) => {
  let view = {};
  const MS_PER_DAY = 86400000;

  const fillAction = async (obj) => {
    const endDate = model.periodEndDate();
    let { date, value, description, domain } = obj;
    description = '🔸' + description;
    const startDate = new Date(date);
    startDate.setDate(date.getDate() + 7);
    const input = await view.getValue(value.toFixed(2), 'Amount', 'Fill');
    value = parseFloat(input);
    for (
      let d = startDate;
      d.getTime() <= endDate.getTime();
      d.setDate(d.getDate() + 7)
    ) {
      model.add({
        date: new Date(d),
        description,
        value,
        actual: false,
        domain,
      });
    }
    model.save();
    updateView();
  };

  const editAction = async (obj) => {
    const input = await view.getValue(obj.value.toFixed(2), 'Amount', 'Set');
    const value = parseFloat(input);
    model.update(obj, { value });
    model.save();
    updateView();
  };

  const deleteAction = (obj) => {
    model.remove(obj);
    model.save();
    updateView();
  };

  const cancelAction = () => {
    updateView();
  };

  const domainAction = async (obj) => {
    const { domain } = obj;
    const input = await view.getValue(domain, 'Domain', 'Update');
    for (let line of model.data.filter((l) => l.domain === domain)) {
      model.update(line, { domain: input });
    }
    model.save();
    updateView();
  };

  const resetAction = () => {
    model.reset();
    model.save();
    updateView();
  };

  const resetMonthAction = () => {
    model.resetMonth();
    model.save();
    updateView();
  };

  const importAction = () => {
    webscrapeAction().then(updateView, (e) => console.error(e));
  };

  const onRowSelect = async (number) => {
    await view.showRowMenu(number);
  };

  const daysBetween = (fromDate, toDate) => {
    const ms = toDate.getTime() - fromDate.getTime();
    days = Math.floor(ms / MS_PER_DAY);
    return days;
  };

  const webscrapeAction = async () => {
    const fileData = await webscrape();
    for (const line of fileData) {
      line.domain = await getDomain(line.description);
      model.add(line);
    }
    model.removeDuplicates();
    model.save();
  };

  const updateView = () => {
    model.sort();
    const periodStartDate = model.periodStartDate();
    const other = model.other();
    const groupedWeekly = model.groupByWeek(periodStartDate);
    const weekly = groupedWeekly.map(({ number, values }) => ({
      number,
      values,
      start: new Date(
        periodStartDate.getTime() + (number - 1) * MS_PER_DAY * 7
      ),
    }));
    const isForecast = model.data.some((r) => !r.actual);
    const endDate = model.periodEndDate();
    const daysLeft = daysBetween(new Date(), endDate);
    view.buildTable(weekly, other, daysLeft, isForecast);
  };

  const setView = (v) => {
    view = v;
  };

  const init = async () => {
    await model.load();
    updateView();
  };

  return {
    fillAction,
    editAction,
    deleteAction,
    domainAction,
    onRowSelect,
    resetAction,
    resetMonthAction,
    importAction,
    cancelAction,
    setView,
    init,
  };
};
