// Consulta se o Pix foi pago.
const BASE = 'https://api.tribopay.com.br/api/public/v1';
const json = (code, obj) => ({ statusCode: code, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(obj) });
exports.handler = async (event) => {
  const hash = (event.queryStringParameters || {}).hash, token = process.env.TRIBOPAY_API_TOKEN;
  if (!hash || !token) return json(400, { paid: false });
  try {
    const res = await fetch(BASE + '/transactions/' + encodeURIComponent(hash) + '?api_token=' + encodeURIComponent(token), { headers: { Accept: 'application/json' } });
    const d = await res.json().catch(() => ({})), x = d.data || d;
    const status = String(x.payment_status || x.status || '').toLowerCase();
    return json(200, { paid: ['paid', 'approved'].indexOf(status) !== -1, status });
  } catch (e) { return json(200, { paid: false }); }
};
