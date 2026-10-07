import './meta-tracking.js';
import './presence-tracking.js';
import { offerForVariant, pricingForCart, variantFromPath } from './pricing.js';

const checkoutStorageKey = 'ponto-forte-checkout-v1';
const variant = variantFromPath(location.pathname);
const productPage = '/'+variant;
const trackedUrl = path => window.IcedCarTracking?.url(path) || path;
const homeLink = document.querySelector('header a[aria-label="IcedCar — Início"]');
if (homeLink) homeLink.href = trackedUrl(productPage);
const offer = offerForVariant(variant);
window.IcedCarGoogle?.viewItem(offer.singleCents/100,variant);
const money = cents => new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(cents / 100);
window.IcedCarTracking?.track('ViewContent', {version:2,variant,quantity:1,units:[{}]}, crypto.randomUUID());
const byText = (selector, value) => [...document.querySelectorAll(selector)].find(node => node.textContent.trim() === value);
const css = document.createElement('style');
css.textContent = `
  .mirror-field{display:block;margin-top:16px;font-size:14px;font-weight:600;color:#202428}
  .mirror-field select,.mirror-field input{display:block;width:100%;height:44px;margin-top:7px;padding:0 12px;border:1px solid #dedede;border-radius:7px;background:#fff;color:#202428;font:inherit}
  .mirror-field input:focus,.mirror-field select:focus{outline:2px solid #b65d32;outline-offset:1px}
  .mirror-plate-preview{margin:14px 0 4px;padding:18px 16px 12px;border:1px solid #ece5df;border-radius:12px;background:linear-gradient(135deg,#faf8f5,#fff);text-align:center}
  .mirror-plate-preview svg{display:block;width:min(100%,340px);height:auto;margin:auto;filter:drop-shadow(0 5px 5px #0002)}
  .mirror-plate-preview figcaption{margin-top:12px;font-size:12px;font-weight:400;color:#747474;line-height:1.5}
  .mirror-color-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px;margin-top:8px}
  .mirror-color-grid button{display:flex;align-items:center;gap:7px;min-width:0;border:1px solid #dedede;border-radius:10px;padding:9px 8px;font-size:12px;font-weight:500;background:#fff;color:#25282a;text-align:left}
  .mirror-color-grid button[aria-pressed=true]{border-color:#b65d32!important;background:#fff6f0!important;color:#b65d32!important}
  .mirror-color-swatch{display:inline-block;width:17px;height:17px;flex:0 0 17px;border-radius:50%;border:1px solid #bfc3c5}
  .mirror-selected{border-color:#202428!important;background:#f2f2f2!important;color:#202428!important}
  @media(max-width:640px){.mirror-color-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}
  .mirror-pack[data-selected=true]{border-color:hsl(var(--store-blue))!important;box-shadow:0 0 0 1px hsl(var(--store-blue))!important;background:#f7f9fc!important}
  .mirror-pack[data-selected=false]{border-color:#e6e6e6!important;box-shadow:none!important;background:#fff!important}
  .mirror-pack[data-selected=true] .mirror-pack-radio{border-color:hsl(var(--store-blue))!important}
  .mirror-pack[data-selected=false] .mirror-pack-radio{border-color:#dcdcdc!important}
  .mirror-pack .mirror-pack-name-row{flex-wrap:wrap}
  .mirror-pack .mirror-pack-name{white-space:normal;overflow-wrap:anywhere;line-height:1.2}
  .mirror-checkout-note{margin-top:12px;padding:12px;border-radius:8px;background:#fff5ef;color:#65402e;font-size:13px;line-height:1.45}
  .mirror-dialog{position:fixed;inset:0;z-index:1000;display:grid;place-items:center;padding:20px;background:#0009}
  .mirror-dialog[hidden]{display:none}
  .mirror-dialog-inner{width:min(100%,420px);border-radius:18px;background:#fff;padding:24px;box-shadow:0 18px 50px #0003}
  .mirror-dialog-inner h2{font-size:22px;font-weight:750;margin:0 0 12px}
  .mirror-dialog-inner p{font-size:15px;line-height:1.5;margin:0 0 16px}
  .mirror-dialog-inner a{display:block;text-align:center;border-radius:99px;padding:14px;background:#b65d32;color:#fff;font-weight:700;text-decoration:none}
  .mirror-dialog-inner button{display:block;width:100%;margin-top:10px;padding:10px;border:0;background:none}
  .mirror-menu{position:fixed;inset:0;z-index:1001;background:#000b}
  .mirror-menu[hidden]{display:none}
  .mirror-menu-panel{height:100%;width:min(87vw,360px);background:#fff;padding:14px 8px}
  .mirror-menu-head{display:flex;align-items:center;justify-content:space-between;padding:3px 12px 15px;border-bottom:1px solid #eee}
  .mirror-menu-head img{width:72px;height:auto}
  .mirror-menu-head button{font-size:24px;border:1px solid #888;border-radius:50%;width:26px;height:26px;line-height:21px;color:#777}
  .mirror-menu nav{padding-top:12px}
  .mirror-menu nav a{display:block;padding:14px 16px;font-weight:600;color:#222;border-radius:14px;text-decoration:none}
  .mirror-menu nav a:first-child{background:#f5f5f5}
`;
document.head.append(css);

// The original carousel renders later slides through React. Restore them from its own thumbnails.
const thumbButtons = [...document.querySelectorAll('button')].filter(button => button.querySelector('img[src^="/media/"]') && button.className.includes('h-20 w-20'));
if (thumbButtons.length) {
  const carousel = document.querySelector('img[src="/media/icedcar-main.png"]')?.parentElement?.parentElement;
  if (carousel?.children.length >= thumbButtons.length) {
    const slides = [...carousel.children];
    const dots = carousel.nextElementSibling?.children || [];
    thumbButtons.forEach((button, index) => {
      const img = button.querySelector('img');
      if (!slides[index].querySelector('img')) {
        const full = img.cloneNode(true);
        full.removeAttribute('width'); full.removeAttribute('height');
        full.className = 'h-full w-full object-cover';
        slides[index].append(full);
      }
      button.addEventListener('click', () => carousel.scrollTo({ left: carousel.clientWidth * index, behavior: 'smooth' }));
    });
    carousel.addEventListener('scroll', () => {
      const selected = Math.round(carousel.scrollLeft / carousel.clientWidth);
      thumbButtons.forEach((button, index) => {
        button.classList.toggle('border-foreground', selected === index);
        button.classList.toggle('border-border', selected !== index);
        if (dots[index]) dots[index].className = `h-1.5 rounded-full transition-all duration-300 ${selected === index ? 'bg-white w-4' : 'bg-white/40 w-1.5'}`;
      });
    }, { passive: true });
  }
}

const answers = new Map([
  ['Informações do envio', 'Escolha no checkout: PAC grátis em 7 a 12 dias úteis ou SEDEX por R$ 24,90 em 3 a 5 dias úteis. Você receberá o código de rastreio por e-mail.'],
  ['Trocas e devoluções', 'Você tem até 7 dias após o recebimento para solicitar troca ou devolução, conforme o Código de Defesa do Consumidor. Produto deve estar sem uso e na embalagem original.'],
  ['Qual o prazo de entrega dos pedidos?', 'O PAC grátis leva de 7 a 12 dias úteis. O SEDEX custa R$ 24,90 e leva de 3 a 5 dias úteis. Escolha o frete no checkout.'],
  ['Vocês entregam em todo o Brasil?', 'Sim! Enviamos para todo o Brasil. As opções de frete e os prazos aparecem no checkout.'],
  ['Como acompanho meu pedido?', 'Assim que o pedido é despachado, enviamos o código de rastreio no seu e-mail. Você também pode acompanhar na página Rastrear meu pedido.'],
  ['Quais formas de pagamento são aceitas?', 'Esta loja aceita apenas Pix. O código para pagamento é gerado no checkout após a confirmação dos dados do pedido.'],
  ['A compra é segura?', 'O checkout valida os dados do pedido e gera a cobrança Pix pela Kirvus Pay. Confira o valor e os dados no aplicativo do seu banco antes de pagar.'],
  ['Os produtos são originais e têm garantia?', 'Sim. Todos os itens passam por conferência de qualidade e contam com garantia de satisfação após o recebimento.'],
  ['Posso trocar ou devolver o produto?', 'Pode. Você tem até 7 dias corridos após o recebimento para solicitar troca ou devolução, conforme o Código de Defesa do Consumidor.'],
  ['Vocês oferecem cupom de desconto?', 'Não há cupom ativo neste checkout.'],
  ['Como falo com o atendimento?', 'Nosso atendimento responde de segunda a sábado, das 10h às 19h.']
]);
for (const button of document.querySelectorAll('button[data-orientation="vertical"]')) {
  const question = button.querySelector('span')?.textContent.trim();
  if (!answers.has(question)) continue;
  const region = button.parentElement.nextElementSibling;
  if (!region) continue;
  region.innerHTML = `<div class="pb-4 text-[15px] leading-[1.6] text-muted-foreground"></div>`;
  region.firstElementChild.textContent = answers.get(question);
  button.addEventListener('click', () => {
    const open = button.getAttribute('aria-expanded') !== 'true';
    button.setAttribute('aria-expanded', String(open));
    button.setAttribute('data-state', open ? 'open' : 'closed');
    button.parentElement.setAttribute('data-state', open ? 'open' : 'closed');
    region.setAttribute('data-state', open ? 'open' : 'closed');
    region.hidden = !open;
    const mark = button.querySelector('span[aria-hidden="true"]');
    if (mark) mark.textContent = open ? '−' : '+';
  });
}

fetch('/api/payments?mode=config',{cache:'no-store',referrerPolicy:'no-referrer'}).then(response=>response.json()).then(config=>{
  if (config.pix !== true) return;
  const updated = new Map([
    ['Quais formas de pagamento são aceitas?', 'Aceitamos pagamento exclusivamente por Pix pela Kirvus Pay.'],
    ['A compra é segura?', 'O Pix é gerado pela Kirvus Pay. O valor da compra é conferido no servidor e a confirmação é verificada antes de marcar o pedido como pago.']
  ]);
  for (const button of document.querySelectorAll('button[data-orientation="vertical"]')) {
    const question = button.querySelector('span')?.textContent.trim();
    if (updated.has(question)) button.parentElement.nextElementSibling?.firstElementChild?.replaceChildren(updated.get(question));
  }
  const walker = document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (node.textContent.includes('CHECKOUT EM PREPARAÇÃO')) node.textContent = node.textContent.replace('CHECKOUT EM PREPARAÇÃO','PIX DISPONÍVEL');
    if (node.textContent.includes('Pagamento ainda não disponível.')) node.textContent = node.textContent.replace('Pagamento ainda não disponível.','Pagamento Pix disponível.');
    if (node.textContent.includes('Checkout em preparação')) node.textContent = node.textContent.replace('Checkout em preparação','Checkout Pix disponível');
  }
}).catch(()=>{});

const productVideo = document.querySelector('video[data-src]');
if (productVideo) {
  productVideo.src = productVideo.dataset.src;
  productVideo.muted = true;
  new IntersectionObserver(([entry], observer) => {
    if (!entry.isIntersecting) return;
    productVideo.play().catch(() => {});
    observer.disconnect();
  }).observe(productVideo);
}
const giftPlay = document.querySelector('button[aria-label="Reproduzir vídeo"]');
if (giftPlay) giftPlay.addEventListener('click', () => {
  const video = giftPlay.parentElement.querySelector('video');
  video.src = '/media/store/gift-section-fdea47ba-92dc-40cf-8691-7f7138d02934.mp4';
  video.controls = true;
  giftPlay.hidden = true;
  video.play().catch(() => {});
});

const section = document.querySelector('section[aria-label="Personalize seu IcedCar"]');
const secondSectionTemplate = section?.cloneNode(true);
const customizers = [];
let catalog = {};
fetch('/vehicles.json').then(response => response.json()).then(data => {
  catalog = data;
  customizers.forEach(customizer => customizer.renderFields());
}).catch(() => {});

function setupCustomizer(formSection) {
  if (!formSection) return null;
  const state = { side: '', category: '', brand: '', model: '', year: '', color: '', plate: '', manual: false };
  const selectors = formSection.querySelectorAll('div.grid');
  const fields = document.createElement('div');
  fields.className = 'mirror-fields';
  formSection.querySelector('.space-y-5')?.append(fields);

  function selectGroup(group, value) {
    for (const button of group.querySelectorAll('button')) {
      const selected = button.textContent.trim() === value;
      button.setAttribute('aria-pressed', String(selected));
      button.classList.toggle('mirror-selected', selected);
    }
  }
  selectors[0]?.addEventListener('click', event => {
    const button = event.target.closest('button'); if (!button) return;
    state.side = button.textContent.trim(); selectGroup(selectors[0], state.side);
  });
  selectors[1]?.addEventListener('click', event => {
    const button = event.target.closest('button'); if (!button) return;
    state.category = ({ Picape:'pickup', SUV:'suv', Sedã:'sedan', Hatch:'hatch', 'Esportivo / Coupé':'sports_coupe', Conversível:'convertible' })[button.textContent.trim()];
    state.brand = state.model = state.year = state.color = state.plate = '';
    selectGroup(selectors[1], button.textContent.trim()); renderFields();
  });
  const manualButton = [...formSection.querySelectorAll('button')].find(button => button.textContent.trim() === 'Não encontrou seu carro? Informe manualmente →');
  manualButton?.addEventListener('click', () => {
    state.manual = !state.manual;
    manualButton.textContent = state.manual ? 'Voltar à busca de veículos →' : 'Não encontrou seu carro? Informe manualmente →';
    renderFields();
  });

  function field(label, name, values, placeholder) {
    const wrapper = document.createElement('label'); wrapper.className = 'mirror-field'; wrapper.textContent = label;
    const input = values ? document.createElement('select') : document.createElement('input');
    input.name = name;
    if (values) {
      input.append(new Option(placeholder, ''));
      values.forEach(value => input.append(new Option(value, value)));
    } else input.placeholder = placeholder;
    input.value = state[name] || '';
    if (!values && (name === 'brand' || name === 'model' || name === 'plate')) input.addEventListener('input', () => {
      state[name] = input.value;
      if (name !== 'plate') updatePackLabels();
    });
    input.addEventListener('change', () => {
      state[name] = input.value;
      if (name === 'brand') state.model = state.year = state.color = '';
      if (name === 'model') state.year = state.color = '';
      renderFields();
    });
    wrapper.append(input); fields.append(wrapper);
    if (name === 'plate') {
      const preview = document.createElement('figure'); preview.className = 'mirror-plate-preview';
      preview.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 142" role="img" aria-label="Prévia da sua placa personalizada">
        <rect x="3" y="3" width="414" height="136" rx="12" fill="#dadcdd" stroke="#73787c" stroke-width="2"/>
        <rect x="8" y="8" width="404" height="126" rx="8" fill="#fff" stroke="#adb0b2"/>
        <path d="M16 8H404Q412 8 412 16V39H8V16Q8 8 16 8" fill="#202528"/>
        <text x="210" y="29" text-anchor="middle" fill="#fff" font-family="Arial,sans-serif" font-size="16" font-weight="700" letter-spacing="5">ICED<tspan fill="#ff681f">CAR</tspan></text>
        <circle cx="27" cy="24" r="4" fill="#aab0b3"/><circle cx="393" cy="24" r="4" fill="#aab0b3"/>
        <path d="M24 24h6m360 0h6" stroke="#52585b" stroke-width="1.5"/>
        <text data-plate-name x="210" y="100" text-anchor="middle" fill="#202528" font-family="Impact,Arial Narrow,Arial,sans-serif" font-size="49" font-weight="900" letter-spacing="2"></text>
        <path d="M24 121H396" stroke="#e4e4e4"/>
      </svg><figcaption>Prévia da sua personalização · o nome aparece enquanto você digita.</figcaption>`;
      const plateName = preview.querySelector('[data-plate-name]');
      const updatePreview = () => {
        const text = input.value.trim().toLocaleUpperCase('pt-BR') || 'SEU NOME';
        plateName.textContent = text;
        plateName.setAttribute('font-size', String(Math.min(49, 520 / Math.max(text.length, 1))));
        if (text.length > 18) { plateName.setAttribute('textLength','355'); plateName.setAttribute('lengthAdjust','spacingAndGlyphs'); }
        else { plateName.removeAttribute('textLength'); plateName.removeAttribute('lengthAdjust'); }
      };
      input.addEventListener('input', updatePreview); updatePreview(); fields.append(preview);
    }
  }
  function renderFields() {
    fields.replaceChildren();
    updatePackLabels();
    if (!state.category) return;
    const brands = Object.keys(catalog[state.category] || {}).sort((a,b) => a.localeCompare(b, 'pt-BR'));
    field('Marca', 'brand', state.manual ? null : brands, state.manual ? 'Digite a marca' : 'Selecione ou busque sua marca');
    if (state.brand || state.manual) field('Modelo', 'model', state.manual ? null : (catalog[state.category]?.[state.brand] || []), state.manual ? 'Digite o modelo' : 'Selecione ou busque seu modelo');
    if (state.model) field('Ano', 'year', Array.from({length:37}, (_, i) => String(2026-i)), 'Selecione o ano');
    if (state.year) {
      const label = document.createElement('p'); label.className = 'mirror-field'; label.textContent = 'Qual a cor do seu carro?'; fields.append(label);
      const grid = document.createElement('div'); grid.className = 'mirror-color-grid'; grid.setAttribute('aria-label', 'Cor do carro');
      const swatches = {Branco:'#fff',Preto:'#1e2225',Prata:'#b8bec2',Cinza:'#737a80',Azul:'#2d528a',Vermelho:'#b42d29',Verde:'#347752',Bege:'#ccbea9',Marrom:'#694833'};
      for (const [color, hex] of Object.entries(swatches)) {
        const button = document.createElement('button'); button.type = 'button'; button.setAttribute('aria-label', color); button.setAttribute('aria-pressed', String(state.color === color));
        const swatch = document.createElement('span'); swatch.className = 'mirror-color-swatch'; swatch.style.backgroundColor = hex; swatch.setAttribute('aria-hidden','true');
        const name = document.createElement('span'); name.textContent = color; button.append(swatch,name);
        button.addEventListener('click', () => { state.color = color; renderFields(); }); grid.append(button);
      }
      fields.append(grid);
    }
    if (state.color) {
      const summary = document.createElement('p'); summary.className = 'mirror-field'; summary.textContent = `SEU ICEDCAR ${state.brand.toUpperCase()} ${state.model} · ${state.year} · ${state.color} ${state.side}`; fields.append(summary);
      field('Personalize sua placa', 'plate', null, 'Digite o nome que você quer na placa.');
    }
  }
  const customizer = { state, renderFields };
  customizers.push(customizer);
  return customizer;
}
setupCustomizer(section);

const packButtons = [...document.querySelectorAll('button')].filter(button => /^[12] Unidade(?:s)? IcedCar/.test(button.textContent.trim()));
const savingsNote = [...document.querySelectorAll('p')].find(item => item.textContent.includes('Você economiza') && item.textContent.includes('nesta compra'));
if (packButtons.length === 2) {
  const firstPrice = packButtons[0].querySelector('.shrink-0.text-right > div');
  const secondPrices = packButtons[1].querySelectorAll('.shrink-0.text-right > div');
  const discount = [...packButtons[1].querySelectorAll('div')].find(element => element.classList.contains('mt-0.5'));
  if (firstPrice) firstPrice.textContent = money(offer.singleCents);
  if (secondPrices[0]) secondPrices[0].textContent = money(offer.doubleCents);
  if (secondPrices[1]) secondPrices[1].textContent = money(offer.compareCents);
  if (discount) discount.textContent = `${offer.discountPercent}% OFF — economize ${money(offer.savingsCents)}`;
}
function vehicleName(state) {
  const brand = state?.brand?.trim();
  const model = state?.model?.trim();
  return brand && model ? `${brand} ${model}` : '';
}
function updatePackLabels() {
  if (packButtons.length !== 2) return;
  const first = vehicleName(customizers[0]?.state);
  const second = vehicleName(customizers[1]?.state);
  const names = [
    `1 Unidade IcedCar (${first || 'Escolha o modelo'})`,
    first || second
      ? `2 Unidades IcedCar (${first || 'Escolha o 1º modelo'} + ${second || 'Escolha o 2º modelo'})`
      : '2 Unidades IcedCar (Escolha os modelos)'
  ];
  packButtons.forEach((button, index) => {
    const label = button.querySelector('.min-w-0 > .flex > span');
    if (!label) return;
    label.parentElement.classList.add('mirror-pack-name-row');
    label.classList.add('mirror-pack-name');
    label.textContent = names[index];
  });
}
let secondUnit;
let selectedPack = 1;
function selectPack(pack) {
  selectedPack = pack;
  packButtons.forEach((button, index) => {
    const selected = index + 1 === pack;
    button.classList.add('mirror-pack');
    button.dataset.selected = String(selected);
    button.setAttribute('aria-pressed', String(selected));
    const radio = button.firstElementChild?.firstElementChild;
    if (radio) {
      radio.classList.add('mirror-pack-radio');
      radio.replaceChildren();
      if (selected) {
        const dot = document.createElement('div');
        dot.className = 'h-[9px] w-[9px] rounded-full bg-[hsl(var(--store-blue))]';
        radio.append(dot);
      }
    }
  });
  if (pack === 2 && !secondUnit && secondSectionTemplate) {
    secondUnit = document.createElement('div');
    secondUnit.className = 'mt-4 border-t border-border pt-1';
    secondUnit.innerHTML = '<div class="mt-3 flex items-center justify-between gap-3"><p class="min-w-0 break-words text-sm font-semibold text-foreground">Unidade 2 · escolha outro carro</p></div>';
    secondUnit.append(secondSectionTemplate);
    packButtons[1].parentElement.parentElement.after(secondUnit);
    setupCustomizer(secondSectionTemplate);
    updatePackLabels();
  }
  if (secondUnit) secondUnit.hidden = pack !== 2;
  if (savingsNote) {
    savingsNote.parentElement.hidden = pack !== 2;
    savingsNote.textContent = `Você economiza ${money(offer.savingsCents)} nesta compra`;
  }
}
packButtons.forEach((button, index) => button.addEventListener('click', () => selectPack(index + 1)));
if (packButtons.length === 2) selectPack(1);
byText('button', '661 avaliações')?.addEventListener('click', () => document.querySelector('#avaliacoes')?.scrollIntoView({behavior:'smooth'}));

function goToCheckout() {
  document.querySelector('.mirror-checkout-note')?.remove();
  const required = ['side', 'category', 'brand', 'model', 'year', 'color', 'plate'];
  const selected = customizers.slice(0, selectedPack);
  const incomplete = selected.findIndex(({state}) => required.some(key => !String(state[key] || '').trim()));
  if (incomplete !== -1) {
    const form = incomplete === 0 ? section : secondSectionTemplate;
    const note = document.createElement('p');
    note.className = 'mirror-checkout-note';
    note.setAttribute('role', 'alert');
    note.textContent = `Complete a personalização da unidade ${incomplete + 1}: frente ou traseira, tipo, marca, modelo, ano, cor e nome na placa.`;
    form?.append(note);
    form?.scrollIntoView({behavior:'smooth', block:'center'});
    return;
  }
  const units = selected.map(({state}) => Object.fromEntries(required.map(key => [key, String(state[key]).trim().slice(0, 80)])));
  try {
    const cart = {version:2,variant,quantity:selectedPack,units};
    if (sessionStorage.getItem(checkoutStorageKey) !== JSON.stringify(cart)) {
      sessionStorage.removeItem('ponto-forte-payment-id-v1');
      sessionStorage.removeItem(`ponto-forte-shipping-v1-${variant}`);
    }
    sessionStorage.setItem(checkoutStorageKey, JSON.stringify(cart));
    window.IcedCarTracking?.track('AddToCart', cart, crypto.randomUUID());
    window.location.assign(trackedUrl(`/checkout?offer=${variant}`));
  } catch {
    const note = document.createElement('p');
    note.className = 'mirror-checkout-note';
    note.setAttribute('role', 'alert');
    note.textContent = 'Não foi possível iniciar o checkout neste navegador. Habilite o armazenamento da sessão e tente novamente.';
    section?.append(note);
  }
}
for (const name of ['Comprar agora', 'Adicionar ao carrinho']) byText('button', name)?.addEventListener('click', goToCheckout);
document.querySelector('button[aria-label="Abrir carrinho"]')?.addEventListener('click', () => {
  let savedCart;
  try { savedCart = JSON.parse(sessionStorage.getItem(checkoutStorageKey) || 'null'); } catch {}
  if (savedCart?.variant === variant && pricingForCart(savedCart))
    window.location.assign(trackedUrl(`/checkout?offer=${variant}`));
  else section?.scrollIntoView({behavior:'smooth'});
});

const menu = document.createElement('div'); menu.className = 'mirror-menu'; menu.hidden = true;
menu.innerHTML = `<div class="mirror-menu-panel" role="dialog" aria-modal="true" aria-label="Menu"><div class="mirror-menu-head"><img src="/brand/icedcar-logo.svg" alt="IcedCar"><button type="button" aria-label="Fechar menu">×</button></div><nav><a href="${trackedUrl(productPage)}">Início</a><a href="${trackedUrl(productPage+'#avaliacoes')}">Avaliações</a><a href="${trackedUrl('/2')}">Oferta 2</a><a href="https://pontofortebr.com/rastreio">Rastrear meu pedido</a></nav></div>`;
document.body.append(menu);
document.querySelector('button[aria-label="Abrir menu"]')?.addEventListener('click', () => menu.hidden = false);
menu.querySelector('button').addEventListener('click', () => menu.hidden = true);
menu.addEventListener('click', event => { if (event.target === menu) menu.hidden = true; });

for (const button of document.querySelectorAll('button')) if (button.textContent.trim() === 'Mostrar mais' || button.textContent.trim() === 'Escrever minha avaliação') {
  button.addEventListener('click', () => { window.location.href = trackedUrl(`${productPage}#avaliacoes`); });
}

// Routes outside the requested product page stay on the live shop until their backend is migrated.
for (const link of document.querySelectorAll('a[href]')) {
  const href = link.getAttribute('href');
  if (href === '/' || href === '/produtos') link.href = trackedUrl(productPage); else if (href.startsWith('/politicas') || href.startsWith('/rastreio')) link.href = 'https://pontofortebr.com' + href;
}
const newsletter = document.querySelector('footer form');
newsletter?.addEventListener('submit', event => {
  event.preventDefault();
  let note = newsletter.nextElementSibling;
  if (!note?.classList?.contains('newsletter-note')) {
    note = document.createElement('p');
    note.className = 'newsletter-note';
    note.textContent = 'Cadastro de e-mail indisponível nesta loja.';
    newsletter.after(note);
  }
});
