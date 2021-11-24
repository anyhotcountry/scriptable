// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: cyan; icon-glyph: magic;
const baseurl = "http://192.168.1.1/cgi-bin/luci/rpc/";
const items = await iptables();
console.log(items);
const rules = [];
let chain = '';
for (item of items) {
  if (item.startsWith('Chain')) {
    chain = item;
  } else if (!item.trimLeft().startsWith('pkts')) {
    [pkts, bytes,target,prot,opt,inn,out,source,dest,...extra] = item.trimLeft().split(/ +/);
    rules.push({target,prot,opt,in:inn,out,source,dest,extra:extra.join(' '),chain, transferred:formatBytes(bytes)});
  }
}
const html = getHtml(rules);
await WebView.loadHTML(html);
Script.complete();

async function rpcCall(api, method, params, token) {
  const url = `${baseurl}${api}?auth=${token}`;
  const req = new Request(baseurl + api);
  req.method = "POST";
  const data = {
    id: 1,
    method,
    params,
  };
  req.body = JSON.stringify(data);
  const res = await req.loadJSON();
//   console.log(res);
  return res.result;
}

async function iptables() {
  const passwd = Keychain.get("openwrt.pass");
  const token = await rpcCall("auth", "login", ["root", passwd]);
  const output = await rpcCall("sys", 'exec', ["iptables -L -vx"], token);
  return output.split('\n');
}

function formatBytes(bytesStr, decimals = 2) {
  const bytes = parseInt(bytesStr);
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}


function getHtml(data) {
  return `<!DOCTYPE html>
<html lang="en">
	<head>
		<link href="https://unpkg.com/tabulator-tables@4.8.4/dist/css/tabulator.min.css" rel="stylesheet">
          <script type="text/javascript" src="https://unpkg.com/tabulator-tables@4.8.4/dist/js/tabulator.min.js"></script>
	</head>
	<body>
		<div id="example-table"></div>
						<script type="text/javascript" src="/js/tabulator/4.8/tabulator.min.js"></script>
		<script type="text/javascript">
	//sample data
	var tabledata = ${JSON.stringify(data)};

	var table = new Tabulator("#example-table", {
// 		height:200, // set height of table to enable virtual DOM
		data:tabledata, //load initial data into table
		layout:"fitDataFill",
		autoColumns:true,
          groupBy:"chain",
	    rowClick:function(e, row){ //trigger an alert message when the row is clicked
	    	alert("Row " + row.getIndex() + " Clicked!!!!");
	    },
	});
     table.deleteColumn("chain");
</script>
	</body>
</html>`;
}