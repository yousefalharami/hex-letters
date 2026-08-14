/* DEV — REMOVE BEFORE RELEASE (win confetti)
   Delete this file, its <script> tag, the #devConfetti canvas in index.html,
   and the .devConfetti CSS block in styles.css to remove this feature entirely.
   Self-contained: watches #scGame's and #overlay's class attributes to know
   when the win popup is showing, instead of hooking into game.js/tournament.js
   directly — zero changes made to game logic. */
(function(){
  const canvas=document.getElementById('devConfetti');
  if(!canvas)return;
  const ctx=canvas.getContext('2d');
  const reduced=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
  let particles=[],running=false,rafId=null,spawnTimer=null;
  const dpr=Math.max(1,window.devicePixelRatio||1);

  function resize(){
    canvas.width=innerWidth*dpr;canvas.height=innerHeight*dpr;
    canvas.style.width=innerWidth+'px';canvas.style.height=innerHeight+'px';
    ctx.setTransform(dpr,0,0,dpr,0,0);
  }
  window.addEventListener('resize',resize);
  resize();

  function winColors(){
    const c=(typeof winCard!=='undefined'&&winCard)?winCard.style.getPropertyValue('--c'):'';
    const base=c&&c.trim()?c.trim():'#FFD60A';
    return [base,base,'#FFD60A','#ECE6DA'];
  }

  function spawnBatch(){
    if(!running)return;
    const colors=winColors(),w=innerWidth;
    for(let i=0;i<10;i++){
      particles.push({
        x:Math.random()*w,
        y:-10-Math.random()*40,
        vx:(Math.random()-.5)*2.2,
        vy:2+Math.random()*2.5,
        size:5+Math.random()*5,
        rot:Math.random()*Math.PI*2,
        vr:(Math.random()-.5)*.3,
        color:colors[Math.floor(Math.random()*colors.length)]
      });
    }
    if(particles.length>220)particles.splice(0,particles.length-220);
  }

  function tick(){
    ctx.clearRect(0,0,innerWidth,innerHeight);
    particles.forEach(p=>{
      p.x+=p.vx;p.y+=p.vy;p.vy+=.03;p.rot+=p.vr;
      ctx.save();
      ctx.translate(p.x,p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle=p.color;
      ctx.fillRect(-p.size/2,-p.size/3,p.size,p.size*.66);
      ctx.restore();
    });
    particles=particles.filter(p=>p.y<innerHeight+30);
    if(running||particles.length)rafId=requestAnimationFrame(tick);
    else rafId=null;
  }

  function start(){
    if(running||reduced)return;
    running=true;
    spawnBatch();
    spawnTimer=setInterval(spawnBatch,180);
    if(!rafId)rafId=requestAnimationFrame(tick);
  }
  function stop(){
    running=false;
    if(spawnTimer){clearInterval(spawnTimer);spawnTimer=null;}
  }

  function sync(){
    const gameOn=typeof scGame!=='undefined'&&scGame&&scGame.classList.contains('on');
    const overlayShown=typeof overlay!=='undefined'&&overlay&&overlay.classList.contains('show');
    if(gameOn&&overlayShown)start();else stop();
  }

  if(typeof scGame!=='undefined'&&scGame)
    new MutationObserver(sync).observe(scGame,{attributes:true,attributeFilter:['class']});
  if(typeof overlay!=='undefined'&&overlay)
    new MutationObserver(sync).observe(overlay,{attributes:true,attributeFilter:['class']});
})();
/* /DEV */
