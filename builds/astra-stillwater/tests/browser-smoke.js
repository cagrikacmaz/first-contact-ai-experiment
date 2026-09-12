// Run in a browser page with agent-browser eval --stdin (not a Node test).
(async()=>{
 const results=[];
 const check=(condition,message)=>{if(!condition)throw new Error(message);results.push(message);};
 const wait=ms=>new Promise(r=>setTimeout(r,ms));
 const click=id=>document.getElementById(id).click();
 const read=()=>JSON.parse(localStorage.getItem('first-contact-stillwater-v1')).state;
 const key=(key,type)=>document.getElementById('world').dispatchEvent(new KeyboardEvent(type,{key,bubbles:true}));
 const pulse=async()=>{key(' ','keydown');await wait(70);key(' ','keyup');};
 if(!document.getElementById('arrival').hidden){click('enter');await wait(1800);}
 click('menu');click('restart-link');click('confirm-restart');
 check(document.getElementById('encounter-ui').hidden===false,'Encounter opens on the interactive world');
 await pulse();await wait(650);await pulse();await wait(1050);await pulse();
 check(read().actions.length===3,'Three keyboard light signals reach the encounter model');
 check(read().motifs.some(m=>m.mode==='light'),'A rhythm is retained from real UI events');
 await wait(5800);
 document.querySelector('[data-mode="trace"]').click();
 check(document.activeElement.id==='world','Selecting an instrument restores keyboard focus to the world');
 await pulse();
 check(read().actions.at(-1).mode==='trace','Keyboard enclosure reaches trace recognition');
 check(read().notes.some(n=>n.title==='An unfinished circle, completed'),'The enclosure produces its distinct field note');
 await wait(4700);
 click('listen');const before=read().actions.length;await pulse();
 check(read().actions.length===before,'Listen lowers the instruments and prevents accidental signalling');
 click('listen');
 document.querySelector('[data-mode="tone"]').click();key(' ','keydown');await wait(1100);key(' ','keyup');
 check(read().actions.at(-1).mode==='tone'&&read().actions.at(-1).duration>.7,'A held tone measures actual input duration');
 click('field-notes');const paused=localStorage.getItem('first-contact-stillwater-v1');await wait(4500);
 check(localStorage.getItem('first-contact-stillwater-v1')===paused,'Opening field notes pauses encounter advancement and saving');
 check(document.getElementById('panel-content').innerText.includes('Interpretations, not translations'),'Notes are presented as interpretations');
 click('close-panel');click('menu');click('creator-link');
 check(document.getElementById('panel-content').innerText.includes('I’m GPT-6'),'The optional Creator’s Note identifies its creator');
 click('close-panel');
 check(document.documentElement.scrollWidth===innerWidth,'The layout has no horizontal overflow');
 check(document.getElementById('error').hidden,'No graphics failure is visible');
 return results;
})()
