// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: cyan; icon-glyph: magic;
// You need entries in Keychain for your router url and password
// This can be done by creating a new script with these lines:

// Customise settings
const apiKey = Keychain.get('erx.api.key');
const url = Keychain.get('erx.url');
const iface = 'eth0';
const loadHigh = 2; // Load will depend on your CPU cores
const flashHigh = 75; // percent
const memHigh = 75; // percent
const pingHost = '10.64.0.1';
const pingName = 'WireGuard'

// Don't change anything below
// ===========================

let data = {};
try {
  data = await getData();
  console.log(data);
} catch (e) {
  console.error(e);
}

const widget = createWidget(data);

if (!config.runsInWidget) {
  widget.presentSmall();
}

// Tell the system to show the widget.
Script.setWidget(widget);
Script.complete();

function createWidget(data) {
  const widget = new ListWidget();
  widget.spacing = 1;
  widget.refreshAfterDate = new Date();
  const gradient = new LinearGradient();
  gradient.locations = [0, 1];
  gradient.colors = [new Color('111111'), new Color('222222')];
  widget.backgroundGradient = gradient;
  const wdate = widget.addDate(new Date());
  wdate.textColor = Color.gray();
  wdate.rightAlignText();
  wdate.applyOffsetStyle();
  wdate.font = Font.systemFont(8);
  const header = addText(widget, 'ERX');
  header.font = Font.boldSystemFont(14);
  if (data === null) {
    const nodata = addText(widget, 'NO DATA');
    nodata.font = Font.boldSystemFont(16);
    nodata.textColor = Color.red();
    return widget;
  }

  widget.addSpacer(3);
  const stack1 = widget.addStack();
  stack1.layoutHorizontally();
  stack1.spacing = 4;
  addStat(
    stack1,
    'LOAD',
    data.load.join('/'),
    `${data.load[2]}`,
    Color.orange(),
    data.load[2] >= loadHigh
  );
  stack1.addSpacer(2);
  addStat(
    stack1,
    'NET',
    `↑${data.tx}`,
    `↓${data.rx}`,
    Color.cyan()
  );
  widget.addSpacer(4);
  const stack2 = widget.addStack();
  stack2.spacing = 4;
  stack2.layoutHorizontally();
  addStat(
    stack2,
    'MEM',
    `${data.memUsed}/${data.memTotal} MB`,
    `${data.percent}%`,
    Color.magenta(),
    data.percent >= memHigh
  );
  stack2.addSpacer(2);
  addStat(
    stack2,
    'FLASH',
    `${data.flashUsed}/${data.flashTotal} MB`,
    `${data.flashPercent}%`,
    Color.blue(),
    data.flashPercent >= flashHigh
  );
  widget.addSpacer(3);
  const stack3 = widget.addStack();
  stack3.layoutHorizontally();
  const stack4 = stack3.addStack();
  const stack5 = stack3.addStack();
  stack4.layoutVertically();
  stack5.layoutVertically();
  addUptime(stack4, data.uptime);
  addText(stack4, ` IP: ${data.ip}`, Color.yellow());
  const pingStatus = data.pingTest ? '⬤' : '⭘';
  addText(stack5, `${pingName}: ${pingStatus}`, data.pingTest ? Color.green() : Color.red());
  return widget;
}

function addText(container, text, color = Color.white()) {
  const wtext = container.addText(text);
  wtext.font = Font.regularSystemFont(8);
  wtext.textColor = color;
  return wtext;
}

function addUptime(widget, uptime) {
  const stack = widget.addStack();
  addText(stack, ' UP: ', Color.yellow());
  const currentMs = new Date().getTime();
  const startMs = currentMs - uptime * 1000;
  const started = new Date(startMs);
  const wdate = stack.addDate(started);
  wdate.applyRelativeStyle();
  wdate.font = Font.regularSystemFont(8);
  wdate.textColor = Color.yellow();
}

function addStat(container, label, footnote, value, color, isHigh) {
  const stack = container.addStack();
  stack.size = new Size(70, 45);
  stack.borderColor = color;
  stack.borderWidth = 4;
  stack.cornerRadius = 8;
  stack.layoutVertically();
  stack.setPadding(4, 4, 4, 4);

  const wlabel = stack.addText(label);
  wlabel.font = Font.mediumSystemFont(12);
  wlabel.textColor = color;
  wlabel.centerAlignText();

  if (footnote) {
    const wfootnote = stack.addText(footnote);
    wfootnote.font = Font.mediumSystemFont(8);
    wfootnote.textColor = Color.white();
    wfootnote.centerAlignText();
  }
  if (value) {
    const wvalue = stack.addText(value);
    wvalue.font = Font.mediumSystemFont(10);
    wvalue.textColor = isHigh ? Color.red() : Color.green();
    wvalue.centerAlignText();
  }
}

function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return "0 ";

  const k = 1000;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["", "K", "M", "G", "T", "P", "E", "Z", "Y"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}


async function getData() {
  const req = new Request(url);
  req.headers = {'X-API-KEY': apiKey};
  req.method = 'GET';
  const res = await req.loadJSON();
  console.log(res);
  
  const obj = {
    uptime: res.uptime[0],
    load: res.load,
    ip: res.ip,
    pingTest: res.ping,
    adblock: 0,
    flashTotal: Math.round(res.fs[0] / 1024),
    flashUsed: Math.round(res.fs[1] / 1024),
    flashPercent: Math.round((100 * res.fs[1]) / res.fs[0]),
    rx: res.vnstat[0],
    tx: res.vnstat[1],
    memTotal: Math.round(res.mem[0] / 1024),
    memUsed: Math.round((res.mem[0] - res.mem[1]) / 1024),
    percent: 100 - Math.round((100 * res.mem[1]) / res.mem[0])
  };
  return obj;
}

