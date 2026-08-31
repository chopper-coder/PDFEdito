export const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);
export const deepClone = (value) => JSON.parse(JSON.stringify(value));
export const clamp = (value,min,max) => Math.max(min,Math.min(max,value));
export const normalizeRotation = (rotation) => ((rotation % 360) + 360) % 360;
export const xmlEscape = (value='') => String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[char]));
