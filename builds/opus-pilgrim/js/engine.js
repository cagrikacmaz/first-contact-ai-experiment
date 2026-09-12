// ═══════════════════════════════════════════════════════════
//  FIRST CONTACT — Engine Layer
//  Utilities, Noise, Audio, Environment
// ═══════════════════════════════════════════════════════════
'use strict';
window.FC = {};

// ── Configuration ──
FC.Config = {
  SNOW_COUNT: 350,
  ENTITY_PARTICLES: 180,
  ENTITY_START_DIST: 1.0,
  SIGNAL_COOLDOWN: 0.6,
  TRUST_DECAY: 0.0004,
  FEAR_DECAY: 0.004,
  CURIOSITY_DRIFT: 0.0004,
};

// ── Utilities ──
FC.U = {
  lerp: (a,b,t) => a+(b-a)*t,
  clamp: (v,lo,hi) => Math.max(lo,Math.min(hi,v)),
  map: (v,a,b,c,d) => c+((v-a)/(b-a))*(d-c),
  rand: (lo=0,hi=1) => lo+Math.random()*(hi-lo),
  randInt: (lo,hi) => Math.floor(lo+Math.random()*(hi-lo+1)),
  dist: (x1,y1,x2,y2) => Math.hypot(x2-x1,y2-y1),
  rgba: (r,g,b,a) => `rgba(${r},${g},${b},${a})`,
  hsla: (h,s,l,a) => `hsla(${h},${s}%,${l}%,${a})`,
  TAU: Math.PI*2,
};

// ── Noise (value noise with fBm) ──
FC.Noise = class {
  constructor(seed=42){
    this.p = new Uint8Array(512);
    const t = new Uint8Array(256);
    for(let i=0;i<256;i++) t[i]=i;
    let s=seed;
    for(let i=255;i>0;i--){s=(s*16807)%2147483647;const j=s%(i+1);[t[i],t[j]]=[t[j],t[i]];}
    for(let i=0;i<512;i++) this.p[i]=t[i&255];
  }
  n2(x,y){
    const P=this.p, xi=Math.floor(x)&255, yi=Math.floor(y)&255;
    const xf=x-Math.floor(x), yf=y-Math.floor(y);
    const u=xf*xf*(3-2*xf), v=yf*yf*(3-2*yf);
    const aa=P[P[xi]+yi]/255, ab=P[P[xi]+yi+1]/255;
    const ba=P[P[xi+1]+yi]/255, bb=P[P[xi+1]+yi+1]/255;
    return aa+u*(ba-aa)+v*((ab+u*(bb-ab))-(aa+u*(ba-aa)));
  }
  fbm(x,y,oct=4){
    let v=0,a=1,f=1,m=0;
    for(let i=0;i<oct;i++){v+=this.n2(x*f,y*f)*a;m+=a;a*=.5;f*=2;}
    return v/m;
  }
};

// ── Audio Engine ──
FC.Audio = class {
  constructor(){this.ctx=null;this.ok=false;this.droneGain=null;this.waterGain=null;this.masterGain=null;}

  init(){
    try{
      this.ctx=new(window.AudioContext||window.webkitAudioContext)();
      this.masterGain=this.ctx.createGain();
      this.masterGain.gain.value=0.35;
      this.comp=this.ctx.createDynamicsCompressor();
      this.comp.threshold.value=-24;
      this.comp.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);
      this.ok=true;
      this._startDrone();
      this._startWater();
    }catch(e){console.warn('Audio unavailable:',e);}
  }

  _startDrone(){
    if(!this.ok)return;
    const t=this.ctx.currentTime;
    const oscs=[[35,'sine'],[52,'sine'],[42,'triangle']];
    this.droneGain=this.ctx.createGain();
    this.droneGain.gain.setValueAtTime(0,t);
    this.droneGain.gain.linearRampToValueAtTime(0.1,t+5);
    const filt=this.ctx.createBiquadFilter();
    filt.type='lowpass';filt.frequency.value=140;filt.Q.value=0.8;
    filt.connect(this.droneGain);this.droneGain.connect(this.comp);
    // LFO
    const lfo=this.ctx.createOscillator();lfo.type='sine';lfo.frequency.value=0.06;
    const lg=this.ctx.createGain();lg.gain.value=3;lfo.connect(lg);lfo.start(t);
    oscs.forEach(([f,type])=>{
      const o=this.ctx.createOscillator();o.type=type;o.frequency.value=f;
      lg.connect(o.frequency);o.connect(filt);o.start(t);
    });
  }

  _startWater(){
    if(!this.ok)return;
    const sr=this.ctx.sampleRate, len=sr*2;
    const buf=this.ctx.createBuffer(1,len,sr), d=buf.getChannelData(0);
    let last=0;
    for(let i=0;i<len;i++){last=(last+0.02*(Math.random()*2-1))/1.02;d[i]=last*3.5;}
    const src=this.ctx.createBufferSource();src.buffer=buf;src.loop=true;
    const f=this.ctx.createBiquadFilter();f.type='bandpass';f.frequency.value=90;f.Q.value=0.4;
    this.waterGain=this.ctx.createGain();this.waterGain.gain.setValueAtTime(0,this.ctx.currentTime);
    this.waterGain.gain.linearRampToValueAtTime(0.05,this.ctx.currentTime+6);
    src.connect(f);f.connect(this.waterGain);this.waterGain.connect(this.comp);src.start();
  }

  sonarPing(){
    if(!this.ok)return;const t=this.ctx.currentTime;
    const o=this.ctx.createOscillator();o.type='sine';o.frequency.setValueAtTime(1200,t);
    o.frequency.exponentialRampToValueAtTime(800,t+0.8);
    const g=this.ctx.createGain();g.gain.setValueAtTime(0.2,t);
    g.gain.exponentialRampToValueAtTime(0.001,t+2.5);
    const dl=this.ctx.createDelay();dl.delayTime.value=0.35;
    const fb=this.ctx.createGain();fb.gain.value=0.25;
    o.connect(g);g.connect(this.comp);g.connect(dl);dl.connect(fb);fb.connect(dl);fb.connect(this.comp);
    o.start(t);o.stop(t+3);
  }

  lightPulse(){
    if(!this.ok)return;const t=this.ctx.currentTime;
    const o=this.ctx.createOscillator();o.type='square';o.frequency.value=180;
    const g=this.ctx.createGain();g.gain.setValueAtTime(0.06,t);
    g.gain.exponentialRampToValueAtTime(0.001,t+0.12);
    o.connect(g);g.connect(this.comp);o.start(t);o.stop(t+0.15);
  }

  entitySound(type){
    if(!this.ok)return;const t=this.ctx.currentTime;
    switch(type){
      case 'curious_pulse':{
        const o1=this.ctx.createOscillator(),o2=this.ctx.createOscillator();
        o1.type=o2.type='sine';o1.frequency.value=300;o2.frequency.value=306;
        o1.frequency.exponentialRampToValueAtTime(480,t+1.5);
        o2.frequency.exponentialRampToValueAtTime(490,t+1.5);
        const g=this.ctx.createGain();g.gain.setValueAtTime(0,t);
        g.gain.linearRampToValueAtTime(0.08,t+0.3);g.gain.linearRampToValueAtTime(0,t+2);
        const fl=this.ctx.createBiquadFilter();fl.type='lowpass';fl.frequency.value=1800;
        o1.connect(fl);o2.connect(fl);fl.connect(g);g.connect(this.comp);
        o1.start(t);o2.start(t);o1.stop(t+2.5);o2.stop(t+2.5);break;
      }
      case 'greeting':{
        [350,440,528].forEach((f,i)=>{
          const o=this.ctx.createOscillator();o.type='sine';o.frequency.value=f;
          const g=this.ctx.createGain();g.gain.setValueAtTime(0,t);
          g.gain.linearRampToValueAtTime(0.06,t+0.15+i*0.08);
          g.gain.linearRampToValueAtTime(0,t+2.2);
          o.connect(g);g.connect(this.comp);o.start(t);o.stop(t+2.5);
        });break;
      }
      case 'alarm':{
        const o=this.ctx.createOscillator();o.type='sawtooth';o.frequency.value=140;
        const g=this.ctx.createGain();g.gain.setValueAtTime(0.12,t);
        g.gain.exponentialRampToValueAtTime(0.001,t+0.7);
        const fl=this.ctx.createBiquadFilter();fl.type='lowpass';fl.frequency.value=700;
        o.connect(fl);fl.connect(g);g.connect(this.comp);o.start(t);o.stop(t+0.9);break;
      }
      case 'pattern':{
        const notes=[400,500,400,600,500];
        notes.forEach((f,i)=>{setTimeout(()=>{
          if(!this.ok)return;const ct=this.ctx.currentTime;
          const o=this.ctx.createOscillator();o.type='sine';o.frequency.value=f;
          const g=this.ctx.createGain();g.gain.setValueAtTime(0.08,ct);
          g.gain.exponentialRampToValueAtTime(0.001,ct+0.45);
          o.connect(g);g.connect(this.comp);o.start();o.stop(ct+0.5);
        },i*180);});break;
      }
      case 'resonance':{
        const o=this.ctx.createOscillator();o.type='sine';o.frequency.value=260;
        o.frequency.linearRampToValueAtTime(340,t+1.5);
        const g=this.ctx.createGain();g.gain.setValueAtTime(0,t);
        g.gain.linearRampToValueAtTime(0.07,t+0.4);g.gain.linearRampToValueAtTime(0,t+2);
        o.connect(g);g.connect(this.comp);o.start(t);o.stop(t+2.5);break;
      }
    }
  }

  creak(){
    if(!this.ok)return;const t=this.ctx.currentTime,sr=this.ctx.sampleRate;
    const buf=this.ctx.createBuffer(1,sr/2,sr),d=buf.getChannelData(0);
    for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*Math.exp(-i/(d.length*0.08));
    const s=this.ctx.createBufferSource();s.buffer=buf;
    const f=this.ctx.createBiquadFilter();f.type='bandpass';f.frequency.value=250+Math.random()*200;f.Q.value=4;
    const g=this.ctx.createGain();g.gain.value=0.06;
    s.connect(f);f.connect(g);g.connect(this.comp);s.start(t);
  }

  probeRelease(){
    if(!this.ok)return;const t=this.ctx.currentTime;
    const o=this.ctx.createOscillator();o.type='sine';o.frequency.setValueAtTime(480,t);
    o.frequency.exponentialRampToValueAtTime(90,t+1);
    const g=this.ctx.createGain();g.gain.setValueAtTime(0.1,t);
    g.gain.exponentialRampToValueAtTime(0.001,t+1.3);
    o.connect(g);g.connect(this.comp);o.start(t);o.stop(t+1.5);
  }

  goDark(){
    if(!this.ok)return;const t=this.ctx.currentTime;
    if(this.droneGain){this.droneGain.gain.cancelScheduledValues(t);this.droneGain.gain.setValueAtTime(this.droneGain.gain.value,t);this.droneGain.gain.linearRampToValueAtTime(0.02,t+1.2);}
    if(this.waterGain){this.waterGain.gain.cancelScheduledValues(t);this.waterGain.gain.setValueAtTime(this.waterGain.gain.value,t);this.waterGain.gain.linearRampToValueAtTime(0.015,t+1.2);}
  }

  resume(){
    if(!this.ok)return;const t=this.ctx.currentTime;
    if(this.droneGain){this.droneGain.gain.cancelScheduledValues(t);this.droneGain.gain.setValueAtTime(this.droneGain.gain.value,t);this.droneGain.gain.linearRampToValueAtTime(0.1,t+1);}
    if(this.waterGain){this.waterGain.gain.cancelScheduledValues(t);this.waterGain.gain.setValueAtTime(this.waterGain.gain.value,t);this.waterGain.gain.linearRampToValueAtTime(0.05,t+1);}
  }
};

// ── Environment ──
FC.Environment = class {
  constructor(){
    this.snow=[];this.noise=new FC.Noise();this.w=0;this.h=0;
  }

  resize(w,h){
    this.w=w;this.h=h;this.snow=[];
    const count=Math.min(FC.Config.SNOW_COUNT, Math.floor(w*h/3200));
    for(let i=0;i<count;i++){
      this.snow.push({
        x:Math.random()*w, y:Math.random()*h,
        z:Math.random(), // 0=far,1=near
        sz:0.4+Math.random()*2.2,
        sp:0.25+Math.random()*0.65,
        dr:(Math.random()-0.5)*0.25,
        wb:Math.random()*FC.U.TAU,
        ws:0.4+Math.random(),
        al:0.12+Math.random()*0.3,
      });
    }
  }

  update(dt){
    for(const p of this.snow){
      p.y+=p.sp*(0.25+p.z*0.75)*dt*42;
      p.x+=(p.dr+Math.sin(p.wb)*0.15)*dt*18;
      p.wb+=p.ws*dt;
      if(p.y>this.h+10){p.y=-10;p.x=Math.random()*this.w;}
      if(p.x<-10)p.x=this.w+10;if(p.x>this.w+10)p.x=-10;
    }
  }

  drawBg(ctx,time){
    const g=ctx.createLinearGradient(0,0,0,this.h);
    g.addColorStop(0,'#000b16');g.addColorStop(0.3,'#00060d');
    g.addColorStop(0.7,'#000409');g.addColorStop(1,'#000206');
    ctx.fillStyle=g;ctx.fillRect(0,0,this.w,this.h);
    // Distant rock silhouettes
    ctx.fillStyle='rgba(0,3,9,0.7)';
    ctx.beginPath();ctx.moveTo(0,this.h);
    for(let x=0;x<=this.w;x+=25){
      const n=this.noise.fbm(x*0.003+10,time*0.008,3);
      ctx.lineTo(x,this.h*0.84+n*70+Math.sin(x*0.009)*25);
    }
    ctx.lineTo(this.w,this.h);ctx.closePath();ctx.fill();
    ctx.fillStyle='rgba(0,2,7,0.5)';
    ctx.beginPath();ctx.moveTo(0,this.h);
    for(let x=0;x<=this.w;x+=35){
      const n=this.noise.fbm(x*0.002+50,time*0.004+100,3);
      ctx.lineTo(x,this.h*0.75+n*100+Math.sin(x*0.007+2)*35);
    }
    ctx.lineTo(this.w,this.h);ctx.closePath();ctx.fill();
  }

  drawSnow(ctx,zMin,zMax){
    for(const p of this.snow){
      if(p.z<zMin||p.z>=zMax)continue;
      const s=p.sz*(0.3+p.z*0.7), a=p.al*(0.15+p.z*0.85);
      ctx.beginPath();ctx.arc(p.x,p.y,s,0,FC.U.TAU);
      ctx.fillStyle=FC.U.rgba(165,190,212,a);ctx.fill();
    }
  }

  drawLight(ctx,mx,my,intensity,dark){
    if(dark||intensity<0.01)return;
    const cx=this.w/2, cy=this.h+60;
    const dx=mx-cx, dy=my-cy;
    const ang=Math.atan2(dy,dx);
    const maxD=Math.hypot(this.w,this.h)*0.85;
    ctx.save();
    ctx.beginPath();ctx.moveTo(cx,cy);
    const sp=0.32;
    ctx.lineTo(cx+Math.cos(ang-sp)*maxD, cy+Math.sin(ang-sp)*maxD);
    ctx.lineTo(cx+Math.cos(ang+sp)*maxD, cy+Math.sin(ang+sp)*maxD);
    ctx.closePath();ctx.clip();
    const gx=cx+dx*0.35, gy=cy+dy*0.35;
    const gr=ctx.createRadialGradient(cx,cy,15,gx,gy,maxD*0.55);
    const a=0.065*intensity;
    gr.addColorStop(0,FC.U.rgba(255,250,228,a));
    gr.addColorStop(0.3,FC.U.rgba(215,232,255,a*0.45));
    gr.addColorStop(0.65,FC.U.rgba(175,208,240,a*0.12));
    gr.addColorStop(1,'rgba(175,208,240,0)');
    ctx.fillStyle=gr;ctx.fillRect(0,0,this.w,this.h);
    ctx.restore();
  }

  drawVignette(ctx){
    const cx=this.w/2,cy=this.h/2,r=Math.max(this.w,this.h)*0.72;
    const g=ctx.createRadialGradient(cx,cy,r*0.28,cx,cy,r);
    g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(0.65,'rgba(0,0,0,0.12)');
    g.addColorStop(1,'rgba(0,0,0,0.5)');
    ctx.fillStyle=g;ctx.fillRect(0,0,this.w,this.h);
  }

  drawFrame(ctx){
    ctx.strokeStyle='rgba(35,65,85,0.1)';ctx.lineWidth=1.5;
    const n=12,r=16,w=this.w-n*2,h=this.h-n*2;
    ctx.beginPath();
    if(ctx.roundRect){ctx.roundRect(n,n,w,h,r);}
    else{// fallback
      ctx.moveTo(n+r,n);ctx.lineTo(n+w-r,n);ctx.arcTo(n+w,n,n+w,n+r,r);
      ctx.lineTo(n+w,n+h-r);ctx.arcTo(n+w,n+h,n+w-r,n+h,r);
      ctx.lineTo(n+r,n+h);ctx.arcTo(n,n+h,n,n+h-r,r);
      ctx.lineTo(n,n+r);ctx.arcTo(n,n,n+r,n,r);ctx.closePath();
    }
    ctx.stroke();
  }
};
