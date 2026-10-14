/* Optional browser checks. Requires Playwright; the application itself has no dependencies. */
const assert = require('node:assert/strict');
const { mkdir } = require('node:fs/promises');
const { chromium } = require('playwright');

const baseURL = process.env.BASE_URL || 'http://127.0.0.1:8000';
const frame = page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
const zoom = async page => Number((await page.locator('#zoom-label').textContent()).replace('%',''));

(async () => {
  await mkdir('test-results',{recursive:true});
  const browser = await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH ? {executablePath:process.env.CHROMIUM_PATH} : {}),args:['--no-sandbox']});
  let checks = 0;
  const checked = message => { checks++;console.log(`PASS ${message}`); };
  const errors = [];
  function monitor(page) {
    page.on('pageerror',error=>errors.push(error.message));
    page.on('console',message=>{ if (message.type()==='error') errors.push(message.text()); });
    page.on('requestfailed',request=>errors.push(`Failed request: ${request.url()}`));
    page.on('response',response=>{ if (response.status()>=400) errors.push(`HTTP ${response.status()}: ${response.url()}`); });
  }
  async function ready(page) {
    await page.goto(baseURL);
    await page.waitForFunction(() => {
      const canvas=document.querySelector('#city-canvas');
      return canvas.width>300 && canvas.getContext('2d').getImageData(canvas.width/2,canvas.height/2,1,1).data[3]>0;
    });
    await frame(page);
    assert.equal(await page.locator('#map-error').isVisible(),false);
  }
  try {
    const page=await browser.newPage({viewport:{width:1440,height:1000}});
    monitor(page);await ready(page);
    assert.equal(await page.locator('#house-count').textContent(),'21');
    assert.equal(await page.locator('#tree-count').textContent(),'32');
    assert.equal(await page.locator('#object-picker option').count(),54);
    checked('Desktop startup, assets and object counts');
    await page.screenshot({path:'test-results/desktop.png'});

    const initialZoom=await zoom(page);
    await page.locator('#zoom-in').click();assert.ok(await zoom(page)>initialZoom);
    await page.locator('#zoom-out').click();assert.ok(Math.abs(await zoom(page)-initialZoom)<=1);
    const box=await page.locator('#city-canvas').boundingBox();
    await page.mouse.move(box.x+box.width/2,box.y+box.height/2);
    await page.mouse.wheel(0,-100);
    await page.waitForFunction(initial=>Number(document.querySelector('#zoom-label').textContent.replace('%',''))>initial,initialZoom);
    for (let i=0;i<20;i++) await page.locator('#zoom-in').click({force:true});
    assert.equal(await zoom(page),250);assert.equal(await page.locator('#zoom-in').isDisabled(),true);
    for (let i=0;i<30;i++) await page.locator('#zoom-out').click({force:true});
    assert.equal(await zoom(page),30);assert.equal(await page.locator('#zoom-out').isDisabled(),true);
    await page.locator('#reset-view').click();assert.equal(await zoom(page),initialZoom);
    checked('Zoom buttons, wheel, limits and fit reset');

    await page.mouse.move(5,5);await frame(page);
    const withoutGrid=await page.locator('#city-canvas').screenshot();
    await page.locator('#grid-toggle').click();await frame(page);
    assert.equal(await page.locator('#grid-toggle').getAttribute('aria-pressed'),'true');
    assert.notDeepEqual(await page.locator('#city-canvas').screenshot(),withoutGrid);
    await page.locator('#grid-toggle').click();checked('Grid visibly renders and toggles');

    await page.locator('#object-picker').selectOption('townhouse-1');await frame(page);
    assert.equal(await page.locator('#selected-coordinate').textContent(),'X 3 / Y 4');
    assert.equal(await page.locator('#selected-footprint').textContent(),'1 × 1 ô');
    assert.equal(await page.locator('#inspector').isVisible(),true);
    await page.locator('#close-inspector').click();
    const clickX=box.x+box.width/2;
    const clickY=box.y+box.height/2+20-25*(await zoom(page)/100);
    await page.mouse.click(clickX,clickY);await frame(page);
    assert.equal(await page.locator('#selected-id').textContent(),'townhouse-1');
    assert.equal(await page.locator('#inspector').isVisible(),true);
    checked('Accessible object picker and actual sprite hit detection');

    await page.mouse.move(clickX,clickY);await page.mouse.down();
    await page.mouse.move(clickX+180,clickY-80,{steps:12});await page.mouse.up();await frame(page);
    assert.equal(await page.locator('#selected-id').textContent(),'townhouse-1');
    await page.locator('#close-inspector').click();
    await page.mouse.click(clickX+180,clickY-80);await frame(page);
    assert.equal(await page.locator('#selected-id').textContent(),'townhouse-1');
    assert.equal(await page.locator('#inspector').isVisible(),true);
    checked('Dragging moves the object by the expected screen offset without selecting on release');

    await page.locator('#city-canvas').focus();await page.keyboard.press('Escape');
    assert.equal(await page.locator('#inspector').isVisible(),false);
    await page.keyboard.press('Home');assert.equal(await zoom(page),initialZoom);
    await page.keyboard.press('+');assert.ok(await zoom(page)>initialZoom);
    await page.keyboard.press('-');assert.equal(await zoom(page),initialZoom);
    await page.mouse.move(5,5);await frame(page);
    const beforeKeyboardPan=await page.locator('#city-canvas').screenshot();
    await page.locator('#city-canvas').focus();await page.keyboard.press('ArrowRight');await frame(page);
    assert.notDeepEqual(await page.locator('#city-canvas').screenshot(),beforeKeyboardPan);
    await page.keyboard.press('Home');checked('Keyboard pan, zoom, fit and deselect');

    await page.setViewportSize({width:900,height:700});await frame(page);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await page.locator('#reset-view').click();await frame(page);
    checked('Tablet resize without horizontal overflow');

    const mobile=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
    monitor(mobile);await ready(mobile);
    assert.ok(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await mobile.screenshot({path:'test-results/mobile.png'});
    await mobile.locator('#zoom-in').tap();assert.ok(await zoom(mobile)>30);
    await mobile.locator('#reset-view').tap();
    const session=await mobile.context().newCDPSession(mobile);
    const mobileZoom=await zoom(mobile);
    await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:130,y:450,id:1},{x:250,y:450,id:2}]});
    await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:90,y:450,id:1},{x:290,y:450,id:2}]});
    await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await frame(mobile);
    assert.ok(await zoom(mobile)>mobileZoom);
    assert.equal(await mobile.locator('#inspector').isVisible(),false);
    const beforeTouchPan=await mobile.locator('#city-canvas').screenshot();
    await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:180,y:420,id:3}]});
    await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:225,y:460,id:3}]});
    await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await frame(mobile);
    assert.notDeepEqual(await mobile.locator('#city-canvas').screenshot(),beforeTouchPan);
    assert.equal(await mobile.locator('#inspector').isVisible(),false);
    await mobile.locator('#object-picker').selectOption('cottage-2');
    assert.equal(await mobile.locator('#selected-coordinate').textContent(),'X 7 / Y 4');
    checked('Mobile layout, Retina canvas, touch buttons, pinch, drag and selection');

    assert.deepEqual(errors,[]);checked('No JavaScript errors, failed assets or HTTP errors during interactions');
    console.log(`${checks} browser checks passed. Screenshots: test-results/desktop.png, test-results/mobile.png`);
  } finally { await browser.close(); }
})().catch(error=>{ console.error(error);process.exitCode=1; });
