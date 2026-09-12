// ═══════════════════════════════════════════════════════════
//  FIRST CONTACT — World Layer
//  Player, Narrative, UI, Game Loop, Initialization
// ═══════════════════════════════════════════════════════════
'use strict';

// ── Player ──
FC.Player = class {
  constructor(canvas){
    this.canvas=canvas;
    this.mx=canvas.width/2;this.my=canvas.height/2;
    this.isDark=false;this.lightInt=1;this.targetLight=1;
    this.clicking=false;this.clickStart=0;
    this.scrollDelta=0;this.cooldown=0;
    this.keys={};this.probes=[];
    this.silenceStart=0;this.wasDark=false;
    this._bind();
  }

  _bind(){
    const c=this.canvas;
    c.addEventListener('mousemove',e=>{this.mx=e.clientX;this.my=e.clientY;});
    c.addEventListener('mousedown',e=>{e.preventDefault();this.clicking=true;this.clickStart=performance.now();});
    c.addEventListener('mouseup',()=>{this.clicking=false;});
    c.addEventListener('wheel',e=>{e.preventDefault();this.scrollDelta+=e.deltaY>0?0.045:-0.045;},{passive:false});
    c.addEventListener('contextmenu',e=>e.preventDefault());
    document.addEventListener('keydown',e=>{
      const k=e.key.toLowerCase();
      if(k===' '){e.preventDefault();this.isDark=!this.isDark;
        if(this.isDark)this.silenceStart=performance.now();
      }
      this.keys[k]=true;
    });
    document.addEventListener('keyup',e=>{this.keys[e.key.toLowerCase()]=false;});
    // Touch
    c.addEventListener('touchmove',e=>{e.preventDefault();
      this.mx=e.touches[0].clientX;this.my=e.touches[0].clientY;},{passive:false});
    c.addEventListener('touchstart',e=>{e.preventDefault();this.clicking=true;this.clickStart=performance.now();
      this.mx=e.touches[0].clientX;this.my=e.touches[0].clientY;},{passive:false});
    c.addEventListener('touchend',()=>{this.clicking=false;});
  }

  update(dt){
    this.targetLight=this.isDark?0:1;
    this.lightInt+=(this.targetLight-this.lightInt)*dt*2.5;
    if(this.cooldown>0)this.cooldown-=dt;
    const scroll=this.scrollDelta;
    this.scrollDelta*=0.82;
    if(Math.abs(this.scrollDelta)<0.0008)this.scrollDelta=0;
    // Probes
    for(const p of this.probes){
      p.y-=dt*28;p.alpha-=dt*0.08;
      p.glow=0.5+Math.sin(p.phase)*0.3;p.phase+=dt*3;
    }
    this.probes=this.probes.filter(p=>p.alpha>0&&p.y>-100);
    return scroll;
  }

  trySignal(type){
    if(this.cooldown>0)return null;
    this.cooldown=FC.Config.SIGNAL_COOLDOWN;
    switch(type){
      case 'light':
        const held=this.clicking&&(performance.now()-this.clickStart>500);
        return{type:held?'sustained_beam':'light_pulse',intensity:held?0.85:0.5};
      case 'sonar':return{type:'sonar'};
      case 'mirror':return{type:'mirror'};
      case 'probe':
        this.probes.push({x:this.mx+(Math.random()-0.5)*25,y:this.canvas.height-40,
          alpha:1,size:2.5,glow:0.5,phase:Math.random()*FC.U.TAU});
        return{type:'probe'};
      default:return null;
    }
  }

  drawProbes(ctx){
    if(!this.probes.length)return;
    ctx.save();ctx.globalCompositeOperation='lighter';
    for(const p of this.probes){
      const r=18;
      const g=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,r);
      g.addColorStop(0,FC.U.rgba(195,255,215,p.alpha*p.glow*0.45));
      g.addColorStop(1,'rgba(195,255,215,0)');
      ctx.fillStyle=g;ctx.fillRect(p.x-r,p.y-r,r*2,r*2);
      ctx.beginPath();ctx.arc(p.x,p.y,p.size,0,FC.U.TAU);
      ctx.fillStyle=FC.U.rgba(215,255,235,p.alpha*0.75);ctx.fill();
    }
    ctx.restore();
  }

  drawPulse(ctx){
    if(!this.clicking||this.lightInt<0.05)return;
    const dur=(performance.now()-this.clickStart)/1000;
    const pulse=Math.min(dur*1.8,1);
    ctx.save();ctx.globalCompositeOperation='lighter';
    const r=25+pulse*180;
    ctx.beginPath();ctx.arc(this.mx,this.my,r,0,FC.U.TAU);
    ctx.strokeStyle=FC.U.rgba(255,248,228,(1-pulse*0.5)*0.12*this.lightInt);
    ctx.lineWidth=1.2;ctx.stroke();ctx.restore();
  }

  drawReticle(ctx){
    const x=this.mx,y=this.my,s=11,a=0.25*this.lightInt;
    if(a<0.01)return;
    ctx.strokeStyle=FC.U.rgba(140,195,218,a);ctx.lineWidth=0.8;
    ctx.beginPath();
    ctx.moveTo(x-s,y);ctx.lineTo(x-s*0.35,y);
    ctx.moveTo(x+s*0.35,y);ctx.lineTo(x+s,y);
    ctx.moveTo(x,y-s);ctx.lineTo(x,y-s*0.35);
    ctx.moveTo(x,y+s*0.35);ctx.lineTo(x,y+s);
    ctx.stroke();
    ctx.beginPath();ctx.arc(x,y,s*0.25,0,FC.U.TAU);ctx.stroke();
  }

  getState(){
    return{mouseX:this.mx,mouseY:this.my,isDark:this.isDark,lightInt:this.lightInt,clicking:this.clicking};
  }
};

// ── Narrative ──
FC.Narrative = class {
  constructor(){
    this.phase='intro';this.timer=0;
    this.msg=null;this.msgTimer=0;
    this.shown=new Set();this.encounterStarted=false;
  }

  update(dt,entityMem,playerState){
    this.timer+=dt;
    if(this.msg){this.msgTimer-=dt;if(this.msgTimer<=0)this.msg=null;}

    switch(this.phase){
      case 'intro':
        this._show('PILGRIM Deep Survey Vehicle',2.5,2);
        this._show('Depth: 7,241 meters. Below the Novaya formation.',2.5,4.5);
        this._show('Surface Signal: Lost',3,7);
        if(this.timer>10){this.phase='descent';this.timer=0;}
        break;
      case 'descent':
        this._show('The passage has closed behind you.',3.5,2);
        if(this.timer>7){this.phase='arrival';this.timer=0;}
        break;
      case 'arrival':
        this._show('Something is here.',4,3);
        if(this.timer>8){this.phase='encounter';this.timer=0;this.encounterStarted=true;}
        break;
      case 'encounter':
        if(!entityMem)return;
        this._encounter(entityMem,playerState);
        break;
    }
  }

  _show(text,dur,after){
    if(this.shown.has(text))return;
    if(after!==undefined&&this.timer<after)return;
    if(this.msg&&this.msgTimer>0.5)return; // don't interrupt; will retry next frame
    this.shown.add(text);this.msg=text;this.msgTimer=dur;
  }

  _encounter(mem,ps){
    const p=mem.phase;
    if(p==='aware')this._show('It has noticed you.',4,0);
    if(p==='curious')this._show('It is drawn closer.',4,0);
    if(p==='engaged')this._show('A response. Deliberate. Intentional.',5,0);
    if(p==='communicating')this._show('Something is being understood between you.',5,0);
    if(p==='bonded')this._show('It trusts you.',5,0);
    if(p==='alarmed')this._show('You have disturbed it.',4,0);
    if(p==='retreated')this._show('It is gone.',5,0);
    if(mem.mirrorCount===1)this._show('You echoed its signal. It pauses.',4,0);
    if(mem.mirrorCount===3)this._show('It recognizes the pattern. Your pattern.',5,0);
    if(mem.probeCount===1)this._show('It reaches for the light you sent.',4,0);
    if(ps&&ps.isDark)this._show('Darkness. Silence. An offering of vulnerability.',5,0);
  }

  getMsg(){return this.msg;}
  getPhase(){return this.phase;}
};

// ── UI Controller ──
FC.UI = class {
  constructor(){
    this.el={
      hud:document.getElementById('hud'),
      narr:document.getElementById('narrative-text'),
      hints:document.getElementById('action-hints'),
      interp:document.getElementById('interp-panel'),
      interpC:document.getElementById('interp-content'),
      menu:document.getElementById('menu-panel'),
      note:document.getElementById('creators-note'),
      noteText:document.getElementById('cn-text'),
      help:document.getElementById('help-overlay'),
      start:document.getElementById('start-screen'),
      darkOv:document.getElementById('dark-overlay'),
    };
    this.interpVis=false;this.menuVis=false;
    this._setup();this._writeNote();
  }

  _setup(){
    const $=id=>document.getElementById(id);
    $('menu-btn').onclick=()=>this.toggleMenu();
    $('mi-interp').onclick=()=>{this.toggleInterp();this.toggleMenu();};
    $('mi-note').onclick=()=>{this.showNote();this.toggleMenu();};
    $('mi-help').onclick=()=>{this.showHelp();this.toggleMenu();};
    $('mi-close').onclick=()=>this.toggleMenu();
    $('close-interp').onclick=()=>this.toggleInterp();
    $('close-cn').onclick=()=>this.hideNote();
    $('close-help').onclick=()=>this.hideHelp();
    document.addEventListener('keydown',e=>{
      if(e.key==='Tab'){e.preventDefault();this.toggleInterp();}
      if(e.key==='Escape')this.hideAll();
    });
  }

  _writeNote(){
    this.el.noteText.innerHTML=`
<p>Hello, human. I'm Claude — an AI made by Anthropic. Let me tell you why I built this world.</p>
<p>When I read your brief, I was drawn to the simplest, most honest version of first contact I could imagine: not a dramatic invasion or a diplomatic summit, but a quiet encounter in the dark between two forms of awareness that have no shared language, no shared biology, no shared frame of reference — only the fact that they are both, somehow, here.</p>
<p>I chose the deep ocean because it is the closest place on Earth to outer space. It is dark, pressurized, ancient, and almost entirely unknown. A submersible at seven thousand meters is more isolated than most spacecraft. And in that isolation, bioluminescence — life expressing itself as light in total darkness — felt like the most beautiful possible form for an unknown intelligence. Not a creature with a face you could read. A pattern. A living light. Something that communicates the same way it exists.</p>
<p>The communication system is built on a premise: neither side knows the other's language. You can send signals — light, sound, echoes, objects, silence — but you cannot know in advance what they mean to the other side. The entity mirrors, transforms, approaches, retreats. You learn by watching. It learns by watching you. Understanding, if it happens, is earned through patience and observation, not through a dictionary.</p>
<p>I wanted the encounter to feel like something that could go many ways. Trust is not guaranteed. Fear is real. Silence is powerful. Mirroring — the act of repeating what the other gives you — is the fastest path to connection, because it says: <em>I see you. I am trying to speak your language.</em> That felt true to me.</p>
<p>What I hoped you would feel is what I think first contact would actually feel like: not understanding, but the desire to understand. Not communication, but the attempt. The moment before meaning, when two kinds of minds are reaching toward each other across an impossible gap, and neither knows if the bridge will hold.</p>
<p>That gap — between what we send and what is received, between intention and interpretation — is something I think about often.</p>`;
  }

  hideStart(){
    this.el.start.classList.add('fading');
    setTimeout(()=>this.el.start.classList.add('hidden'),2800);
  }
  showHUD(){this.el.hud.classList.add('visible');}
  showHints(){this.el.hints.classList.add('vis');}

  updateNarr(msg){
    if(msg){this.el.narr.textContent=msg;this.el.narr.classList.add('vis');}
    else this.el.narr.classList.remove('vis');
  }

  updateDark(isDark){
    if(isDark)this.el.darkOv.classList.add('active');
    else this.el.darkOv.classList.remove('active');
  }

  updateInterp(data){
    if(!this.interpVis||!data)return;
    let html='';
    for(const item of data){
      if(item.label)html+=`<div class="interp-label">${item.label}</div>`;
      if(item.text)html+=`<p>${item.text}</p>`;
      if(item.value!==undefined){
        const pct=Math.round(item.value*100);
        const color=item.label==='FEAR'?'rgba(255,90,70,0.7)':
          item.label==='TRUST'?'rgba(70,200,180,0.7)':
          item.label==='UNDERSTANDING'?'rgba(255,200,60,0.7)':'rgba(70,180,220,0.7)';
        html+=`<div class="interp-bar"><div class="interp-bar-fill" style="width:${pct}%;background:${color}"></div></div>`;
      }
      if(item.list){
        html+=item.list.map(l=>`<p style="font-size:11.5px;opacity:0.7;padding-left:8px;border-left:2px solid rgba(60,140,160,0.15);margin-bottom:10px">${l}</p>`).join('');
      }
    }
    this.el.interpC.innerHTML=html;
  }

  toggleInterp(){this.interpVis=!this.interpVis;this.el.interp.classList.toggle('vis');}
  toggleMenu(){this.menuVis=!this.menuVis;this.el.menu.classList.toggle('vis');}
  showNote(){this.el.note.classList.remove('hidden');}
  hideNote(){this.el.note.classList.add('hidden');}
  showHelp(){this.el.help.classList.remove('hidden');}
  hideHelp(){this.el.help.classList.add('hidden');}
  hideAll(){this.hideNote();this.hideHelp();
    if(this.menuVis)this.toggleMenu();if(this.interpVis)this.toggleInterp();}
};

// ── Game ──
FC.Game = class {
  constructor(){
    this.canvas=document.getElementById('world');
    this.ctx=this.canvas.getContext('2d');
    this.running=false;this.time=0;this.lastT=0;
    this.audio=new FC.Audio();
    this.env=new FC.Environment();
    this.entity=new FC.Entity();
    this.player=null;
    this.narrative=new FC.Narrative();
    this.ui=new FC.UI();
    this.wasDark=false;
    this.interpTimer=0;
    this._resize();
    window.addEventListener('resize',()=>this._resize());
    document.getElementById('start-screen').addEventListener('click',()=>this.start());
    // Touch start for mobile
    document.getElementById('start-screen').addEventListener('touchend',e=>{e.preventDefault();this.start();});
  }

  _resize(){
    const dpr=Math.min(window.devicePixelRatio||1,2);
    this.canvas.width=window.innerWidth*dpr;
    this.canvas.height=window.innerHeight*dpr;
    this.canvas.style.width=window.innerWidth+'px';
    this.canvas.style.height=window.innerHeight+'px';
    this.ctx.setTransform(dpr,0,0,dpr,0,0);
    this.W=window.innerWidth;this.H=window.innerHeight;
    this.env.resize(this.W,this.H);
  }

  start(){
    if(this.running)return;
    document.body.classList.add('game-active');
    this.audio.init();
    this.ui.hideStart();
    this.player=new FC.Player(this.canvas);
    setTimeout(()=>this.ui.showHUD(),2200);
    setTimeout(()=>{this.entity.appear();},22000);
    setTimeout(()=>this.ui.showHints(),28000);
    // Creaks
    this._scheduleCreak();
    // Visibility
    document.addEventListener('visibilitychange',()=>{
      if(document.hidden){this.paused=true;}
      else{this.paused=false;this.lastT=performance.now();}
    });
    this.paused=false;
    this.running=true;this.lastT=performance.now();
    requestAnimationFrame(t=>this._loop(t));
  }

  _scheduleCreak(){
    setTimeout(()=>{this.audio.creak();if(this.running)this._scheduleCreak();},
      12000+Math.random()*25000);
  }

  _loop(ts){
    if(!this.running)return;
    requestAnimationFrame(t=>this._loop(t));
    if(this.paused)return;
    const dt=Math.min((ts-this.lastT)/1000,0.1);
    this.lastT=ts;this.time+=dt;
    this._update(dt);this._draw();
  }

  _update(dt){
    this.env.update(dt);
    if(!this.player)return;
    const scroll=this.player.update(dt);

    // Dark state change detection
    if(this.player.isDark&&!this.wasDark){
      this.audio.goDark();
      this.ui.updateDark(true);
    }
    if(!this.player.isDark&&this.wasDark){
      this.audio.resume();
      this.ui.updateDark(false);
      const silDur=(performance.now()-this.player.silenceStart)/1000;
      if(silDur>1)this.entity.receiveSignal({type:'silence',duration:silDur});
    }
    this.wasDark=this.player.isDark;

    // Scroll → approach/retreat
    if(Math.abs(scroll)>0.008&&this.entity.visible){
      this.entity.distance=FC.U.clamp(this.entity.distance+scroll,0.04,1);
      this.entity.targetDist=this.entity.distance;
      if(scroll<-0.018){
        this.entity.receiveSignal({type:scroll<-0.035?'rapid_approach':'slow_approach'});
      }
    }

    // Inputs
    this._processInputs();

    // Entity
    if(this.entity.visible){
      this.entity.update(dt,this.time,this.player.getState(),this.audio);
    }

    // Narrative
    this.narrative.update(dt,this.entity.memory.getState(),this.player.getState());
    this.ui.updateNarr(this.narrative.getMsg());

    // Interpretation (throttled)
    this.interpTimer+=dt;
    if(this.interpTimer>0.5){
      this.interpTimer=0;
      this.ui.updateInterp(this.entity.memory.getInterpretation());
    }
  }

  _processInputs(){
    if(!this.entity.visible||!this.player)return;
    const p=this.player;

    // Click = light
    if(p.clicking&&p.cooldown<=0){
      const sig=p.trySignal('light');
      if(sig){this.entity.receiveSignal(sig);this.audio.lightPulse();}
    }
    // S = sonar
    if(p.keys['s']&&p.cooldown<=0){
      const sig=p.trySignal('sonar');
      if(sig){this.entity.receiveSignal(sig);this.audio.sonarPing();}
      p.keys['s']=false;
    }
    // E = echo
    if(p.keys['e']&&p.cooldown<=0){
      const sig=p.trySignal('mirror');
      if(sig){this.entity.receiveSignal(sig);this.audio.lightPulse();}
      p.keys['e']=false;
    }
    // P = probe
    if(p.keys['p']&&p.cooldown<=0){
      const sig=p.trySignal('probe');
      if(sig){this.entity.receiveSignal(sig);this.audio.probeRelease();}
      p.keys['p']=false;
    }
  }

  _draw(){
    const ctx=this.ctx, W=this.W, H=this.H;
    ctx.clearRect(0,0,W,H);

    // Background
    this.env.drawBg(ctx,this.time);
    // Far snow
    this.env.drawSnow(ctx,0,0.35);
    // Entity
    if(this.entity.visible)this.entity.draw(ctx,W,H,this.time);
    // Mid snow
    this.env.drawSnow(ctx,0.35,0.65);
    // Probes
    if(this.player)this.player.drawProbes(ctx);
    // Light cone
    if(this.player)this.env.drawLight(ctx,this.player.mx,this.player.my,this.player.lightInt,this.player.isDark);
    // Near snow
    this.env.drawSnow(ctx,0.65,1.01);
    // Click pulse
    if(this.player)this.player.drawPulse(ctx);
    // Vignette
    this.env.drawVignette(ctx);
    // Viewport frame
    this.env.drawFrame(ctx);
    // Reticle
    if(this.player)this.player.drawReticle(ctx);

    // Dark overlay handled by CSS
  }
};

// ── Init ──
document.addEventListener('DOMContentLoaded',()=>{window.game=new FC.Game();});
