// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: light-gray; icon-glyph: cogs;
module.exports = (storeName) => {
  const files = FileManager.iCloud();
  const documents = files.documentsDirectory();
  const stores = `${documents}/stores`;
  const store = `${stores}/${storeName}.json`;
  let data = [];
  const MS_PER_DAY = 86400000;
  const groceryShops = ['TESCO', 'ALDI', 'ASDA', 'WAITROSE'];

  const groupByWeek = (week1) => {
    return regularWeekly().reduce((rv, x) => {
      let v = Math.max(
        1,
        1 + Math.floor((x.date.getTime() - week1.getTime()) / (MS_PER_DAY * 7))
      );
      let el = rv.find((r) => r && r.key === v);
      if (el) {
        el.values.push(x);
      } else {
        rv.push({ key: v, values: [x] });
      }
      return rv;
    }, []);
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

  const sort = () => {
    const newData = [...data];
    newData.sort((a, b) => a.date.getTime() - b.date.getTime());
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
    groupByWeek,
    regularWeekly,
    other,
    sort,
    reset,
    removeDuplicates,
  };
};
