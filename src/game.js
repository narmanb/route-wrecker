import {World,unproject,clamp} from './systems.js';
import {Renderer} from './render.js';
import {LENGTH,WEAPONS} from './data.js';

const $=id=>document.getElementById(id);
const canvas=$('scene'),renderer=new Renderer(canvas),world=new World();
let state='title',last=performance.now(),gamepadActive=false,usingTouch=false,triggerWasDown=false,switchWasDown=false,pauseWasDown=false;
const keys=new Set(),touch={move:{x:0,y:0},aim:{x:0,y:0},brake:false,boost:false};
const scoreFormat=n=>Math.floor(n).toLocaleString('en-US');
function panels(){for(const id of ['title','pausePanel','results'])$(id).classList.toggle('hidden',id!==({title:'title',paused:'pausePanel',results:'results'}[state]||''));$('hud').classList.toggle('hidden',state==='title');$('bottom').classList.toggle('hidden',state==='title');$('touch').classList.toggle('hidden',state!=='playing'||gamepadActive||!usingTouch);}
function begin(){world.reset();state='playing';panels();orientation();}
function togglePause(){if(state==='playing'){state='paused';world.paused=true;}else if(state==='paused'){state='playing';world.paused=false;}panels();}
function report(){state='results';const r=world.report(),fields=[['PROPERTY DAMAGE','$'+scoreFormat(r.damage)],['ARCADE SCORE',scoreFormat(r.score)],['LONGEST COMBO','x'+r.longestCombo],['LARGEST CHAIN','$'+scoreFormat(r.largestChain)],['INDIRECT DAMAGE','$'+scoreFormat(r.indirectDamage)],['MAILBOXES DESTROYED',r.stats.mailboxes],['WINDOWS BROKEN',r.stats.windows],['VEHICLES DAMAGED',r.stats.vehicles],['TOTAL OBJECTS',r.stats.objects],['PATROLS WRECKED',r.stats.police],['INSURANCE CLAIMS',r.claims],['NEIGHBORHOOD APPROVAL',r.approval+'%']];$('report').replaceChildren(...fields.map(([a,b])=>{const div=document.createElement('div'),label=document.createElement('span'),value=document.createElement('b');label.textContent=a;value.textContent=b;div.append(label,value);return div;}));$('resultQuote').textContent=r.damage>12000?'“WE HAVE RECONSIDERED YOUR COVERAGE.”':'“PLEASE KEEP YOUR RECEIPTS.”';panels();}
function orientation(){if(screen.orientation?.lock){screen.orientation.lock('landscape').catch(()=>{});} $('rotate').classList.toggle('hidden',innerWidth>=innerHeight);}
async function fullscreen(){try{if(!document.fullscreenElement)await $('shell').requestFullscreen();else await document.exitFullscreen();}catch{}orientation();}
document.addEventListener('pointerdown',e=>{if(e.pointerType==='touch'){usingTouch=true;gamepadActive=false;mouseAim=null;panels();}},{passive:true});
$('start').onclick=begin;$('again').onclick=begin;$('restartPause').onclick=begin;$('pause').onclick=togglePause;$('resume').onclick=togglePause;
document.querySelectorAll('.fullscreen').forEach(b=>b.onclick=fullscreen);
document.addEventListener('fullscreenchange',orientation);window.addEventListener('resize',orientation);orientation();
window.addEventListener('keydown',e=>{if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Escape'].includes(e.code))e.preventDefault();keys.add(e.code);if(e.repeat)return;if(e.code==='Escape'||e.code==='KeyP'){togglePause();}if(e.code==='KeyQ'||e.code==='KeyE')switchWeapon();if(e.code==='Enter'&&state==='title')begin();if(e.code==='KeyR'&&state==='results')begin();});
window.addEventListener('keyup',e=>keys.delete(e.code));
window.addEventListener('blur',()=>{keys.clear();if(state==='playing')togglePause();});
function switchWeapon(){world.player.weapon=world.player.weapon==='paper'?'ball':'paper';world.say(WEAPONS[world.player.weapon].label);}
let mouseAim=null,mouseThrow=false;
canvas.addEventListener('pointermove',e=>{if(e.pointerType==='mouse'){const r=canvas.getBoundingClientRect(),scale=Math.max(r.width/960,r.height/540),offsetX=(r.width-960*scale)/2,offsetY=(r.height-540*scale)/2;const sx=(e.clientX-r.left-offsetX)/scale,sy=(e.clientY-r.top-offsetY)/scale;const p=renderer.point(world.player.x,world.player.y);mouseAim=unproject(sx-p.x,sy-p.y);gamepadActive=false;}});
canvas.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'&&e.button===0)mouseThrow=true;});
window.addEventListener('pointerup',e=>{if(e.pointerType==='mouse')mouseThrow=false;});
canvas.addEventListener('contextmenu',e=>e.preventDefault());
function stick(id,key,fireOnRelease=false){const el=$(id),nub=el.querySelector('.nub');let pointer=null,moved=false;
  function move(e){const r=el.getBoundingClientRect(),dx=e.clientX-r.left-r.width/2,dy=e.clientY-r.top-r.height/2,limit=r.width*.38,len=Math.hypot(dx,dy),scale=Math.min(1,limit/(len||1));touch[key]={x:dx*scale/limit,y:dy*scale/limit};nub.style.transform=`translate(${dx*scale}px,${dy*scale}px)`;if(len>12)moved=true;}
  el.addEventListener('pointerdown',e=>{usingTouch=true;gamepadActive=false;pointer=e.pointerId;moved=false;el.setPointerCapture(pointer);move(e);panels();e.preventDefault();});
  el.addEventListener('pointermove',e=>{if(e.pointerId===pointer)move(e);});
  const end=e=>{if(e.pointerId!==pointer)return;if(fireOnRelease&&moved&&state==='playing'){
    // Capture the final touch direction even if release occurs between two frames.
    const a=unproject(touch.aim.x,touch.aim.y),length=Math.hypot(a.x,a.y);
    if(length>.01){world.player.aim={x:a.x/length,y:a.y/length};world.throw();}
  }pointer=null;touch[key]={x:0,y:0};nub.style.transform='';};
  el.addEventListener('pointerup',end);el.addEventListener('pointercancel',end);
}
stick('moveStick','move');stick('aimStick','aim',true);
for(const [id,key] of [['touchBrake','brake'],['touchBoost','boost']]){const b=$(id);b.addEventListener('pointerdown',e=>{usingTouch=true;touch[key]=true;b.setPointerCapture(e.pointerId);e.preventDefault();});for(const event of ['pointerup','pointercancel'])b.addEventListener(event,()=>touch[key]=false);}
$('touchSwitch').addEventListener('pointerdown',e=>{e.preventDefault();switchWeapon();});
function controller(){const pad=navigator.getGamepads?.().find(p=>p&&p.connected);if(!pad)return null;
  const dead=n=>Math.abs(n)<.17?0:n;const a=pad.axes;
  const steer=dead(a[0]||0)+(pad.buttons[15]?.pressed?1:0)-(pad.buttons[14]?.pressed?1:0);
  const throttle=-dead(a[1]||0)+(pad.buttons[12]?.pressed?1:0)-(pad.buttons[13]?.pressed?1:0);
  const right=unproject(dead(a[2]||0),dead(a[3]||0));
  const trigger=pad.buttons[7]?.pressed||pad.buttons[7]?.value>.35,sw=pad.buttons[3]?.pressed||pad.buttons[4]?.pressed||pad.buttons[5]?.pressed,pause=pad.buttons[9]?.pressed;
  if(sw&&!switchWasDown)switchWeapon();switchWasDown=!!sw;
  if(state==='title'&&(pause||pad.buttons[0]?.pressed))begin();
  else if(pause&&!pauseWasDown)togglePause();pauseWasDown=!!pause;
  if(!gamepadActive&&(Math.abs(steer)+Math.abs(throttle)+Math.hypot(right.x,right.y)>0||trigger||pad.buttons[0]?.pressed)){gamepadActive=true;panels();}
  const result={steer:clamp(steer,-1,1),throttle:clamp(throttle,-1,1),aim:Math.hypot(right.x,right.y)>.2?right:null,brake:!!(pad.buttons[6]?.pressed||pad.buttons[6]?.value>.35),boost:!!pad.buttons[0]?.pressed,throw:!!trigger&&!triggerWasDown};triggerWasDown=!!trigger;return result;
}
function input(){const pad=controller();const kb={steer:Number(keys.has('KeyD')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('ArrowLeft')),throttle:Number(keys.has('KeyW')||keys.has('ArrowUp'))-Number(keys.has('KeyS')||keys.has('ArrowDown')),brake:keys.has('ShiftLeft')||keys.has('ShiftRight'),boost:keys.has('KeyF'),throw:keys.has('Space')||mouseThrow};
  const aim=mouseAim||unproject(Number(keys.has('KeyL'))-Number(keys.has('KeyJ')),-Number(keys.has('KeyI'))+Number(keys.has('KeyK')));
  if(touch.aim.x||touch.aim.y)kb.aim=unproject(touch.aim.x,touch.aim.y);
  else if(aim.x||aim.y)kb.aim=aim;
  if(usingTouch){kb.steer=touch.move.x;kb.throttle=-touch.move.y;kb.brake=touch.brake;kb.boost=touch.boost;}
  return gamepadActive&&pad?pad:kb;
}
function hud(){const r=world.report();$('score').textContent=String(r.score).padStart(6,'0');$('damage').textContent='$'+scoreFormat(r.damage);$('timer').textContent=`${Math.floor(world.remaining/60)}:${String(Math.floor(world.remaining%60)).padStart(2,'0')}`;$('combo').textContent=world.combo>1?`COMBO x${world.combo}`:'';$('heat').textContent=`HEAT ${world.heat} ${'◆'.repeat(world.heat)}`;$('weapon').textContent=WEAPONS[world.player.weapon].label;$('progress').textContent=`${Math.round(world.player.x/LENGTH*100)}% ▸`;}
function frame(now){const dt=Math.min((now-last)/1000,.05);last=now;if(state==='playing'){world.update(dt,input());if(world.finished)report();hud();}renderer.render(world);requestAnimationFrame(frame);}requestAnimationFrame(frame);
