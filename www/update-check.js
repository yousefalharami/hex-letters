/* ---------------- mandatory update-required modal ----------------
   This modal is permanent, real UI — not dev-only. It's just not wired to a
   real version check yet: nothing in this app currently calls
   showUpdateRequired(). A dev-only preview toggle used to call it on demand
   (dev-updatetoggle.js) but has since been removed — see CLAUDE.md's
   "Mandatory update-required modal" section. When the real version-check is
   built, call showUpdateRequired() from wherever that check resolves
   "out of date". */
const APP_STORE_URL='https://apps.apple.com/app/id6794808658';

function showUpdateRequired(){
  const t=L();
  updateTitle.textContent=t.updateRequiredTitle;
  updateMsg.textContent=t.updateRequiredMsg;
  updateBtn.textContent=t.updateBtn;
  updateBtn.href=APP_STORE_URL;
  updateOverlay.classList.add('show');
}
