// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: cyan; icon-glyph: magic;
// You need entries in Keychain for your router url and password
// This can be done by creating a new script with these lines:
//  Keychain.set('openwrt.url', 'http://192.168.1.1');
//  Keychain.set('openwrt.pass', 'password');
const baseurl = Keychain.get('openwrt.url');
const passwd = Keychain.get('openwrt.pass');

// Customise settings
const iface = 'eth0.2';
const loadHigh = 2; // Load will depend on your CPU cores
const flashHigh = 75; // percent
const memHigh = 75; // percent

// Don't change anything below
// ===========================

let data = {};
let token = null;
try {
  token = await rpcCall('auth', 'login', ['root', passwd]);
  data = await getData();
} catch (e) {
  console.error(e);
  console.log(baseurl);
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
  const now = new Date().getTime();
  widget.refreshAfterDate = new Date(now + 60000);
  const gradient = new LinearGradient();
  gradient.locations = [0, 1];
  gradient.colors = [new Color('111111'), new Color('222222')];
  widget.backgroundGradient = gradient;
  const wdate = widget.addDate(new Date());
  wdate.textColor = Color.gray();
  wdate.rightAlignText();
  wdate.applyOffsetStyle();
  wdate.font = Font.systemFont(8);
  const header = addText(widget, '⚡️OpenWRT');
  header.font = Font.boldSystemFont(14);
  if (token === null) {
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
    data.load[2],
    Color.orange(),
    parseFloat(data.load[2]) >= loadHigh
  );
  stack1.addSpacer(2);
  addStat(
    stack1,
    'NET',
    `↑${data.transmitted} GB`,
    `↓${data.received} GB`,
    Color.cyan()
  );
  widget.addSpacer(4);
  const stack2 = widget.addStack();
  stack2.spacing = 4;
  stack2.layoutHorizontally();
  addStat(
    stack2,
    'MEM',
    `${data.used}/${data.total} MB`,
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
  addUptime(widget, data.uptime);
  addText(widget, ` IP: ${data.ip}`, Color.yellow());
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
    wvalue.font = Font.mediumSystemFont(12);
    wvalue.textColor = isHigh ? Color.red() : Color.green();
    wvalue.centerAlignText();
  }
}

async function getData() {
  const uptime = await rpcCall('sys', 'uptime', [], token);
  const meminfoRaw = await rpcCall('sys', 'exec', ['cat /proc/meminfo'], token);
  const loadRaw = await rpcCall('sys', 'exec', ['cat /proc/loadavg'], token);
  const flashRaw = await rpcCall('sys', 'exec', ['df | grep overlayfs'], token);
  const trafficRaw = await rpcCall(
    'sys',
    'exec',
    [`grep 'total bytes' /proc/${iface}`],
    token
  );
  const ipStr = await rpcCall(
    'sys',
    'exec',
    [`ip -j -4 address show ${iface}`],
    token
  );
  const [, flashTotalStr, flashUsedStr] = flashRaw.split(/ +/, 3);
  const trafficRegex = /received +(\d+).*transmitted +(\d+)/s;
  const [, receivedStr, transmittedStr] = trafficRegex.exec(trafficRaw) || [];
  console.log(receivedStr);
  const load = loadRaw.split(' ', 3);
  const meminfo = parseMeminfo(meminfoRaw);
  const flashTotal = parseInt(flashTotalStr);
  const flashUsed = parseInt(flashUsedStr);
  const received = parseInt(receivedStr);
  const transmitted = parseInt(transmittedStr);
  const [
    {
      addr_info: [{ local: ip }],
    },
  ] = JSON.parse(ipStr);
  const other = {
    uptime: parseInt(uptime),
    load,
    ip,
    flashTotal: Math.round(flashTotal / 1024),
    flashUsed: Math.round(flashUsed / 1024),
    flashPercent: Math.round((100 * flashUsed) / flashTotal),
    received: Math.round(received / (1024 * 1024 * 1024)),
    transmitted: Math.round(transmitted / (1024 * 1024 * 1024)),
  };
  return { ...meminfo, ...other };
}

async function rpcCall(api, method, params, token) {
  const url = `${baseurl}/cgi-bin/luci/rpc/${api}?auth=${token}`;
  const req = new Request(url);
  req.method = 'POST';
  const data = {
    id: 1,
    method,
    params,
  };
  req.body = JSON.stringify(data);
  const res = await req.loadJSON();
  return res.result;
}

function parseMeminfo(raw) {
  const lines = raw.split(/\n/);
  const obj = {};
  for (let line of lines) {
    const [rawProp, rawVal] = line.split(':');
    obj[rawProp] = parseInt(rawVal);
  }
  const cleanObj = {
    total: Math.round(obj.MemTotal / 1024),
    used: Math.round((obj.MemTotal - obj.MemAvailable) / 1024),
    percent: Math.round(100 * (1.0 - obj.MemAvailable / obj.MemTotal)),
  };

  return cleanObj;
}
