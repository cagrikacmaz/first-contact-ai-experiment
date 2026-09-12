// The encounter is a bounded, continuous simulation. All timing uses active time.
export const clamp=(v,lo=0,hi=1)=>Math.max(lo,Math.min(hi,v));
export class Encounter {
 constructor(saved){
  this.time=0;this.trust=.08;this.alarm=.08;this.curiosity=.35;this.proximity=0;this.lateral=0;
  this.lastAction=0;this.nextInitiative=8;this.lastSilence=0;this.lastStep=0;this.actions=[];this.notes=[];this.motifs=[];this.queue=[];
  this.successes=0;this.interruptions=0;this.outcome=null;this.phase='threshold';this.echoUntil=0;this.lastMode=null;this.returned=false;
  this.events=[];this.sequence=0;
  if(saved?.version===1){
   const s=saved.state;
   if(s && Number.isFinite(s.time) && s.time>=0 && s.time<1e8){
    for(const key of ['time','lastAction','nextInitiative','lastSilence','lastStep','echoUntil','sequence','successes','interruptions'])if(Number.isFinite(s[key]))this[key]=clamp(s[key],0,1e8);
    for(const key of ['trust','alarm','curiosity','proximity'])if(Number.isFinite(s[key]))this[key]=clamp(s[key]);
    if(Number.isFinite(s.lateral))this.lateral=clamp(s.lateral,-1,1);
    this.actions=Array.isArray(s.actions)?s.actions.filter(a=>a&&Number.isFinite(a.time)&&['light','tone','trace','step'].includes(a.mode)).slice(-80):[];
    this.notes=Array.isArray(s.notes)?s.notes.filter(n=>n&&typeof n.title==='string'&&typeof n.text==='string'&&Number.isFinite(n.time)).slice(-40):[];
    this.motifs=Array.isArray(s.motifs)?s.motifs.filter(m=>m&&['light','tone','trace'].includes(m.mode)&&Array.isArray(m.pattern)&&m.pattern.every(Number.isFinite)).slice(-8):[];
    this.outcome=['shared','withdrawn','left'].includes(s.outcome)?s.outcome:null;
    this.nextInitiative=this.time+5;this.echoUntil=this.time;this.returned=true;
   }
  }
 }
 emit(type,data={}){this.events.push({type,...data});}
 note(title,text){this.notes.push({time:this.time,title,text});this.notes=this.notes.slice(-40);this.emit('note');}
 start(){
  if(this.returned){this.emit('subtitle',{text:'The water kept the shape of your absence.'});this.note('A return, not a beginning','The earlier encounter remains in local memory. Its distance and disposition have not reset.');}
  else{this.note('Arrival','A suspended surface changes its rhythm as you enter. There is no evidence yet that it distinguishes you from the water.');this.emit('subtitle',{text:'You take one step. The water takes another.'});}
 }
 get phaseName(){return this.outcome==='shared'?'A SHARED INTERVAL':this.outcome==='withdrawn'?'THE FAR SHORE':this.outcome==='left'?'AFTER YOUR LEAVING':this.alarm>.57?'A FRACTURE IN THE WATER':this.trust>.52?'THE SPACE BETWEEN':this.actions.length>2?'AN ANSWERING SHAPE':'THE THRESHOLD';}
 get phaseText(){return this.outcome==='shared'?'For a moment, neither rhythm belongs to one of you.':this.outcome==='withdrawn'?'The surface has folded beyond your reach.':this.outcome==='left'?'Something remains, on the other side of the silence.':this.alarm>.57?'The reflection breaks before the surface does.':this.trust>.52?'Its light is arriving closer to your feet.':this.actions.length>2?'Your gestures no longer disappear without a trace.':'Water at your ankles. No footprints behind you.';}
 signal(mode,{duration=.15,points=[],target='water'}={}){
  if(this.outcome==='withdrawn'||this.outcome==='left')return false;
  if(!['light','tone','trace'].includes(mode))return false;
  duration=clamp(Number(duration)||.15,.05,8);
  const previous=this.actions.filter(a=>a.mode!=='step').at(-1);
  const gap=previous?this.time-previous.time:10;
  const interrupted=this.time<this.echoUntil;
  const crowded=gap<.3 || duration>3.4 || interrupted;
  const act={mode,time:this.time,duration,target};
  this.lastAction=this.time;this.lastMode=mode;this.lastSilence=this.time;
  this.actions.push(act);this.actions=this.actions.slice(-80);
  this.curiosity=clamp(this.curiosity+.035);
  if(crowded){
   this.alarm=clamp(this.alarm+(duration>3.4?.21:interrupted?.12:.13));this.trust=clamp(this.trust-.045);this.interruptions++;
   if(this.interruptions===1 || this.interruptions%4===0){this.note('Two voices occupying the same space',duration>3.4?'The sustained vibration overwhelmed its smaller variations. The membrane tightened and rose.':'Your signal arrived before the previous interval had cleared. It pulled away; repetition may be reading as pressure.');this.emit('subtitle',{text:'Its light draws inward.'});}
   this.emit('recoil');
  }else{
   this.trust=clamp(this.trust+.018);this.alarm=clamp(this.alarm-.025);
   if(mode==='light'&&target==='body'&&this.proximity>.6&&this.trust<.4){this.alarm=clamp(this.alarm+.11);this.note('A light too near','A signal directed into the membrane at close range coincided with a contraction. The water had carried the same signal more gently.');}
  }
  if(mode==='trace'){
   const clean=points.filter(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)).slice(0,120);
   if(clean.length>5){
    let length=0,turning=0;for(let i=1;i<clean.length;i++){length+=Math.hypot(clean[i].x-clean[i-1].x,clean[i].y-clean[i-1].y);if(i>1){const a=clean[i],b=clean[i-1],c=clean[i-2];turning+=Math.abs((a.x-b.x)*(b.y-c.y)-(a.y-b.y)*(b.x-c.x));}}
    const closed=Math.hypot(clean[0].x-clean.at(-1).x,clean[0].y-clean.at(-1).y)<Math.max(.045,length*.17);
    if(closed&&length>.15&&!crowded){this.trust=clamp(this.trust+.085);this.successes++;this.remember('trace',[length,1]);this.scheduleEcho('trace',[0,1.1],clean);this.note('An unfinished circle, completed','It carried your enclosure into its own surface. A boundary with room inside may be meaningful to it.');}
    else{this.curiosity=clamp(this.curiosity+.07);this.scheduleEcho('trace',[0],clean);this.note('A contour held in suspension','It retained the contour, but changed its orientation. A reply is visible; agreement is uncertain.');}
   }
  }else{
   const recent=this.actions.filter(a=>a.mode===mode&&this.time-a.time<9).slice(-3);
   if(recent.length===3){
    const intervals=[recent[1].time-recent[0].time,recent[2].time-recent[1].time];
    const measured=intervals.every(n=>n>=.42&&n<=3.2);
    const learned=this.motifs.find(m=>m.mode===mode&&m.pattern.length===2&&intervals.every((n,i)=>Math.abs(n-m.pattern[i])<.4));
    if(measured&&!crowded){
     this.trust=clamp(this.trust+(learned?.12:.075));this.successes++;this.remember(mode,intervals);
     this.scheduleEcho(mode,[0,intervals[0],intervals[0]+intervals[1]]);
     this.note(learned?'An interval remembered':'A rhythm returned',learned?'A pattern you used earlier returned sooner and from nearer the water. The history of this gesture changed its reception.':'It returned the spacing of your last three signals. Their pauses survived even though their color and pitch changed.');
     this.emit('subtitle',{text:learned?'It remembers the space you left.':'Three gestures. Three answers. Something stayed the same.'});
    }
   }
   if(mode==='tone'&&duration>=.7&&duration<=2.6&&!crowded){this.trust=clamp(this.trust+.035);if(this.actions.filter(a=>a.mode==='tone').length===1)this.note('The water carries a vibration','The lower folds vibrated with the held tone. Duration seemed to matter more than loudness.');this.scheduleEcho('tone',[0,duration+.4]);}
  }
  this.evaluate();return true;
 }
 remember(mode,pattern){this.motifs.push({mode,pattern:pattern.map(n=>clamp(n,0,10)),time:this.time});this.motifs=this.motifs.slice(-8);}
 scheduleEcho(mode,beats,points){
  if(this.alarm>.85)return;
  const delay=2.7-this.trust*.7,start=this.time+delay;
  for(const beat of beats)this.queue.push({at:start+beat,type:'echo',mode,points,learned:true});
  this.echoUntil=Math.max(this.echoUntil,start+beats.at(-1)+.7);this.nextInitiative=this.echoUntil+13;
 }
 move(forward,side,dt){
  if(this.outcome==='left')return;
  const old=this.proximity;this.proximity=clamp(this.proximity+forward*dt*.105);this.lateral=clamp(this.lateral+side*dt*.2,-1,1);
  if(Math.abs(this.proximity-old)+Math.abs(side)>0){
   this.lastAction=this.time;
   if(this.time-this.lastStep>.9){this.lastStep=this.time;this.emit('step');}
   if(forward>0&&this.proximity>.57&&this.trust<.42){this.alarm=clamp(this.alarm+dt*.064);}
   if(forward<0&&this.alarm>.3){this.alarm=clamp(this.alarm-dt*.05);this.trust=clamp(this.trust+dt*.008);}
  }
  this.evaluate();
 }
 tick(dt){
  dt=clamp(dt,0,.2);this.time+=dt;
  const due=this.queue.filter(e=>e.at<=this.time);this.queue=this.queue.filter(e=>e.at>this.time);
  for(const e of due)this.emit(e.type,e);
  const quiet=this.time-this.lastAction;
  if(!this.outcome){
   if(quiet>5){this.alarm=clamp(this.alarm-dt*(this.proximity<.5?.018:.006));}
   if(quiet>6&&this.time-this.lastSilence>15&&this.actions.length){
    this.lastSilence=this.time;this.trust=clamp(this.trust+.04);this.curiosity=clamp(this.curiosity+.025);
    if(!this.notes.some(n=>n.title==='A silence with edges')){this.note('A silence with edges','After your gesture, you left room for an answer. The membrane descended and widened. Silence after an action appears different from absence.');this.emit('subtitle',{text:'You leave a silence. It puts something inside it.'});}
   }
   if(this.time>=this.nextInitiative){
    this.nextInitiative=this.time+18+this.alarm*12;
    if(quiet>80&&this.successes===0){this.alarm=clamp(this.alarm+.03);this.emit('subtitle',{text:'It turns toward something farther away.'});}
    else{
     const remembered=this.motifs.at(-1);const beats=remembered&&remembered.mode!=='trace'?[0,remembered.pattern[0],remembered.pattern[0]+remembered.pattern[1]]:[0,.72,1.9];
     this.echoUntil=this.time+beats.at(-1)+.7;
     for(const b of beats)this.queue.push({at:this.time+b,type:'echo',mode:remembered?.mode||'light',learned:!!remembered});
     if(this.sequence++===0){this.note('The first initiative','Three changes in its surface, separated by unequal pauses. They began without a signal from you.');this.emit('subtitle',{text:'A light. Another. Then a longer pause.'});}
    }
   }
  }else if(this.outcome==='shared'&&this.time>=this.nextInitiative){this.nextInitiative=this.time+11;this.emit('echo',{mode:this.motifs.at(-1)?.mode||'light',learned:true});}
  this.evaluate();
 }
 evaluate(){
  if(this.outcome)return;
  if(this.alarm>=.96){this.outcome='withdrawn';this.queue=[];this.note('The far shore','The accumulated pressure exceeded what the membrane could hold. It contracted and moved beyond reach. Later silence cannot undo this encounter.');this.emit('ending',{outcome:'withdrawn',text:'The water still moves. It no longer moves toward you.'});}
  else if(this.trust>=.77&&this.successes>=3&&this.time>35){this.outcome='shared';this.alarm=.05;this.note('A shared interval','Its next pulse began inside the pause you had been leaving. Repeated patterns and room for replies formed a temporary shared rhythm. This is contact, not translation.');this.emit('ending',{outcome:'shared',text:'For a moment, the next gesture belongs to neither of you.'});}
 }
 leave(){if(this.outcome)return;this.outcome='left';this.queue=[];this.note('A deliberate departure','You stepped away while a reply was still possible. The encounter ended in an open question.');this.emit('ending',{outcome:'left',text:'You leave the question open.'});}
 drain(){const e=this.events;this.events=[];return e;}
 serialize(){const {events,queue,...state}=this;return {version:1,state};}
}
