// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// always-run-in-app: true; icon-color: deep-blue;
// icon-glyph: credit-card;
export default (storeName) => {
  const startDay = 27;
  const files = FileManager.iCloud();
  const documents = files.documentsDirectory();
  const stores = `${documents}/stores`;
  const store = `${stores}/${storeName}.json`;
  let data = [];
  const MS_PER_DAY = 86400000;
  const groceryShops = ['TESCO', 'ALDI', 'ASDA', 'WAITROSE','COSTA', 'KFC', 'DOMINOS', 'SAINSBURYS', 'HAPPY VALLEY'];

  const groupByWeek = (week1) => {
    return regularWeekly()
      .reduce((rv, x) => {
        let v = Math.max(
          1,
          1 +
            Math.floor((x.date.getTime() - week1.getTime()) / (MS_PER_DAY * 7))
        );
        let el = rv.find((r) => r && r.number === v);
        if (el) {
          el.values.push(x);
        } else {
          rv.push({ number: v, values: [x] });
        }
        return rv;
      }, [])
      .sort((a, b) => b.number - a.number);
  };

  const load = async () => {
    await files.downloadFileFromiCloud(store);
    const json = files.readString(store);
    data = JSON.parse(json, (key, value) =>
      key === 'date' ? new Date(value) : value
    );
  };

  const save = () => {
    files.writeString(store, JSON.stringify(data));
  };

  const add = (obj) => {
    data = [...data, obj];
  };

  const update = (obj, newProps) => {
    const newObj = { ...obj, ...newProps };
    const newData = data.filter((x) => x !== obj);
    newData.push(newObj);
    data = newData;
  };

  const remove = (obj) => {
    update(obj, { ignore: true });
  };

  const periodStartDate = () => {
    const startDate =
      data.length !== 0 ? new Date(data[data.length - 1].date) : new Date();
    startDate.setDate(startDay);
    return startDate;
  };

  const periodEndDate = () => {
    const endDate = new Date(periodStartDate());
    endDate.setDate(startDay - 1);
    endDate.setMonth(endDate.getMonth() + 1);
    return endDate;
  };

  const regularWeekly = () =>
    data.filter(
      (d) => !d.ignore && groceryShops.some((s) => d.description.includes(s))
    );

  const other = () =>
    data.filter(
      (d) => !d.ignore && !groceryShops.some((s) => d.description.includes(s))
    );

  const removeDuplicates = () => {
    const map = new Map();
    const ignored = data.filter((x) => x.ignore);
    for (let obj of [...data, ...ignored]) {
      const { ignore, ...newObj } = obj;
      map.set(JSON.stringify(newObj), obj);
    }
    data = [...map.values()];
  };

  const reset = () => {
    data = data.filter((r) => r.actual).map((r) => ({ ...r, ignore: false }));
  };

  const resetMonth = () => {
    data = [];
  };

  const sort = () => {
    const newData = [...data];
    newData.sort((a, b) => b.date.getTime() - a.date.getTime());
    data = newData;
  };

  if (!files.isDirectory(stores)) {
    files.createDirectory(stores);
  }

  if (!files.fileExists(store)) {
    save();
  }

  return {
    get data() {
      return data.filter((x) => !x.ignore);
    },
    load,
    save,
    add,
    remove,
    update,
    periodStartDate,
    periodEndDate,
    groupByWeek,
    regularWeekly,
    other,
    sort,
    reset,
    resetMonth,
    removeDuplicates,
  };
};
