(()=>{
'use strict';
const VERSION='10.25.57-loupe-hitthrough';
if(document.getElementById('fvLoupeHitThroughStyle'))return;
const s=document.createElement('style');
s.id='fvLoupeHitThroughStyle';
s.textContent=`
body:has(#itemFilter option:checked[value="ERS"]) #fvErsStatusBoxes .fv-ers-hit,
body:has(#itemFilter option:checked[value="Tieback"]) #fvErsStatusBoxes .fv-ers-hit,
body:has(#itemFilter option:checked[value="Waler"]) #fvErsStatusBoxes .fv-ers-hit{pointer-events:none!important}
`;
document.head.appendChild(s);
console.info(`FieldVerify loupe tap-through ${VERSION} loaded`);
})();