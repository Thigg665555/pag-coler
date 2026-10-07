(()=>{const ATTRIBUTION_KEYS = Object.freeze([
  'ttclid','fbclid','src','sck','utm_source','utm_medium','utm_campaign','utm_content','utm_term','utm_id'
]);

function captureAttribution(previous, search, now = Date.now()) {
  const params = new URLSearchParams(search);
  if (!ATTRIBUTION_KEYS.some(key => params.has(key))) return previous && typeof previous === 'object' ? previous : {};

  // A new ad landing replaces the previous click. Carrying old UTM fields into
  // a new Meta or TikTok visit would attribute this order to the wrong campaign.
  const sameMetaClick = params.get('fbclid') && params.get('fbclid') === previous?.fbclid;
  const supplied=ATTRIBUTION_KEYS.filter(key=>params.get(key));
  const sameCampaign=previous?.fbclid && !params.get('fbclid') && !params.get('ttclid') &&
    supplied.some(key=>['utm_campaign','utm_medium','utm_content','utm_id'].includes(key)) &&
    supplied.every(key=>params.get(key)===previous[key]);
  const attribution = sameMetaClick || sameCampaign ? {...previous} : {};
  for (const key of ATTRIBUTION_KEYS) {
    const value = params.get(key);
    if (value && value.length <= 600) attribution[key] = value;
  }
  if (attribution.fbclid) {
    attribution.fbcFallback = (sameMetaClick || sameCampaign) && previous.fbcFallback || `fb.1.${now}.${attribution.fbclid}`;
    if (!attribution.utm_source) attribution.utm_source = 'FB';
  } else if (attribution.ttclid && !attribution.utm_source) {
    attribution.utm_source = 'TikTok';
  }
  return attribution;
}

const META_ATTRIBUTION_COOKIE='icedcar_meta_attribution';
// Scoped policy for /1 and /2. A source-only internal URL is not a new ad
// click. Keep the captured campaign unless a new click or campaign identifies
// a genuinely different touch. The legacy /3 policy is unchanged.
function captureScopedMetaAttribution(previous, search, now=Date.now()) {
  const params=new URLSearchParams(search);
  const source=params.get('utm_source');
  const meta=value=>/^(fb|facebook|instagram|meta)$/i.test(value||'');
  const hasNewClick=['fbclid','ttclid'].some(key=>params.get(key)&&params.get(key)!==previous?.[key]);
  const changedCampaign=['utm_campaign','utm_medium','utm_content','utm_id'].some(key=>params.get(key)&&params.get(key)!==previous?.[key]);
  if(meta(previous?.utm_source) && !previous?.ttclid && !hasNewClick && !changedCampaign &&
     (!source || meta(source))) {
    const merged={...previous};
    for(const key of ATTRIBUTION_KEYS) {
      const value=params.get(key);
      if(value && value.length<=600)merged[key]=value;
    }
    return merged;
  }
  return captureAttribution(previous,search,now);
}
function restoreMetaAttribution(current,saved) {
  const sanitize=value=>Object.fromEntries([...ATTRIBUTION_KEYS,'fbp','fbc','fbcFallback','ttp']
    .filter(key=>typeof value?.[key]==='string'&&value[key].length>0&&value[key].length<=600)
    .map(key=>[key,value[key]]));
  const incoming=sanitize(current),fallback=sanitize(saved);
  if(!fallback.fbclid&&!/^(fb|facebook|instagram|meta)$/i.test(fallback.utm_source||''))return incoming;
  if(incoming.ttclid || incoming.utm_source&&!/^(fb|facebook|instagram|meta)$/i.test(incoming.utm_source))return incoming;
  if(incoming.fbclid&&incoming.fbclid!==fallback.fbclid)return incoming;
  const clickFromCookie=incoming.fbc?.match(/^fb\.\d+\.\d+\.(.+)$/)?.[1];
  if(clickFromCookie&&fallback.fbclid&&clickFromCookie!==fallback.fbclid)return incoming;
  // A different campaign is a new touch: never fill it with an older ad set.
  if(['utm_campaign','utm_medium','utm_content','utm_id'].some(key=>incoming[key]&&fallback[key]&&incoming[key]!==fallback[key]))return incoming;
  return {...fallback,...incoming};
}
function readMetaAttribution(cookie,now=Date.now(),name=META_ATTRIBUTION_COOKIE) {
  try {
    const raw=cookie.split(';').map(x=>x.trim()).find(x=>x.startsWith(name+'='));
    const saved=JSON.parse(decodeURIComponent(raw?.slice(name.length+1)||''));
    if(!saved || saved.expires<=now || !saved.attribution || typeof saved.attribution!=='object')return {};
    return saved.attribution;
  } catch { return {}; }
}
function metaAttributionCookie(attribution,now=Date.now(),name=META_ATTRIBUTION_COOKIE) {
  if(attribution?.ttclid || !(attribution?.fbclid || /^(fb|facebook|instagram|meta)(?:[_ -].*)?$/i.test(attribution?.utm_source||''))) return null;
  const value=encodeURIComponent(JSON.stringify({expires:now+30*86400000,attribution}));
  if(value.length>3800)return null;
  return `${name}=${value}; Path=/; Max-Age=2592000; SameSite=Lax; Secure`;
}

function attributionUrl(path, attribution = {}) {
  const url = new URL(path, 'https://icedcar.invalid');
  for (const key of ATTRIBUTION_KEYS) {
    const value = attribution[key];
    if (typeof value === 'string' && value.length > 0 && value.length <= 600) url.searchParams.set(key, value);
  }
  return url.pathname + url.search + url.hash;
}

try {
 const offer=/^\/([12])\/?$/.exec(location.pathname)?.[1] || (location.pathname.replace(/\/$/,'')==='/checkout'?new URLSearchParams(location.search).get('offer'):null);
 if(['1','2'].includes(offer)) {
   const scopedKey='icedcar-meta-touch-v2:'+offer, cookieName='icedcar_meta_attribution_'+offer;
   let saved={};try{saved=JSON.parse(sessionStorage.getItem(scopedKey)||'{}')}catch{}
   saved=restoreMetaAttribution(saved,readMetaAttribution(document.cookie,Date.now(),cookieName));
   const touch=captureScopedMetaAttribution(saved,location.search);
   try{sessionStorage.setItem(scopedKey,JSON.stringify(touch))}catch{}
   const scopedCookie=metaAttributionCookie(touch,Date.now(),cookieName);if(scopedCookie)document.cookie=scopedCookie;
   else if(touch.ttclid || touch.utm_source)document.cookie=cookieName+'=; Path=/; Max-Age=0; SameSite=Lax; Secure';
 }
 const key='ponto-forte-tiktok-v1:attribution';
 let previous={};try{previous=JSON.parse(sessionStorage.getItem(key)||'{}')}catch{}
 previous=restoreMetaAttribution(previous,readMetaAttribution(document.cookie));
 const captured=captureAttribution(previous,location.search);
 const cookie=metaAttributionCookie(captured);if(cookie)document.cookie=cookie;
 try{sessionStorage.setItem(key,JSON.stringify(captured))}catch{}
}catch{} })();