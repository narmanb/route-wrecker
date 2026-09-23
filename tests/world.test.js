import test from 'node:test';
import assert from 'node:assert/strict';
import {World,project,unproject} from '../src/systems.js';
import {LENGTH,ROUTE_SECONDS,TYPES,makeLevel} from '../src/data.js';
import {Renderer} from '../src/render.js';

test('projected street moves up-right and aiming has an inverse',()=>{
  const p=project(100,0);assert(p.x>0&&p.y<0);
  const q=unproject(p.x,p.y);assert(Math.abs(q.x-100)<1e-9);assert(Math.abs(q.y)<1e-9);
});

test('the level is authored, varied, and travels for roughly 2 to 3 minutes',()=>{
  const l=makeLevel();assert(new Set(l.objects.map(o=>o.type)).size>=11);
  assert(l.objects.some(o=>o.x>4500));assert(l.people.length>=6);assert(l.dogs.length>=4);
  const w=new World();let wipeouts=0;const crash=w.crash;
  w.crash=function(reason){if(this.player.invuln<=0)wipeouts++;return crash.call(this,reason);};
  while(!w.finished)w.update(.05,{});
  assert(w.time>=115&&w.time<=ROUTE_SECONDS);assert(w.player.x>=LENGTH-150||w.remaining===0);
  assert.equal(wipeouts,0,'the default center route should let a new player learn the controls');
});

test('directions move where they point onscreen, with fast coasting and effective brakes',()=>{
  const ride=input=>{const w=new World();w.objects=[];w.people=[];w.dogs=[];const start=project(w.player.x,w.player.y);for(let i=0;i<20;i++)w.update(.05,input);const end=project(w.player.x,w.player.y);return {dx:end.x-start.x,dy:end.y-start.y,w};};
  const coast=ride({}),right=ride({steer:1}),left=ride({steer:-1}),up=ride({throttle:1}),down=ride({throttle:-1});
  assert(coast.dx>70&&coast.dy<0,'auto-forward should be visibly brisk and diagonal');
  assert(right.dx>coast.dx+40&&left.dx<coast.dx-40,'left/right must match screen direction');
  assert(up.dy<coast.dy-40&&down.dy>coast.dy+40,'up/down must match screen direction');
  assert(up.w.player.speed>coast.w.player.speed&&down.w.player.speed<coast.w.player.speed);
  const w=right.w,fast=w.player.speed;
  for(let i=0;i<20;i++)w.update(.05,{brake:true});
  assert(w.player.speed<fast/2&&w.player.speed>0);
});

test('opening sequence carries one causal credit through water, resident, cart, fence and ornament',()=>{
  const w=new World();w.player.x=240;w.player.y=-55;w.player.aim={x:1,y:0};
  assert(w.throw());assert(!w.throw());
  for(let i=0;i<250;i++)w.update(.016,{brake:true});
  const [bin,car,hydrant,cart,fence,ornament]=w.objects;
  for(const o of [bin,hydrant,cart,fence,ornament])assert(o.broken,`${o.type} did not break`);
  assert(car.damageTaken>0);assert.equal(w.people[0].credit,bin.credit);
  for(const o of [car,hydrant,cart,fence,ornament])assert.equal(o.credit,bin.credit);
  assert.equal(w.chains.size,1);assert(w.indirectDamage>0);assert(w.largestChain>3000);
  assert(w.eventCounts.has('domino'));assert(w.eventCounts.has('slip'));
});

test('vehicle partial damage cannot be counted twice or unlock two-vehicle event',()=>{
  const w=new World(),car=w.objects.find(o=>o.type==='car'),id=w.chain();
  w.hit(car,1,id,false);w.hit(car,1,id,true);w.hit(car,10,id,true);
  assert.equal(w.damage,TYPES.car.value);assert.equal(w.stats.vehicles,1);
  assert.equal(w.chains.get(id).cars.size,1);assert(!w.eventCounts.has('cars'));
  assert(w.indirectDamage>0);
});

test('wipeout is recoverable and a finished route produces separate totals',()=>{
  const w=new World();w.combo=8;w.crash();assert.equal(w.combo,0);assert(w.player.crash>0);
  for(let i=0;i<100;i++)w.update(.016,{});assert.equal(w.player.crash,0);
  w.player.x=LENGTH-1;for(let i=0;i<10&&!w.finished;i++)w.update(.05,{});assert(w.finished);
  const r=w.report();assert('damage' in r&&'score' in r&&'approval' in r);
});

test('renderer draws a full populated frame with a canvas context',()=>{
  const calls=[];const g=new Proxy({},{get(target,name){return target[name]??((...args)=>calls.push([name,args]));},set(target,name,value){target[name]=value;return true;}});
  const canvas={getContext:()=>g,width:0,height:0},renderer=new Renderer(canvas),w=new World();
  w.hazards.push({x:340,y:0,radius:40,kind:'water',life:5});
  renderer.render(w);
  assert.equal(canvas.width,960);assert.equal(canvas.height,540);
  assert(calls.some(c=>c[0]==='fillRect'));assert(calls.some(c=>c[0]==='ellipse'));
});
