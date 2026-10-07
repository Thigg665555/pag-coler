// Cria a cobrança Pix na TriboPay. O valor é recalculado aqui (não confie no navegador).
const BASE = 'https://api.tribopay.com.br/api/public/v1';
const UNIT_PRICE = { 1: 9700, 2: 12900 };   // centavos: "1 Unidade" = R$ 97,00 | "2 Unidades" = R$ 129,00
const SHIPPING = { pac: 0, sedex: 2490 };
const COUPONS = { OFERTA10: 0.10 };          // mantenha igual ao checkout.js
const json = (code, obj) => ({ statusCode: code, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(obj) });
const digits = v => String(v || '').replace(/\D/g, '');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Método não permitido' });
  const token = process.env.TRIBOPAY_API_TOKEN, offer = process.env.TRIBOPAY_OFFER_HASH, product = process.env.TRIBOPAY_PRODUCT_HASH;
  if (!token || !offer || !product) return json(500, { error: 'Pagamento não configurado' });

  let o; try { o = JSON.parse(event.body || '{}'); } catch (e) { return json(400, { error: 'Pedido inválido' }); }
  const c = o.customer || {}, a = o.address || {};
  if (!Array.isArray(o.items) || !o.items.length || !c.name || !c.email || !c.document || !c.phone || !a.zip || !a.street) return json(400, { error: 'Dados incompletos' });

  let sub = 0, units = 0;
  o.items.forEach(i => {
    const q = Math.min(10, Math.max(1, parseInt(i.qty, 10) || 1)), pack = /^2 Unidades/i.test(i.name) ? 2 : 1;
    sub += UNIT_PRICE[pack] * q; units += pack * q;
  });
  const disc = Math.round(sub * (COUPONS[String(o.coupon || '').toUpperCase()] || 0));
  const ship = SHIPPING[(o.shipping || {}).method] || 0;
  const total = sub + ship - disc;

  const t = o.tracking || {};
  const body = {
    amount: total, offer_hash: offer, payment_method: 'pix', installments: 1, expire_in_days: 1,
    customer: {
      name: c.name, email: c.email, phone_number: digits(c.phone), document: digits(c.document),
      street_name: a.street, number: a.number, complement: a.complement || '', neighborhood: a.neighborhood,
      city: a.city, state: a.state, zip_code: digits(a.zip)
    },
    cart: [{ product_hash: product, title: units + ' IcedCar personalizado' + (units > 1 ? 's' : ''), price: total, quantity: 1, operation_type: 1, tangible: true }],
    tracking: { src: t.src || '', utm_source: t.utm_source || '', utm_medium: t.utm_medium || '', utm_campaign: t.utm_campaign || '', utm_content: t.utm_content || '', utm_term: t.utm_term || '' }
  };
  if (process.env.TRIBOPAY_POSTBACK_URL) body.postback_url = process.env.TRIBOPAY_POSTBACK_URL;

  try {
    const res = await fetch(BASE + '/transactions?api_token=' + encodeURIComponent(token), {
      method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(body)
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) { console.error('TriboPay erro', res.status, JSON.stringify(d)); return json(502, { error: 'Falha ao gerar o Pix' }); }
    const x = d.data || d, pix = x.pix || d.pix || {};
    const code = pix.pix_qr_code || pix.qr_code || x.pix_qr_code || x.qr_code || '';
    const hash = x.hash || x.transaction_hash || d.hash || d.transaction_hash || '';
    if (!code) { console.error('TriboPay sem código Pix', JSON.stringify(d)); return json(502, { error: 'Pix sem código' }); }
    return json(200, { hash, code });
  } catch (e) { console.error(e); return json(502, { error: 'Falha ao gerar o Pix' }); }
};
