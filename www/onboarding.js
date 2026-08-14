/* ---------------- first-launch onboarding ---------------- */
function showOnboardPage(n){
  obPageLang.style.display=n===1?'':'none';
  obPageRules.style.display=n===2?'':'none';
}
function renderOnboardRules(){
  const t=L();
  obTitle.textContent=t.obTitle;
  obRulesList.innerHTML=t.obRules.map(r=>`<li>${r}</li>`).join('');
  obTip.textContent=t.obTip;
  obStartBtn.textContent=t.obStart;
}
function pickOnboardLang(lang){
  cfg.lang=lang;paintSel();applyLang();persistSettings();
  renderOnboardRules();
  showOnboardPage(2);
}
obLangAr.onclick=()=>pickOnboardLang('ar');
obLangEn.onclick=()=>pickOnboardLang('en');
obStartBtn.onclick=()=>{
  markOnboarded();
  obOverlay.classList.remove('show');
};
if(!hasOnboarded()){
  showOnboardPage(1);
  obOverlay.classList.add('show');
}
