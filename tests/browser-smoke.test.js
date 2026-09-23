import test from 'node:test';
import assert from 'node:assert/strict';

test('browser entry starts a route, renders a frame, pauses, and restarts',async()=>{
  const listeners=new Map(),elements=new Map(),draws=[];
  const context=new Proxy({}, {get(target,key){return target[key]??((...args)=>draws.push([key,...args]));},set(target,key,value){target[key]=value;return true;}});
  const element=id=>{
    if(!elements.has(id))elements.set(id,{
      id,textContent:'',style:{},classList:{values:new Set(),toggle(name,on){if(on)this.values.add(name);else this.values.delete(name);},contains(name){return this.values.has(name);}},
      addEventListener(name,fn){listeners.set(`${id}:${name}`,fn);},getContext:()=>context,
      getBoundingClientRect:()=>({left:0,top:0,width:960,height:540}),
      querySelector:()=>({style:{}}),setPointerCapture(){},append(){},replaceChildren(){},
    });return elements.get(id);
  };
  const prev={document:globalThis.document,window:globalThis.window,navigator:globalThis.navigator,screen:globalThis.screen,innerWidth:globalThis.innerWidth,innerHeight:globalThis.innerHeight,requestAnimationFrame:globalThis.requestAnimationFrame};
  let nextFrame;
  globalThis.document={getElementById:element,querySelectorAll:()=>[],addEventListener(name,fn){listeners.set(`document:${name}`,fn);},createElement:()=>({textContent:'',append(){}})};
  globalThis.window={addEventListener(name,fn){listeners.set(`window:${name}`,fn);}};
  Object.defineProperty(globalThis,'navigator',{configurable:true,value:{getGamepads:()=>[]}});
  globalThis.screen={orientation:{lock:async()=>{}}};globalThis.innerWidth=960;globalThis.innerHeight=540;
  globalThis.requestAnimationFrame=fn=>{nextFrame=fn;};
  try{
    await import('../src/game.js');
    assert(nextFrame);element('start').onclick();nextFrame(performance.now()+16);
    assert(!element('hud').classList.contains('hidden'));
    assert(draws.some(c=>c[0]==='fillRect'));
    element('pause').onclick();assert(!element('pausePanel').classList.contains('hidden'));
    element('restartPause').onclick();assert(element('pausePanel').classList.contains('hidden'));
  }finally{
    for(const [key,value] of Object.entries(prev)){
      if(key==='navigator')Object.defineProperty(globalThis,key,{configurable:true,value});
      else if(value===undefined)delete globalThis[key];else globalThis[key]=value;
    }
  }
});
