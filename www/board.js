/* ---------------- board geometry + rendering ---------------- */
const ROWS=5,COLS=5,s=52,w=Math.sqrt(3)*s,m=58,BASE_BW=5.5*w+2*m,BH=8*s+2*m;
let BW=BASE_BW,shiftX=0;
const cx=(r,c)=>m+shiftX+w/2+(r%2?w/2:0)+w*c, cy=r=>m+s+1.5*s*r;
const vx=(r,c)=>{const X=cx(r,c),Y=cy(r);return[[X,Y-s],[X+w/2,Y-s/2],[X+w/2,Y+s/2],[X,Y+s],[X-w/2,Y+s/2],[X-w/2,Y-s/2]];};
const K=p=>p.map(v=>Math.round(v*10)/10).join(",");
function sizeBoardCanvas(){
  const stage=document.querySelector('.stage');
  if(!stage)return;
  const r=stage.getBoundingClientRect();
  if(r.width<=0||r.height<=0)return;
  const extraW=Math.max(0,BH*(r.width/r.height)-BASE_BW);
  BW=BASE_BW+extraW;shiftX=extraW/2;
}
function perimeter(){
  const cnt={},pt={};
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){const v=vx(r,c);
    for(let i=0;i<6;i++){const a=K(v[i]),b=K(v[(i+1)%6]);pt[a]=v[i];pt[b]=v[(i+1)%6];
      const k=[a,b].sort().join("|");cnt[k]=(cnt[k]||0)+1;}}
  const adj={};
  Object.keys(cnt).filter(k=>cnt[k]===1).forEach(k=>{const[a,b]=k.split("|");
    (adj[a]=adj[a]||[]).push(b);(adj[b]=adj[b]||[]).push(a);});
  const A=K([m+shiftX,m+s/2]),B=K([m+shiftX+5*w,m+s/2]),C=K([m+shiftX+5*w,m+7.5*s]),D=K([m+shiftX,m+7.5*s]);
  let cyc=[A],prev=A,cur=adj[A].reduce((x,y)=>pt[x][0]>pt[y][0]?x:y);
  while(cur!==A){cyc.push(cur);const n=adj[cur].find(p=>p!==prev);prev=cur;cur=n;}
  const arc=(p,q)=>{const i=cyc.indexOf(p),j=cyc.indexOf(q);
    return(i<j?cyc.slice(i,j+1):cyc.slice(i).concat(cyc.slice(0,j+1))).map(k=>pt[k]);};
  const ray=(p,dx,dy)=>{const P=pt[p],t=dx>0?(BW-P[0])/dx:(0-P[0])/dx;return[P[0]+dx*t,P[1]+dy*t];};
  return{A,B,C,D,arc,ra:ray(A,-.866,-.5),rb:ray(B,.866,-.5),rc:ray(C,.866,.5),rd:ray(D,-.866,.5),P:p=>pt[p]};
}
function drawBoard(){
  sizeBoardCanvas();
  const g=perimeter(),pts=a=>a.map(p=>p.join(",")).join(" ");
  let svg=`<svg viewBox="0 0 ${BW} ${BH}" xmlns="http://www.w3.org/2000/svg">
  <polygon points="${pts([g.ra,...g.arc(g.A,g.B),g.rb,[BW,0],[0,0]])}" fill="${cfg.t1}"/>
  <polygon points="${pts([g.rc,...g.arc(g.C,g.D),g.rd,[0,BH],[BW,BH]])}" fill="${cfg.t1}"/>
  <polygon points="${pts([g.rb,...g.arc(g.B,g.C),g.rc])}" fill="${cfg.t2}"/>
  <polygon points="${pts([g.ra,...g.arc(g.D,g.A).reverse(),g.rd])}" fill="${cfg.t2}"/>`;
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++)
    svg+=`<polygon class="cell" id="h${r*COLS+c}" data-i="${r*COLS+c}" points="${pts(vx(r,c))}" fill="#fff" stroke="#000" stroke-width="4" stroke-linejoin="round"/>`;
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++)
    svg+=`<text class="ltr" id="lt${r*COLS+c}" x="${cx(r,c)}" y="${cy(r)}" text-anchor="middle" dominant-baseline="central"></text>`;
  [[g.A,g.ra],[g.B,g.rb],[g.C,g.rc],[g.D,g.rd]].forEach(([p,q])=>{const P=g.P(p);
    svg+=`<line x1="${P[0]}" y1="${P[1]}" x2="${q[0]}" y2="${q[1]}" stroke="#000" stroke-width="5" stroke-linecap="round"/>`;});
  board.innerHTML=svg+`</svg>`;
  document.querySelectorAll('polygon.cell').forEach(p=>p.onclick=()=>pick(+p.dataset.i));
}
let refitTimer=null;
function refitBoard(){
  clearTimeout(refitTimer);
  refitTimer=setTimeout(()=>{
    if(!scGame.classList.contains('on'))return;
    drawBoard();sync();
  },80);
}
window.addEventListener('resize',refitBoard);
window.addEventListener('orientationchange',refitBoard);
/* .stage's actual rendered box is the real source of truth sizeBoardCanvas()
   reads — a plain window 'resize' can fire before that box has fully
   settled on some devices (observed: iPad, aspect-ratio-dependent white
   edges that a fixed-delay redraw sometimes missed). ResizeObserver fires
   whenever .stage's own box genuinely changes size, however many layout
   passes that takes, so this is a direct signal rather than a timing
   guess — keeps refitBoard() self-correcting regardless of device/ratio. */
if(typeof ResizeObserver!=='undefined'){
  const stageEl=document.querySelector('.stage');
  if(stageEl)new ResizeObserver(refitBoard).observe(stageEl);
}
