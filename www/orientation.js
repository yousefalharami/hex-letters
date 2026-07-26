/* ---------------- native orientation control ---------------- */
function lockOrientation(mode){
  try{
    const SO=window.Capacitor&&window.Capacitor.Plugins&&window.Capacitor.Plugins.ScreenOrientation;
    if(SO&&SO.lock)SO.lock({orientation:mode}).catch(()=>{});
  }catch(e){}
}
function setStatusBarHidden(hidden){
  try{
    const SB=window.Capacitor&&window.Capacitor.Plugins&&window.Capacitor.Plugins.StatusBar;
    if(SB){(hidden?SB.hide():SB.show()).catch(()=>{});}
  }catch(e){}
}
function lockPortrait(){lockOrientation('portrait');setStatusBarHidden(false);}
function lockLandscape(){lockOrientation('landscape');setStatusBarHidden(true);}
lockPortrait();

/* Defensive re-assert: the game board screen must never actually present in
   portrait, on any device. A one-time lock() call on entering #scGame is
   already correct, but this listener re-asserts it if the device is
   physically rotated while the game screen stays the active one — scoped to
   #scGame only, on purpose (menu/tournament screens are untouched). */
try{
  const SO=window.Capacitor&&window.Capacitor.Plugins&&window.Capacitor.Plugins.ScreenOrientation;
  if(SO&&SO.addListener){
    SO.addListener('screenOrientationChange',()=>{
      if(typeof scGame!=='undefined'&&scGame&&scGame.classList.contains('on'))lockLandscape();
    });
  }
}catch(e){}
