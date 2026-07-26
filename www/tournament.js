/* ---------------- tournament state ---------------- */
const TOUR_STEPS=['config','setup','bracket'];
const TOUR_PALETTE=["#6B8E23","#A03322","#FF6B6B","#D4A373","#CCFF00","#133C2A","#A8E6CF","#0F4C5C",
                    "#00F5D4","#708090","#03045E","#7B2CBF","#3A0CA3","#F72585","#8B5E3C","#9B5DE5"];
const tour={name:'',size:4,teams:[],rounds:3,letters:'ar',seeded:[],step:'config'};
let tourActive=false;

function esc(s){return String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');}
function shuffle(a){const b=a.slice();for(let i=b.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]];}return b;}
function makeTeams(n){
  const t=L();
  return Array.from({length:n},(_,i)=>({name:`${t.tourTeamPh} ${i+1}`,color:TOUR_PALETTE[i%TOUR_PALETTE.length]}));
}

/* ---------------- nav ---------------- */
function tourOpen(){
  Object.assign(tour,{name:'',size:4,rounds:cfg.rounds||3,letters:'ar',step:'config',seeded:[],bracket:null,queue:[],qi:0,
    savedCfg:{t1:cfg.t1,t2:cfg.t2,names:{1:cfg.names[1],2:cfg.names[2]},letters:cfg.letters,rounds:cfg.rounds}});
  tour.teams=makeTeams(4);
  scHome.classList.remove('on');scTournament.classList.add('on');
  lockLandscape();
  renderTour();
}
function tourBack(){
  const i=TOUR_STEPS.indexOf(tour.step);
  if(i===0){scTournament.classList.remove('on');scHome.classList.add('on');lockPortrait();return;}
  tour.step=TOUR_STEPS[i-1];renderTour();
}
function tourNext(){
  const i=TOUR_STEPS.indexOf(tour.step);
  if(i<TOUR_STEPS.length-1){tour.step=TOUR_STEPS[i+1];renderTour();}
}
function tourNav(nextEnabled){
  const t=L();
  return `<div class="tourNav"><button class="ghost" id="tourBackBtn">${t.tourBack}</button>
    <button class="tourNavNext" id="tourNextBtn" ${nextEnabled?'':'disabled'}>${t.tourNext}</button></div>`;
}
function wireNav(onNext){
  tourBackBtn.onclick=tourBack;
  tourNextBtn.onclick=onNext||tourNext;
}

/* ---------------- step: config ---------------- */
function renderConfig(){
  const t=L();
  tourTitle.textContent=t.stepConfig;
  tourBody.innerHTML=`
    <div class="tourStep">
      <input class="tourNameInput tourNameBig" id="tourNameInput" maxlength="30" autocomplete="off"
             placeholder="${esc(t.tourNamePh)}" value="${esc(tour.name)}">
      <div class="row" style="margin:0"><span>${t.stepSize}</span>
        <div class="seg" id="tourSizeSeg"><button data-v="4">4</button><button data-v="8">8</button><button data-v="16">16</button></div>
      </div>
      <div class="row" style="margin:0"><span>${t.stepRounds}</span>
        <div class="seg" id="tourRoundsSeg"><button data-v="1">1</button><button data-v="3">3</button><button data-v="5">5</button></div>
      </div>
      <div class="row" style="margin:0"><span>${t.letters}</span>
        <div class="seg" id="tourLettersSeg">
          <button data-v="ar">${t.ar}</button><button data-v="en">${t.en}</button><button data-v="mix">${t.mix}</button>
        </div>
      </div>
      ${tourNav(true)}
    </div>`;
  tourNameInput.oninput=()=>{tour.name=tourNameInput.value.trim();};
  tourSizeSeg.querySelectorAll('button').forEach(b=>{
    b.classList.toggle('on',+b.dataset.v===tour.size);
    b.onclick=()=>{
      const n=+b.dataset.v;
      if(tour.teams.length!==n){tour.teams=makeTeams(n);tour.seeded=[];tour.bracket=null;}
      tour.size=n;
      tourSizeSeg.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));
    };
  });
  tourRoundsSeg.querySelectorAll('button').forEach(b=>{
    b.classList.toggle('on',+b.dataset.v===tour.rounds);
    b.onclick=()=>{
      tour.rounds=+b.dataset.v;
      tourRoundsSeg.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));
    };
  });
  tourLettersSeg.querySelectorAll('button').forEach(b=>{
    b.classList.toggle('on',b.dataset.v===tour.letters);
    b.onclick=()=>{
      tour.letters=b.dataset.v;
      tourLettersSeg.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));
    };
  });
  wireNav();
}

/* ---------------- step: setup ---------------- */
function renderSetup(){
  const t=L();
  tourTitle.textContent=t.stepSetup;
  tourBody.innerHTML=`
    <div class="tourStep">
      <div class="tourTeams" id="tourTeams">
        ${tour.teams.map((tm,i)=>`
          <div class="tourTeamRow">
            <input class="tourNameInput" data-i="${i}" maxlength="20" autocomplete="off" value="${esc(tm.name)}">
            <button class="tourSwatchToggle" data-i="${i}" style="background:${tm.color}"></button>
          </div>`).join('')}
      </div>
      <div class="tourColorPicker" id="tourColorPicker" hidden>
        ${TOUR_PALETTE.map(c=>`<button class="sw" data-c="${c}" style="background:${c}"></button>`).join('')}
      </div>
      <div class="tourNav"><button class="ghost" id="tourBackBtn">${t.tourBack}</button>
        <button class="tourNavNext" id="tourDrawBtn">${t.drawBtn}</button></div>
    </div>`;
  let activeIdx=null;
  tourTeams.querySelectorAll('.tourSwatchToggle').forEach(tg=>{
    tg.onclick=()=>{
      const i=+tg.dataset.i;
      if(activeIdx===i&&!tourColorPicker.hidden){tourColorPicker.hidden=true;activeIdx=null;return;}
      activeIdx=i;
      tourColorPicker.hidden=false;
      tourColorPicker.querySelectorAll('.sw').forEach(sw=>sw.classList.toggle('on',sw.dataset.c===tour.teams[i].color));
    };
  });
  tourColorPicker.querySelectorAll('.sw').forEach(sw=>{
    sw.onclick=()=>{
      if(activeIdx===null)return;
      tour.teams[activeIdx].color=sw.dataset.c;
      tourTeams.querySelector(`.tourSwatchToggle[data-i="${activeIdx}"]`).style.background=sw.dataset.c;
      tourColorPicker.hidden=true;activeIdx=null;
    };
  });
  tourTeams.querySelectorAll('.tourNameInput').forEach(inp=>{
    inp.oninput=()=>{tour.teams[+inp.dataset.i].name=inp.value.trim()||`${t.tourTeamPh} ${+inp.dataset.i+1}`;};
  });
  tourBackBtn.onclick=tourBack;
  tourDrawBtn.onclick=tourDoDraw;
}
function tourDoDraw(){
  tour.seeded=shuffle(tour.teams);
  const built=buildBracket();
  tour.bracket={left:built.left,right:built.right,final:built.final};
  tour.queue=built.queue;tour.qi=0;
  tour.step='bracket';
  tourNameTag.textContent=tour.name||'';
  renderBracket(true);
  runDrawReveal();
}

/* ---------------- step: bracket ---------------- */
function buildSide(seeds,sideSlot,final){
  const r1=[];
  for(let i=0;i<seeds.length;i+=2)r1.push({a:seeds[i],b:seeds[i+1],winner:null,next:null});
  const rounds=[r1];
  let count=r1.length/2;
  while(count>=1){
    rounds.push(Array.from({length:count},()=>({a:null,b:null,winner:null,next:null})));
    count/=2;
  }
  for(let r=0;r<rounds.length;r++){
    rounds[r].forEach((m,i)=>{
      m.next=(r<rounds.length-1)
        ?{match:rounds[r+1][Math.floor(i/2)],slot:i%2===0?'a':'b'}
        :{match:final,slot:sideSlot};
    });
  }
  return rounds;
}
function buildBracket(){
  const half=tour.seeded.length/2;
  const final={a:null,b:null,winner:null,next:null};
  const left=buildSide(tour.seeded.slice(0,half),'a',final);
  const right=buildSide(tour.seeded.slice(half),'b',final);
  const queue=[];
  for(let r=0;r<left.length;r++)queue.push(...left[r],...right[r]);
  queue.push(final);
  return{left,right,final,queue};
}
function roundLabel(matchCount){
  const t=L();
  return matchCount>=8?t.roundOf16:matchCount===4?t.quarter:matchCount===2?t.semi:t.final;
}
function renderBracket(revealing){
  const t=L();
  tourTitle.textContent=t.stepBracket;
  if(!tour.bracket){
    const built=buildBracket();
    tour.bracket={left:built.left,right:built.right,final:built.final};
    tour.queue=built.queue;tour.qi=0;
  }
  const {left,right,final}=tour.bracket;
  let slotN=0;
  const teamCell=(team,winner,id)=>{
    const idAttr=id?` id="${id}"`:'';
    const content=id?'':(team?esc(team.name):t.tbd);
    return `<div class="tourMatchTeam${winner&&winner===team?' winner':''}"${idAttr} style="--c:${team?team.color:'var(--line)'}">${content}</div>`;
  };
  const matchBox=(m,ids)=>`<div class="tourMatch">
    ${teamCell(m.a,m.winner,ids&&ids[0])}
    ${teamCell(m.b,m.winner,ids&&ids[1])}
  </div>`;
  const sideCol=(round,roundIdx,wing)=>`<div class="tourRound"${roundIdx===0?` id="tourR1${wing}"`:''}>
    <div class="tourRoundLabel">${roundLabel(round.length*2)}</div>
    ${round.map(m=>{
      const ids=(revealing&&roundIdx===0)?['tourSlot'+(slotN++),'tourSlot'+(slotN++)]:null;
      return matchBox(m,ids);
    }).join('')}
  </div>`;
  const finalCol=`<div class="tourRound tourFinalCol" id="tourFinalCol">
    <div class="tourRoundLabel">${t.final}</div>
    ${matchBox(final)}
  </div>`;
  const done=tour.qi>=tour.queue.length;
  const navHtml=done
    ?`<div class="tourChampionBanner">
        <div class="tourChampionKicker">${t.tourChampion}</div>
        <div class="tourChampionName" style="--c:${final.winner.color}">${esc(final.winner.name)}</div>
      </div>
      <button class="tourNavNext" id="tourFinishBtn">${t.tourFinish}</button>`
    :tour.qi===0
    ?`<div class="tourNav"><button class="ghost" id="tourBackBtn">${t.tourBack}</button>
        <button class="tourNavNext" id="tourStartBtn">${t.startTour}</button></div>`
    :`<div class="tourNav"><button class="ghost" id="tourBackBtn">${t.exit}</button>
        <button class="tourNavNext" id="tourStartBtn">${t.tourNextMatch}</button></div>`;
  tourBody.innerHTML=`
    <div class="tourStep">
      <div class="tourBracketWrap">
        <div class="tourBracket" id="tourBracketEl">
          ${left.map((round,i)=>sideCol(round,i,'L')).join('')}
          ${finalCol}
          ${right.slice().reverse().map((round,i)=>sideCol(round,right.length-1-i,'R')).join('')}
        </div>
        ${revealing?`<button class="tourSkipHint" id="tourSkipBtn">${t.tourSkip}</button>`:''}
      </div>
      ${navHtml}
    </div>`;
  if(done){
    tourFinishBtn.onclick=tourFinishTournament;
  }else if(tour.qi===0){
    tourBackBtn.onclick=tourBack;
    tourStartBtn.onclick=()=>tourLaunchMatch(tour.queue[0]);
  }else{
    tourBackBtn.onclick=tourConfirmExit;
    tourStartBtn.onclick=()=>tourLaunchMatch(tour.queue[tour.qi]);
  }
}

/* ---------------- draw reveal animation (Style B: shuffle-and-lock) ---------------- */
function runDrawReveal(){
  const {left,right}=tour.bracket;
  const slots=[];
  left[0].forEach(m=>slots.push(m.a,m.b));
  const leftCount=slots.length;
  right[0].forEach(m=>slots.push(m.a,m.b));
  const ids=slots.map((_,i)=>'tourSlot'+i);
  const pool=tour.seeded.map(tm=>tm.name);
  const reduced=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
  const PER=750, FLICKER=reduced?0:500;

  let finished=false,cancelCurrent=null;
  const wrap=document.querySelector('.tourBracketWrap');
  const skipBtn=document.getElementById('tourSkipBtn');

  function finishAll(){
    if(finished)return;
    finished=true;
    if(cancelCurrent){cancelCurrent();cancelCurrent=null;}
    renderBracket(false);
    const finalEl=document.getElementById('tourFinalCol');
    if(finalEl)finalEl.scrollIntoView({behavior:'smooth',inline:'center',block:'nearest'});
  }
  if(skipBtn)skipBtn.onclick=finishAll;
  if(wrap)wrap.onclick=finishAll;

  const leftFirstCol=document.getElementById('tourR1L');
  if(leftFirstCol)leftFirstCol.scrollIntoView({behavior:'smooth',inline:'center',block:'nearest'});

  function revealOne(idx){
    if(finished)return;
    if(idx>=slots.length){finishAll();return;}
    if(idx===leftCount){
      const rightFirstCol=document.getElementById('tourR1R');
      if(rightFirstCol)rightFirstCol.scrollIntoView({behavior:'smooth',inline:'center',block:'nearest'});
    }
    const el=document.getElementById(ids[idx]);
    const team=slots[idx];
    if(!el){revealOne(idx+1);return;}
    let tickTimer=null;
    const doLock=()=>{
      if(tickTimer){clearInterval(tickTimer);tickTimer=null;}
      el.classList.remove('revealing');
      el.textContent=team.name;
      el.classList.add('locking');
    };
    if(FLICKER>0){
      el.classList.add('revealing');
      tickTimer=setInterval(()=>{el.textContent=pool[Math.floor(Math.random()*pool.length)];},60);
    }else{
      doLock();
    }
    const lockTimer=FLICKER>0?setTimeout(doLock,FLICKER):null;
    const advanceTimer=setTimeout(()=>{cancelCurrent=null;revealOne(idx+1);},PER);
    cancelCurrent=()=>{
      if(tickTimer)clearInterval(tickTimer);
      if(lockTimer)clearTimeout(lockTimer);
      clearTimeout(advanceTimer);
    };
  }
  revealOne(0);
}

/* ---------------- playing bracket matches ---------------- */
function tourLaunchMatch(m){
  cfg.names[1]=m.a.name;cfg.names[2]=m.b.name;
  cfg.t1=m.a.color;cfg.t2=m.b.color;
  cfg.letters=tour.letters;cfg.rounds=tour.rounds;
  tourActive=true;
  btnExit.onclick=tourConfirmExit;homeBtn.onclick=tourConfirmExit;
  againBtn.onclick=startRound;
  scTournament.classList.remove('on');scGame.classList.add('on');
  lockLandscape();
  applyColors();
  newMatch();
  sideTitle.textContent=tour.name||cfg.title[cfg.lang];
}
function tourReturnToBracket(){
  scGame.classList.remove('on');scTournament.classList.add('on');
  lockLandscape();
  tour.step='bracket';
  renderTour();
}
function onMatchOver(winnerNum){
  if(!tourActive)return;
  const t=L();
  const m=tour.queue[tour.qi];
  const winner=winnerNum===1?m.a:m.b;
  m.winner=winner;
  if(m.next)m.next.match[m.next.slot]=winner;
  tour.qi++;
  againBtn.textContent=tour.qi>=tour.queue.length?t.tourChampion:t.tourNextMatch;
  againBtn.style.display='';
  againBtn.onclick=tourReturnToBracket;
}
function onUndoMatchOver(){
  if(!tourActive)return;
  tour.qi--;
  const m=tour.queue[tour.qi];
  m.winner=null;
  if(m.next)m.next.match[m.next.slot]=null;
  const t=L();
  againBtn.textContent=t.next;
  againBtn.onclick=startRound;
}
function tourResetState(){
  tourActive=false;
  tour.bracket=null;tour.queue=[];tour.qi=0;
  btnExit.onclick=goHome;homeBtn.onclick=goHome;againBtn.onclick=startRound;
  if(tour.savedCfg){
    cfg.t1=tour.savedCfg.t1;cfg.t2=tour.savedCfg.t2;
    cfg.names[1]=tour.savedCfg.names[1];cfg.names[2]=tour.savedCfg.names[2];
    cfg.letters=tour.savedCfg.letters;cfg.rounds=tour.savedCfg.rounds;
    applyColors();paintSel();applyLang();
  }
}
function tourConfirmExit(){
  const t=L();
  if(!confirm(t.tourExitConfirm))return;
  tourResetState();
  goHome();
}
function tourFinishTournament(){
  tourResetState();
  scTournament.classList.remove('on');scHome.classList.add('on');
  lockPortrait();
}

/* ---------------- dispatch ---------------- */
function renderTour(){
  tourNameTag.textContent=(tour.step==='config'||!tour.name)?'':tour.name;
  ({config:renderConfig,setup:renderSetup,bracket:renderBracket})[tour.step]();
}
tourBtn.onclick=tourOpen;
