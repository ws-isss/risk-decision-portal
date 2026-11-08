import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import path from 'node:path';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{})});
const errors=[];
const shotStyle='.topbar, .demo-timeline, .skip-link { visibility: hidden !important; }';
async function expand(p){if(!await p.locator('#forecast-basis').evaluate(e=>e.open))await p.locator('#forecast-basis > summary').click();}
async function compare(p){
 for(const id of ['A','B']){
  const table=p.locator(`#comparison-table [data-forecast="${id}"] time`),chart=p.locator(`[data-timeline-result="${id}"] time`);
  assert.equal(await chart.getAttribute('datetime'),await table.getAttribute('datetime'));
  assert.equal(await chart.innerText(),await table.innerText());
  assert.equal(await p.locator(`[data-timeline-gap="${id}"]`).innerText(),await p.locator(`#comparison-table [data-gap="${id}"]`).innerText());
  assert.equal(await p.locator(`[data-timeline-plan="${id}"] .ft-key-dates time`).last().getAttribute('datetime'),await p.locator(`#comparison-table [data-metric="window"] [data-plan="${id}"] time`).getAttribute('datetime'));
 }
}
try{
 await mkdir(path.join(root,'output'),{recursive:true});
 for(const lang of ['en','zh']) for(const width of [1440,390]){
  const context=await browser.newContext({offline:true,hasTouch:width===390,viewport:{width,height:1050}}),p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));
  await p.goto(pathToFileURL(path.join(root,'dist/index.html')).href+'#comparison');
  if(lang==='zh'){await p.locator('#language-menu summary').click();await p.locator('[data-language="zh"]').click();}
  const table=p.locator('#comparison-table'),arrangements=table.locator('[data-metric="resources"]');
  const params=await p.evaluate(()=>({queue:DEMO_DATA.plans.B.queueWorkdays,hold:DEMO_DATA.plans.A.holdUntil}));
  assert.match(await arrangements.locator('[data-plan="A"]').innerText(),lang==='zh'?/加急.*无需额外排队/:/Expedited.*No additional queue/);
  assert.ok((await arrangements.locator('[data-plan="B"]').innerText()).includes(String(params.queue)));
  const holdRow=table.locator('[data-metric="hold"]');
  assert.equal(await holdRow.locator('[data-plan="A"] time').getAttribute('datetime'),params.hold);
  assert.match(await holdRow.locator('[data-plan="A"]').innerText(),lang==='zh'?/申请.*上海.*待药明确认.*确认后暂留费不退/s:/Request.*Shanghai.*Subject to WuXi confirmation.*non-refundable/s);
  assert.match(await holdRow.locator('[data-plan="B"]').innerText(),lang==='zh'?/不暂留.*候选窗口尚未确认/s:/No original-window hold.*Candidate window not yet confirmed/s);
  const scope=table.locator('[data-metric="scope"]');
  assert.equal(await scope.locator('td').count(),1);assert.equal(await scope.locator('td').getAttribute('colspan'),'2');
  assert.match(await scope.innerText(),lang==='zh'?/两者相同.*纯化条件筛选.*候选条件确认.*HMW.*回收率.*约定的分析.*不含额外的方法开发/s:/Same for both.*Purification-condition screening.*candidate confirmation.*HMW.*recovery.*agreed analyses.*excludes additional method development/s);
  assert.equal(await p.locator('#cost-details').isVisible(),false);
  await p.locator('#toggle-costs').click();assert.equal(await p.locator('#cost-details').isVisible(),true);await p.locator('#toggle-costs').click();
  assert.equal(await table.evaluate(e=>e.scrollWidth>e.clientWidth+1),false,'Comparison content fits within its table');
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
  await table.screenshot({path:path.join(root,'output',`comparison-${lang}-${width}.png`),style:shotStyle});
  assert.equal(await p.locator('#forecast-basis').evaluate(e=>e.open),false);
  assert.equal(await p.locator('#explain-delivery-gap').innerText(),lang==='zh'?'为什么晚 34 天？':'Why 34 days late?');
  const beforeClock=await p.locator('.demo-clock time').getAttribute('datetime');
  await p.locator('#explain-delivery-gap').click();
  assert.equal(await p.locator('#forecast-basis').evaluate(e=>e.open),true);
  assert.equal(await p.locator('#forecast-timeline').evaluate(e=>e===document.activeElement),true);
  const top=await p.locator('#forecast-timeline').boundingBox(),header=await p.locator('.topbar').boundingBox();
  assert.ok(top.y>=header.y+header.height && top.y<header.y+header.height+45,'Chart starts just below sticky header');
  assert.equal(await p.locator('.demo-clock time').getAttribute('datetime'),beforeClock);
  await compare(p);
  const caption=await p.locator('#forecast-timeline figcaption').innerText();
  assert.match(caption,lang==='zh'?/为什么 B 比 A 晚 42 天/:/Why B arrives 42 days later than A/);
  assert.match(caption,lang==='zh'?/10 个工作日.*2 周（12月16日）.*1月4日.*2月15日/:/10 working days.*2 weeks later \(Dec 16\).*Jan 4.*Feb 15/);
  if(width===390){
   assert.equal(await p.locator('.ft-axis-year').count(),1);
   assert.equal(await p.locator('.ft-axis-year').innerText(),'2027');
   assert.equal(await p.locator('.ft-month-desktop:visible').count(),0);
   const month=p.locator('.ft-month-mobile').nth(2);
   assert.equal(await month.evaluate(e=>getComputedStyle(e).whiteSpace),'nowrap');
  }
  const four=await p.locator('[data-timeline-plan="B"] [data-phase="4"] > b').boundingBox();
  const phase=await p.locator('[data-timeline-plan="B"] [data-phase="4"]').boundingBox();
  const need=await p.locator('[data-timeline-plan="B"] .ft-reference-need').boundingBox();
  assert.ok(four.x-phase.x<10,'Phase number sits at the start of the bar');
  assert.ok(four.x+four.width<need.x || four.x>need.x+need.width,'Need-date line does not obscure phase 4');
  const geometry=()=>p.locator('#forecast-timeline .ft-segment').evaluateAll(nodes=>nodes.map(n=>({phase:n.dataset.phase,start:n.dataset.start,end:n.dataset.end,style:n.getAttribute('style')})));
  const beforeGeometry=await geometry();
  assert.equal(await p.locator('.ft-hatching-note').innerText(),lang==='zh'?'斜线表示等待生产窗口。':'Hatching indicates the wait for a production window.');
  assert.equal(await p.locator('.ft-zone-note > span').innerText(),lang==='zh'?'实验和生产窗口按上海时间，客户审阅和交付按纽约时间。':'Lab work and production windows use Shanghai time; customer review and delivery use New York time.');
  assert.equal(await p.locator('#forecast-timeline .info-content:visible').count(),0);
  // The formerly visible explanatory sentences are retained in their matching tips.
  const checks=lang==='zh'?[/夜间及非工作日交接/,/工艺就绪／窗口使用确认/,/生产准备及缓冲.*斜线/,/交付缓冲.*并行时间不重复累加/,/评估段包含两地工作.*日期明细表.*月份位置.*各节点日期保留其执行地时区/]:[/overnight and non-working-day handoffs/,/readiness \/ window-use confirmation/,/production preparation and its buffer.*Hatching/,/delivery buffer.*Parallel release testing and record review are not added twice/,/assessment phase includes both locations.*detail table.*Month positions.*each labeled date retains its execution time zone/];
  await p.locator('#forecast-timeline').focus();await p.keyboard.press('Tab');
  assert.equal(await p.locator('[data-info="forecast-phase-1"] summary').evaluate(e=>e===document.activeElement),true,'Tab reaches the first information control');
  for(const [i,key] of ['forecast-phase-1','forecast-phase-2','forecast-phase-3','forecast-phase-4','forecast-zones'].entries()){
   const tip=p.locator(`[data-info="${key}"]`),summary=tip.locator('summary'),panel=tip.locator('.info-content');
   await summary.focus();await p.keyboard.press(i%2?'Space':'Enter');await panel.waitFor({state:'visible'});
   assert.match(await panel.innerText(),checks[i]);
   await p.keyboard.press('Escape');assert.equal(await tip.evaluate(e=>e.open),false);
   assert.equal(await summary.evaluate(e=>e===document.activeElement),true,'Escape restores focus to its trigger');
   if(width===390)await summary.tap();else await summary.click();await panel.waitFor({state:'visible'});
   await p.waitForFunction(key=>{const r=document.querySelector(`[data-info="${key}"] .info-content`).getBoundingClientRect();return r.x>=11 && r.right<=innerWidth-11 && r.top>=0 && r.bottom<=innerHeight;},key);
   await summary.click();assert.equal(await tip.evaluate(e=>e.open),false);
  }
  assert.deepEqual(await geometry(),beforeGeometry,'Opening explanatory tips never changes chart geometry or dates');
  await compare(p);
  assert.match(await p.locator('[data-reference="hold"]').innerText(),lang==='zh'?/拟暂留至/:/Proposed hold until/);
  assert.equal(await p.locator('.basis-table-wrap tbody tr').count(),20);
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
  await p.locator('#forecast-timeline h4').click();
  await p.locator('#forecast-timeline').screenshot({path:path.join(root,'output',`forecast-${lang}-${width}.png`),style:shotStyle});
  for(const date of ['2026-09-10','2027-07-19']){
   await p.locator('#edit-requirement').click();await p.locator('#requirement-date').fill(date);await p.locator('#requirement-form [type="submit"]').click();await expand(p);await compare(p);
   const chart=p.locator('#forecast-timeline'),at=Date.parse(date+'T12:00:00Z');
   assert.ok(Date.parse(await chart.getAttribute('data-axis-start'))<=at && Date.parse(await chart.getAttribute('data-axis-end'))>at);
   assert.equal(await p.locator('[data-reference="need"] time').getAttribute('datetime'),date);
   assert.equal(await p.locator('#forecast-timeline figcaption').innerText(),caption,'Changing the need date does not change A versus B delivery difference');
   const late=await p.evaluate(date=>-DEMO_CORE.calendarGap(date,DEMO_DATA.plans.B.forecast.localDate),date);
   if(late>0) assert.ok((await p.locator('#explain-delivery-gap').innerText()).includes(String(late)));
   else assert.equal(await p.locator('#explain-delivery-gap').count(),0);
   assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
  }
  // Existing chapter drives internal scheduling and the separate customer receipt.
  await p.locator('#chapter-select').selectOption('hold');
  await p.locator('#start-resource-review').click();await p.locator('#advance-event').click();await p.locator('#demo-next-step').click();
  await p.locator('#confirm-resource-response').click();await expand(p);
  assert.match(await p.locator('[data-reference="hold"]').innerText(),lang==='zh'?/拟暂留至/:/Proposed hold until/);
  await p.locator('#demo-next-step').click();await p.locator('#return-resource-receipt').click();await expand(p);await compare(p);
  assert.match(await p.locator('[data-reference="hold"]').innerText(),lang==='zh'?/已暂留至/:/Held until/);
  assert.match(await p.locator('#comparison-table [data-metric="hold"] [data-plan="A"]').innerText(),lang==='zh'?/已暂留至.*已产生且不退/s:/held until.*incurred and non-refundable/s);
  await p.locator('#forecast-timeline').screenshot({path:path.join(root,'output',`forecast-held-${lang}-${width}.png`)});
  await p.locator('#chapter-select').selectOption('unavailable');await p.locator('#resource-response-form select').selectOption('unavailable');await p.locator('#confirm-resource-response').click();await p.locator('#demo-next-step').click();await p.locator('#return-resource-receipt').click();await expand(p);
  assert.equal(await p.locator('#forecast-timeline [data-phase="4"], #forecast-timeline [data-timeline-result], #forecast-timeline [data-timeline-gap]').count(),0);
  assert.equal(await p.locator('[data-forecast-unknown]').count(),2);
  assert.match(await p.locator('#comparison-table [data-metric="hold"] [data-plan="A"]').innerText(),lang==='zh'?/无法暂留/:/hold unavailable/);
  assert.equal(await p.locator('#comparison-table [data-metric="hold"] [data-plan="A"] time').count(),0);
  assert.equal(await p.locator('#explain-delivery-gap').count(),0,'No obsolete late-date link after reassessment');
  assert.equal(await p.locator('.ft-track [data-forecast-unknown]').count(),0,'Unknown delivery is outside the scale');
  assert.equal(await p.locator('#forecast-timeline time[datetime^="2027-03-11"], #forecast-timeline time[datetime^="2027-04-22"]').count(),0);
  assert.match(await p.locator('[data-reference="hold"]').innerText(),lang==='zh'?/已失效/:/no longer valid/);
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
  await p.locator('#forecast-timeline').screenshot({path:path.join(root,'output',`forecast-invalid-${lang}-${width}.png`)});
  await context.close();
 }
 assert.deepEqual(errors,[]);console.log('Forecast browser checks passed: English/Chinese, desktop/mobile offline, retained explanatory tips with touch and Tab/Enter/Space/Escape, unchanged geometry, table/date/gap parity, editable need-date axis, client receipt boundary, invalid forecasts without dated endpoints and preserved detail table.');
}finally{await browser.close();}
