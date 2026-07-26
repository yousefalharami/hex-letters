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
