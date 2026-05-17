import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import './GhostCursor.css';

const VERT = `varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position,1.0);}`;

const FRAG = `
uniform float iTime;uniform vec3 iResolution;uniform vec2 iMouse;
uniform vec2 iPrevMouse[MAX_TRAIL_LENGTH];uniform float iOpacity,iScale,iBrightness,iEdgeIntensity;
uniform vec3 iBaseColor;varying vec2 vUv;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f*=f*(3.-2.*f);
return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;mat2 m=mat2(cos(.5),sin(.5),-sin(.5),cos(.5));
for(int i=0;i<5;i++){v+=a*noise(p);p=m*p*2.;a*=.5;}return v;}
vec4 blob(vec2 p,vec2 mp,float intensity,float activity){
vec2 q=vec2(fbm(p*iScale+iTime*.1),fbm(p*iScale+vec2(5.2,1.3)+iTime*.1));
vec2 r=vec2(fbm(p*iScale+q*1.5+iTime*.15),fbm(p*iScale+q*1.5+vec2(8.3,2.8)+iTime*.15));
float smoke=fbm(p*iScale+r*.8),radius=.5+.3*(1./iScale);
float df=1.-smoothstep(0.,radius*activity,length(p-mp));float alpha=pow(smoke,2.5)*df;
vec3 c=mix(mix(iBaseColor,vec3(1),.15),mix(iBaseColor,vec3(.8,.9,1),.25),sin(iTime*.5)*.5+.5);
return vec4(c*alpha*intensity,alpha*intensity);}
void main(){
vec2 uv=(gl_FragCoord.xy/iResolution.xy*2.-1.)*vec2(iResolution.x/iResolution.y,1.);
vec2 mouse=(iMouse*2.-1.)*vec2(iResolution.x/iResolution.y,1.);
vec3 cA=vec3(0);float aA=0.;vec4 b=blob(uv,mouse,1.,iOpacity);cA+=b.rgb;aA+=b.a;
for(int i=0;i<MAX_TRAIL_LENGTH;i++){
vec2 pm=(iPrevMouse[i]*2.-1.)*vec2(iResolution.x/iResolution.y,1.);
float t=1.-float(i)/float(MAX_TRAIL_LENGTH);t=pow(t,2.);
if(t>.01){vec4 bt=blob(uv,pm,t*.8,iOpacity);cA+=bt.rgb;aA+=bt.a;}}
cA*=iBrightness;vec2 u01=gl_FragCoord.xy/iResolution.xy;
float ed=min(min(u01.x,1.-u01.x),min(u01.y,1.-u01.y));
float dm=clamp(ed*2.,0.,1.),k=clamp(iEdgeIntensity,0.,1.);
gl_FragColor=vec4(cA,clamp(aA*iOpacity*mix(1.-k,1.,dm),0.,1.));}`;

export default function GhostCursor({className='',style,trailLength=50,inertia=.5,
  grainIntensity=.05,bloomStrength=.1,bloomRadius=1,bloomThreshold=.025,
  brightness=1,color='#B497CF',mixBlendMode='screen',edgeIntensity=0,
  maxDevicePixelRatio=.5,targetPixels,fadeDelayMs,fadeDurationMs,zIndex=10}){
  const cRef=useRef(),rRef=useRef(),compRef=useRef(),matRef=useRef(),bpRef=useRef(),fpRef=useRef();
  const tbRef=useRef([]),hRef=useRef(0),rafRef=useRef(),roRef=useRef();
  const cmRef=useRef(new THREE.Vector2(.5,.5)),velRef=useRef(new THREE.Vector2(0,0));
  const foRef=useRef(1),lmRef=useRef(performance.now()),paRef=useRef(false),runRef=useRef(false),vsRef=useRef(false);
  const isTouch=useMemo(()=>typeof window!=='undefined'&&('ontouchstart' in window||navigator.maxTouchPoints>0),[]);
  const pb=targetPixels??(isTouch?.9e6:1.3e6),fd=fadeDelayMs??(isTouch?500:1e3),fdu=fadeDurationMs??(isTouch?1e3:1500);

  const FGS=useMemo(()=>({uniforms:{tDiffuse:{value:null},iTime:{value:0},intensity:{value:grainIntensity}},
    vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`uniform sampler2D tDiffuse;uniform float iTime,intensity;varying vec2 vUv;
    float h(float n){return fract(sin(n)*43758.5453);}
    void main(){vec4 c=texture2D(tDiffuse,vUv);c.rgb+=(h(vUv.x*1e3+vUv.y*2e3+iTime)*2.-1.)*intensity*c.rgb;gl_FragColor=c;}`}),[grainIntensity]);

  const UPP=useMemo(()=>new ShaderPass({uniforms:{tDiffuse:{value:null}},
    vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`uniform sampler2D tDiffuse;varying vec2 vUv;void main(){vec4 c=texture2D(tDiffuse,vUv);float a=max(c.a,1e-5);gl_FragColor=vec4(clamp(c.rgb/a,0.,1.),c.a);}`}),[]);

  useEffect(()=>{
    const host=cRef.current,par=host?.parentElement;if(!host||!par)return;let on=true;
    const pp=par.style.position;if(!pp||pp==='static')par.style.position='relative';
    const R=new THREE.WebGLRenderer({antialias:!isTouch,alpha:true,depth:false,stencil:false,premultipliedAlpha:false});
    R.setClearColor(0,0);rRef.current=R;R.domElement.style.pointerEvents='none';
    if(mixBlendMode)R.domElement.style.mixBlendMode=String(mixBlendMode);
    host.appendChild(R.domElement);
    const sc=new THREE.Scene(),cam=new THREE.OrthographicCamera(-1,1,1,-1,0,1),geo=new THREE.PlaneGeometry(2,2);
    const ml=Math.max(1,Math.floor(trailLength));
    tbRef.current=Array.from({length:ml},()=>new THREE.Vector2(.5,.5));hRef.current=0;
    const bc=new THREE.Color(color);
    const mat=new THREE.ShaderMaterial({defines:{MAX_TRAIL_LENGTH:ml},
      uniforms:{iTime:{value:0},iResolution:{value:new THREE.Vector3(1,1,1)},iMouse:{value:new THREE.Vector2(.5,.5)},
        iPrevMouse:{value:tbRef.current.map(v=>v.clone())},iOpacity:{value:1},iScale:{value:1},
        iBaseColor:{value:new THREE.Vector3(bc.r,bc.g,bc.b)},iBrightness:{value:brightness},iEdgeIntensity:{value:edgeIntensity}},
      vertexShader:VERT,fragmentShader:FRAG,transparent:true,depthTest:false,depthWrite:false});
    matRef.current=mat;sc.add(new THREE.Mesh(geo,mat));
    const comp=new EffectComposer(R);compRef.current=comp;comp.addPass(new RenderPass(sc,cam));
    const bp=new UnrealBloomPass(new THREE.Vector2(1,1),bloomStrength,bloomRadius,bloomThreshold);
    bpRef.current=bp;comp.addPass(bp);const fp=new ShaderPass(FGS);fpRef.current=fp;comp.addPass(fp);comp.addPass(UPP);
    const resize=()=>{if(!on)return;const r=host.getBoundingClientRect(),w=Math.floor(r.width),h=Math.floor(r.height);
      if(w<=0||h<=0){vsRef.current=false;return;}
      const d=Math.min(window.devicePixelRatio||1,maxDevicePixelRatio),n=w*h*d*d;
      const s=n<=pb?1:Math.max(.5,Math.min(1,Math.sqrt(pb/Math.max(1,n)))),pr=d*s;
      R.setPixelRatio(pr);R.setSize(w,h,false);comp.setSize(w,h);
      const wp=Math.max(1,Math.floor(w*pr)),hp=Math.max(1,Math.floor(h*pr));
      mat.uniforms.iResolution.value.set(wp,hp,1);
      const base=600,cur=Math.min(Math.max(1,r.width),Math.max(1,r.height));
      mat.uniforms.iScale.value=Math.max(.5,Math.min(2,cur/base));bp.setSize(wp,hp);vsRef.current=true;};
    resize();const ro=new ResizeObserver(()=>{if(on)resize();});roRef.current=ro;ro.observe(par);ro.observe(host);
    const t0=performance.now();
    const anim=()=>{if(!on)return;if(!vsRef.current){rafRef.current=requestAnimationFrame(anim);return;}
      const now=performance.now(),t=(now-t0)/1e3,m=matRef.current,c=compRef.current;
      if(paRef.current){velRef.current.set(cmRef.current.x-m.uniforms.iMouse.value.x,cmRef.current.y-m.uniforms.iMouse.value.y);
        m.uniforms.iMouse.value.copy(cmRef.current);foRef.current=1;}
      else{velRef.current.multiplyScalar(inertia);if(velRef.current.lengthSq()>1e-6)m.uniforms.iMouse.value.add(velRef.current);
        const dt=now-lmRef.current;if(dt>fd){const k=Math.min(1,(dt-fd)/fdu);foRef.current=Math.max(0,1-k);}}
      const N=tbRef.current.length;hRef.current=(hRef.current+1)%N;tbRef.current[hRef.current].copy(m.uniforms.iMouse.value);
      const arr=m.uniforms.iPrevMouse.value;for(let i=0;i<N;i++)arr[i].copy(tbRef.current[(hRef.current-i+N)%N]);
      m.uniforms.iOpacity.value=foRef.current;m.uniforms.iTime.value=t;
      if(fpRef.current?.uniforms?.iTime)fpRef.current.uniforms.iTime.value=t;c.render();
      if(!paRef.current&&foRef.current<=.001){runRef.current=false;rafRef.current=null;return;}
      rafRef.current=requestAnimationFrame(anim);};
    const go=()=>{if(!runRef.current){runRef.current=true;rafRef.current=requestAnimationFrame(anim);}};
    const onM=e=>{const r=par.getBoundingClientRect();
      cmRef.current.set(THREE.MathUtils.clamp((e.clientX-r.left)/Math.max(1,r.width),0,1),
        THREE.MathUtils.clamp(1-(e.clientY-r.top)/Math.max(1,r.height),0,1));
      paRef.current=true;lmRef.current=performance.now();go();};
    const onE=()=>{paRef.current=true;go();};
    const onL=()=>{paRef.current=false;lmRef.current=performance.now();go();};
    par.addEventListener('pointermove',onM,{passive:true});par.addEventListener('pointerenter',onE,{passive:true});
    par.addEventListener('pointerleave',onL,{passive:true});go();
    return()=>{on=false;vsRef.current=false;if(rafRef.current)cancelAnimationFrame(rafRef.current);
      runRef.current=false;par.removeEventListener('pointermove',onM);par.removeEventListener('pointerenter',onE);
      par.removeEventListener('pointerleave',onL);roRef.current?.disconnect();sc.clear();geo.dispose();mat.dispose();
      matRef.current=null;comp.dispose();compRef.current=null;R.dispose();R.forceContextLoss();rRef.current=null;
      if(R.domElement?.parentElement)R.domElement.parentElement.removeChild(R.domElement);
      if(!pp||pp==='static')par.style.position=pp;};
  },[trailLength,inertia,grainIntensity,bloomStrength,bloomRadius,bloomThreshold,pb,fd,fdu,isTouch,color,brightness,mixBlendMode,edgeIntensity]);

  useEffect(()=>{if(matRef.current){const c=new THREE.Color(color);matRef.current.uniforms.iBaseColor.value.set(c.r,c.g,c.b);}},[color]);
  useEffect(()=>{if(matRef.current)matRef.current.uniforms.iBrightness.value=brightness;},[brightness]);
  useEffect(()=>{if(matRef.current)matRef.current.uniforms.iEdgeIntensity.value=edgeIntensity;},[edgeIntensity]);
  useEffect(()=>{if(fpRef.current?.uniforms?.intensity)fpRef.current.uniforms.intensity.value=grainIntensity;},[grainIntensity]);

  const ms=useMemo(()=>({zIndex,...style}),[zIndex,style]);
  return <div ref={cRef} className={`ghost-cursor ${className}`} style={ms}/>;
}
