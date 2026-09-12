export class Soundscape {
 constructor(){this.enabled=false;this.ctx=null;this.hold=null;}
 async enable(){
  try{
   if(!this.ctx){
    this.ctx=new(window.AudioContext||window.webkitAudioContext)();const c=this.ctx;
    this.master=c.createGain();this.master.gain.value=.45;this.master.connect(c.destination);
    const comp=c.createDynamicsCompressor();comp.threshold.value=-22;comp.ratio.value=5;comp.connect(this.master);this.output=comp;
    const noise=c.createBuffer(1,c.sampleRate*4,c.sampleRate),d=noise.getChannelData(0);let last=0;
    for(let i=0;i<d.length;i++){last=(last+.022*(Math.random()*2-1))/1.022;d[i]=last*3;}
    const bed=c.createBufferSource();bed.buffer=noise;bed.loop=true;
    const filter=c.createBiquadFilter();filter.type='lowpass';filter.frequency.value=370;const gain=c.createGain();gain.gain.value=.17;bed.connect(filter).connect(gain).connect(comp);bed.start();
    this.drone=c.createGain();this.drone.gain.value=.055;this.drone.connect(comp);
    for(const frequency of [43.65,65.4,87.42]){const o=c.createOscillator();o.frequency.value=frequency;o.connect(this.drone);o.start();}
    const ir=c.createBuffer(2,c.sampleRate*2.5,c.sampleRate);for(let ch=0;ch<2;ch++){const a=ir.getChannelData(ch);for(let i=0;i<a.length;i++)a[i]=(Math.random()*2-1)*Math.pow(1-i/a.length,3)*.28;}
    this.reverb=c.createConvolver();this.reverb.buffer=ir;this.reverb.connect(comp);
   }
   await this.ctx.resume();this.enabled=true;this.master.gain.setTargetAtTime(.45,this.ctx.currentTime,.3);return true;
  }catch{this.enabled=false;return false;}
 }
 disable(){this.enabled=false;this.stopHold();if(this.ctx)this.master.gain.setTargetAtTime(0,this.ctx.currentTime,.15);}
 pulse({human=false,alarm=0,trust=0,pan=0,mode='light'}={}){
  if(!this.enabled||!this.ctx)return;
  const c=this.ctx,t=c.currentTime,o=c.createOscillator(),g=c.createGain(),p=c.createStereoPanner();
  const freq=human?(mode==='tone'?174.6:261.6):130.8*(1+trust*.5+alarm*.8);
  o.type='sine';o.frequency.setValueAtTime(freq,t);o.frequency.exponentialRampToValueAtTime(freq*(human?.98:1.25),t+.6);
  g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(human?.11:.16,t+.055);g.gain.exponentialRampToValueAtTime(.0001,t+1.9);p.pan.value=Math.max(-1,Math.min(1,pan));
  o.connect(g).connect(p);p.connect(this.output);p.connect(this.reverb);o.start(t);o.stop(t+2);o.onended=()=>{o.disconnect();g.disconnect();p.disconnect();};
 }
 startHold(){if(!this.enabled||!this.ctx||this.hold)return;const c=this.ctx,o=c.createOscillator(),g=c.createGain();o.frequency.value=174.6;g.gain.value=0;g.gain.setTargetAtTime(.08,c.currentTime,.3);o.connect(g);g.connect(this.output);g.connect(this.reverb);o.start();this.hold={o,g};}
 stopHold(){if(!this.hold)return;const {o,g}=this.hold;const t=this.ctx.currentTime;g.gain.setTargetAtTime(0,t,.08);o.stop(t+.5);o.onended=()=>{o.disconnect();g.disconnect();};this.hold=null;}
 update(alarm){if(this.ctx&&this.enabled)this.drone.gain.setTargetAtTime(.045+alarm*.045,this.ctx.currentTime,.6);}
 suspend(){this.stopHold();if(this.ctx?.state==='running')this.ctx.suspend().catch(()=>{});}
 resume(){if(this.enabled&&this.ctx)this.ctx.resume().catch(()=>{});}
}
