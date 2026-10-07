/* IcedCar — checkout: identificação → entrega → pagamento (Pix).
   A API de pagamento entra em window.createPix (no fim deste arquivo). */
(function(){
  'use strict';
  var $=function(s,r){return (r||document).querySelector(s);};
  var $$=function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s));};
  var SHIP={pac:{label:'PAC dos Correios',price:0},sedex:{label:'SEDEX dos Correios',price:24.9}};
  var COUPONS={OFERTA10:0.10}; // cupom → desconto (10%). Mantenha igual em netlify/functions/create-pix.js
  var items=[]; try{items=JSON.parse(localStorage.getItem('icedcar_order')||'[]');}catch(e){}
  var order={customer:{},address:{},shipping:'pac',coupon:'',juridica:false};
  var money=function(n){return 'R$ '+n.toFixed(2).replace('.',',');};
  var esc=function(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});};
  var digits=function(v){return String(v||'').replace(/\D/g,'');};

  function totals(){
    var sub=items.reduce(function(s,i){return s+i.price*i.qty;},0);
    var ship=SHIP[order.shipping].price, disc=COUPONS[order.coupon]?sub*COUPONS[order.coupon]:0;
    return {sub:sub,ship:ship,disc:disc,total:sub+ship-disc};
  }

  // ---------- resumo ----------
  var st=document.createElement('style');
  st.textContent='.ck-item{display:flex;justify-content:space-between;gap:12px;padding:10px 0;border-bottom:1px solid #eee;font-size:13px}.ck-item small{display:block;color:#777;line-height:1.4;margin-top:2px}.ck-row{display:flex;justify-content:space-between;padding:6px 0;font-size:14px}.ck-row.total{font-weight:800;font-size:16px;border-top:1px solid #eee;margin-top:6px;padding-top:12px}.ck-empty{padding:14px 0;font-size:13px;color:#666}#review{margin:14px 0;font-size:13px;line-height:1.5;color:#444}#review b{display:block;margin-top:8px;color:#111}';
  document.head.appendChild(st);

  function renderSummary(){
    var t=totals(), qty=items.reduce(function(s,i){return s+i.qty;},0);
    $$('[data-count]').forEach(function(e){e.textContent=qty;});
    var list=items.length?items.map(function(i){
      return '<div class="ck-item"><div><strong>'+esc(i.name)+(i.qty>1?' × '+i.qty:'')+'</strong><small>'+esc(i.model)+' · '+esc(i.side)+'<br>Nome na placa: '+esc(i.nameOnPlate)+'</small></div><strong>'+money(i.price*i.qty)+'</strong></div>';
    }).join(''):'<div class="ck-empty">Seu carrinho está vazio. <a href="/" style="text-decoration:underline">Voltar à loja</a></div>';
    var tot='<div class="ck-row"><span>Subtotal</span><span>'+money(t.sub)+'</span></div>'+
      '<div class="ck-row"><span>Frete ('+SHIP[order.shipping].label+')</span><span>'+(t.ship?money(t.ship):'Grátis')+'</span></div>'+
      (t.disc?'<div class="ck-row"><span>Cupom</span><span>− '+money(t.disc)+'</span></div>':'')+
      '<div class="ck-row total"><span>Total</span><span>'+money(t.total)+'</span></div>';
    $$('.summary-content').forEach(function(e){e.innerHTML=list;});
    $$('.summary-totals').forEach(function(e){e.innerHTML=items.length?tot:'';});
    var pt=$('#pix-total'); if(pt) pt.textContent=money(t.total);
  }

  // ---------- etapas ----------
  var panels={1:'identity-step',2:'delivery-step',3:'payment-step'};
  function go(n){
    Object.keys(panels).forEach(function(k){var p=document.getElementById(panels[k]); if(p) p.hidden=(+k!==n);});
    $$('.step').forEach(function(s){var k=+s.getAttribute('data-step'); s.classList.toggle('current',k===n); s.classList.toggle('done',k<n);});
    if(n===3) preparePayment();
    window.scrollTo({top:0,behavior:'smooth'});
  }
  function fail(id,msg){var e=document.getElementById(id); if(!e) return; e.textContent=msg; e.hidden=false; e.scrollIntoView({block:'center',behavior:'smooth'});}
  function ok(id){var e=document.getElementById(id); if(e) e.hidden=true;}

  // ---------- máscaras e validações ----------
  function mask(v,p){var d=digits(v),o='',i=0;for(var k=0;k<p.length&&i<d.length;k++){o+=p[k]==='0'?d[i++]:p[k];}return o;}
  function cpfOk(c){c=digits(c);if(c.length!==11||/^(\d)\1+$/.test(c))return false;for(var t=9;t<11;t++){var s=0;for(var i=0;i<t;i++)s+=c[i]*(t+1-i);if(((s*10)%11)%10!=c[t])return false;}return true;}
  function bind(id,fn){var e=document.getElementById(id); if(e) e.addEventListener('input',function(){e.value=fn(e.value);});}
  bind('customer-phone',function(v){return mask(v,'(00) 00000-0000');});
  bind('customer-document',function(v){return order.juridica?mask(v,'00.000.000/0000-00'):mask(v,'000.000.000-00');});
  bind('zip',function(v){return mask(v,'00000-000');});
  bind('state',function(v){return v.toUpperCase().replace(/[^A-Z]/g,'').slice(0,2);});

  $$('#person-fisica,#person-juridica').forEach(function(b){
    b.addEventListener('click',function(){
      order.juridica=b.id==='person-juridica';
      $('#person-fisica').classList.toggle('active',!order.juridica); $('#person-fisica').setAttribute('aria-pressed',String(!order.juridica));
      $('#person-juridica').classList.toggle('active',order.juridica); $('#person-juridica').setAttribute('aria-pressed',String(order.juridica));
      $('#name-label').textContent=order.juridica?'Razão social':'Nome completo';
      $('#document-label').textContent=order.juridica?'CNPJ':'CPF';
      $('#customer-document').value=''; $('#customer-document').placeholder=order.juridica?'00.000.000/0000-00':'000.000.000-00';
      $('#document-hint').textContent=order.juridica?'Confira os 14 dígitos do CNPJ.':'Confira os 11 dígitos do CPF.';
    });
  });

  // ---------- 1. identificação ----------
  $('#identity-form').addEventListener('submit',function(e){
    e.preventDefault();
    var name=$('#customer-name').value.trim(), mail=$('#customer-email').value.trim(), doc=$('#customer-document').value, ph=digits($('#customer-phone').value);
    if(!items.length) return fail('identity-error','Seu carrinho está vazio. Volte à loja e escolha seu IcedCar.');
    if(name.split(/\s+/).length<2) return fail('identity-error',order.juridica?'Informe a razão social.':'Informe seu nome completo.');
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(mail)) return fail('identity-error','Digite um e-mail válido.');
    if(order.juridica?digits(doc).length!==14:!cpfOk(doc)) return fail('identity-error',order.juridica?'CNPJ inválido.':'CPF inválido. Confira os 11 dígitos.');
    if(ph.length!==11||ph[2]!=='9') return fail('identity-error','Celular inválido. Use DDD + 9 dígitos.');
    ok('identity-error');
    order.customer={name:name,email:mail,document:digits(doc),phone:ph};
    go(2);
  });

  // ---------- 2. entrega ----------
  var zipEl=$('#zip'), zipStatus=$('#zip-status');
  zipEl.addEventListener('input',function(){
    var cep=digits(zipEl.value); if(cep.length!==8){zipStatus.textContent='';return;}
    zipStatus.textContent='Buscando endereço...';
    fetch('https://viacep.com.br/ws/'+cep+'/json/').then(function(r){return r.json();}).then(function(d){
      if(d.erro){zipStatus.textContent='CEP não encontrado. Preencha o endereço manualmente.';return;}
      $('#street').value=d.logradouro||''; $('#neighborhood').value=d.bairro||''; $('#city').value=d.localidade||''; $('#state').value=d.uf||'';
      zipStatus.textContent=''; $(d.logradouro?'#house-number':'#street').focus();
    }).catch(function(){zipStatus.textContent='Não foi possível buscar o CEP. Preencha manualmente.';});
  });
  $$('input[name="shipping-method"]').forEach(function(r){r.addEventListener('change',function(){order.shipping=r.value; renderSummary();});});
  $('#delivery-form').addEventListener('submit',function(e){
    e.preventDefault();
    var a={zip:digits(zipEl.value),street:$('#street').value.trim(),number:$('#house-number').value.trim(),complement:$('#complement').value.trim(),neighborhood:$('#neighborhood').value.trim(),city:$('#city').value.trim(),state:$('#state').value.trim()};
    if(a.zip.length!==8) return fail('delivery-error','Digite um CEP válido com 8 dígitos.');
    if(!a.street||!a.number||!a.neighborhood||!a.city||a.state.length!==2) return fail('delivery-error','Preencha endereço, número, bairro, cidade e UF.');
    ok('delivery-error'); order.address=a; go(3);
  });
  $$('[data-back]').forEach(function(b){b.addEventListener('click',function(){go(+b.getAttribute('data-back'));});});

  // ---------- 3. pagamento (Pix) ----------
  function preparePayment(){
    var a=order.address,c=order.customer;
    $('#review').innerHTML='<b>Cliente</b>'+esc(c.name)+' · '+esc(c.email)+
      '<b>Entrega</b>'+esc(a.street)+', '+esc(a.number)+(a.complement?' – '+esc(a.complement):'')+' · '+esc(a.neighborhood)+'<br>'+esc(a.city)+'/'+esc(a.state)+' · CEP '+mask(a.zip,'00000-000')+
      '<b>Frete</b>'+SHIP[order.shipping].label;
    var po=$('#pix-option'); po.disabled=false; po.setAttribute('aria-pressed','true'); $('#pix-label').textContent='PIX';
    var pu=$('#payment-unavailable'); if(pu) pu.hidden=true;
    $('#pix-panel').hidden=false; renderSummary();
  }
  function buildOrder(){var t=totals(); return {items:items,customer:order.customer,address:order.address,shipping:{method:order.shipping,label:SHIP[order.shipping].label,price:t.ship},coupon:order.coupon,tracking:utms(),subtotal:t.sub,discount:t.disc,total:t.total};}

  $('#pix-create').addEventListener('click',function(){
    var btn=this, status=$('#pix-status'); btn.disabled=true; btn.textContent='Gerando Pix...'; status.textContent='';
    window.createPix(buildOrder()).then(function(r){
      $('#pix-code').value=r.code; $('#pix-result').hidden=false; btn.hidden=true; drawQR(r.code); if(r.hash) poll(r.hash);
    }).catch(function(err){
      status.textContent=err&&err.message==='NOT_CONNECTED'?'O pagamento via Pix ainda não está conectado.':'Não foi possível gerar o Pix. Tente novamente.';
      btn.disabled=false; btn.textContent='Gerar Pix para pagar';
    });
  });
  $('#pix-copy').addEventListener('click',function(){
    var t=$('#pix-code'); t.select();
    (navigator.clipboard?navigator.clipboard.writeText(t.value):Promise.reject()).catch(function(){document.execCommand('copy');});
    var b=this, old=b.innerHTML; b.textContent='Código copiado!'; setTimeout(function(){b.innerHTML=old;},1800);
  });

  // ---------- cupom e resumo ----------
  $('#coupon-apply').addEventListener('click',function(){
    var code=$('#coupon-code').value.trim().toUpperCase(), m=$('#coupon-message'); m.hidden=false;
    if(COUPONS[code]){order.coupon=code; m.textContent='Cupom aplicado.';} else {order.coupon=''; m.textContent='Cupom inválido ou expirado.';}
    renderSummary();
  });
  var tg=$('#summary-toggle'); if(tg) tg.addEventListener('click',function(){
    var open=tg.getAttribute('aria-expanded')!=='true'; tg.setAttribute('aria-expanded',String(open));
    var b=$('.summary-body'); if(b) b.hidden=!open;
  });

  var cs=$('.checkout-status'); if(cs) cs.hidden=true;
  renderSummary(); go(1);

  // ---------- TriboPay (via Netlify Functions) ----------
  function utms(){
    var p=new URLSearchParams(location.search), o={};
    ['src','utm_source','utm_medium','utm_campaign','utm_content','utm_term'].forEach(function(k){o[k]=p.get(k)||'';});
    return o;
  }
  function drawQR(code){
    var s=document.createElement('script'); s.src='https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js';
    s.onload=function(){ window.QRCode.toCanvas($('#pix-qr'),code,{width:220,margin:1},function(err){ if(!err) $('#pix-qr-section').hidden=false; else $('#pix-qr-error').hidden=false; }); };
    s.onerror=function(){ $('#pix-qr-error').hidden=false; };
    document.head.appendChild(s);
  }
  function poll(hash){
    var n=0, t=setInterval(function(){
      if(++n>360){clearInterval(t);return;}
      fetch('/.netlify/functions/check-pix?hash='+encodeURIComponent(hash)).then(function(r){return r.json();}).then(function(d){
        if(!d.paid) return;
        clearInterval(t);
        $('#pix-state strong').textContent='Pagamento confirmado!';
        $('#pix-status').textContent='Recebemos seu pagamento. Enviaremos os detalhes do pedido por e-mail.';
        try{localStorage.removeItem('icedcar_order');}catch(e){}
      }).catch(function(){});
    },5000);
  }
  window.createPix=function(o){
    return fetch('/.netlify/functions/create-pix',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(o)})
      .then(function(r){return r.json().then(function(d){if(!r.ok||!d.code) throw new Error(d.error||'ERRO'); return d;});});
  };
})();
