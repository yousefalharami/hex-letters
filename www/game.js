/* ---------------- config ---------------- */
const PRESETS1=["#F2913C","#E0533D","#E8B23A","#C86BE0","#3D8BE0","#E24C6B","#16A085","#7B68EE","#9B59B6","#EF7FA8"];
const PRESETS2=["#63BF8E","#3FA9C9","#8FCB4A","#5E7CE2","#26A69A","#B0BEC5","#2E8B57","#4FC3F7","#7E57C2","#78909C"];
const cfg={t1:PRESETS1[0],t2:PRESETS2[0],rounds:3,letters:"ar",lang:"ar",darkMode:false,
           title:{ar:"خلية الحروف",en:"Letter Hive"},names:{1:"",2:""}};
const L=()=>T[cfg.lang];
const teamName=team=>cfg.names[team]||L()[team===1?'t1':'t2'];
const teamLabel=team=>cfg.names[team]||'';
const roundOrdinal=n=>(L().roundOrdinals&&L().roundOrdinals[n-1])||n;
function persistSettings(){if(typeof saveSettings==='function')saveSettings();}
const COLOR_NAMES={
  "#F2913C":{ar:"برتقالي",en:"Orange"},"#E0533D":{ar:"أحمر",en:"Red"},
  "#E8B23A":{ar:"كهرماني",en:"Amber"},"#C86BE0":{ar:"بنفسجي فاتح",en:"Orchid"},
  "#3D8BE0":{ar:"أزرق",en:"Blue"},"#E24C6B":{ar:"قرمزي",en:"Crimson"},
  "#16A085":{ar:"فيروزي",en:"Turquoise"},"#7B68EE":{ar:"أزرق بنفسجي",en:"Periwinkle"},
  "#9B59B6":{ar:"بنفسجي",en:"Violet"},"#EF7FA8":{ar:"زهري",en:"Pink"},
  "#63BF8E":{ar:"أخضر",en:"Green"},"#3FA9C9":{ar:"سماوي",en:"Cyan"},
  "#8FCB4A":{ar:"ليموني",en:"Lime"},"#5E7CE2":{ar:"نيلي",en:"Indigo"},
  "#26A69A":{ar:"تركوازي",en:"Teal"},"#B0BEC5":{ar:"رمادي",en:"Gray"},
  "#2E8B57":{ar:"أخضر داكن",en:"Sea Green"},"#4FC3F7":{ar:"أزرق فاتح",en:"Sky Blue"},
  "#7E57C2":{ar:"بنفسجي غامق",en:"Purple"},"#78909C":{ar:"رمادي مزرق",en:"Slate"}
};
const colorName=hex=>(COLOR_NAMES[hex]||{})[cfg.lang]||hex;
const winnerLabel=team=>cfg.names[team]||colorName(team===1?cfg.t1:cfg.t2);
const AR="ابتثجحخدذرزسشصضطظعغفقكلمنهوي".split("");
const EN="ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

/* ---------------- home wiring ---------------- */
function swatchRow(el,list,key){
  el.innerHTML=list.map(c=>`<button class="sw" data-c="${c}" style="background:${c}"></button>`).join("");
  el.querySelectorAll('.sw').forEach(b=>b.onclick=()=>{cfg[key]=b.dataset.c;applyColors();paintSel();persistSettings();});
}
function paintSel(){
  sw1.querySelectorAll('.sw').forEach(b=>b.classList.toggle('on',b.dataset.c===cfg.t1));
  sw2.querySelectorAll('.sw').forEach(b=>b.classList.toggle('on',b.dataset.c===cfg.t2));
  [['segRounds',String(cfg.rounds)],['segLetters',cfg.letters],['segLang',cfg.lang]].forEach(([id,v])=>
    document.getElementById(id).querySelectorAll('button').forEach(b=>b.classList.toggle('on',b.dataset.v===v)));
}
function applyColors(){
  document.documentElement.style.setProperty('--t1',cfg.t1);
  document.documentElement.style.setProperty('--t2',cfg.t2);
  if(state.letters.length) drawBoard(), sync();
}
function paintDarkMode(){
  darkModeBtn.classList.toggle('on',cfg.darkMode);
  darkModeBtn.setAttribute('aria-pressed',cfg.darkMode?'true':'false');
  darkModeLbl.textContent=L().darkMode;
}
function applyLang(){
  const t=L();
  document.documentElement.lang=cfg.lang;
  document.documentElement.dir=cfg.lang==='ar'?'rtl':'ltr';
  gameTitle.textContent=cfg.title[cfg.lang];
  sideTitle.textContent=cfg.title[cfg.lang];
  tagline.textContent=t.tag; startBtn.textContent=t.start; tourBtn.textContent=t.tourBtn;
  lblColors.textContent=t.colors; hintColors.textContent=t.hint;
  lblRounds.textContent=t.rounds; lblLetters.textContent=t.letters;
  segLetters.querySelectorAll('button').forEach(b=>b.textContent=t[b.dataset.v]);
  name1.placeholder=t.t1; name2.placeholder=t.t2;
  qbBtn.textContent=t.qbTitle; onlineBtn.textContent=t.onlineTitle; qbCardTitle.textContent=t.qbTitle;
  qbCardSub.textContent=t.qbSoon; qbClose.textContent=t.ok;
  b1.textContent=teamLabel(1); b2.textContent=teamLabel(2);
  cRound.textContent=t.round; roundNo.textContent=roundOrdinal(state.round);
  btnNew.textContent=t.newR; btnExit.textContent=t.exit; undoBtn.textContent=t.undo;
  againBtn.textContent=t.next; homeBtn.textContent=t.home;
  paintDarkMode();
}
swatchRow(sw1,PRESETS1,'t1'); swatchRow(sw2,PRESETS2,'t2');
segRounds.onclick=e=>{if(e.target.dataset.v){cfg.rounds=+e.target.dataset.v;paintSel();applyLang();}};
segLetters.onclick=e=>{if(e.target.dataset.v){cfg.letters=e.target.dataset.v;paintSel();}};
segLang.onclick=e=>{if(e.target.dataset.v){cfg.lang=e.target.dataset.v;paintSel();applyLang();persistSettings();}};
gameTitle.addEventListener('input',()=>{cfg.title[cfg.lang]=gameTitle.textContent;persistSettings();});
name1.addEventListener('input',()=>{cfg.names[1]=name1.value.trim();persistSettings();});
name2.addEventListener('input',()=>{cfg.names[2]=name2.value.trim();persistSettings();});
qbBtn.onclick=()=>{qbCardTitle.textContent=L().qbTitle;qbOverlay.classList.add('show');};
onlineBtn.onclick=()=>{qbCardTitle.textContent=L().onlineTitle;qbOverlay.classList.add('show');};
qbClose.onclick=()=>qbOverlay.classList.remove('show');
startBtn.onclick=()=>{scHome.classList.remove('on');scGame.classList.add('on');newMatch();lockLandscape();};
darkModeBtn.onclick=()=>{cfg.darkMode=!cfg.darkMode;paintDarkMode();sync();persistSettings();};

/* ---------------- game state ---------------- */
const state={owner:Array(25).fill(null),letters:[],sel:null,round:1,hist:[],done:false,over:false};
function pool(){return cfg.letters==='ar'?AR:cfg.letters==='en'?EN:AR.concat(EN);}
function deal(){state.letters=pool().slice().sort(()=>Math.random()-.5).slice(0,25);}
function neighbors(i){
  const r=Math.floor(i/COLS),c=i%COLS,odd=r%2,out=[];
  [[r,c-1],[r,c+1],[r-1,c-(odd?0:1)],[r-1,c+(odd?1:0)],[r+1,c-(odd?0:1)],[r+1,c+(odd?1:0)]]
    .forEach(([R,C])=>{if(R>=0&&R<ROWS&&C>=0&&C<COLS)out.push(R*COLS+C);});
  return out;
}
function won(team){
  const own=i=>state.owner[i]===team,starts=[],ends=[];
  for(let k=0;k<COLS;k++){
    if(team===1){starts.push(k);ends.push((ROWS-1)*COLS+k);}
    else{starts.push(k*COLS);ends.push(k*COLS+COLS-1);}}
  const seen=new Set(),q=starts.filter(own);q.forEach(i=>seen.add(i));
  while(q.length){const i=q.pop();neighbors(i).forEach(n=>{if(own(n)&&!seen.has(n)){seen.add(n);q.push(n);}});}
  return[...seen].some(i=>ends.includes(i));
}
function pick(i){if(state.done||state.owner[i])return;state.sel=(state.sel===i?null:i);sync();}
function sync(){
  const t=L();
  state.owner.forEach((o,i)=>{
    const neutral=state.sel!==i&&!o;
    const cell=document.getElementById('h'+i);
    cell.setAttribute('fill',state.sel===i?"#FFD60A":o===1?cfg.t1:o===2?cfg.t2:(cfg.darkMode?"#000":"#fff"));
    cell.setAttribute('stroke',cfg.darkMode?"#fff":"#000");
    const el=document.getElementById('lt'+i),letter=state.letters[i];
    el.textContent=letter;el.setAttribute('dy','0');
    el.setAttribute('fill',neutral&&cfg.darkMode?"#fff":"#000");});
  roundNo.textContent=roundOrdinal(state.round);
  const has=state.sel!==null&&!state.done;
  tile.textContent=has?state.letters[state.sel]:"—";tile.classList.toggle('live',has);
  b1.classList.toggle('live',has);b2.classList.toggle('live',has);
  w1.textContent=state.hist.filter(h=>h.t===1).length;
  w2.textContent=state.hist.filter(h=>h.t===2).length;
  hist.innerHTML=state.hist.slice().reverse().map(h=>
    `<li><i style="background:${h.t===1?cfg.t1:cfg.t2}"></i>${teamName(h.t)}<b>${t.round} ${h.r}</b></li>`).join("");
}
let undoSnap=null;
function award(team){
  if(state.sel===null||state.done)return;
  undoSnap={
    owner:state.owner.slice(),sel:state.sel,round:state.round,
    hist:state.hist.map(h=>({...h})),done:state.done,over:state.over,
    overlayShown:overlay.classList.contains('show')
  };
  undoBtn.disabled=false;
  state.owner[state.sel]=team;state.sel=null;sync();
  if(!won(team))return;
  state.done=true;state.hist.push({r:state.round,t:team});
  const t=L(),wins=state.hist.filter(h=>h.t===team).length, need=Math.ceil(cfg.rounds/2);
  state.over=wins>=need;
  winCard.style.setProperty('--c',team===1?cfg.t1:cfg.t2);
  winKicker.textContent=state.over?t.matchOver:t.roundOver;
  winTitle.textContent=winnerLabel(team);
  winSub.textContent=state.over?t.champ+" "+wins+"—"+state.hist.filter(h=>h.t!==team).length:(team===1?t.sub1:t.sub2);
  againBtn.style.display=state.over?'none':'';
  homeBtn.textContent=state.over?t.home:t.home;
  overlay.classList.add('show');
  sync();
  if(state.over&&typeof onMatchOver==='function')onMatchOver(team);
}
function undoAward(){
  if(!undoSnap)return;
  if(state.over&&typeof tourActive!=='undefined'&&tourActive&&typeof onUndoMatchOver==='function')onUndoMatchOver();
  Object.assign(state,{owner:undoSnap.owner,sel:undoSnap.sel,round:undoSnap.round,
    hist:undoSnap.hist,done:undoSnap.done,over:undoSnap.over});
  overlay.classList.toggle('show',undoSnap.overlayShown);
  sync();
  undoSnap=null;undoBtn.disabled=true;
}
function startRound(){
  if(state.over)return;
  if(state.done)state.round++;
  state.owner=Array(25).fill(null);state.sel=null;state.done=false;
  deal();overlay.classList.remove('show');
  sync();
  undoSnap=null;undoBtn.disabled=true;
}
function newMatch(){
  Object.assign(state,{owner:Array(25).fill(null),sel:null,round:1,hist:[],done:false,over:false});
  deal();drawBoard();applyLang();overlay.classList.remove('show');
  sync();
  undoSnap=null;undoBtn.disabled=true;
}
function goHome(){scGame.classList.remove('on');scHome.classList.add('on');lockPortrait();}
b1.onclick=()=>award(1); b2.onclick=()=>award(2);
btnNew.onclick=startRound; againBtn.onclick=startRound;
btnExit.onclick=goHome; homeBtn.onclick=goHome;
undoBtn.onclick=undoAward;
document.addEventListener('keydown',e=>{
  if(e.target.closest('input,textarea,[contenteditable]'))return;
  if(e.key==='1')award(1);if(e.key==='2')award(2);if(e.key==='z')undoAward();
});

applyColors();paintSel();applyLang();deal();drawBoard();sync();
