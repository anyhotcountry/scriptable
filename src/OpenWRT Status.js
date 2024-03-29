// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: cyan; icon-glyph: magic;
// You need entries in Keychain for your router url and password
// This can be done by creating a new script with these lines:// 
const baseurl = Keychain.get('openwrt.url');
const passwd = Keychain.get('openwrt.pass');

// Customise settings
const iface = 'eth0';
const loadHigh = 2; // Load will depend on your CPU cores
const flashHigh = 75; // percent
const memHigh = 75; // percent
const pingHost = '10.64.0.1';
const pingName = 'WireGuard'

// Don't change anything below
// ===========================

let data = {};
let token = null;
try {
  token = await rpcCall('auth', 'login', ['root', passwd]);
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
  const header = addText(widget, 'OpenWRT');
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
  const bytes = data.received - data.prevReceived;
  const seconds = 1e-3 * (data.timestamp - data.prevTimestamp);
  addStat(
    stack1,
    'NET',
    `↑${Math.round(1e-9 * data.transmitted)} ↓${Math.round(1e-9 * data.received)} GB`,
    data.prevTimestamp ? `↓${formatBytes(bytes / seconds, 0)}B/s` :  'N/A',
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
  addText(stack5, `AdBlock: ${formatBytes(data.adblock, 0)}`, data.adblock > 0 ? Color.green() : Color.red());
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

function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return "0 ";

  const k = 1000;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["", "K", "M", "G", "T", "P", "E", "Z", "Y"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}


async function getData() {
  const cache = cacheManager();
  const prevData = cache.load();
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
  const timestamp = new Date().getTime();
  const ipStr = await rpcCall(
    'sys',
    'exec',
    [`ip -j -4 address show ${iface}`],
    token
  );
  let pingTest = null;
  if (pingHost) {
    pingTest = await rpcCall("sys", "exec", [`ping -c 1 -W 1 ${pingHost} &> /dev/null; echo -n $?`], token);
  }
  const adblockRaw = await rpcCall('sys', 'exec', ['/etc/init.d/adblock status_service | grep blocked_domains'], token);
  const [, flashTotalStr, flashUsedStr] = flashRaw.split(/ +/, 3);
  const trafficRegex = /received +(\d+).*transmitted +(\d+)/s;
  const [, receivedStr, transmittedStr] = trafficRegex.exec(trafficRaw) || [];
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
  const [, adblock] = adblockRaw.split(':');
  const other = {
    timestamp,
    uptime: parseInt(uptime),
    load,
    ip,
    pingTest: pingTest === '0',
    adblock: parseInt(adblock),
    flashTotal: Math.round(flashTotal / 1000),
    flashUsed: Math.round(flashUsed / 1000),
    flashPercent: Math.round((100 * flashUsed) / flashTotal),
    received,
    transmitted,
    prevTransmitted: prevData.received,
    prevReceived: prevData.received,
    prevTimestamp: prevData.timestamp,
  };
  const data = { ...meminfo, ...other };
  cache.save(data);
  return data;
}

async function rpcCall(api, method, params, token) {
  const url = `${baseurl}/contrast-identity/${api}?auth=${token}`;
  const req = new Request(url);
  req.method = 'POST';
  const data = {
    id: 1,
    method,
    params,
  };
  req.body = JSON.stringify(data);
//    console.log(req);
  const res = await req.loadJSON();
//   console.log(res);
  return res.result;
}

function cacheManager() {
  const fm = FileManager.local();
  const filePath = fm.joinPath(fm.documentsDirectory(), 'openwrt.json');
  
  function load() {
    return fm.fileExists(filePath) ? JSON.parse(fm.readString(filePath)) : {};
  }

  function save(data) {
    fm.writeString(filePath, JSON.stringify(data));
  }
  
  return { load, save };
}

function parseMeminfo(raw) {
  const lines = raw.split(/\n/);
  const obj = {};
  for (let line of lines) {
    const [rawProp, rawVal] = line.split(':');
    obj[rawProp] = parseInt(rawVal);
  }
  const cleanObj = {
    total: Math.round(obj.MemTotal / 1000),
    used: Math.round((obj.MemTotal - obj.MemAvailable) / 1000),
    percent: Math.round(100 * (1.0 - obj.MemAvailable / obj.MemTotal)),
  };

  return cleanObj;
}
