// Browser evaluator script. Resets the evaluator browser's encounter.
(async()=>{
 const results=[];
 const wait=ms=>new Promise(r=>setTimeout(r,ms));
 const click=id=>document.getElementById(id).click();
 const read=()=>JSON.parse(localStorage.getItem('first-contact-stillwater-v1')).state;
 const check=(ok,text)=>{if(!ok)throw new Error(text);results.push(text);};
 const restart=()=>{click('menu');click('restart-link');click('confirm-restart');};
 if(!document.getElementById('arrival').hidden){click('enter');await wait(1700);}
 restart();
 const c=document.getElementById('world');
 for(let i=0;i<15;i++){c.dispatchEvent(new KeyboardEvent('keydown',{key:' ',bubbles:true}));c.dispatchEvent(new KeyboardEvent('keyup',{key:' ',bubbles:true}));await wait(110);}
 check(read().outcome==='withdrawn','Rapid UI signals cause withdrawal');
 check([...document.querySelectorAll('[data-mode]')].every(b=>b.disabled),'Withdrawal disables the visible instruments');
 await wait(1300);
 check(document.getElementById('phase').textContent==='THE FAR SHORE','Withdrawal reaches the visible scene caption');
 restart();
 check(read().outcome===null&&read().motifs.length===0,'Confirmed restart resets the old outcome and learned patterns');
 click('menu');click('leave-link');click('confirm-leave');
 check(read().outcome==='left','Deliberate departure closes and saves the encounter');
 check(document.getElementById('signal-hint').textContent.includes('ended'),'Departure is reflected in the visible controls');
 return results;
})()
