const vertex = `attribute vec2 position;void main(){gl_Position=vec4(position,0.,1.);}`;
const fragment = `
precision highp float;
uniform vec2 resolution;
uniform float time, proximity, lateral, trust, alarm, flash, response, opening, active, reduced, departure;
uniform vec2 aim;
uniform vec4 ripples[8];
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=noise(p)*a;p=p*2.03+8.12;a*=.5;}return v;}
mat2 rot(float a){return mat2(cos(a),-sin(a),sin(a),cos(a));}
vec3 center(){return vec3(0.,2.8+alarm*1.2-trust*.55+departure*3.,.8-alarm*3.-departure*14.);}
float shape(vec3 p){
 p-=center();p.xy=rot(.12+sin(time*.12)*.045)*p.xy;p.yz=rot(.27)*p.yz;
 float a=atan(p.z,p.x),r=length(p.xz);
 float fold=sin(a*3.+time*.12)*.31+sin(a*7.-time*.16)*.12;
 float radius=3.25+opening*.65+sin(a*3.+time*.09)*.28+sin(time*.25)*.1;
 float ripple=sin(r*19.-time*.5+a*3.)*.018;
 float d=length(vec2((r-radius)*.65,p.y+fold+ripple))-(.23+trust*.06);
 float shell=length(vec2((r-radius+.42)*.7,p.y-.16+fold*.9))-.033;
 d=min(d,shell);
 shell=length(vec2((r-radius-.43)*.78,p.y+.16+fold*.8))-.022;d=min(d,shell);
 float fringe=length(vec2(r-(radius+.05+sin(p.y*4.+a*5.+time*.2)*.07),sin(a*74.+p.y*3.)*r/74.))-.006;
 fringe=max(fringe,abs(p.y+fold+.04)-(.22+.14*noise(vec2(a*18.,0.))));
 d=min(d,fringe);
 return d;
}
vec3 normal(vec3 p){vec2 e=vec2(.003,0);return normalize(vec3(shape(p+e.xyy)-shape(p-e.xyy),shape(p+e.yxy)-shape(p-e.yxy),shape(p+e.yyx)-shape(p-e.yyx)));}
vec3 sky(vec3 rd){
 float h=rd.y;
 vec3 col=mix(vec3(.24,.32,.34),vec3(.022,.058,.079),smoothstep(-.08,.6,h));
 float horizon=exp(-abs(h+.016)*14.);
 col+=vec3(.35,.20,.095)*horizon;
 float haze=fbm(rd.xz/max(abs(rd.y),.17)*1.7+vec2(time*.006,0.));
 col*=.65+.42*haze;
 float mountains=fbm(vec2(rd.x*15./max(abs(rd.z),.3),2.))*.105+.005;
 if(h<mountains && h>-.1){col=mix(col,vec3(.055,.105,.125),.85);col+=vec3(.12,.17,.17)*smoothstep(mountains-.012,mountains,h)*.2;}
 return col;
}
vec3 entity(vec3 ro,vec3 rd,vec3 base){
 float t=.1,d=0.;float glow=0.;bool hit=false;
 for(int i=0;i<68;i++){
  vec3 p=ro+rd*t;d=shape(p);
  glow+=exp(-abs(d)*24.)*.018;
  if(d<.008){hit=true;break;}
  t+=max(d*.75,.009);if(t>32.)break;
 }
 vec3 warm=mix(vec3(.96,.55,.27),vec3(.65,.91,.86),trust*.75);warm=mix(warm,vec3(1.,.22,.07),alarm*.7);
 if(hit){
  vec3 p=ro+rd*t,n=normal(p),q=p-center();
  float a=atan(q.z,q.x);float vein=pow(.5+.5*sin(a*119.+q.y*62.+sin(a*17.)*4.),18.);
  float grain=noise(vec2(a*70.,q.y*120.));
  float edge=pow(1.-abs(dot(n,rd)),2.);
  float diffuse=max(dot(n,normalize(vec3(-3.,6.,7.))),0.);
  float wave=pow(.5+.5*sin(a*3.-time*(.6+alarm*2.)),12.);
  base=vec3(.055,.09,.105)*(diffuse+.6)+warm*(.055+vein*.2+edge*.42+wave*(.15+response*2.));
  base+=vec3(.29,.39,.38)*pow(max(dot(reflect(normalize(vec3(2.,-4.,-5.)),n),-rd),0.),24.)*.7;
  base+=warm*flash*.6;base*=.8+.2*grain;
  base=mix(base,sky(rd),1.-exp(-t*.015));
 }
 return base+warm*glow*(.055+response*.23+flash*.1);
}
void main(){
 vec2 uv=(gl_FragCoord.xy-.5*resolution)/resolution.y;
 float tm=time*(1.-reduced*.75);
 vec3 ro=vec3(lateral*.8,1.1+sin(tm*.6)*.016,12.-proximity*5.);
 vec3 target=vec3(mix(-3.7,0.,active)+aim.x*.25,1.28+aim.y*.1,0.);
 vec3 ww=normalize(target-ro),uu=normalize(cross(ww,vec3(0,1,0))),vv=cross(uu,ww);
 vec3 rd=normalize(uv.x*uu+uv.y*vv+1.3*ww);
 vec3 col=sky(rd);
 if(rd.y<-.004){
  float t=-ro.y/rd.y;vec3 p=ro+rd*t;
  float w=sin(p.x*4.+tm*.6)*.003+sin(p.z*6.-tm*.5)*.004;
  vec2 wave=vec2(w,sin(p.x*3.+p.z*4.+tm*.5)*.004);
  float rings=0.;
  for(int i=0;i<8;i++){
   float age=time-ripples[i].z;float r=length(p.xz-ripples[i].xy);
   float ring=sin(r*15.-age*7.)*exp(-pow(r-age*1.5,2.)*2.)*exp(-age*.55)*step(0.,age)*ripples[i].w;
   rings+=ring;wave+=normalize(p.xz-ripples[i].xy+.001)*ring*.018;
  }
  vec3 n=normalize(vec3(wave.x,1.,wave.y));vec3 reflected=reflect(rd,n);
  col=entity(p+vec3(0,.02,0),reflected,sky(reflected));
  float fresnel=.38+.58*pow(1.-max(dot(n,-rd),0.),4.);
  col=col*fresnel*vec3(.59,.76,.79)+vec3(.023,.067,.077);
  float caustic=pow(max(0.,sin(p.x*6.+sin(p.z*4.)+tm*.4)*sin(p.z*6.-tm*.3)),16.);
  col+=vec3(.09,.22,.23)*caustic*exp(-t*.09)*(.2+trust);
  col+=vec3(.26,.51,.51)*abs(rings)*.55;
  col+=vec3(.38,.23,.12)*flash*exp(-length(p.xz-ro.xz)*.3)*.5;
  col=mix(col,sky(rd),1.-exp(-t*.007));
 }else{col=entity(ro,rd,col);}
 // Suspended dust catches the light. A far-away scale, without a starfield.
 vec2 dustUV=gl_FragCoord.xy/resolution.y*vec2(105.,75.);dustUV.y+=time*.025;
 vec2 cell=floor(dustUV);float dust=pow(hash(cell),42.)*pow(max(0.,1.-length(fract(dustUV)-.5)*2.),5.);
 col+=vec3(.7,.75,.6)*dust*.22;
 col*=1.-.24*length(uv*.65);col+=((hash(gl_FragCoord.xy+mod(time,100.))-.5)/255.)*2.;
 col=pow(max(col,0.),vec3(.91));gl_FragColor=vec4(col,1.);
}`;
export class World {
 constructor(canvas){
  this.canvas=canvas;this.gl=canvas.getContext('webgl',{alpha:false,antialias:false,powerPreference:'high-performance'});
  if(!this.gl)throw new Error('This encounter needs WebGL. Enable hardware acceleration in your browser and reload.');
  const gl=this.gl;const compile=(type,source)=>{const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s;};
  this.program=gl.createProgram();gl.attachShader(this.program,compile(gl.VERTEX_SHADER,vertex));gl.attachShader(this.program,compile(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(this.program);if(!gl.getProgramParameter(this.program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(this.program));gl.useProgram(this.program);
  const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
  const pos=gl.getAttribLocation(this.program,'position');gl.enableVertexAttribArray(pos);gl.vertexAttribPointer(pos,2,gl.FLOAT,false,0,0);
  this.uniforms=Object.fromEntries(['resolution','time','proximity','lateral','trust','alarm','flash','response','opening','active','reduced','departure','aim','ripples'].map(k=>[k,gl.getUniformLocation(this.program,k)]));
  this.ripples=Array.from({length:8},()=>[0,0,-100,0]);this.rippleIndex=0;this.quality=1;this.resize();
 }
 resize(){const scale=Math.min(devicePixelRatio||1,1.35,1500/innerWidth)*this.quality;this.canvas.width=Math.round(innerWidth*scale);this.canvas.height=Math.round(innerHeight*scale);this.gl.viewport(0,0,this.canvas.width,this.canvas.height);}
 ripple(x,z,time,strength=1){this.ripples[this.rippleIndex++%8]=[x,z,time,strength];}
 render(state){const gl=this.gl;gl.useProgram(this.program);gl.uniform2f(this.uniforms.resolution,this.canvas.width,this.canvas.height);for(const k of ['time','proximity','lateral','trust','alarm','flash','response','opening','active','reduced','departure'])gl.uniform1f(this.uniforms[k],state[k]||0);gl.uniform2f(this.uniforms.aim,state.aim?.x||0,state.aim?.y||0);gl.uniform4fv(this.uniforms.ripples,new Float32Array(this.ripples.flat()));gl.drawArrays(gl.TRIANGLES,0,6);}
}
