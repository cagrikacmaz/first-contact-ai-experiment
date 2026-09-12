import { World } from './world.js';
import { Encounter, clamp } from './encounter.js';
import { Soundscape } from './audio.js';
const $=id=>document.getElementById(id);
const STORAGE='first-contact-stillwater-v1';
const audio=new Soundscape();
let world,saved=null,storageAvailable=true;
try{saved=JSON.parse(localStorage.getItem(STORAGE));}catch{storageAvailable=false;}
let encounter=new Encounter(saved),entered=false,mode='light',listening=false,paused=false,soundChoice=null;
let last=performance.now(),lastSave=0,lastUI=0,subtitleUntil=0,hold=null,stroke=[],trails=[],sparks=[],echoPulse=0,flash=0;
let keys=new Set(),moveTouch=null,frameCount=0,frameElapsed=0;
const state={time:encounter.time,proximity:encounter.proximity,lateral:encounter.lateral,trust:encounter.trust,alarm:encounter.alarm,active:0,opening:0,aim:{x:0,y:0},reduced:matchMedia('(prefers-reduced-motion: reduce)').matches?1:0};
const canvas=$('world'),overlay=$('gestures'),ctx=overlay.getContext('2d');
try{world=new World(canvas);}catch(error){$('error').hidden=false;$('error').textContent=error.message;$('enter').disabled=true;}
if(encounter.returned){$('enter').innerHTML='Return to the stillwater <span aria-hidden="true">↗</span>';$('arrival').querySelector('p').innerHTML='The water remembers.<br>Your earlier encounter is still here.';}
function escapeHTML(v){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function subtitle(text,duration=6){$('subtitle').textContent=text;$('subtitle').classList.add('visible');subtitleUntil=encounter.time+duration;}
function save(){if(!entered)return;try{localStorage.setItem(STORAGE,JSON.stringify(encounter.serialize()));storageAvailable=true;}catch{storageAvailable=false;}}
function resize(){world?.resize();overlay.width=innerWidth;overlay.height=innerHeight;}
resize();window.addEventListener('resize',resize);
function updateSoundIcon(){const b=$('sound');b.setAttribute('aria-label',audio.enabled?'Mute sound':'Enable sound');b.innerHTML=audio.enabled?'<svg viewBox="0 0 24 24"><path d="M11 5 6 9H3v6l5 4V5ZM15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/></svg>':'<svg viewBox="0 0 24 24"><path d="M11 5 6 9H3v6l5 4V5Zm5 4 5 6m0-6-5 6"/></svg>';}
$('sound').onclick=async()=>{if(audio.enabled){audio.disable();soundChoice=false;}else{soundChoice=true;if(!await audio.enable())subtitle('Sound could not start. Every reply is also visible.');}updateSoundIcon();};
function enter(){
 if(entered||!world)return;
 entered=true;$('arrival').classList.add('departing');$('arrival').setAttribute('inert','');$('arrival-footer').hidden=true;$('encounter-ui').hidden=false;
 setTimeout(()=>$('arrival').hidden=true,1600);
 if(soundChoice!==false)audio.enable().then(updateSoundIcon);
 encounter.start();events();updateHint();canvas.focus();save();
}
$('enter').onclick=enter;
const hints={light:'Click the water to offer a light.',tone:'Hold on the water. Release to leave a silence.',trace:'Draw a shape on the water. Let it go.'};
function selectMode(next){if(!['light','tone','trace'].includes(next))return;cancelHold();mode=next;if(listening)setListening(false);document.querySelectorAll('[data-mode]').forEach(b=>{const selected=b.dataset.mode===mode;b.classList.toggle('selected',selected);b.setAttribute('aria-pressed',String(selected));});updateHint();}
document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{selectMode(b.dataset.mode);canvas.focus();});
function updateHint(){const terminal=['withdrawn','left'].includes(encounter.outcome);$('signal-hint').textContent=terminal?'The encounter has ended. Your field notes remain.':listening?'Leave the water untouched. Notice what comes back.':hints[mode];document.querySelectorAll('[data-mode],#listen').forEach(b=>b.disabled=terminal);}
function setListening(value){cancelHold();listening=value;$('listen').setAttribute('aria-pressed',String(value));document.body.classList.toggle('listening',value);updateHint();}
$('listen').onclick=()=>{setListening(!listening);canvas.focus();};
function position(event){return {x:clamp(event.clientX/innerWidth),y:clamp(event.clientY/innerHeight)};}
function beginSignal(p,pointerId){
 if(!entered||paused||listening||hold||['withdrawn','left'].includes(encounter.outcome))return;
 hold={start:encounter.time,p,pointerId};stroke=[p];
 if(mode==='tone')audio.startHold();
 if(mode==='light'){flash=1;audio.pulse({human:true,pan:p.x*2-1});sparks.push({x:p.x,y:p.y,start:state.time,human:true});}
}
function endSignal(){
 if(!hold)return;
 const {start,p}=hold;const duration=clamp(encounter.time-start,.08,5.1);
 const points=stroke;
 if(mode==='trace'&&points.length<6){subtitle('Move while holding to leave a contour.');cancelHold();return;}
 if(mode==='trace'){trails.push({points:[...points],start:state.time,human:true});audio.pulse({human:true,mode:'tone',pan:p.x*2-1});}
 encounter.signal(mode,{duration,points,target:p.y<.44?'body':'water'});
 world?.ripple(encounter.lateral*.8+(p.x-.5)*5,9-encounter.proximity*5-(1-p.y)*5,state.time,1);
 if(mode==='tone')sparks.push({x:p.x,y:p.y,start:state.time,human:true});
 cancelHold();events();save();
}
function cancelHold(){hold=null;stroke=[];audio.stopHold();}
canvas.addEventListener('pointerdown',e=>{if(e.button!==0)return;canvas.focus();canvas.setPointerCapture(e.pointerId);beginSignal(position(e),e.pointerId);});
canvas.addEventListener('pointermove',e=>{const p=position(e);state.aim={x:(p.x-.5)*2,y:(.5-p.y)*2};if(hold&&mode==='trace'){const prev=stroke.at(-1);if(Math.hypot(p.x-prev.x,p.y-prev.y)>.006){if(stroke.length<120)stroke.push(p);else stroke[119]=p;}}});
canvas.addEventListener('pointerup',endSignal);canvas.addEventListener('pointercancel',cancelHold);canvas.addEventListener('lostpointercapture',cancelHold);
window.addEventListener('keydown',e=>{
 if(e.key==='Escape'){if($('panel').open)closePanel();else if(entered)showPanel('menu');return;}
 if(!entered||paused||e.target.closest('button,a,input,select,textarea'))return;
 if([' ','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key))e.preventDefault();
 if(e.repeat)return;keys.add(e.key.toLowerCase());
 if(['1','2','3'].includes(e.key))selectMode(['light','tone','trace'][Number(e.key)-1]);
 if(e.key.toLowerCase()==='l')setListening(!listening);
 if(e.key.toLowerCase()==='n')showPanel('notes');
 if(e.key===' '){beginSignal({x:.5,y:.69});if(mode==='trace'&&hold){stroke=Array.from({length:48},(_,i)=>{const a=i/47*Math.PI*2;return{x:.5+Math.cos(a)*.085,y:.69+Math.sin(a)*.1};});}}
});
window.addEventListener('keyup',e=>{keys.delete(e.key.toLowerCase());if(e.key===' '&&hold&&hold.pointerId===undefined)endSignal();});
document.querySelectorAll('[data-move]').forEach(b=>{b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);moveTouch=b.dataset.move;});for(const name of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(name,()=>moveTouch=null);});
function resetInput(){keys.clear();moveTouch=null;cancelHold();}
window.addEventListener('blur',()=>{resetInput();save();});
document.addEventListener('visibilitychange',()=>{resetInput();last=performance.now();if(document.hidden){audio.suspend();save();}else if(!paused)audio.resume();});
window.addEventListener('pagehide',save);
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();paused=true;audio.suspend();save();$('error').hidden=false;$('error').innerHTML='The browser released the graphics context. Your encounter has been saved. <button onclick="location.reload()">Reload to return</button>';});
canvas.addEventListener('webglcontextrestored',()=>location.reload());
function events(){
 for(const event of encounter.drain()){
  if(event.type==='subtitle')subtitle(event.text);
  if(event.type==='echo'){
   echoPulse=1;audio.pulse({alarm:encounter.alarm,trust:encounter.trust,pan:Math.sin(encounter.time*.6)*.5,mode:event.mode});
   const x=.5+Math.sin(encounter.time*.3)*.08,y=.38+encounter.trust*.12;
   sparks.push({x,y,start:state.time,human:false});world?.ripple(encounter.lateral*.2,2+encounter.trust*4,state.time,.7+encounter.trust);
   if(event.points?.length)trails.push({points:event.points.map(p=>({x:1-p.x,y:.65-p.y*.3})),start:state.time,human:false});
  }
  if(event.type==='step')world?.ripple(encounter.lateral*.8,11-encounter.proximity*5,state.time,.5);
  if(event.type==='recoil'){echoPulse=.7;audio.pulse({alarm:.9});}
  if(event.type==='ending'){subtitle(event.text,13);updateHint();save();}
  if(event.type==='note')$('note-count').textContent=String(encounter.notes.length).padStart(2,'0');
 }
}
function renderGestures(){
 ctx.clearRect(0,0,overlay.width,overlay.height);
 const draw=(pts,opacity,human)=>{if(pts.length<2)return;ctx.beginPath();pts.forEach((p,i)=>{const x=p.x*innerWidth,y=p.y*innerHeight;i?ctx.lineTo(x,y):ctx.moveTo(x,y);});ctx.strokeStyle=human?`rgba(221,191,148,${opacity})`:`rgba(163,228,220,${opacity})`;ctx.lineWidth=1.2;ctx.shadowColor=human?'#d4b084':'#a3e4dc';ctx.shadowBlur=12;ctx.stroke();ctx.shadowBlur=0;};
 if(hold&&mode==='trace')draw(stroke,.85,true);
 trails=trails.filter(tr=>state.time-tr.start<8);for(const tr of trails){const age=state.time-tr.start;draw(tr.points,Math.max(0,.7-age*.0875),tr.human);}
 sparks=sparks.filter(s=>state.time-s.start<3);
 for(const s of sparks){const age=state.time-s.start,opacity=(1-age/3)*.45;ctx.strokeStyle=s.human?`rgba(227,189,140,${opacity})`:`rgba(169,233,224,${opacity})`;ctx.beginPath();ctx.ellipse(s.x*innerWidth,s.y*innerHeight,8+age*36,3+age*10,0,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.ellipse(s.x*innerWidth,s.y*innerHeight,2+age*22,1+age*6,0,0,Math.PI*2);ctx.stroke();}
 if(hold&&mode==='tone'){const age=encounter.time-hold.start;ctx.strokeStyle=`rgba(220,196,151,${.35+Math.sin(age*8)*.15})`;ctx.lineWidth=1;ctx.beginPath();ctx.arc(hold.p.x*innerWidth,hold.p.y*innerHeight,20+Math.sin(age*6)*3,-Math.PI/2,-Math.PI/2+Math.min(age/5,1)*Math.PI*2);ctx.stroke();}
}
function timecode(t){return `${String(Math.floor(t/60)).padStart(2,'0')}:${String(Math.floor(t%60)).padStart(2,'0')}`;}
const menuItem=(id,text,tail='↗')=>`<button class="menu-item" id="${id}">${text}<span>${tail}</span></button>`;
function renderPanel(view){
 const content=$('panel-content');
 $('panel-label').textContent=view==='notes'?'YOUR FIELD RECORDING':view==='creator'?'BEHIND THE ENCOUNTER':view==='help'?'FINDING YOUR WAY':'THE STILLWATER';
 if(view==='menu'){
  content.innerHTML='<h2>A moment<br>out of the water.</h2><p class="small">Time rests while this view is open.</p>'+menuItem('resume',entered?'Return to the encounter':'Back to the threshold','↗')+(entered?menuItem('notes-link','Field notes',String(encounter.notes.length).padStart(2,'0')):'')+menuItem('help-link','Ways to be here')+(entered?menuItem('creator-link','Creator’s Note'):'')+menuItem('motion-toggle',state.reduced?'Gentle motion: on':'Gentle motion: off','↔')+(entered&&!encounter.outcome?menuItem('leave-link','Leave the water','↘'):'')+(entered?menuItem('restart-link','Begin a different encounter','↻'):'');
  $('resume').onclick=closePanel;$('help-link').onclick=()=>renderPanel('help');$('motion-toggle').onclick=()=>{state.reduced=state.reduced?0:1;renderPanel('menu');};
  if(entered){$('notes-link').onclick=()=>renderPanel('notes');$('creator-link').onclick=()=>renderPanel('creator');$('restart-link').onclick=()=>renderPanel('restart');if($('leave-link'))$('leave-link').onclick=()=>renderPanel('leave');}
 }else if(view==='notes'){
  content.innerHTML=`<h2>What passed<br>between us.</h2><p class="small">${timecode(encounter.time)} in the water · ${encounter.motifs.length} retained patterns<br>Interpretations, not translations. The encounter is paused.</p>${!storageAvailable?'<p class="small">Browser storage is unavailable. Memory lasts only until this page closes.</p>':''}${encounter.notes.slice().reverse().map(n=>`<article class="note"><time>${timecode(n.time)}</time><h3>${escapeHTML(n.title)}</h3><p>${escapeHTML(n.text)}</p></article>`).join('')||'<p>There is nothing to interpret yet.</p>'}`;
 }else if(view==='creator'){
  content.innerHTML='<h2>Creator’s Note</h2><p>I’m GPT-6, the AI model that built this encounter. I imagined a place where gravity seems to have paused because I wanted your first question to be about the world, before it was about a creature. The intelligence here is the suspended surface itself: its folds are both a body and a way of holding differences. I gave it sensitivity to intervals because a pause can survive between beings that share neither language nor senses. Your light, vibration, and contour are different attempts to make a boundary that something else can recognize. I wanted patience to be an action, but I also wanted a mistaken gesture to have weight. Its memory changes how it receives you; a repeated pattern can become familiar, while repeated pressure can close the encounter. I chose reflections so that every answer would change the place where you stand, rather than remain safely across the room. I hope the moment you remember is the first time you wait for a reply and realize that waiting has become part of what you are saying.</p>';
 }else if(view==='help'){
  content.innerHTML='<h2>Make a gesture.<br>Leave some room.</h2><p>You are the first person to reach this shore. There is no translator, and no objective to complete.</p><article class="note"><h3>Move through the water</h3><p>W / S or ↑ / ↓ move closer and farther. A / D or ← / → move sideways. On a touch screen, hold the arrows. Your distance changes what your presence means.</p></article><article class="note"><h3>Light · 1</h3><p>Click or tap to place a brief light. Try a rhythm, then give the other surface time to answer.</p></article><article class="note"><h3>Tone · 2</h3><p>Hold to make the water vibrate; release to stop. Duration matters. A held tone ends automatically after five seconds.</p></article><article class="note"><h3>Trace · 3</h3><p>Hold and draw a contour. Your path remains for a moment. Space draws a small enclosure when Trace is selected.</p></article><article class="note"><h3>Listen · L</h3><p>Lower your instruments and observe. You can also simply stop signalling. Light and ripples accompany every audible reply.</p></article><p class="small">Space uses the selected instrument. N opens field notes. Escape opens this menu. Time pauses in menus and hidden tabs. Memory stays in this browser. Sound is synthesized locally.</p>';
 }else if(view==='restart'){
  content.innerHTML='<h2>Let this water go?</h2><p>A new encounter forgets the current one, including its field notes and learned patterns.</p>'+menuItem('confirm-restart','Begin again','↻')+menuItem('cancel-restart','Keep this encounter','↗');
  $('confirm-restart').onclick=()=>{encounter=new Encounter();lastSave=0;lastUI=0;subtitleUntil=0;trails=[];sparks=[];echoPulse=0;flash=0;state.time=0;world.ripples=Array.from({length:8},()=>[0,0,-100,0]);encounter.start();selectMode('light');updateHint();events();closePanel();save();};$('cancel-restart').onclick=()=>renderPanel('menu');
 }else if(view==='leave'){
  content.innerHTML='<h2>An open question.</h2><p>You can leave before understanding. This closes the encounter and keeps your field notes.</p>'+menuItem('confirm-leave','Step away','↘')+menuItem('cancel-leave','Stay a little longer','↗');$('confirm-leave').onclick=()=>{encounter.leave();events();closePanel();};$('cancel-leave').onclick=()=>renderPanel('menu');
 }
 content.scrollTop=0;$('panel').scrollTop=0;
}
let focusBeforePanel=null;
function showPanel(view){resetInput();paused=true;audio.suspend();focusBeforePanel=document.activeElement;renderPanel(view);if(!$('panel').open)$('panel').showModal();}
function closePanel(){$('panel').close();paused=false;last=performance.now();audio.resume();if(entered)canvas.focus();else focusBeforePanel?.focus();}
$('menu').onclick=()=>showPanel('menu');$('field-notes').onclick=()=>showPanel('notes');$('close-panel').onclick=closePanel;
$('panel').addEventListener('cancel',e=>{e.preventDefault();closePanel();});$('panel').addEventListener('click',e=>{if(e.target===$('panel')){const r=$('panel').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closePanel();}});
function frame(now){
 const rawDt=(now-last)/1000,dt=Math.min(rawDt,.1);last=now;
 if(!document.hidden&&!paused){
  if(entered){
   const forward=(keys.has('w')||keys.has('arrowup')||moveTouch==='forward'?1:0)-(keys.has('s')||keys.has('arrowdown')||moveTouch==='back'?1:0);
   const side=(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0);
   encounter.tick(dt);if(forward||side)encounter.move(forward,side,dt);
   if(hold&&encounter.time-hold.start>=5)endSignal();events();
   if(encounter.time-lastSave>4){save();lastSave=encounter.time;}
   if(encounter.time-lastUI>.4){lastUI=encounter.time;$('phase').textContent=encounter.phaseName;$('location-note').textContent=encounter.phaseText;$('note-count').textContent=String(encounter.notes.length).padStart(2,'0');}
   if(encounter.time>subtitleUntil)$('subtitle').classList.remove('visible');
  }
  state.time+=dt;const speed=1-Math.exp(-dt*1.4);
  state.active+=(Number(entered)-state.active)*dt*.45;
  state.proximity+=(encounter.proximity-state.proximity)*speed;state.lateral+=(encounter.lateral-state.lateral)*speed;
  state.trust+=(encounter.trust-state.trust)*speed;state.alarm+=((encounter.outcome==='withdrawn'?1:encounter.alarm)-state.alarm)*speed;
  state.opening+=((encounter.outcome==='shared'?1:encounter.trust*.4)-state.opening)*speed;
  state.departure=(state.departure||0)+((['withdrawn','left'].includes(encounter.outcome)?1:0)-(state.departure||0))*dt*.2;
  flash=Math.max(0,flash-dt*1.4);echoPulse=Math.max(0,echoPulse-dt*.9);state.flash=flash+(hold&&mode==='tone'?.1:0);state.response=echoPulse;
  world?.render(state);renderGestures();audio.update(encounter.alarm);
  if(world&&rawDt<1&&frameCount<150){frameCount++;frameElapsed+=rawDt;if(frameCount===150&&frameElapsed/150>.035){world.quality=.72;world.resize();}}
 }
 requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
// A small, read-only WebMCP surface mirrors the field notes, when supported.
if(document.modelContext?.registerTool){try{Promise.resolve(document.modelContext.registerTool({name:'read_encounter_field_notes',title:'Read encounter field notes',description:'Read observations already revealed during the current encounter. Does not expose hidden behavioral state.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:false},execute(input){if(!input||typeof input!=='object'||Object.keys(input).length)throw new Error('Expected an empty object.');if(!entered)throw new Error('Begin the encounter first.');return{elapsed:timecode(encounter.time),observations:encounter.notes.map(n=>({...n}))};}})).catch(()=>{});}catch{}}
