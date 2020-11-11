// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: pink; icon-glyph: magic;
if (config.runsInWidget) {
  const data = await getData();
  const widget = createWidget(data);
  Script.setWidget(widget);
} else {
  await searches();
}

Script.complete();

function createWidget(data) {
  const w = new ListWidget();
  const gradient = new LinearGradient();
  gradient.locations = [0, 1];
  gradient.colors = [new Color('111111'), new Color('222222')];
  w.backgroundGradient = gradient;
  const wdate = w.addDate(data.lastUpdated);
  wdate.textColor = Color.gray();
  wdate.rightAlignText();
  wdate.applyOffsetStyle();
  wdate.font = Font.systemFont(12);
  addText(w, 'REWARDS', Color.white(), 22);
  addPoints(
    w,
    data.pcProgress,
    data.pcProgressMax,
    SFSymbol.named('laptopcomputer')
  );
  addPoints(
    w,
    data.mobileProgress,
    data.mobileProgressMax,
    SFSymbol.named('iphone')
  );
  const stack = addPoints(
    w,
    data.edgeProgress,
    data.edgeProgressMax,
    SFSymbol.named('e.circle')
  );
  stack.addSpacer(4);
  addPoints(
    w,
    data.dailyProgress,
    data.dailyProgressMax,
    SFSymbol.named('gift.circle'),
    stack
  );
  addText(w, `Streak: ${data.streak}`, Color.yellow(), 18);
  addText(w, `Total: ${data.total}`, Color.cyan(), 18);
  return w;

  function addPoints(widget, points, maxPoints, symbol, sstack = null) {
    const stack = sstack ?? widget.addStack();
    const color = points === maxPoints ? Color.green() : Color.red();
    const image = symbol.image;
    const wimg = stack.addImage(image);
    wimg.imageSize = new Size(16, 16);
    wimg.tintColor = color;
    stack.addSpacer(5);
    const wtxt = stack.addText(`${points}/${maxPoints}`);
    wtxt.textColor = color;
    wtxt.font = Font.boldSystemFont(16);
    return stack;
  }

  function addText(widget, text, color, size = 22) {
    const wtxt = widget.addText(text);
    wtxt.font = Font.boldSystemFont(size);
    wtxt.textColor = color;
  }
}

async function searches() {
  const req = new Request(
    'https://gist.githubusercontent.com/deekayen/4148741/raw/98d35708fa344717d8eee15d11987de6c8e26d7d/1-1000.txt'
  );

  const res = await req.loadString();
  const words = res.split(/\r?\n/);
  console.log(args);
  const mode = args.queryParameters.mode ?? 'mobile';
  if (mode === 'mobile') {
    const data = await getData();
    const mobileSearches = data.mobileProgressMax - data.mobileProgress;
    const pcSearches = data.pcProgressMax - data.pcProgress;
    await mobile(mobileSearches / 3, pcSearches / 3);
  } else if (mode === 'desktop') {
    await desktop();
  } else {
    const data = await getData();
    const widget = await createWidget(data);
    widget.presentSmall();
    Safari.open(
      'microsoft-edge-https://account.microsoft.com/rewards/dashboard?refd=www.bing.com'
    );
  }

  async function mobile(mobileSearches, pcSearches) {
    let wv = new WebView();
    for (let i = 0; i < mobileSearches; i++) {
      const url = getSearch();
      if (i === 0) {
        wv.loadURL(url);
        await wv.present();
        wv.present();
      }
      await Promise.any([wv.loadURL(url), wait(2000)]);
    }
    next('desktop', pcSearches);
  }

  async function desktop() {
    const pcSearches = parseInt(args.queryParameters.count);
    for (let i = 0; i < pcSearches; i++) {
      const url = getSearch();
      if (i === 0) {
        await Safari.openInApp(url);
      } else {
        await Promise.any([Safari.openInApp(url), wait(1000)]);
      }
    }
    next('exit');
  }

  function getSearch() {
    const word1 = words[Math.floor(Math.random() * words.length)];
    const word2 = words[Math.floor(Math.random() * words.length)];
    const url = `https://www.bing.com/search?q=${word1}+${word2}`;
    return url;
  }

  function next(mode, count = 0) {
    const scriptUrl = `${URLScheme.forRunningScript()}?mode=${mode}&count=${count}`;
    console.log(scriptUrl);
    Safari.open(scriptUrl);
  }
}

async function getData() {
  let lastUpdated = new Date();
  const wv = new WebView();
  const url = 'https://account.microsoft.com/rewards/';
  await wv.loadURL(url);
  await wait(5000);
  let data = await wv.evaluateJavaScript(
    '(typeof dashboard == "object") ? dashboard : {};'
  );
  const fm = FileManager.iCloud();
  const filePath = fm.joinPath(fm.documentsDirectory(), 'dashboard.json');
  if (!data.userStatus && fm.fileExists(filePath)) {
    await fm.downloadFileFromiCloud(filePath);
    lastUpdated = fm.modificationDate(filePath);
    data = JSON.parse(fm.readString(filePath));
  } else {
    fm.writeString(filePath, JSON.stringify(data));
  }
  const today = new Date().toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
  });
  console.log(today);

  let total = 0,
    streak = 0,
    pcProgress = 0,
    pcProgressMax = 0,
    edgeProgress = 0,
    edgeProgressMax = 0,
    mobileProgress = 0,
    mobileProgressMax = 0;
  daily = [];
  try {
    ({
      streakPromotion: { activityProgress: streak },
      dailySetPromotions: { [today]: daily },
      userStatus: {
        availablePoints: total,
        counters: {
          pcSearch: [
            { pointProgress: pcProgress, pointProgressMax: pcProgressMax },
            { pointProgress: edgeProgress, pointProgressMax: edgeProgressMax },
          ],
          mobileSearch: [
            {
              pointProgress: mobileProgress,
              pointProgressMax: mobileProgressMax,
            },
          ],
        },
      },
    } = data);
  } catch (e) {
    console.log(e);
  }
  let [dailyProgress, dailyProgressMax] = daily.reduce(
    (a, b) => [a[0] + b.pointProgress, a[1] + b.pointProgressMax],
    [0, 0]
  );
  if (new Date().getDate() !== lastUpdated.getDate()) {
    pcProgress = 0;
    mobileProgress = 0;
    edgeProgress = 0;
    dailyProgress = 0;
  }
  return {
    total,
    streak,
    pcProgress,
    pcProgressMax,
    edgeProgress,
    edgeProgressMax,
    mobileProgress,
    mobileProgressMax,
    dailyProgress,
    dailyProgressMax,
    lastUpdated,
  };
}

function wait(ms) {
  return new Promise((resolve) => Timer.schedule(ms, false, resolve));
}
