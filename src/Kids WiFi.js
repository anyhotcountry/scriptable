// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: cyan; icon-glyph: wifi;
const username = await getSecret('agh-username');
const password = await getSecret('agh-password');
const aghUrl = await getSecret('agh-url');
const baseurl = await getSecret('openwrt.url');
const passwd = await getSecret('openwrt.pass');
const wifiImage = SFSymbol.named('wifi').image;
const videoImage = SFSymbol.named('video.fill').image;
const wifiSlashImage = SFSymbol.named('wifi.slash').image;
const shieldImage = SFSymbol.named('shield.lefthalf.filled').image;
const shieldSlashImage = SFSymbol.named('shield.lefthalf.filled.slash').image;
const lookup = {
  jxyz: SFSymbol.named('j.circle').image,
  ixyz: SFSymbol.named('i.circle').image,
  exyz: SFSymbol.named('e.circle').image,
  lxyz: SFSymbol.named('l.circle').image,
  zxyx: SFSymbol.named('z.circle').image,
};

async function getSecret(key) {
  if (!Keychain.contains(key)) {
    const alert = new Alert();
    alert.message = `Enter value for ${key}`;
    alert.addTextField(key);
    alert.addAction('Set');
    await alert.presentAlert();
    Keychain.set(key, alert.textFieldValue(0));
  }
  return Keychain.get(key);
}

const devices = {
  phone: SFSymbol.named('iphone').image,
  pc: SFSymbol.named('laptopcomputer').image
};

const createWidget = (clients) => {
  const w = new ListWidget();
  const gradient = new LinearGradient();
  gradient.locations = [0, 1];
  gradient.colors = [new Color('111111'), new Color('222222')];
  w.backgroundGradient = gradient;
  const wdate = w.addDate(new Date());
  wdate.textColor = Color.gray();
  wdate.rightAlignText();
  wdate.applyOffsetStyle();
  wdate.font = Font.systemFont(12);
  wdate.url = 'shortcuts://run-shortcut?name=Refresh%20All%20Widgets';
  addText(w, 'WiFi', Color.white(), 16);
  for (let c of clients) {
    const stack = w.addStack();
    addIcon(stack, lookup[c.name.split('-')[0]], c.wiFi, 20);
    addIcon(stack, devices[c.name.split('-')[1]], c.wiFi);
    addIcon(stack, wifiImage, c.wiFi);
    addIcon(stack, videoImage, c.tiktok);
    addIcon(stack, shieldImage, !c.ads);
  }
  return w;

  function addIcon(stack, image, on, size = 16) {
    const wimg = stack.addImage(image);
    wimg.imageSize = new Size(size, size);
    wimg.tintColor = on ? Color.green() : Color.red();
    stack.addSpacer(8);
  }
  
  function addText(widget, text, color, size = 22) {
    const wtxt = widget.addText(text);
    wtxt.font = Font.boldSystemFont(size);
    wtxt.textColor = color;
  }
};


const table = new UITable();

let token = null;

const buildTable = async (clients) => {
  table.showSeparators = true;
  table.removeAllRows();
  const heading = new UITableRow();
  const h1 = heading.addText('Kids WiFi');
  h1.titleFont = Font.boldSystemFont(36);
  const h2 = heading.addText('✖️');
  h2.rightAligned();
  h2.titleFont = Font.boldSystemFont(36);
  heading.onSelect = () => null;
  heading.dismissOnSelect = true;
  heading.isHeader = true;
  table.addRow(heading);
  
  for (let el of clients) {
    const wifi = el.selected === 1 ? !el.wiFi : el.wiFi;
    const tiktok = (el.selected === 2 && el.tiktok !== null) ? !el.tiktok : el.tiktok;
    const ads = el.selected === 3 ? !el.ads : el.ads;
    const row = new UITableRow();
    row.height = 60;
    const cell1 = row.addImage(SFSymbol.named(`${el.name[0].toLowerCase()}.square.fill`).image);
    cell1.widthWeight = 10;
    const cell2 = row.addText(el.name);
    cell2.widthWeight = 40;
    cell2.titleFont = Font.regularSystemFont(24);
    const cell3 = row.addImage(wifi ? wifiImage : wifiSlashImage);
    cell3.widthWeight = 10;
    cell3.rightAligned();
    cell3.titleFont = Font.systemFont(36);
    const cell4 = row.addText(tiktok === null ? '👶' : (tiktok ? '🙊' : '🙈'));
    cell4.widthWeight = 10;
    cell4.rightAligned();
    cell4.titleFont = Font.systemFont(36);
    const cell5 = row.addImage(ads ? shieldSlashImage : shieldImage);
    cell5.widthWeight = 10;
    cell5.rightAligned();
    row.onSelect = () => {
      el.selected = (el.selected + 1) % 4;
      el.selected = el.tiktok === null && el.selected === 2 ? 3 : el.selected;
      buildTable(clients);
    };
    row.backgroundColor = el.selected > 0 ? Color.lightGray() : null;
    row.dismissOnSelect = false;
    table.addRow(row);
  }
  const actionRow = new UITableRow();
  const applyBtn = actionRow.addText('Apply');
  applyBtn.titleFont = Font.boldSystemFont(36);
  applyBtn.titleColor = Color.white();
  applyBtn.centerAligned();
  table.addRow(actionRow);
  actionRow.height = 75;
  actionRow.dismissOnSelect = false;
  actionRow.backgroundColor = new Color('#0275d8');
  actionRow.onSelect = () => {
    applyAction(clients);
  };
  table.reload();
};

const applyAction = async (clients) => {
  for (let c of clients.filter(c => c.selected === 1)) {
  showMessage(`Toggle ${c.name} WiFi...`);
  await rpcCall('sys', 'exec', [`/root/toggle_kids.sh ${c.name}`], token);
  }
  for (let c of clients.filter(c => c.selected === 2)) {
    showMessage(`Toggle ${c.name} TikTok...`);
    await toggleTikTok(c.client);
  }
  for (let c of clients.filter(c => c.selected === 3)) {
    showMessage(`Toggle ${c.name} Ads...`);
    await toggleAds(c.client);
  }
  clients = await getData();
  await buildTable(clients);
};

const toggleTikTok = async (client) => {
  client.blocked_services = client.blocked_services.indexOf('tiktok') === -1 ? [ 'tinder', 'tiktok' ] : [ 'tinder' ];
  await updateClient(client);
  const clients = await getData();
  if (client.blocked_services.indexOf('tiktok') !== -1) {
    const notification = new Notification();
    notification.scriptName = Script.name();
    notification.title = `Switch ${client.name} TikTok off`;
    notification.setTriggerDate(new Date(Date.now() + 3600 * 1000));  
    notification.preferredContentHeight = 300;
    notification.schedule();
  }
  await buildTable(clients);
};

const toggleAds = async (client) => {
  const ads = !client.filtering_enabled && !client.use_global_settings;
  client.use_global_settings = ads;
  client.filtering_enabled = ads;
  console.log(ads);
  console.log(client);
  await updateClient(client);
  const clients = await getData();
  await buildTable(clients);
};

const showMessage = (message) => {
  table.removeAllRows();
  const row = new UITableRow();
  row.addText(message);
  table.addRow(row);
  table.reload();
};

const updateClient = async (client) => {
  const url = `${aghUrl}/clients/update`;
  const req = new Request(url);
  req.method = 'POST';
  const auth = btoa(`${username}:${password}`);
  req.headers = {'Authorization': `Basic ${auth}`};
  const body = { name: client.name, data: client };
  req.body = JSON.stringify(body);
  const res = await req.loadString();
};

const getData = async () => {
  const url = `${aghUrl}/clients`;
  const req = new Request(url);
  const auth = btoa(`${username}:${password}`);
  req.headers = {'Authorization': `Basic ${auth}`};
  const res = await req.loadJSON();
//   console.log(res);
  const kidsWiFiRaw = await rpcCall('sys', 'exec', ['/root/kids_status.sh'], token);
  const kidsWiFi = JSON.parse(kidsWiFiRaw);
  const clients = res.clients
  .filter(x => x.tags[0] === 'user_child')
  .map(x => ({ name: x.name, tiktok: x.use_global_blocked_services ? null : (x.blocked_services.indexOf('tiktok') === -1 ? true : false), ads: !x.filtering_enabled && !x.use_global_settings, wiFi: kidsWiFi[x.name].status === 1, selected: 0, client: x }));
  return clients.sort((a, b) => a.name.localeCompare(b.name));
};

async function rpcCall(api, method, params, token) {
  const url = `${baseurl}/${api}?auth=${token}`;
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
//   console.log(req);
  return res.result;
}

if (config.runsInWidget) {
  token = await rpcCall('auth', 'login', ['root', passwd]);
  const clients = await getData();
  const widget = createWidget(clients);
  Script.setWidget(widget);
} else {
  table.showSeparators = true;  
  showMessage('Loading data...');
  table.present(false);
  try {
    token = await rpcCall('auth', 'login', ['root', passwd]);
  } catch (e) {
    console.error(e);
  }
  const clients = await getData();
  // console.log(clients);
  await buildTable(clients);
}

