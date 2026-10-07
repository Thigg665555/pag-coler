import '../meta-tracking.js';
import '../presence-tracking.js';
import { pricingForCart } from '../pricing.js';
import { shippingForMethod } from '../shipping.js';
import { drawPixQr } from './pix-qr.js';
import { digits, formatCpf, formatCnpj, formatPhone, validCpf, validCnpj, validPhone, validCep, validName, validEmail } from './validation.js';

const key = 'ponto-forte-checkout-v1';
const requestedOffer = new URLSearchParams(location.search).get('offer');
const money = value => new Intl.NumberFormat('pt-BR', {style:'currency', currency:'BRL'}).format(value);
const $ = id => document.getElementById(id);
const allowed = ['side','category','brand','model','year','color','plate'];
let cart;
try {
  const parsed = JSON.parse(sessionStorage.getItem(key) || 'null');
  if (pricingForCart(parsed) && parsed.units?.length === parsed.quantity && parsed.units.every(unit => allowed.every(field => typeof unit[field] === 'string' && unit[field].trim().length > 0 && unit[field].length <= 80))) cart = parsed;
} catch { /* An absent or malformed cart starts empty. */ }
if (requestedOffer && cart?.variant !== requestedOffer) cart = null;
const storefrontPath = '/'+(['1','2','3'].includes(requestedOffer||cart?.variant)?requestedOffer||cart.variant:'1');
const trackedUrl = path => window.IcedCarTracking?.url(path) || path;
document.querySelector('header a[aria-label="Início"]').href = trackedUrl(storefrontPath);
const cartTotal = () => (pricingForCart(cart)?.totalCents || 0) / 100;
const unitPrice = () => (pricingForCart(cart)?.unitCents || 0) / 100;
const shippingStorageKey = `ponto-forte-shipping-v1-${cart?.variant || requestedOffer || '1'}`;
const storedShipping = shippingForMethod(sessionStorage.getItem(shippingStorageKey));
if (storedShipping) document.querySelector(`input[name="shipping-method"][value="${storedShipping.method}"]`).checked = true;
const selectedShipping = () => shippingForMethod(document.querySelector('input[name="shipping-method"]:checked')?.value) || shippingForMethod('pac');
const orderTotal = () => cartTotal() + selectedShipping().cents / 100;
const categoryLabel = {pickup:'Picape',suv:'SUV',sedan:'Sedã',hatch:'Hatch',sports_coupe:'Esportivo / Coupé',convertible:'Conversível'};
const timer = document.querySelector('header + div p:last-child strong');
if (timer) {
  const timerKey = 'ponto-forte-offer-deadline-v1';
  let deadline = Number(sessionStorage.getItem(timerKey));
  if (!deadline || deadline < Date.now() - 86400000) {
    deadline = Date.now() + 900000;
    sessionStorage.setItem(timerKey, String(deadline));
  }
  const tick = () => {
    const seconds = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
    timer.textContent = `00:${String(Math.floor(seconds / 60)).padStart(2,'0')}:${String(seconds % 60).padStart(2,'0')}`;
  };
  tick();
  setInterval(tick, 1000);
}

function renderSummary(target) {
  target.replaceChildren();
  const compact = target.closest('aside') !== null;
  if (!cart) {
    if (!compact) {
      const empty = document.createElement('p'); empty.className = 'summary-empty'; empty.textContent = 'Sua sacola está vazia. ';
      const link = document.createElement('a'); link.href = storefrontPath; link.textContent = 'Voltar à loja';
      empty.append(link); target.append(empty);
    }
    return;
  }
  cart.units.forEach((unit, index) => {
    const item = document.createElement('div'); item.className = 'summary-item';
    const photo = document.createElement('img'); photo.src = '/media/icedcar-main.png'; photo.alt = '';
    const content = document.createElement('div'); content.className = 'summary-item-main';
    const name = document.createElement('strong'); name.textContent = `IcedCar – Cooler dos Apaixonados por Carros & Churrasco`;
    const detail = document.createElement('small'); detail.textContent = compact ? `Qtd: 1 · ${unit.brand} ${unit.model}` : `Vista: ${unit.side}; Tipo: ${categoryLabel[unit.category] || unit.category}; Marca: ${unit.brand}; Modelo: ${unit.model}; Ano: ${unit.year}; Cor: ${unit.color}; Nome na placa: ${unit.plate}`;
    const price = document.createElement('b'); price.textContent = money(unitPrice());
    const priceBlock = document.createElement('div'); priceBlock.className = 'summary-price';
    const stockNotice = document.createElement('p'); stockNotice.className = 'stock-urgency';
    stockNotice.textContent = `Últimas 3 unidades do modelo ${unit.model}!`;
    priceBlock.append(price, stockNotice);
    content.append(name, detail);
    if (!compact) {
      content.append(priceBlock);
      const actions = document.createElement('div'); actions.className = 'item-actions';
      const quantity = document.createElement('div'); quantity.className = 'quantity-control';
      const minus = document.createElement('button'); minus.type = 'button'; minus.textContent = '−'; minus.setAttribute('aria-label',`Diminuir ou remover unidade ${index + 1}`); minus.addEventListener('click', () => removeUnit(index));
      const count = document.createElement('span'); count.textContent = '1';
      const plus = document.createElement('button'); plus.type = 'button'; plus.textContent = '+'; plus.disabled = true; plus.title = 'Escolha outro carro na página do produto';
      quantity.append(minus,count,plus);
      const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'remove-unit'; remove.setAttribute('aria-label',`Remover unidade ${index + 1}`); remove.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2m3 0-1 14H6L5 6m4 4v7m6-7v7"/></svg>'; remove.addEventListener('click', () => removeUnit(index));
      actions.append(quantity,remove); content.append(actions);
    }
    item.append(photo, content);
    if (compact) item.append(priceBlock);
    target.append(item);
  });
}
function renderTotals(target) {
  target.replaceChildren();
  const compact = target.closest('aside') !== null;
  if (!cart && !compact) return;
  const shipping = selectedShipping();
  for (const [label, amount, kind] of [[compact ? 'Subtotal' : 'Produtos',cartTotal(),''],
    [`Frete (${shipping.method.toUpperCase()})`,shipping.cents ? shipping.cents / 100 : 'Grátis',''],
    ['Total',orderTotal(),'total']]) {
    const row = document.createElement('div'); row.className = `total-row ${kind}`;
    const left = document.createElement('span'); left.textContent = label;
    const right = document.createElement('span'); right.textContent = typeof amount === 'number' ? money(amount) : amount;
    row.append(left,right); target.append(row);
  }
}
function renderAll() {
  document.querySelectorAll('.summary-content').forEach(renderSummary);
  document.querySelectorAll('.summary-totals').forEach(renderTotals);
  document.querySelectorAll('[data-count]').forEach(node => {node.textContent = cart?.quantity || 0;});
  $('identity-step').hidden = false;
  $('identity-form').querySelector('button[type=submit]').disabled = !cart;
  document.querySelector('.coupon').hidden = !cart;
  if (!cart) { $('delivery-step').hidden = true; $('payment-step').hidden = true; }
  $('pix-total').textContent = money(orderTotal());
}
function removeUnit(index) {
  if (!cart) return;
  cart.units.splice(index,1);
  cart.quantity = cart.units.length;
  if (cart.quantity === 0) {cart = null; sessionStorage.removeItem(key);}
  else sessionStorage.setItem(key,JSON.stringify(cart));
  sessionStorage.removeItem('ponto-forte-payment-id-v1');
  step(1);
  renderAll();
}
renderAll();
if (cart && !$('identity-step').hidden && $('delivery-step').hidden && $('payment-step').hidden) {
  const checkoutId = sessionStorage.getItem('ponto-forte-payment-id-v1') || crypto.randomUUID();
  sessionStorage.setItem('ponto-forte-payment-id-v1', checkoutId);
  window.IcedCarTracking?.track('InitiateCheckout', cart, checkoutId);
  window.IcedCarGoogle?.beginCheckout(cartTotal(),cart.variant,cart.quantity,checkoutId);
}
$('summary-toggle').addEventListener('click', event => {
  const content = event.currentTarget.nextElementSibling;
  content.hidden = !content.hidden;
  event.currentTarget.setAttribute('aria-expanded', String(!content.hidden));
});
$('coupon-apply').addEventListener('click', () => {
  const message = $('coupon-message');
  message.hidden = false;
  message.textContent = 'Cupons não estão disponíveis nesta oferta.';
});

let personType = 'fisica';
function maskInput(input, format) {
  input.addEventListener('input', event => {
    if (event.isComposing) return;
    const caret = input.selectionStart;
    const before = digits(input.value.slice(0, caret)).length;
    const formatted = format(input.value);
    input.value = formatted;
    let position = before === 0 ? 0 : formatted.length;
    if (before < digits(formatted).length) {
      let count = 0;
      for (let i = 0; i < formatted.length; i++) {
        if (/\d/.test(formatted[i])) count++;
        if (count === before) {position = i + 1; break;}
      }
    }
    input.setSelectionRange(position,position);
  });
}
maskInput($('customer-document'), value => personType === 'fisica' ? formatCpf(value) : formatCnpj(value));
maskInput($('customer-phone'), formatPhone);
for (const type of ['fisica','juridica']) $('person-' + type).addEventListener('click', () => {
  personType = type;
  for (const item of ['fisica','juridica']) {
    const button = $('person-' + item);
    button.classList.toggle('active', item === type);
    button.setAttribute('aria-pressed', String(item === type));
  }
  $('name-label').textContent = type === 'fisica' ? 'Nome completo' : 'Razão social';
  $('document-label').textContent = type === 'fisica' ? 'CPF' : 'CNPJ';
  $('customer-document').placeholder = type === 'fisica' ? '000.000.000-00' : '00.000.000/0000-00';
  $('customer-document').value = '';
  $('customer-document').removeAttribute('aria-invalid');
  $('document-hint').textContent = type === 'fisica' ? 'Confira os 11 dígitos do CPF.' : 'Confira os 14 dígitos do CNPJ.';
  $('document-hint').classList.remove('field-error');
  error('identity-error',null,'');
});

function error(id, input, message) {
  const notice = $(id);
  notice.textContent = message;
  notice.hidden = !message;
  if (input) {input.setAttribute('aria-invalid','true'); input.focus();}
}
function step(number) {
  for (const [index,id] of ['identity-step','delivery-step','payment-step'].entries()) $(id).hidden = index + 1 !== number;
  for (const element of document.querySelectorAll('.step')) {
    const index = Number(element.dataset.step);
    element.classList.toggle('current', index === number);
    element.classList.toggle('done', index < number);
  }
  window.scrollTo({top:0,behavior:'smooth'});
}
document.querySelectorAll('[data-back]').forEach(button => button.addEventListener('click', () => step(Number(button.dataset.back))));

function identityChecks() {
  const name = $('customer-name'), email = $('customer-email'), document = $('customer-document'), phone = $('customer-phone');
  return [[name, personType === 'fisica' ? validName(name.value) : name.value.trim().length >= 3, 'Informe o nome completo ou a razão social.'], [email, validEmail(email.value), 'Informe um e-mail válido, como nome@dominio.com.'], [document, personType === 'fisica' ? validCpf(document.value) : validCnpj(document.value), `Informe um ${personType === 'fisica' ? 'CPF' : 'CNPJ'} válido.`], [phone, validPhone(phone.value), 'Informe um celular válido com DDD e 9 dígitos.']];
}
function validateIdentity() {
  const checks = identityChecks();
  checks.forEach(([input]) => input.removeAttribute('aria-invalid'));
  const failed = checks.find(([,valid]) => !valid);
  if (failed) {error('identity-error',failed[0],failed[2]);return false;}
  error('identity-error',null,'');
  return true;
}
for (const [inputId,hintId] of [['customer-email','email-hint'],['customer-document','document-hint'],['customer-phone','phone-hint']]) {
  const input = $(inputId), hint = $(hintId), defaultHint = hint.textContent;
  const normalHint = () => inputId === 'customer-document' ?
    (personType === 'fisica' ? 'Confira os 11 dígitos do CPF.' : 'Confira os 14 dígitos do CNPJ.') : defaultHint;
  input.addEventListener('blur', () => {
    if (!input.value.trim()) return;
    const check = identityChecks().find(([field]) => field === input);
    if (check[1]) input.removeAttribute('aria-invalid');
    else input.setAttribute('aria-invalid','true');
    hint.textContent = check[1] ? normalHint() : check[2];
    hint.classList.toggle('field-error', !check[1]);
  });
  input.addEventListener('input', () => {
    input.removeAttribute('aria-invalid');
    hint.textContent = normalHint();
    hint.classList.remove('field-error');
    if (!$('identity-error').hidden) error('identity-error',null,'');
  });
}
$('identity-form').addEventListener('submit', event => {
  event.preventDefault();
  if (!cart || !validateIdentity()) return;
  const email = $('customer-email'), document = $('customer-document'), phone = $('customer-phone');
  void window.IcedCarTracking?.identify({email:email.value, phone:phone.value, document:document.value});
  step(2);
});

let lookupController;
let lastZip = '';
$('zip').addEventListener('input', () => {
  const value = digits($('zip').value).slice(0,8);
  $('zip').value = value.length > 5 ? `${value.slice(0,5)}-${value.slice(5)}` : value;
  if (value !== lastZip) {
    for (const id of ['street','neighborhood','city','state']) $(id).value = '';
    lastZip = value;
  }
  lookupController?.abort();
  $('zip-status').textContent = '';
  if (value.length === 8) lookupCep(value);
});
async function lookupCep(cep) {
  lookupController = new AbortController();
  $('zip-status').textContent = 'Consultando CEP…';
  try {
    const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`, {signal:lookupController.signal, referrerPolicy:'no-referrer'});
    if (!response.ok) throw new Error('lookup failed');
    const address = await response.json();
    if (digits($('zip').value) !== cep) return;
    if (address.erro) {$('zip-status').textContent = 'CEP não encontrado. Confira o número.';return;}
    for (const [id,value] of [['street',address.logradouro],['neighborhood',address.bairro],['city',address.localidade],['state',address.uf]]) $(id).value = String(value || '');
    $('zip-status').textContent = 'Endereço encontrado. Confira os dados e informe o número.';
    $('house-number').focus();
  } catch (err) {
    if (err.name !== 'AbortError') $('zip-status').textContent = 'Não foi possível consultar o CEP. Preencha o endereço manualmente.';
  }
}
$('delivery-form').addEventListener('submit', event => {
  event.preventDefault();
  const ids = ['zip','street','house-number','neighborhood','city','state'];
  ids.forEach(id => $(id).removeAttribute('aria-invalid'));
  if (!validCep($('zip').value)) {error('delivery-error',$('zip'),'Informe um CEP com 8 dígitos.');return;}
  const missing = ids.slice(1).find(id => !$(id).value.trim());
  if (missing) {error('delivery-error',$(missing),'Preencha todos os campos obrigatórios do endereço.');return;}
  if (!/^(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)$/i.test($('state').value.trim())) {error('delivery-error',$('state'),'Informe uma sigla de estado válida.');return;}
  if (!/^(\d+[A-Za-z]?|s\/?n)$/i.test($('house-number').value.trim())) {error('delivery-error',$('house-number'),'Informe um número válido ou S/N.');return;}
  error('delivery-error',null,'');
  const review = $('review'); review.replaceChildren();
  const title = document.createElement('strong'); title.textContent = 'Endereço de entrega';
  const line = document.createElement('p'); line.textContent = `${$('street').value.trim()}, ${$('house-number').value.trim()}${$('complement').value.trim() ? ', ' + $('complement').value.trim() : ''} — ${$('neighborhood').value.trim()}, ${$('city').value.trim()}/${$('state').value.trim().toUpperCase()} — CEP ${$('zip').value}`;
  const shipping = selectedShipping();
  const price = document.createElement('p'); price.textContent = `Produtos: ${money(cartTotal())}. Frete ${shipping.label}: ${shipping.cents ? money(shipping.cents / 100) : 'grátis'}. Total: ${money(orderTotal())}.`;
  review.append(title,line,price);
  window.IcedCarTracking?.track('AddPaymentInfo', cart, sessionStorage.getItem('ponto-forte-payment-id-v1') || crypto.randomUUID(), {payment_method:'pix'});
  step(3);
});

let pixEnabled = false;
let paymentPoll;
let renderedPixCode = '';
const paymentIdKey = 'ponto-forte-payment-id-v1';
document.querySelectorAll('input[name="shipping-method"]').forEach(input => input.addEventListener('change', () => {
  const previousPix = !$('pix-result').hidden;
  sessionStorage.setItem(shippingStorageKey, selectedShipping().method);
  if (paymentPoll) {clearInterval(paymentPoll);paymentPoll = null;}
  sessionStorage.removeItem(paymentIdKey);
  $('pix-result').hidden = true;
  $('pix-code').value = '';
  renderedPixCode = '';
  $('pix-qr-section').hidden = true;
  $('pix-qr-error').hidden = true;
  $('pix-preparation').hidden = false;
  $('pix-create').hidden = false;
  $('pix-status').textContent = previousPix ? 'O Pix anterior corresponde ao frete antigo. Gere um novo código para esta opção.' : '';
  document.querySelectorAll('.summary-totals').forEach(renderTotals);
  $('pix-total').textContent = money(orderTotal());
}));
async function paymentRequest(mode, body) {
  const response = await fetch(`/api/payments?mode=${mode}`, {
    method: 'POST', headers: {'content-type':'application/json'}, body: JSON.stringify(body),
    cache: 'no-store', referrerPolicy: 'no-referrer', keepalive:mode==='copy'
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'PAYMENT_UNAVAILABLE');
  if (mode === 'create') window.IcedCarGoogle?.generated(result);
  return result;
}
function showPayment(order) {
  const chargedShipping = shippingForMethod(order.shipping?.method) || selectedShipping();
  if (Number.isSafeInteger(order.amount) && order.amount > 0) $('pix-total').textContent = money(order.amount / 100);
  $('pix-status').textContent = ({
    creating:'Preparando seu Pix…', pending:'',
    paid:'Pagamento confirmado. Obrigado pela compra!', rejected:'Não foi possível gerar o Pix. Confira seus dados e tente novamente.',
    unknown:'Não foi possível confirmar o resultado da cobrança. Não gere outra cobrança; entre em contato com a loja.',
    canceled:'Cobrança cancelada.', refused:'Pagamento recusado.', refunded:'Pagamento estornado.', chargeback:'Pagamento contestado.'
  })[order.status] || 'Consultando pagamento…';
  $('pix-result').hidden = !order.pixCode;
  if (order.pixCode) {
    window.IcedCarPresence?.stage('payment');
    $('pix-code').value = order.pixCode;
    $('pix-preparation').hidden = true;
    const paid = order.status === 'paid';
    const payable = order.status === 'pending';
    $('pix-state').classList.toggle('paid',paid);
    $('pix-state').classList.toggle('failed',!paid && !payable);
    $('pix-state').querySelector('strong').textContent = ({
      pending:'Aguardando seu pagamento', paid:'Pagamento confirmado', rejected:'Pix não gerado',
      canceled:'Cobrança cancelada', refused:'Pagamento recusado', refunded:'Pagamento estornado',
      chargeback:'Pagamento contestado', unknown:'Status em verificação'
    })[order.status] || 'Consultando pagamento';
    const pixStockNotice = $('pix-stock-notice');
    const models = [...new Set((cart?.units || []).map(unit => unit.model.trim()).filter(Boolean))];
    pixStockNotice.hidden = !payable || models.length === 0;
    if (!pixStockNotice.hidden) {
      pixStockNotice.textContent = models.length === 1
        ? `Últimas 3 unidades do modelo ${models[0]}.`
        : `Últimas 3 unidades de cada modelo escolhido: ${models.join(', ')}.`;
    }
    $('pix-qr-section').hidden = !payable;
    $('pix-qr-error').hidden = true;
    if (payable && renderedPixCode !== order.pixCode) {
      try {
        drawPixQr($('pix-qr'), order.pixCode);
        renderedPixCode = order.pixCode;
      } catch {
        $('pix-qr-section').hidden = true;
        $('pix-qr-error').hidden = false;
      }
    }
    for (const element of [$('pix-code'),$('pix-copy'),document.querySelector('.pix-help'),
      document.querySelector('label[for="pix-code"]')]) element.hidden = !payable;
  }
  $('pix-create').hidden = !['rejected','canceled','refused'].includes(order.status);
  if (['rejected','canceled','refused'].includes(order.status)) sessionStorage.removeItem(paymentIdKey);
  if (order.status === 'pending' && !paymentPoll) paymentPoll = setInterval(async () => {
    try {
      const next = await paymentRequest('status',{id:order.id,tracking:window.IcedCarTracking?.context()});
      showPayment(next);
    } catch { $('pix-status').textContent = 'Não foi possível consultar o status agora. Tente novamente em instantes.'; }
  },15000);
  if (order.status !== 'pending' && paymentPoll) {clearInterval(paymentPoll);paymentPoll = null;}
  if(order.status === 'pending' && order.pixCode && cart) {
    window.IcedCarMeta?.trackPurchase(cart,order.id,{value:order.amount/100,
      shipping_fee:chargedShipping.cents/100,shipping_method:chargedShipping.method});
  }
  window.IcedCarGoogle?.purchase(order);
  // TikTok Purchase is sent by the server after verified payment, including when this page is closed.
}
fetch('/api/payments?mode=config',{cache:'no-store',referrerPolicy:'no-referrer'}).then(response => response.json()).then(config => {
  pixEnabled = config.pix === true;
  if (!pixEnabled) {
    document.querySelector('.checkout-status').textContent = 'Pagamento Pix indisponível no momento.';
    return;
  }
  $('pix-option').disabled = false;
  $('pix-option').setAttribute('aria-pressed','true');
  $('pix-label').textContent = 'DISPONÍVEL';
  $('payment-unavailable').hidden = true;
  $('pix-panel').hidden = false;
  document.querySelector('#identity-step .intro').textContent = 'Informe seus dados para criar o pedido e gerar o Pix. Use um e-mail válido para contato sobre a entrega.';
  document.querySelector('.checkout-status').hidden = true;
  const footerStatus = [...document.querySelectorAll('footer p')].find(item => item.textContent.includes('CHECKOUT EM CONFIGURAÇÃO'));
  if (footerStatus?.lastChild) footerStatus.lastChild.textContent = 'PAGAMENTO SEGURO VIA PIX';
}).catch(() => { document.querySelector('.checkout-status').textContent = 'Não foi possível verificar o pagamento Pix agora.'; });
$('pix-option').addEventListener('click', () => { if (pixEnabled) $('pix-option').setAttribute('aria-pressed','true'); });
$('pix-create').addEventListener('click', async () => {
  if (!pixEnabled || !cart) return;
  if (!identityChecks().every(([,valid]) => valid)) {step(1);validateIdentity();return;}
  $('pix-create').disabled = true;
  $('pix-status').textContent = 'Gerando cobrança Pix…';
  const id = sessionStorage.getItem(paymentIdKey) || crypto.randomUUID();
  sessionStorage.setItem(paymentIdKey,id);
  const body = { id, cart, shipping:{method:selectedShipping().method}, tracking:{...window.IcedCarTracking?.context(),...window.IcedCarGoogle?.context()}, customer: {
    personType, name:$('customer-name').value, email:$('customer-email').value,
    document:$('customer-document').value, phone:$('customer-phone').value
  }, address: {
    zip:$('zip').value, street:$('street').value, number:$('house-number').value,
    complement:$('complement').value, neighborhood:$('neighborhood').value,
    city:$('city').value, state:$('state').value
  }};
  try {
    const order = await paymentRequest('create',body);
    showPayment(order);
  } catch (error) {
    $('pix-status').textContent = error.message === 'INVALID_CUSTOMER' || error.message === 'INVALID_ADDRESS' ?
      'Revise seus dados e endereço antes de gerar o Pix.' : 'Não foi possível confirmar a cobrança. Aguarde e tente novamente com este pedido.';
  } finally { $('pix-create').disabled = false; }
});
$('pix-copy').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText($('pix-code').value);
    const id=sessionStorage.getItem(paymentIdKey);
    if(id) void paymentRequest('copy',{id}).catch(()=>{});
    $('pix-copy-label').textContent = 'Código copiado!';
    $('pix-status').textContent = 'Código Pix copiado. Cole no aplicativo do seu banco.';
    setTimeout(() => {$('pix-copy-label').textContent = 'Copiar código Pix';},3000);
  }
  catch { $('pix-code').select();$('pix-status').textContent = 'Selecione e copie o código Pix.'; }
});

for (const link of document.querySelectorAll('footer a[href]')) {
  const href = link.getAttribute('href');
  if (href === '/' || href?.startsWith('/produtos')) link.href = trackedUrl(storefrontPath); else if (href?.startsWith('/politicas') || href?.startsWith('/rastreio')) link.href = 'https://pontofortebr.com' + href;
  if (href === '#avaliacoes' || href === '#faq') link.href = trackedUrl(storefrontPath + href);
}
document.querySelector('footer form')?.addEventListener('submit', event => {
  event.preventDefault();
  const form = event.currentTarget;
  let note = form.nextElementSibling;
  if (!note?.classList?.contains('newsletter-note')) {
    note = document.createElement('p');
    note.className = 'newsletter-note';
    note.textContent = 'Cadastro de e-mail indisponível neste checkout.';
    form.after(note);
  }
});
