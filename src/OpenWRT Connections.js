// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: cyan; icon-glyph: magic;
const baseurl = Keychain.get('openwrt.url');
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

async function rpcCall(api, method, params, token) {
  const url = `${baseurl}/cgi-bin/luci/rpc/${api}?auth=${token}`;
  const req = new Request(url);
  req.method = "POST";
  const data = {
    id: 1,
    method,
    params,
  };
  req.body = JSON.stringify(data);
  const res = await req.loadJSON();
  return res.result;
}

function groupBy(xs, hosts) {
  return xs.reduce((rv, x) => {
    (rv[hosts[x.src].name] = rv[hosts[x.src].name] || {
      name: hosts[x.src].name,
      total: 0,
    }).total += x.bytes;
    return rv;
  }, {});
}

function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

async function createWidget(items) {
  let w = new ListWidget();
  let font = new Font("Menlo-Regular", 10);
  let gradient = new LinearGradient();
  gradient.locations = [0, 1];
  gradient.colors = [new Color("#222222"), new Color("#444443")];
  w.backgroundGradient = gradient;
  const scale = 18 / items[0].total;
  let titleTxt = w.addText(new Date().toLocaleString());
  titleTxt.font = new Font("Menlo-Regular", 12);
  titleTxt.textColor = Color.blue();
  for (let i = 0; i < items.length && i < maxEntries; i++) {
    const item = items[i];
    const name = item.name.padEnd(15, "·");
    const bar = '▒'.repeat(Math.ceil(scale * item.total));
    let titleTxt = w.addText(name + bar + " " + formatBytes(item.total));
    titleTxt.font = new Font("Menlo-Regular", 11);
    titleTxt.textColor = Color.white();
  }
  return w;
}

async function loadItems() {
  const passwd = Keychain.get("openwrt.pass");

  const token = await rpcCall("auth", "login", ["root", passwd]);
  const hostHints = await rpcCall("sys", "net.ipv4_hints", [], token);
  const hosts = hostHints.reduce((rv, x) => {
    (rv[x[0]] = rv[x[0]] || {}).name = x[1];
    return rv;
  }, {});
  const conntrack = await rpcCall("sys", "net.conntrack", [], token);
  const filtered = conntrack.filter((x) => {
    return x.dport === "443";
  });
  console.log(filtered);
  const summed = Object.values(groupBy(filtered, hosts));
  summed.sort((a, b) => {
    var x = b.total;
    var y = a.total;
    if (x < y) {
      return -1;
    }
    if (x > y) {
      return 1;
    }
    return 0;
  });
  return summed;
}
