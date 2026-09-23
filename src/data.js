export const LENGTH = 11200;
export const ROUTE_SECONDS = 165;
export const BOUNDS = {minY:-270,maxY:300};

// Each property on the route uses the same components. Replacing art does not change gameplay data.
export const TYPES = {
  mailbox: {hp:1, radius:12, value:45, score:380, mass:1, reaction:'roll', color:'#e7d9ba'},
  trash: {hp:1, radius:17, value:110, score:420, mass:2, reaction:'spill', color:'#697c75'},
  hydrant: {hp:2, radius:15, value:2800, score:1250, mass:6, reaction:'water', color:'#c24845'},
  window: {hp:1, radius:17, value:1050, score:760, mass:1, reaction:'glass', color:'#8eafb3'},
  fence: {hp:1, radius:18, value:240, score:490, mass:2, reaction:'splinter', color:'#c2a885'},
  flamingo: {hp:1, radius:11, value:65, score:510, mass:1, reaction:'roll', color:'#d66f85'},
  sign: {hp:1, radius:15, value:350, score:570, mass:2, reaction:'fall', color:'#c6ad73'},
  mower: {hp:2, radius:19, value:780, score:910, mass:3, reaction:'runaway', color:'#aeb969'},
  cart: {hp:2, radius:19, value:700, score:780, mass:2, reaction:'runaway', color:'#9ab1ac'},
  car: {hp:3, radius:37, value:6200, score:1400, mass:9, reaction:'swerve', color:'#8f9da0'},
  van: {hp:4, radius:39, value:9200, score:1800, mass:10, reaction:'swerve', color:'#b5a684'},
  materials: {hp:1, radius:22, value:530, score:850, mass:3, reaction:'cascade', color:'#aaa299'},
};

export const WEAPONS = {
  paper: {label:'NEWSPAPER', speed:420, damage:1, cooldown:.26, radius:7, life:1.35, knockback:110, color:'#eee7d1'},
  ball: {label:'BOWLING BALL', speed:235, damage:2, cooldown:1.1, radius:13, life:1.9, knockback:240, color:'#3d3d55', pierce:3},
};

export const PEOPLE = {
  porch: {speed:0, color:'#7b798c'},
  mower: {speed:12, color:'#b4a66c'},
  walker: {speed:16, color:'#b5968f'},
  washer: {speed:6, color:'#95aeb0'},
  cart: {speed:9, color:'#b3a0a1'},
  groceries: {speed:13, color:'#c2a583'},
};

export const HEAT = [0,900,2700,5900,11000,19500];
export const EVENTS = {
  domino: 'DOMINO EFFECT', mail: 'MAIL CALL', windows:'WINDOW SHOPPING', cars:'INSURANCE NIGHTMARE',
  loss:'TOTAL PROPERTY LOSS', menace:'NEIGHBORHOOD MENACE', slip:'SLIP & CLAIM', chain:'CHAIN REACTION'
};

// The first lot is a teaching opportunity; its actors are spatially arranged to allow
// a rolling bin to make a car swerve into a hydrant, then water to move a resident/cart.
const first = [
  ['trash',330,-55], ['car',405,62], ['hydrant',475,111], ['cart',525,152],
  ['fence',585,177], ['flamingo',612,192], ['window',640,225],
];
const pattern = [
  ['mailbox',80,-133],['mailbox',190,130],['window',235,-214],['window',265,237],
  ['fence',270,175],['flamingo',155,-190],['sign',325,-130],['trash',330,132],
  ['mower',395,-195],['car',425,-65],['hydrant',520,120],['materials',570,-198],
  ['cart',610,170],['fence',660,186],['van',750,68],['mailbox',790,-135],
];
export function makeLevel() {
  const objects = first.map(([type,x,y],i)=>({id:`intro-${i}`,type,x,y,lot:0}));
  for (let lot=0; lot<14; lot++) for (let i=0;i<pattern.length;i++) {
    const [type,dx,y] = pattern[i];
    const x = 760 + lot*740 + dx;
    if (x > LENGTH - 90) continue;
    objects.push({id:`lot-${lot}-${i}`,type,x,y:lot%2 ? -y:y,lot:lot+1});
  }
  const people = [
    {x:527,y:154,kind:'cart'}, {x:720,y:-210,kind:'porch'}, {x:890,y:170,kind:'walker'},
    ...Array.from({length:14},(_,i)=>({x:1120+i*730,y:i%2? -210:215,kind:['mower','washer','groceries','porch','cart','walker'][i%6]})),
  ];
  const dogs = Array.from({length:9},(_,i)=>({x:1080+i*1160,y:i%2? -185:195}));
  return {objects,people,dogs};
}
