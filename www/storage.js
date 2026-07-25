/* ---------------- persistence ---------------- */
const STORAGE_PREFIX='hexletters:v1:';
const SETTINGS_KEY=STORAGE_PREFIX+'settings';

function storageGet(key){
  try{
    const raw=localStorage.getItem(key);
    return raw?JSON.parse(raw):null;
  }catch(e){return null;}
}
function storageSet(key,value){
  try{localStorage.setItem(key,JSON.stringify(value));}catch(e){}
}

function saveSettings(){
  storageSet(SETTINGS_KEY,{title:cfg.title,names:cfg.names,t1:cfg.t1,t2:cfg.t2,lang:cfg.lang});
}
function loadSettings(){
  const s=storageGet(SETTINGS_KEY);
  if(!s)return;
  if(s.title)cfg.title=s.title;
  if(s.names)cfg.names=s.names;
  if(s.t1)cfg.t1=s.t1;
  if(s.t2)cfg.t2=s.t2;
  if(s.lang)cfg.lang=s.lang;
}

loadSettings();
name1.value=cfg.names[1]||'';name2.value=cfg.names[2]||'';
applyColors();paintSel();applyLang();
