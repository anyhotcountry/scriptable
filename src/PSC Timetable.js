// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: blue; icon-glyph: calendar;
const maxEntries = 12;
const time0 = 1041206400000;
const weekTime = 7 * 86400000;
const week0 = Math.floor((new Date().getTime() - time0) / weekTime);
const weekStart = time0 + week0 * weekTime;
const items = await loadItems();
console.log(items);
let widget = await createWidget(items);
// Check if the script is running in
// a widget. If not, show a preview of
// the widget to easier debug it.
if (!config.runsInWidget) {
  await widget.presentMedium();
}
// Tell the system to show the widget.
Script.setWidget(widget);
Script.complete();

async function createWidget(items) {
  let w = new ListWidget();
  let font = new Font('Menlo-Regular', 10);
  const groups = groupBy(items);
  let gradient = new LinearGradient();
  gradient.locations = [0, 1];
  gradient.colors = [new Color('#111111'), new Color('#000066')];
  w.backgroundGradient = gradient;
  let count = 0;
  for (let day of Object.keys(groups)) {
    if (count < maxEntries - 1) {
      if (count > 0) {
        w.addSpacer(5);
      }
      let titleTxt = w.addText(day);
      titleTxt.font = new Font('Menlo-Regular', 11);
      titleTxt.textColor = Color.lightGray();
    }
    count++;
    for (let meeting of groups[day]) {
      if (count < maxEntries) {
        titleTxt = w.addText(`${meeting.times} ${meeting.subject}`);
        titleTxt.font = font;
        titleTxt.textColor = Color.orange();
      }
      count++;
    }
  }
  return w;
}

function groupBy(xs) {
  return xs.reduce(function (rv, x) {
    const key = x.date.toDateString();
    (rv[key] = rv[key] || []).push(x);
    return rv;
  }, {});
}

async function loadItems() {
  const savedItems = loadCache();
  if (savedItems != null) {
    return savedItems;
  }
  const user = Keychain.get('psc.user');
  const pass = Keychain.get('psc.pass');
  const url = 'https://parents.psc.ac.uk';
  let js = `let user = '${user}';
let pass = '${pass}';
document.getElementById('form_username').value = user;
document.getElementById('form_password').value = pass;
let btn = document.getElementById('form_submit');
btn.click();`;
  //   console.log(js);
  const wv = new WebView();
  await wv.loadURL(url);
  //   await wv.present();
  await wv.evaluateJavaScript(js);
  await wv.waitForLoad();
  const date = new Date(new Date().setHours(0, 0, 0, 0));
  let items = [];
  let week = week0;
  while (items.length == 0 && week - week0 < 5) {
    const weekItems = await loadWeek(wv, url, date, week);
    date.setDate(date.getDate() + 7);
    items = [...items, ...weekItems];
    week++;
  }
  saveCache(items);
  return items;
}

async function loadWeek(wv, url, date, week) {
  await wv.loadURL(`${url}/timetable?week=${week}`);
  const lessonsJs = `const getv = (e, c) => (e.querySelector('span' + c)||{}).innerText.trim();
  [...document.getElementsByClassName('timetable-mobile-grid-wrapper')[0].getElementsByClassName('item ')].map((c) => ({ title: getv(c, '.title'), room: getv(c, '.room'), staff: getv(c, '.in-charge'), times: getv(c, '.times'), date: new Date(${weekStart} + 86400000 * parseInt(c.closest('div.timetable-mobile-grid-day').classList[1].replace('day-', '')))}));`;
  const lessons = await wv.evaluateJavaScript(lessonsJs);
  return lessons
    .filter((l) => l.date > date)
    .map((l) => ({
      date: l.date,
      times: l.times,
      subject: `${l.title} (${l.staff}) `,
    }));
}

function loadCache() {
  const fm = FileManager.local();
  let now = new Date();
  let data = null;
  const filePath = fm.joinPath(fm.cacheDirectory(), 'psc-data.json');
  if (
    fm.fileExists(filePath) &&
    now - fm.modificationDate(filePath) < 86400000
  ) {
    data = JSON.parse(fm.readString(filePath), (key, value) =>
      key === 'date' ? new Date(value) : value
    );
  }
  return data;
}

function saveCache(data) {
  const fm = FileManager.local();
  const filePath = fm.joinPath(fm.cacheDirectory(), 'psc-data.json');
  fm.writeString(filePath, JSON.stringify(data));
}
