const {chromium}=require('playwright');const fs=require('fs');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1920,height:1080}});
await p.goto('file://'+__dirname+'/scene.html');
const only=process.argv[2]?process.argv[2].split(',').map(Number):null;
const N=await p.evaluate(()=>TOTAL);const list=only||[...Array(N).keys()];
for(const i of list){const d=await p.evaluate(i=>frame(i),i);fs.writeFileSync(`frames/f${String(i).padStart(4,'0')}.jpg`,Buffer.from(d.split(',')[1],'base64'));}
await b.close();console.log('done',list.length)})();
