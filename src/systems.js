import {LENGTH, ROUTE_SECONDS, BOUNDS, TYPES, WEAPONS, PEOPLE, HEAT, EVENTS, makeLevel} from './data.js';

export const clamp = (n,a,b)=>Math.max(a,Math.min(b,n));
export const distance = (a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
// Forward along the route travels up and right, as in a 3/4 arcade street.
// The inverse maps screen-relative sticks and mouse aim back into world space.
export const project = (x,y)=>({x:(x+y)*.84,y:(y-x)*.43});
export const unproject = (x,y)=>({x:x/(2*.84)-y/(2*.43),y:x/(2*.84)+y/(2*.43)});

export class World {
  constructor() { this.reset(); }
  reset() {
    const level=makeLevel();
    this.objects=level.objects.map(o=>({...o,hp:TYPES[o.type].hp,broken:false,velocity:null,credit:null,damageTaken:0,reacted:false}));
    this.people=level.people.map((p,i)=>({...p,id:`person-${i}`,state:'idle',vx:0,vy:0,credit:null,phase:i*1.73}));
    this.dogs=level.dogs.map((d,i)=>({...d,id:i,active:false,stun:0,phase:i}));
    this.player={x:85,y:0,speed:86,side:0,angle:0,crash:0,invuln:0,aim:{x:1,y:0},throwCooldown:0,weapon:'paper',skid:0};
    this.projectiles=[]; this.particles=[]; this.hazards=[];
    this.time=0;this.remaining=ROUTE_SECONDS;this.finished=false;this.paused=false;
    this.score=0;this.damage=0;this.indirectDamage=0;this.combo=0;this.longestCombo=0;
    this.comboTimer=0;this.heat=0;this.heatPoints=0;this.chainCounter=0;
    this.chains=new Map();this.largestChain=0;this.messages=[];this.stats={mailboxes:0,windows:0,vehicles:0,objects:0,police:0};
    this.vehicleHits=new Set();this.eventCounts=new Map();this.policeSpawned=false;
  }
  say(label,x=this.player.x,y=this.player.y,color='#f1d898') {this.messages.push({label,x,y,color,life:2.2});if(this.messages.length>12)this.messages.shift();}
  chain() {const id=++this.chainCounter;this.chains.set(id,{damage:0,count:0,mail:0,windows:0,cars:new Set(),lots:new Set(),indirect:0,events:new Set()});return id;}
  event(name,chain,x,y) {
    const c=this.chains.get(chain); if(c?.events.has(name))return;
    c?.events.add(name);this.eventCounts.set(name,(this.eventCounts.get(name)||0)+1);
    this.score+=750;this.say(EVENTS[name]||name,x,y,'#e8b66f');
  }
  hit(o,amount,credit,indirect=false,source=null) {
    if (!o || o.broken || !credit || amount<=0)return false;
    const t=TYPES[o.type],effective=Math.min(amount,o.hp);o.credit=credit;o.hp-=effective;o.damageTaken+=effective;
    if (o.type==='car'||o.type==='van') {
      if(!this.vehicleHits.has(o.id)) {this.vehicleHits.add(o.id);this.stats.vehicles++;}
      const vehicleDamage=Math.round(t.value*o.damageTaken/t.hp)-Math.round(t.value*(o.damageTaken-effective)/t.hp);
      this.damage+=vehicleDamage;if(indirect)this.indirectDamage+=vehicleDamage;
      const c=this.chains.get(credit);if(c){c.damage+=vehicleDamage;c.cars.add(o.id);if(indirect)c.indirect++;this.largestChain=Math.max(this.largestChain,c.damage);}
      if(!o.reacted){o.reacted=true;o.velocity={x:65,y:o.y<0?-35:76,life:3.5,kind:'vehicle',hit:new Set()};this.say('DRIVER PANICS',o.x,o.y);}
    }
    if(o.hp>0){this.say('CRACK!',o.x,o.y);return false;}
    o.broken=true;this.stats.objects++;
    if(o.type==='mailbox')this.stats.mailboxes++;
    if(o.type==='window')this.stats.windows++;
    if(o.type==='van'&&o.police)this.stats.police++;
    const value=(o.type==='car'||o.type==='van')?0:t.value;
    this.damage+=value;
    if(indirect)this.indirectDamage+=value;
    this.combo++;this.comboTimer=3.5;this.longestCombo=Math.max(this.longestCombo,this.combo);
    const c=this.chains.get(credit);
    if(c){c.damage+=value;c.count++;c.lots.add(o.lot);if(indirect)c.indirect++;if(o.type==='mailbox')c.mail++;if(o.type==='window')c.windows++;this.largestChain=Math.max(this.largestChain,c.damage);}
    const style=1+Math.min(2,this.player.speed/80)+Math.min(3,this.combo*.13);
    const pts=Math.round(t.score*style*(indirect?1.7:1));this.score+=pts;
    this.heatPoints+=t.score*(indirect?1.1:1);
    this.say(`${indirect?'CHAIN ':'+'}${pts}`,o.x,o.y,indirect?'#ebd176':'#e8e9cb');
    this.burst(o.x,o.y,t.color,9);
    if(c){
      if(c.indirect>=1)this.event('domino',credit,o.x,o.y);
      if(c.mail>=3)this.event('mail',credit,o.x,o.y);
      if(c.windows>=2)this.event('windows',credit,o.x,o.y);
      if(c.cars.size>=2)this.event('cars',credit,o.x,o.y);
      if(c.damage>=11000&&c.indirect>=3)this.event('loss',credit,o.x,o.y);
      if(c.lots.size>=3)this.event('menace',credit,o.x,o.y);
    }
    this.react(o,credit,source);
    return true;
  }
  burst(x,y,color,n=7){for(let i=0;i<n;i++)this.particles.push({x,y,z:5,vx:(Math.random()-.5)*100,vy:(Math.random()-.5)*100,vz:30+Math.random()*70,life:.55+Math.random()*.5,color});}
  react(o,credit,source){
    const kind=TYPES[o.type].reaction;
    if(kind==='spill'||kind==='roll'||kind==='runaway'||kind==='fall'||kind==='cascade'||kind==='splinter'){
      const toRoad=o.y<0?1:-1;
      const vx=kind==='runaway'?95:kind==='cascade'?85:45;
      o.velocity={x:vx,y:kind==='spill'?(o.y<0?72:-72):kind==='runaway'?(o.y<0?-28:28):toRoad*42,life:kind==='runaway'?4.5:2.5,kind,hit:new Set()};
      if(kind==='spill')this.hazards.push({x:o.x,y:o.y,radius:33,life:9,kind:'debris',credit});
      if(kind==='cascade')for(let i=0;i<3;i++)this.projectiles.push({x:o.x,y:o.y,z:8,vx:60+i*25,vy:(i-1)*42,vz:40,life:1.4,credit,damage:1,radius:9,pierce:1,from:'debris',hit:new Set()});
    }
    if(kind==='water'){
      this.hazards.push({x:o.x+24,y:o.y+13,radius:82,life:14,kind:'water',credit});
      this.say('WATER MAIN!',o.x,o.y,'#99d3cf');this.burst(o.x,o.y,'#9dd4d9',16);
    }
    if(kind==='glass')this.hazards.push({x:o.x,y:o.y,radius:20,life:5,kind:'glass',credit});
    if(kind==='swerve'&&!o.velocity)o.velocity={x:80,y:60,life:2.5,kind:'vehicle',hit:new Set()};
    if(['window','car','van','mower'].includes(o.type))for(const p of this.people)if(distance(p,o)<125&&p.state==='idle'){p.state='angry';p.phase=0;}
  }
  throw(){
    const p=this.player,w=WEAPONS[p.weapon];if(this.finished||this.paused||p.throwCooldown>0||p.crash>0)return false;
    const id=this.chain(),a=p.aim;
    this.projectiles.push({x:p.x+20,y:p.y,z:18,vx:a.x*w.speed+p.speed*.55,vy:a.y*w.speed,vz:48,life:w.life,credit:id,damage:w.damage,radius:w.radius,pierce:w.pierce||1,from:p.weapon,hit:new Set()});
    p.throwCooldown=w.cooldown;this.burst(p.x+12,p.y,w.color,3);return true;
  }
  crash(reason='WIPEOUT!'){
    const p=this.player;if(p.invuln>0||p.crash>0)return;
    p.crash=.8;p.invuln=2.2;p.speed=24;p.side=0;this.combo=0;this.comboTimer=0;
    this.remaining=Math.max(0,this.remaining-.75);this.say(reason,p.x,p.y,'#f3a997');this.burst(p.x,p.y,'#d8b8a3',13);
  }
  update(dt,input={}) {
    if(this.finished||this.paused)return;
    dt=Math.min(dt,.05);this.time+=dt;this.remaining=Math.max(0,this.remaining-dt);
    const p=this.player;p.throwCooldown=Math.max(0,p.throwCooldown-dt);p.invuln=Math.max(0,p.invuln-dt);p.crash=Math.max(0,p.crash-dt);
    const steer=clamp(input.steer||0,-1,1), throttle=clamp(input.throttle||0,-1,1), braking=!!input.brake;
    if(input.aim&&Math.hypot(input.aim.x,input.aim.y)>.25){const len=Math.hypot(input.aim.x,input.aim.y);p.aim={x:input.aim.x/len,y:input.aim.y/len};}
    if(p.crash<=0){
      // Stick/keyboard directions are screen-relative. A press to the right must
      // actually add rightward screen velocity; auto-forward keeps the route moving.
      const control=unproject(steer*62,-throttle*62);
      const forward=braking?31:(input.boost?132:92);
      const responsiveness=braking?8:6.5;
      const targetX=Math.max(14,forward+control.x*(braking?.55:1));
      const targetY=control.y*(braking?.55:1);
      p.speed+=(targetX-p.speed)*Math.min(1,dt*responsiveness);
      p.side+=(targetY-p.side)*Math.min(1,dt*responsiveness);
      if(braking&&Math.abs(p.side)>15){p.skid=.35;if(Math.random()<dt*15)this.burst(p.x,p.y,'#b1a5a0',1);}
      p.skid=Math.max(0,p.skid-dt);
      p.y=clamp(p.y+p.side*dt,BOUNDS.minY,BOUNDS.maxY);
      p.x+=p.speed*dt;p.angle+=(p.side/110-p.angle)*Math.min(1,dt*5);
      const curb=Math.min(Math.abs(Math.abs(p.y)-87),Math.abs(Math.abs(p.y)-122));
      if(curb<7&&Math.abs(p.side)>35&&p.speed>80){p.speed*=.985;p.skid=.2;}
      if(Math.abs(p.y)>230&&p.x%740>220&&p.x%740<590)this.crash('FRONT PORCH!');
    }
    if(input.throw)this.throw();
    for(const o of this.objects){
      if(Math.abs(o.x-p.x)<45&&distance(p,o)<TYPES[o.type].radius+12&&!o.broken&&p.speed>32){
        this.hit(o,p.speed>110?2:1,this.chain(),false,p);
        if(TYPES[o.type].mass>=6)this.crash('HANDLEBARS OVER!');else p.speed*=.8;
      }
    }
    this.updateProjectiles(dt);this.updateObjects(dt);this.updateHazards(dt);this.updatePeople(dt);
    this.updateHeat(dt);
    for(const m of this.messages)m.life-=dt;this.messages=this.messages.filter(m=>m.life>0);
    for(const f of this.particles){f.x+=f.vx*dt;f.y+=f.vy*dt;f.z+=f.vz*dt;f.vz-=130*dt;f.life-=dt;}
    this.particles=this.particles.filter(f=>f.life>0&&f.z>-4);
    if(this.comboTimer>0){this.comboTimer-=dt;if(this.comboTimer<=0)this.combo=0;}
    if(p.x>=LENGTH||this.remaining<=0){this.finished=true;this.paused=false;this.say('ROUTE COMPLETE');}
  }
  updateProjectiles(dt){
    for(const b of this.projectiles){
      const steps=Math.max(1,Math.ceil(Math.hypot(b.vx,b.vy)*dt/12));
      for(let i=0;i<steps&&b.life>0;i++){
        const step=dt/steps;b.x+=b.vx*step;b.y+=b.vy*step;b.z+=b.vz*step;b.vz-=110*step;b.life-=step;
        for(const o of this.objects)if(!o.broken&&!b.hit.has(o.id)&&distance(b,o)<TYPES[o.type].radius+b.radius&&b.z<45){
          b.hit.add(o.id);this.hit(o,b.damage,b.credit,b.from==='debris',b);
          if(--b.pierce<=0){b.life=0;break;}b.vx*=.72;b.vy*=.72;
        }
        if(b.z<0)b.life=0;
      }
    }
    this.projectiles=this.projectiles.filter(b=>b.life>0&&b.x<LENGTH+100);
  }
  updateObjects(dt){
    for(const o of this.objects)if(o.velocity){
      const v=o.velocity;const old={x:o.x,y:o.y};o.x+=v.x*dt;o.y+=v.y*dt;v.life-=dt;
      // A panicked driver arcs toward the nearest curb and can actually strike a hydrant.
      if(v.kind==='vehicle'&&v.life<2.4)v.y+=(o.y<0?-1:1)*25*dt;
      const r=TYPES[o.type].radius;
      for(const target of this.objects){
        if(target===o||target.broken||v.hit.has(target.id))continue;
        const d=distance(o,target);
        if(d<r+TYPES[target.type].radius+5){
          v.hit.add(target.id);
          const impact=v.kind==='vehicle'?3:(v.kind==='spill'?1:2);
          this.hit(target,impact,o.credit,true,o);
          if(v.kind!=='vehicle')v.x*=.72;
        }
      }
      if(distance(o,this.player)<r+12&&Math.hypot(v.x,v.y)>30)this.crash('ROAD HAZARD!');
      if(v.life<=0||Math.hypot(v.x,v.y)<12){o.velocity=null;}else if(v.kind!=='vehicle'){v.x*=1-dt*.5;v.y*=1-dt*.5;}
      if(!Number.isFinite(o.x+o.y))Object.assign(o,old,{velocity:null});
    }
  }
  updateHazards(dt){
    for(const h of this.hazards){h.life-=dt;
      if(distance(h,this.player)<h.radius*.5&&this.player.speed>54&&h.kind==='water')this.crash('HYDROPLANE!');
      for(const p of this.people)if((p.state==='idle'||p.state==='angry')&&h.kind==='water'&&distance(h,p)<h.radius){
        p.state='slip';p.credit=h.credit;p.vx=95;p.vy=25;this.event('slip',h.credit,p.x,p.y);
      }
    }
    this.hazards=this.hazards.filter(h=>h.life>0);
  }
  updatePeople(dt){
    const p=this.player;
    for(const n of this.people){
      n.phase+=dt;
      if(n.state==='slip'){
        n.x+=n.vx*dt;n.y+=n.vy*dt;n.vx*=1-dt*.6;
        for(const o of this.objects)if(!o.broken&&o.type==='cart'&&distance(n,o)<TYPES.cart.radius+13){this.hit(o,2,n.credit,true,n);n.state='stunned';break;}
        if(n.phase>12)n.state='stunned';
      } else if(n.state==='angry'){
        n.x+=clamp(p.x-n.x,-1,1)*PEOPLE[n.kind].speed*dt*1.3;
        n.y+=clamp(p.y-n.y,-1,1)*PEOPLE[n.kind].speed*dt*1.3;
        if(distance(p,n)<17&&this.heat>=3)this.crash('NEIGHBORLY WELCOME!');
      } else if(n.state==='idle'&&PEOPLE[n.kind].speed){n.x+=Math.sin(n.phase*.7)*PEOPLE[n.kind].speed*dt;n.y+=Math.cos(n.phase*.6)*PEOPLE[n.kind].speed*dt*.3;}
    }
    for(const d of this.dogs){d.stun=Math.max(0,d.stun-dt);if(d.active&&d.stun===0){d.x+=clamp(p.x-d.x,-1,1)*43*dt;d.y+=clamp(p.y-d.y,-1,1)*43*dt;if(distance(d,p)<18){this.crash('DOGGONE IT!');d.stun=8;d.y=d.y<0?-190:190;}}}
  }
  updateHeat(dt){
    this.heatPoints=Math.max(0,this.heatPoints-dt*22);
    const next=HEAT.reduce((n,threshold,i)=>this.heatPoints>=threshold?i:n,0);
    if(next>this.heat)this.say(`HEAT ${next}: ${['','CURTAINS TWITCH','DOGS LOOSE','BLOCKADE','PATROL','THE WHOLE BLOCK'][next]}`);
    this.heat=next;
    for(const d of this.dogs)d.active=this.heat>=2&&d.stun===0&&Math.abs(d.x-this.player.x)<360;
    if(this.heat>=4&&!this.policeSpawned){
      this.policeSpawned=true;this.objects.push({id:'patrol',type:'van',x:this.player.x+300,y:20,lot:99,hp:4,broken:false,velocity:{x:-20,y:0,life:9,kind:'vehicle',hit:new Set()},credit:null,damageTaken:0,reacted:true,police:true});
      this.say('PATROL ARRIVES');
    }
  }
  report(){return {score:this.score,damage:this.damage,indirectDamage:this.indirectDamage,longestCombo:this.longestCombo,largestChain:this.largestChain,heat:this.heat,stats:{...this.stats},claims:this.chains.size,approval:Math.max(1,100-Math.floor(this.damage/400)-this.heat*8)};}
}
