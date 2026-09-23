import {TYPES,LENGTH} from './data.js';
import {project,clamp} from './systems.js';

const W=960,H=540;
const COLORS={ink:'#29333b',road:'#444a50',roadEdge:'#69706e',sidewalk:'#a99f8e',grass:'#637960',darkGrass:'#536a58',gold:'#bca981',cream:'#e0cfab',roof:'#544d59'};
const poly=(g,points,color)=>{g.fillStyle=color;g.beginPath();g.moveTo(points[0].x,points[0].y);for(const p of points.slice(1))g.lineTo(p.x,p.y);g.closePath();g.fill();};
const rect=(g,x,y,w,h,c)=>{g.fillStyle=c;g.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));};
const line=(g,x,y,xx,yy,color,width=2)=>{g.strokeStyle=color;g.lineWidth=width;g.beginPath();g.moveTo(x,y);g.lineTo(xx,yy);g.stroke();};

export class Renderer {
  constructor(canvas){this.canvas=canvas;this.g=canvas.getContext('2d',{alpha:false});canvas.width=W;canvas.height=H;this.g.imageSmoothingEnabled=false;this.camera={x:0,y:0};}
  point(x,y,z=0){const q=project(x,y),c=project(this.camera.x,this.camera.y);return {x:q.x-c.x+340,y:q.y-c.y+340-z};}
  quad(x0,y0,x1,y1,color){const p=(x,y)=>this.point(x,y);poly(this.g,[p(x0,y0),p(x1,y0),p(x1,y1),p(x0,y1)],color);}
  ground(world){
    const g=this.g;rect(g,0,0,W,H,'#506456');
    const x0=Math.floor((world.player.x-800)/740)*740,x1=world.player.x+1500;
    this.quad(x0,-430,x1,440,COLORS.grass);
    for(let x=x0;x<x1;x+=55){
      const y1=this.point(x,-245),y2=this.point(x,245);
      line(g,y1.x,y1.y,y1.x+6,y1.y+3,'#72846a',1);line(g,y2.x,y2.y,y2.x+6,y2.y+3,'#72846a',1);
    }
    this.quad(x0,-126,x1,-84,COLORS.sidewalk);this.quad(x0,84,x1,126,COLORS.sidewalk);
    this.quad(x0,-84,x1,84,COLORS.roadEdge);this.quad(x0,-77,x1,77,COLORS.road);
    for(let x=Math.floor(x0/85)*85;x<x1;x+=85){this.quad(x,-2,x+37,2,'#96937c');}
    for(let lot=0;lot<8;lot++){
      const x=lot*740+165;
      this.quad(x,-270,x+69,-78,'#7c806b');this.quad(x,78,x+69,270,'#7c806b');
      this.quad(x+2,-267,x+67,-84,'#a29e87');this.quad(x+2,84,x+67,267,'#a29e87');
      const walkway=lot*740+540;
      this.quad(walkway,-250,walkway+20,-122,'#8f9985');this.quad(walkway,122,walkway+20,250,'#8f9985');
      // Alternate route behind a broken fence on lots 2 and 5.
      if(lot===2||lot===5){this.quad(lot*740+315,-305,lot*740+630,-257,'#737861');const a=this.point(lot*740+470,-275);rect(g,a.x-26,a.y-2,52,4,'#d3bd91');}
    }
    for(let x=x0;x<x1;x+=155){
      const p=this.point(x,-140);rect(g,p.x,p.y,3,2,'#a4aa7c');const q=this.point(x+75,139);rect(g,q.x,q.y,3,2,'#94a582');
    }
  }
  house(x,y,seed){
    const g=this.g,p=this.point(x,y),side=y>0?1:-1;
    if(p.x<-280||p.x>W+270||p.y<-210||p.y>H+190)return;
    const wall=['#b8ada0','#acaaa2','#af9f98','#9dabb0'][seed%4],roof=['#504a58','#5d5356','#555c59'][seed%3];
    // Orthographic sprite set upon an isometric lot; facade, flank, pitched roof, porch and lit windows.
    const baseY=p.y+side*4;
    rect(g,p.x-64,baseY-68,118,69,'#3d4342');rect(g,p.x-61,baseY-72,112,66,wall);
    poly(g,[{x:p.x-76,y:baseY-69},{x:p.x-27,y:baseY-113},{x:p.x+65,y:baseY-89},{x:p.x+51,y:baseY-69}],roof);
    line(g,p.x-76,baseY-69,p.x+51,baseY-69,'#83717a',4);
    rect(g,p.x-41,baseY-56,30,24,'#424d54');rect(g,p.x-38,baseY-53,24,18,seed%3===0?'#d2b679':'#78959b');
    line(g,p.x-26,baseY-54,p.x-26,baseY-35,'#d8ccb0',2);line(g,p.x-39,baseY-44,p.x-12,baseY-44,'#d8ccb0',2);
    rect(g,p.x+13,baseY-58,29,25,'#394449');rect(g,p.x+16,baseY-55,23,19,seed%2?'#cab783':'#75939c');
    line(g,p.x+27,baseY-55,p.x+27,baseY-36,'#d7c6a5',2);
    rect(g,p.x-2,baseY-29,20,30,'#574d4b');rect(g,p.x+12,baseY-16,3,3,'#dbbb78');
    rect(g,p.x-10,baseY-4,37,5,'#787771');rect(g,p.x-22,baseY+1,59,4,'#727565');
    // Oddly repeated glowing attic eye / TV flicker.
    rect(g,p.x+1,baseY-87,14,9,'#3e454b');rect(g,p.x+4,baseY-85,8,5,seed%4===0?'#bb8467':'#a09b8c');
    const tree=this.point(x+105,y+(side*15));this.tree(tree.x,tree.y,seed);
    const lamp=this.point(x-87,y-side*25);rect(g,lamp.x-2,lamp.y-42,4,42,'#464c49');rect(g,lamp.x-7,lamp.y-46,14,8,'#dec591');
  }
  tree(x,y,seed){const g=this.g;rect(g,x-4,y-38,8,40,'#594e44');rect(g,x-16,y-64,30,29,'#3d6053');rect(g,x-23,y-49,45,19,'#476d59');rect(g,x-12,y-74,23,17,seed%2?'#527864':'#466457');rect(g,x-10,y-57,5,5,'#68816b');}
  object(o){
    const g=this.g,p=this.point(o.x,o.y),x=Math.round(p.x),y=Math.round(p.y),broken=o.broken,t=TYPES[o.type];
    if(x<-80||x>W+80||y<-110||y>H+80)return;
    rect(g,x-t.radius*.7,y-3,t.radius*1.4,5,'#394b48');
    switch(o.type){
      case 'mailbox':rect(g,x-2,y-27,4,25,'#555458');rect(g,x-11,y-32,22,12,broken?'#807d72':'#d4c6a5');rect(g,x-11,y-34,17,4,'#eee0b7');rect(g,x+6,y-30,4,7,'#b35b4e');break;
      case 'trash':rect(g,x-12,y-24,25,23,broken?'#384946':'#697d78');rect(g,x-13,y-28,27,5,'#b7b9a9');for(let i=0;i<3;i++)rect(g,x-7+i*7,y-21,2,15,'#526764');if(broken){rect(g,x+14,y-7,13,4,'#a99c7c');rect(g,x-22,y-5,9,5,'#868576');}break;
      case 'hydrant':rect(g,x-9,y-20,19,19,broken?'#668d94':'#bc4b4b');rect(g,x-6,y-29,13,11,'#c65b4b');rect(g,x-14,y-16,6,7,'#c0ab7c');rect(g,x+9,y-16,6,7,'#c0ab7c');break;
      case 'window':rect(g,x-24,y-37,46,34,'#3e474b');rect(g,x-21,y-34,40,27,broken?'#879998':'#9eb8b8');if(broken){line(g,x-20,y-33,x+17,y-8,'#e6e4d1',2);line(g,x+9,y-34,x-13,y-8,'#dce1d8',1);}else{rect(g,x-2,y-34,3,27,'#d1c4a4');rect(g,x-21,y-22,40,3,'#d1c4a4');}rect(g,x-27,y-5,52,4,'#c3ad8d');break;
      case 'fence':for(let i=0;i<4;i++){rect(g,x-27+i*17,y-25+(broken?i%2*9:0),10,24,'#bda88b');poly(g,[{x:x-27+i*17,y:y-25},{x:x-22+i*17,y:y-31},{x:x-17+i*17,y:y-25}],'#dbc6a3');}rect(g,x-30,y-17,68,3,'#8c806d');break;
      case 'flamingo':rect(g,x-3,y-22,5,21,'#9e8380');rect(g,x+4,y-19,2,17,'#a98b87');rect(g,x-11,y-33,23,12,broken?'#b59796':'#d78295');rect(g,x+8,y-40,5,10,'#d78295');rect(g,x+8,y-43,13,6,'#df95a4');rect(g,x+20,y-41,7,3,'#292e37');break;
      case 'sign':rect(g,x-2,y-38,4,37,'#858581');rect(g,x-14,y-49,28,20,broken?'#6d665d':'#d9b979');rect(g,x-9,y-45,18,3,'#666757');rect(g,x-6,y-38,13,3,'#666757');break;
      case 'mower':rect(g,x-14,y-12,31,11,broken?'#545d4d':'#97a962');rect(g,x-10,y-17,15,7,'#363c3c');rect(g,x-15,y-2,6,6,'#30363a');rect(g,x+11,y-2,6,6,'#30363a');line(g,x+12,y-13,x+23,y-25,'#b8b69f',2);break;
      case 'cart':rect(g,x-22,y-20,37,15,broken?'#746f68':'#aeb4a8');rect(g,x-19,y-17,30,2,'#435b5b');for(let i=0;i<4;i++)line(g,x-18+i*9,y-19,x-18+i*9,y-7,'#506260',2);rect(g,x-18,y-3,6,6,'#333b3d');rect(g,x+9,y-3,6,6,'#333b3d');break;
      case 'car':case 'van':{
        const len=o.type==='van'?67:59,body=o.police?'#e2dfce':o.type==='van'?'#b8aa8b':o.damageTaken?'#7c8688':'#91a5a3';
        rect(g,x-len/2,y-27,len,25,'#333e44');rect(g,x-len/2+3,y-29,len-6,23,body);
        poly(g,[{x:x-len/2+12,y:y-28},{x:x-len/2+22,y:y-43},{x:x+len/2-18,y:y-43},{x:x+len/2-8,y:y-28}],body);
        rect(g,x-len/2+23,y-40,len-44,10,o.damageTaken?'#4f555c':'#6f8f9a');
        rect(g,x-len/2+6,y-7,12,6,'#262f36');rect(g,x+len/2-18,y-7,12,6,'#262f36');
        rect(g,x-len/2+1,y-22,5,7,'#e7cb92');rect(g,x+len/2-6,y-22,5,7,'#b66361');
        if(o.police){rect(g,x-7,y-48,14,5,'#ad6469');rect(g,x,y-48,7,5,'#7396b0');}
        if(broken){rect(g,x+11,y-48,5,10,'#565857');rect(g,x+8,y-56,9,6,'#717776');}break;
      }
      case 'materials':for(let i=0;i<3;i++){rect(g,x-22+i*8,y-6-i*9,42,8,broken?'#827c72':'#b0a48d');rect(g,x-19+i*8,y-4-i*9,3,3,'#6f645c');}break;
    }
    if(o.velocity&&o.broken){rect(g,x-4,y-31,8,3,'#e5c98c');}
  }
  person(n){
    const g=this.g,p=this.point(n.x,n.y),x=Math.round(p.x),y=Math.round(p.y);
    if(x<-50||x>W+50||y<-50||y>H+60)return;
    const walking=Math.floor(n.phase*6)%2,slip=n.state==='slip';
    rect(g,x-8,y-3,16,4,'#3d514c');
    if(slip){rect(g,x-14,y-10,25,8,'#a58d88');rect(g,x+8,y-13,10,5,'#d6ad90');return;}
    rect(g,x-7,y-20,6,18,'#3f4c55');rect(g,x+2,y-20+walking*2,6,18-walking*2,'#414b52');
    rect(g,x-10,y-36,20,20,n.state==='angry'?'#a06565':({porch:'#82778a',mower:'#999d6d',walker:'#9f8088',washer:'#8ca6a4',cart:'#9d9192',groceries:'#ac9879'}[n.kind]));
    rect(g,x-14,y-34,5,15,'#d0a990');rect(g,x+9,y-34,5,15,'#d0a990');
    rect(g,x-7,y-46,14,13,'#cda68e');rect(g,x-9,y-48,18,6,'#504948');
    rect(g,x-4,y-41,3,2,'#30313a');rect(g,x+3,y-41,3,2,'#30313a');
    if(n.kind==='groceries')rect(g,x+11,y-23,10,11,'#bda473');
    if(n.kind==='cart'){rect(g,x+13,y-25,21,13,'#738482');rect(g,x+16,y-10,4,4,'#333b3d');}
    if(n.state==='angry')rect(g,x-3,y-52,7,3,'#c87065');
  }
  dog(d){const g=this.g,p=this.point(d.x,d.y),x=p.x,y=p.y;rect(g,x-15,y-12,26,12,'#796d5e');rect(g,x+7,y-17,12,11,'#9b856c');rect(g,x+15,y-17,2,2,'#2c3033');rect(g,x-12,y-2,4,6,'#56514b');rect(g,x+5,y-2,4,6,'#56514b');line(g,x-16,y-11,x-24,y-22,'#917e69',3);}
  player(p){
    const g=this.g,q=this.point(p.x,p.y),x=q.x,y=q.y;
    rect(g,x-21,y-5,43,5,'#344947');
    if(p.crash>0){rect(g,x-24,y-13,39,8,'#b17569');rect(g,x-10,y-23,12,11,'#dfb29a');return;}
    g.save();g.translate(Math.round(x),Math.round(y));g.rotate(clamp(p.angle,-.4,.4));
    for(const ox of [-15,17]){g.strokeStyle='#252e36';g.lineWidth=4;g.beginPath();g.arc(ox,-8,9,0,Math.PI*2);g.stroke();rect(g,ox-2,-16,4,16,'#809194');}
    line(g,-15,-8,1,-24,'#c2bc9d',3);line(g,1,-24,17,-8,'#c2bc9d',3);line(g,17,-8,-15,-8,'#c2bc9d',2);
    line(g,14,-26,23,-28,'#ded0a8',3);line(g,-5,-22,6,-22,'#353e48',4);
    rect(g,-9,-36,14,15,'#9b6d6b');rect(g,-13,-31,6,15,'#ddb99f');rect(g,5,-31,6,13,'#ddb99f');
    rect(g,-7,-47,12,11,'#e1b69a');rect(g,-8,-50,15,6,'#3c4146');rect(g,-4,-44,3,2,'#32333a');
    rect(g,-7,-22,6,9,'#536471');rect(g,1,-22,6,9,'#536471');g.restore();
  }
  render(w){
    const g=this.g;g.clearRect(0,0,W,H);
    this.camera.x+=(w.player.x+40-this.camera.x)*.13;this.camera.y+=(w.player.y*.38-this.camera.y)*.08;
    this.ground(w);
    for(let i=0;i<7;i++)for(const side of [-1,1])this.house(350+i*740,side*255,i+side+8);
    for(const h of w.hazards){const p=this.point(h.x,h.y);g.fillStyle=h.kind==='water'?'#74b3b8aa':'#817a6999';g.beginPath();g.ellipse(p.x,p.y,h.radius*.85,h.radius*.35,0,0,Math.PI*2);g.fill();if(h.kind==='water')for(let i=0;i<5;i++)rect(g,p.x-30+i*13,p.y-4+(i%2)*7,8,2,'#c5dbce');}
    const sprites=[];
    for(const o of w.objects)sprites.push({y:this.point(o.x,o.y).y,draw:()=>this.object(o)});
    for(const p of w.people)sprites.push({y:this.point(p.x,p.y).y,draw:()=>this.person(p)});
    for(const d of w.dogs)if(d.active||Math.abs(d.x-w.player.x)<350)sprites.push({y:this.point(d.x,d.y).y,draw:()=>this.dog(d)});
    sprites.push({y:this.point(w.player.x,w.player.y).y,draw:()=>this.player(w.player)});
    sprites.sort((a,b)=>a.y-b.y);for(const s of sprites)s.draw();
    for(const b of w.projectiles){const p=this.point(b.x,b.y,b.z);rect(g,p.x-6,p.y-3,12,6,b.from==='ball'?'#333b52':'#efe5d0');rect(g,p.x-2,p.y-2,5,2,'#aa9e89');}
    for(const f of w.particles){const p=this.point(f.x,f.y,f.z);rect(g,p.x,p.y,3,3,f.color);}
    for(const m of w.messages){const p=this.point(m.x,m.y,60+(2.2-m.life)*17);g.globalAlpha=clamp(m.life,0,1);g.font='bold 15px monospace';g.textAlign='center';g.lineWidth=3;g.strokeStyle='#29343a';g.strokeText(m.label,p.x,p.y);g.fillStyle=m.color;g.fillText(m.label,p.x,p.y);g.globalAlpha=1;}
    // Aim indicator in world coordinates, independent of bicycle heading.
    const aim=w.player.aim,at=this.point(w.player.x+aim.x*74,w.player.y+aim.y*74);
    g.strokeStyle='#e5d39b';g.lineWidth=2;g.beginPath();g.arc(at.x,at.y,8,0,Math.PI*2);g.stroke();rect(g,at.x-2,at.y-2,4,4,'#ebd5a4');
    // Distance and fleeting road markings near the start/end.
    if(w.player.x>LENGTH-550){const p=this.point(LENGTH,0);g.font='bold 19px monospace';g.fillStyle='#e7d8b6';g.fillText('ROUTE END',p.x,p.y);}
  }
}
