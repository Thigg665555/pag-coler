(() => {
  if (window.IcedCarGoogle) return;
  const tag='AW-18466584841',conversion=tag+'/LWEPCL3x548dEInyxuVE';
  const active=!['localhost','127.0.0.1'].includes(location.hostname);
  const storageKey='icedcar-google-click-v1';
  const clickKeys=['gclid','gbraid','wbraid'];
  let click={};
  try { const saved=JSON.parse(localStorage.getItem(storageKey)||'null');if(saved?.expires>Date.now())click=saved.click||{}; } catch {}
  const params=new URLSearchParams(location.search);
  const incoming=Object.fromEntries(clickKeys.map(key=>[key,params.get(key)]).filter(([,value])=>typeof value==='string'&&/^[\w.-]{1,600}$/.test(value)));
  if(Object.keys(incoming).length){click=incoming;try{localStorage.setItem(storageKey,JSON.stringify({click,expires:Date.now()+90*86400000}))}catch{}}
  window.dataLayer=window.dataLayer||[];
  window.gtag=window.gtag||function(){window.dataLayer.push(arguments)};
  const sent=new Set();
  function emit(event,properties){if(!active)return false;try{window.gtag('event',event,properties);return true}catch{return false}}
  const item=(value,variant,quantity)=>({send_to:tag,currency:'BRL',value,price_variant:variant,items:[{item_id:'icedcar-'+variant,item_name:'Mini Cooler IcedCar',quantity,price:value/quantity}]});
  function convert(order,label,kind){
    if(!Number.isSafeInteger(order?.amount)||order.amount<=0||! /^[a-f\d]{8}-[a-f\d]{4}-4[a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/i.test(order.id||''))return false;
    const key='icedcar-google-'+kind+':'+order.id;
    if(sent.has(key))return false;
    try{if(localStorage.getItem(key))return false}catch{}
    if(!emit('conversion',{send_to:label,value:order.amount/100,currency:'BRL',transaction_id:order.id}))return false;
    sent.add(key);try{localStorage.setItem(key,'1')}catch{}return true;
  }
  window.IcedCarGoogle={
    context:()=>({...click}),
    viewItem:(value,variant)=>emit('view_item',item(value,variant,1)),
    beginCheckout:(value,variant,quantity,id)=>{
      const key='begin_checkout_'+id;if(sent.has(key))return;
      if(emit('begin_checkout',item(value,variant,quantity)))sent.add(key);
    },
    generated:order=>['pending','paid','creating','unknown'].includes(order?.status)&&convert(order,tag+'/1C0kCP79qpIdEInyxuVE','generated'),
    purchase:order=>order?.status==='paid'&&convert(order,conversion,'purchase')
  };
  if(active){
    window.gtag('js',new Date());window.gtag('config',tag,{send_page_view:false});
    emit('page_view',{send_to:tag,page_location:location.origin+location.pathname});
    const script=document.createElement('script');script.async=true;script.src='https://www.googletagmanager.com/gtag/js?id='+tag;document.head.append(script);
  }
})();
