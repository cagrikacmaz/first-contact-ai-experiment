// ═══════════════════════════════════════════════════════════
//  FIRST CONTACT — The Entity
//  Memory system + The unknown intelligence
// ═══════════════════════════════════════════════════════════
'use strict';

// ── Entity Memory ──
FC.EntityMemory = class {
  constructor(){
    this.trust=0;        // -1..1
    this.curiosity=0.15; // 0..1
    this.fear=0;         // 0..1
    this.understanding=0;// 0..1
    this.signalCount=0;
    this.mirrorCount=0;
    this.probeCount=0;
    this.aggressiveCount=0;
    this.gentleCount=0;
    this.silenceTime=0;
    this.lastSignalTime=0;
    this.phase='dormant';
    this.prevPhase='dormant';
    this.history=[];
    this.phaseLog=[];
    this.entityLastSignal=null; // for mirror checking
  }

  recordSignal(sig){
    this.signalCount++;
    this.lastSignalTime=performance.now();
    this.history.push({type:sig.type,time:this.lastSignalTime,trust:this.trust});
    if(this.history.length>80)this.history.shift();

    switch(sig.type){
      case 'light_pulse':
        this.curiosity=Math.min(1,this.curiosity+0.035);
        if(sig.intensity&&sig.intensity>0.7){
          this.fear=Math.min(1,this.fear+0.07);this.aggressiveCount++;
        }else{this.trust=Math.min(1,this.trust+0.018);this.gentleCount++;}
        break;
      case 'sustained_beam':
        this.curiosity=Math.min(1,this.curiosity+0.02);
        this.fear=Math.min(1,this.fear+0.04);
        this.aggressiveCount++;
        break;
      case 'sonar':
        this.curiosity=Math.min(1,this.curiosity+0.05);
        this.trust=Math.min(1,this.trust+0.012);
        break;
      case 'mirror':
        this.mirrorCount++;
        this.trust=Math.min(1,this.trust+0.1);
        this.understanding=Math.min(1,this.understanding+0.07);
        this.curiosity=Math.min(1,this.curiosity+0.04);
        this.gentleCount++;
        break;
      case 'probe':
        this.probeCount++;
        this.curiosity=Math.min(1,this.curiosity+0.07);
        this.trust=Math.min(1,this.trust+0.035);
        this.gentleCount++;
        break;
      case 'silence':
        this.silenceTime+=sig.duration||1;
        this.fear=Math.max(0,this.fear-0.035);
        this.trust=Math.min(1,this.trust+0.02);
        break;
      case 'rapid_approach':
        this.fear=Math.min(1,this.fear+0.14);
        this.trust=Math.max(-1,this.trust-0.08);
        this.aggressiveCount++;
        break;
      case 'slow_approach':
        this.curiosity=Math.min(1,this.curiosity+0.015);
        this.trust=Math.min(1,this.trust+0.008);
        this.gentleCount++;
        break;
      case 'retreat':
        break;
    }
    this.updatePhase();
  }

  update(dt){
    this.fear=Math.max(0,this.fear-FC.Config.FEAR_DECAY*dt);
    this.curiosity=Math.min(1,this.curiosity+FC.Config.CURIOSITY_DRIFT*dt);
    const elapsed=(performance.now()-this.lastSignalTime)/1000;
    if(elapsed>12)this.trust*=(1-FC.Config.TRUST_DECAY*dt);
    this.updatePhase();
  }

  updatePhase(){
    this.prevPhase=this.phase;
    if(this.fear>0.75) this.phase='retreated';
    else if(this.fear>0.45) this.phase='alarmed';
    else if(this.trust>0.65&&this.understanding>0.45) this.phase='bonded';
    else if(this.trust>0.4&&this.understanding>0.25) this.phase='communicating';
    else if(this.curiosity>0.45&&this.trust>0.1) this.phase='engaged';
    else if(this.curiosity>0.3) this.phase='curious';
    else if(this.signalCount>2) this.phase='observing';
    else if(this.signalCount>0) this.phase='aware';
    else this.phase='dormant';

    if(this.phase!==this.prevPhase){
      this.phaseLog.push({from:this.prevPhase,to:this.phase,time:performance.now()});
    }
  }

  getState(){
    return {
      trust:this.trust,curiosity:this.curiosity,fear:this.fear,
      understanding:this.understanding,phase:this.phase,
      signalCount:this.signalCount,mirrorCount:this.mirrorCount,
      probeCount:this.probeCount,aggressiveCount:this.aggressiveCount,
      gentleCount:this.gentleCount,silenceTime:this.silenceTime,
      phaseLog:this.phaseLog,
    };
  }

  getInterpretation(){
    const s=this.getState(), lines=[];
    const desc={
      dormant:'The presence has not yet registered your arrival.',
      aware:'Something has noticed you. It watches from the dark.',
      observing:'It is studying you. Deliberate. Patient.',
      curious:'It is drawn closer. Your signals have stirred something.',
      engaged:'A dialogue is forming. It responds with growing intention.',
      communicating:'Patterns emerge between you. Something is being understood.',
      bonded:'A connection has formed. Fragile, but real.',
      alarmed:'You have disturbed it. It recoils, flashing warnings.',
      retreated:'It has withdrawn. The dark has swallowed it.',
    };
    lines.push({label:'STATUS',text:desc[s.phase]||'Unknown.'});

    // Metrics
    lines.push({label:'TRUST',value:FC.U.clamp((s.trust+1)/2,0,1)});
    lines.push({label:'CURIOSITY',value:s.curiosity});
    lines.push({label:'FEAR',value:s.fear});
    lines.push({label:'UNDERSTANDING',value:s.understanding});

    // Insights
    const insights=[];
    if(s.mirrorCount>0)insights.push(`Signals mirrored: ${s.mirrorCount}. Mirroring builds trust rapidly.`);
    if(s.probeCount>0)insights.push(`Probes deployed: ${s.probeCount}. It examines them with fascination.`);
    if(s.aggressiveCount>3)insights.push('Multiple aggressive actions detected. Trust is degraded.');
    if(s.silenceTime>5)insights.push('Extended silence interpreted as vulnerability. Trust grows.');
    if(s.trust>0.5)insights.push('It appears to trust your presence.');
    if(s.fear>0.3&&s.fear<0.5)insights.push('A tension in its movements. Approach with care.');
    if(s.understanding>0.3)insights.push('It is beginning to decode your patterns.');
    if(insights.length)lines.push({label:'OBSERVATIONS',list:insights});

    // Phase history
    if(s.phaseLog.length>0){
      const recent=s.phaseLog.slice(-5).map(p=>`${p.from} → ${p.to}`);
      lines.push({label:'STATE TRANSITIONS',list:recent});
    }
    return lines;
  }
};

// ── The Entity ──
FC.Entity = class {
  constructor(){
    this.memory=new FC.EntityMemory();
    this.distance=FC.Config.ENTITY_START_DIST;
    this.targetDist=1.0;
    this.driftX=0;this.driftY=-0.08;
    this.tdX=0;this.tdY=-0.08;
    // Particles
    this.particles=[];this._initParticles();
    // Visuals
    this.hue=215;this.targetHue=215;
    this.intensity=0;this.targetInt=0.15;
    this.pulsePhase=0;this.pulseSpeed=0.6;
    // Signals
    this.activeSignal=null;this.sigTimer=0;
    this.pendingResp=null;this.respDelay=0;
    // Autonomous
    this.autoTimer=0;
    // Appearance
    this.visible=false;this.appearProg=0;
    // Last emitted signal type for mirroring
    this.lastEmittedType=null;
  }

  _initParticles(){
    const N=FC.Config.ENTITY_PARTICLES;
    for(let i=0;i<N;i++){
      const ring=i<N*0.25?0:i<N*0.6?1:2;
      const br=[28,75,135][ring];
      const ang=Math.random()*FC.U.TAU;
      const rv=br*(0.55+Math.random()*0.9);
      this.particles.push({
        x:Math.cos(ang)*rv,y:Math.sin(ang)*rv,
        radius:rv,angle:ang,
        speed:(0.08+Math.random()*0.28)*(ring===0?1.4:ring===1?1:0.65),
        size:[1.2,2.2,3.2][ring]*(0.65+Math.random()*0.7),
        alpha:[0.75,0.55,0.35][ring]*(0.55+Math.random()*0.45),
        hueShift:(Math.random()-0.5)*22,
        phase:Math.random()*FC.U.TAU,
        ring,
      });
    }
  }

  appear(){this.visible=true;this.appearProg=0;}

  receiveSignal(sig){
    this.memory.recordSignal(sig);
    this.respDelay=0.8+Math.random()*1.8;
    const mem=this.memory.getState();
    if(mem.phase==='alarmed')this.respDelay=0.25;
    if(mem.phase==='communicating')this.respDelay=0.4+Math.random()*0.6;
    this.pendingResp=this._chooseResponse(sig,mem);
  }

  _chooseResponse(sig,mem){
    if(mem.phase==='retreated')return{type:'flee',vis:'scatter'};
    if(mem.phase==='alarmed')return{type:'retreat',vis:'scatter'};

    switch(sig.type){
      case 'light_pulse':case 'sustained_beam':
        if(mem.trust>0.3)return{type:'mirror_light',vis:'pulse',dur:1.8};
        if(mem.curiosity>0.35)return{type:'curious_approach',vis:'brighten',dur:1.5};
        return{type:'observe',vis:'shift',dur:1};
      case 'sonar':
        if(mem.trust>0.15)return{type:'resonate',vis:'resonance',dur:2.2};
        return{type:'observe',vis:'shift',dur:1};
      case 'mirror':
        return{type:'recognition',vis:'greeting',dur:2.5};
      case 'probe':
        return{type:'investigate',vis:'reach',dur:2};
      case 'silence':
        if(mem.fear>0.2)return{type:'cautious_approach',vis:'settle',dur:1.5};
        return{type:'observe_silence',vis:'settle',dur:1};
      case 'rapid_approach':
        return{type:'startle',vis:'scatter',dur:1.5};
      case 'slow_approach':
        return{type:'allow',vis:'steady',dur:1};
      default:return{type:'observe',vis:'shift',dur:1};
    }
  }

  _executeResponse(resp){
    const dur=resp.dur||1.5;
    switch(resp.type){
      case 'mirror_light':
        this.activeSignal={type:'pulse',duration:dur};this.sigTimer=dur;
        this.lastEmittedType='pulse';
        break;
      case 'resonate':
        this.activeSignal={type:'resonance',duration:dur};this.sigTimer=dur;
        this.lastEmittedType='resonance';
        break;
      case 'recognition':
        this.targetDist=Math.max(0.08,this.distance-0.12);
        this.targetInt=Math.min(1,this.targetInt+0.15);
        this.activeSignal={type:'greeting',duration:dur};this.sigTimer=dur;
        this.lastEmittedType='greeting';
        break;
      case 'investigate':
        this.tdX=(Math.random()-0.5)*0.3;
        this.activeSignal={type:'reach',duration:dur};this.sigTimer=dur;
        this.lastEmittedType='reach';
        break;
      case 'retreat':case 'startle':case 'flee':
        this.targetDist=Math.min(1,this.distance+0.25);
        break;
      case 'curious_approach':
        this.targetDist=Math.max(0.15,this.distance-0.06);
        break;
    }
  }

  update(dt,time,playerState,audio){
    this.memory.update(dt);
    const mem=this.memory.getState();

    if(this.visible&&this.appearProg<1)this.appearProg=Math.min(1,this.appearProg+dt*0.08);

    // Pending response
    if(this.pendingResp){
      this.respDelay-=dt;
      if(this.respDelay<=0){
        this._executeResponse(this.pendingResp);
        // Play sound
        if(audio&&this.pendingResp.vis){
          const sndMap={pulse:'curious_pulse',resonance:'resonance',greeting:'greeting',
            scatter:'alarm',reach:'curious_pulse',brighten:'curious_pulse'};
          const snd=sndMap[this.pendingResp.vis];
          if(snd)audio.entitySound(snd);
        }
        this.pendingResp=null;
      }
    }

    // Signal timer
    if(this.sigTimer>0){this.sigTimer-=dt;if(this.sigTimer<=0)this.activeSignal=null;}

    // Behavior targets
    this._updateBehavior(dt,mem);
    this._updateVisuals(dt,mem,time);
    this._updateParticles(dt,time,mem);

    // Position
    this.distance+=(this.targetDist-this.distance)*dt*0.45;
    this.driftX+=(this.tdX-this.driftX)*dt*0.25;
    this.driftY+=(this.tdY-this.driftY)*dt*0.25;

    // Autonomous
    this.autoTimer+=dt;
    this._autonomous(dt,mem,audio);
  }

  _updateBehavior(dt,mem){
    switch(mem.phase){
      case 'dormant':
        this.targetDist=Math.max(this.targetDist,0.88);
        this.targetInt=0.12;this.pulseSpeed=0.4;break;
      case 'aware':
        this.targetInt=0.22;this.pulseSpeed=0.6;break;
      case 'observing':
        this.targetInt=0.32;this.pulseSpeed=0.75;break;
      case 'curious':
        this.targetDist=Math.max(this.targetDist-dt*0.015,0.38);
        this.targetInt=0.48;this.pulseSpeed=1.1;break;
      case 'engaged':
        this.targetDist=Math.max(this.targetDist-dt*0.022,0.22);
        this.targetInt=0.65;this.pulseSpeed=1.4;break;
      case 'communicating':
        this.targetDist=Math.max(this.targetDist-dt*0.03,0.1);
        this.targetInt=0.82;this.pulseSpeed=1.8;break;
      case 'bonded':
        this.targetDist=Math.max(this.targetDist-dt*0.04,0.04);
        this.targetInt=1;this.pulseSpeed=1;break;
      case 'alarmed':
        this.targetDist=Math.min(this.targetDist+dt*0.08,1);
        this.targetInt=0.85;this.pulseSpeed=2.8;break;
      case 'retreated':
        this.targetDist=Math.min(this.targetDist+dt*0.12,1);
        this.targetInt=0.08;this.pulseSpeed=0.25;break;
    }
  }

  _updateVisuals(dt,mem,time){
    const hueMap={dormant:225,aware:215,observing:200,curious:168,engaged:178,
      communicating:52,bonded:42,alarmed:2,retreated:270};
    this.targetHue=hueMap[mem.phase]||200;
    let hd=this.targetHue-this.hue;
    if(hd>180)hd-=360;if(hd<-180)hd+=360;
    this.hue+=hd*dt*1.2;
    if(this.hue<0)this.hue+=360;if(this.hue>360)this.hue-=360;
    this.intensity+=(this.targetInt-this.intensity)*dt*1.8;
    this.pulsePhase+=this.pulseSpeed*dt;
  }

  _updateParticles(dt,time,mem){
    const breathe=Math.sin(this.pulsePhase)*0.14+1;
    const agit=mem.phase==='alarmed'?2.2:mem.phase==='curious'?1.25:1;
    for(const p of this.particles){
      p.angle+=p.speed*dt*agit;
      let tr=p.radius*breathe;
      if(mem.phase==='alarmed')tr*=1.6;
      if(mem.phase==='bonded')tr*=0.55;
      if(mem.phase==='communicating')tr*=(0.75+0.25*Math.sin(p.angle*3+time));
      let tx=Math.cos(p.angle)*tr+Math.sin(time*0.6+p.phase)*8*agit;
      let ty=Math.sin(p.angle)*tr+Math.cos(time*0.4+p.phase*1.3)*8*agit;
      p.x+=(tx-p.x)*dt*(1.8+agit);
      p.y+=(ty-p.y)*dt*(1.8+agit);
    }
  }

  _autonomous(dt,mem,audio){
    if(this.autoTimer<4+Math.random()*8)return;
    this.autoTimer=0;
    if(mem.phase!=='alarmed'&&mem.phase!=='retreated'){
      this.tdX=(Math.random()-0.5)*0.25;
      this.tdY=-0.08+(Math.random()-0.5)*0.12;
    }
    // Spontaneous signals
    if(mem.phase==='curious'&&Math.random()<0.25){
      this.activeSignal={type:'curious_pulse',duration:2};this.sigTimer=2;
      this.lastEmittedType='curious_pulse';
      if(audio)audio.entitySound('curious_pulse');
    }
    if(mem.phase==='engaged'&&Math.random()<0.35){
      this.activeSignal={type:'greeting',duration:2.5};this.sigTimer=2.5;
      this.lastEmittedType='greeting';
      if(audio)audio.entitySound('greeting');
    }
    if(mem.phase==='communicating'&&Math.random()<0.45){
      this.activeSignal={type:'pattern',duration:3};this.sigTimer=3;
      this.lastEmittedType='pattern';
      if(audio)audio.entitySound('pattern');
    }
  }

  draw(ctx,W,H,time){
    if(!this.visible||this.intensity<0.005)return;
    const scale=FC.U.lerp(0.2,2.8,1-this.distance);
    const baseA=this.intensity*this.appearProg;
    const cx=W/2+this.driftX*W*0.28;
    const cy=H*0.38+this.driftY*H*0.18;

    ctx.save();
    ctx.globalCompositeOperation='lighter';

    // Outer glow
    const gr=190*scale;
    const og=ctx.createRadialGradient(cx,cy,0,cx,cy,gr);
    og.addColorStop(0,FC.U.hsla(this.hue,55,48,0.07*baseA));
    og.addColorStop(0.5,FC.U.hsla(this.hue,45,38,0.025*baseA));
    og.addColorStop(1,FC.U.hsla(this.hue,35,28,0));
    ctx.fillStyle=og;ctx.fillRect(cx-gr,cy-gr,gr*2,gr*2);

    // Particles
    for(const p of this.particles){
      const px=cx+p.x*scale, py=cy+p.y*scale;
      const ps=p.size*scale;
      const pa=p.alpha*baseA;
      const ph=(this.hue+p.hueShift+360)%360;
      if(pa<0.008||px<-60||px>W+60||py<-60||py>H+60)continue;

      const r=ps*3.5;
      const g=ctx.createRadialGradient(px,py,0,px,py,r);
      g.addColorStop(0,FC.U.hsla(ph,78,62,pa*0.55));
      g.addColorStop(0.3,FC.U.hsla(ph,65,52,pa*0.22));
      g.addColorStop(1,FC.U.hsla(ph,55,42,0));
      ctx.fillStyle=g;ctx.fillRect(px-r,py-r,r*2,r*2);

      ctx.beginPath();ctx.arc(px,py,ps*0.4,0,FC.U.TAU);
      ctx.fillStyle=FC.U.hsla(ph,55,82,pa*0.75);ctx.fill();
    }

    // Active signal visual
    if(this.activeSignal&&this.sigTimer>0){
      this._drawSignal(ctx,cx,cy,scale,baseA,time,W,H);
    }
    ctx.restore();
  }

  _drawSignal(ctx,cx,cy,scale,baseA,time,W,H){
    const dur=this.activeSignal.duration||2;
    const prog=1-(this.sigTimer/dur);
    switch(this.activeSignal.type){
      case 'pulse':case 'curious_pulse':{
        const r=prog*180*scale, a=(1-prog)*0.35*baseA;
        ctx.beginPath();ctx.arc(cx,cy,r,0,FC.U.TAU);
        ctx.strokeStyle=FC.U.hsla(this.hue,65,58,a);ctx.lineWidth=1.5;ctx.stroke();
        break;
      }
      case 'greeting':{
        for(let i=0;i<3;i++){
          const p2=Math.max(0,prog-i*0.13);
          const r=p2*165*scale, a=(1-p2)*0.28*baseA;
          ctx.beginPath();ctx.arc(cx,cy,r,0,FC.U.TAU);
          ctx.strokeStyle=FC.U.hsla((this.hue+i*8)%360,65,58,a);ctx.lineWidth=1.2;ctx.stroke();
        }
        break;
      }
      case 'pattern':{
        const sides=5, r=95*scale*(0.45+prog*0.55);
        const a=(1-prog*0.65)*0.4*baseA, rot=time*0.45;
        ctx.beginPath();
        for(let i=0;i<=sides;i++){
          const an=(i/sides)*FC.U.TAU+rot;
          const px=cx+Math.cos(an)*r, py=cy+Math.sin(an)*r;
          i===0?ctx.moveTo(px,py):ctx.lineTo(px,py);
        }
        ctx.strokeStyle=FC.U.hsla(this.hue,75,62,a);ctx.lineWidth=1;ctx.stroke();
        break;
      }
      case 'resonance':{
        for(let i=0;i<5;i++){
          const p2=(prog+i*0.2)%1;
          const r=p2*140*scale, a=(1-p2)*0.18*baseA;
          ctx.beginPath();ctx.arc(cx,cy,r,0,FC.U.TAU);
          ctx.strokeStyle=FC.U.hsla(this.hue,48,52,a);ctx.lineWidth=0.8;ctx.stroke();
        }
        break;
      }
      case 'reach':{
        const endY=cy+(H-cy)*prog*0.45;
        const a=(1-prog)*0.35*baseA;
        ctx.beginPath();ctx.moveTo(cx,cy);
        ctx.quadraticCurveTo(cx+Math.sin(time*2.5)*25,(cy+endY)/2,cx,endY);
        ctx.strokeStyle=FC.U.hsla(this.hue,65,58,a);ctx.lineWidth=1.8;ctx.stroke();
        break;
      }
    }
  }

  getScreenPos(W,H){
    return{x:W/2+this.driftX*W*0.28,y:H*0.38+this.driftY*H*0.18};
  }
};
