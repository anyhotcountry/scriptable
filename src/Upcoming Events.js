// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: blue; icon-glyph: calendar;
const maxEntries = 12;
let items = await loadItems();
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
  const req = new Request('https://www.bp.com/content/dam/bp/business-sites/en/global/bp-petrochemicals/images/sustainability/bp-net-zero.jpg.img.750.medium.jpg');
    const img = await req.loadImage();
  w.backgroundImage = img;
  const dateFormatter = new DateFormatter();
  dateFormatter.dateFormat = "HH:mm";
  const groups = groupBy(items);
  let gradient = new LinearGradient();
  gradient.locations = [0, 1];
  gradient.colors = [new Color("#111111", 0.5), new Color("#222222", 0.5)];
  w.backgroundGradient = gradient;
  let count = 0;
  for (let day of Object.keys(groups)) {
    if (count < maxEntries - 1) {
      if (count > 0) {
        w.addSpacer(5);
      }
      let titleTxt = w.addText(day);
      titleTxt.font = new Font('Menlo-Regular', 11);
      titleTxt.textColor = Color.blue();
    }
    count++;
    for (let meeting of groups[day]) {
      if (count < maxEntries) {
        titleTxt = w.addText(
          `${dateFormatter.string(meeting.localStart)}-${dateFormatter.string(
            meeting.localEnd
          )} ${meeting.subject}`
        );
        titleTxt.font = font;
        const colour =
          meeting.seriesMasterId != null ? Color.white() : Color.magenta();
        titleTxt.textColor = colour;
        titleTxt.shadowColor = Color.black();
titleTxt.shadowOffset = new Point(1,1);
titleTxt.shadowRadius = 1;
        console.log(meeting);
      }
      count++;
    }
  }
  return w;
}

function groupBy(xs) {
  return xs.reduce(function (rv, x) {
    const key = x.localStart.toDateString();
    (rv[key] = rv[key] || []).push(x);
    return rv;
  }, {});
}

async function loadItems() {
  let url = Keychain.get('events.url');
  let req = new Request(url);
  let json = await req.loadJSON();
  console.log(json);
  if (json.error) {
    return [];
  }
  json.sort((a, b) => {
    var x = a.start;
    var y = b.start;
    if (x < y) {
      return -1;
    }
    if (x > y) {
      return 1;
    }
    return 0;
  });
  return json.map((x) => ({
    localStart: new Date(x.start + "Z"),
    localEnd: new Date(x.end + "Z"),
    ...x,
  }));
}
