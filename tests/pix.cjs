'use strict';
const assert = require('node:assert/strict');
const { createPixPayload, crc16 } = require('../lib/pix.cjs');
const check = require('./start-check.cjs');

function fields(payload) {
  const result = {};
  let offset = 0;
  while (offset < payload.length) {
    const id = payload.slice(offset, offset + 2);
    const length = Number(payload.slice(offset + 2, offset + 4));
    assert.ok(/^\d{2}$/.test(id) && length > 0);
    const value = payload.slice(offset + 4, offset + 4 + length);
    assert.equal(value.length, length);
    assert.equal(result[id], undefined);
    result[id] = value;
    offset += 4 + length;
  }
  assert.equal(offset, payload.length);
  return result;
}
// Published BCB fixture, including the independently known CRC 1D3D.
const bcbExample = '00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-4266554400005204000053039865802BR5913Fulano de Tal6008BRASILIA62070503***63041D3D';
assert.equal(crc16(bcbExample.slice(0, -4)), '1D3D');
assert.equal(crc16('123456789'), '29B1');
const keys = ['00000000-0000-0000-0000-000000000000', '12345678900', '00038166000105', '+5561912345678', 'fulano@example.test', 'a'.repeat(64) + '@example.test'];
for (const pixKey of keys) {
  for (const amountCents of [1, 10, 2500, 5079, 100000000]) {
    const payload = createPixPayload({ pixKey, beneficiary: 'João & Organização de Proteção Animal', city: 'São Gonçalo do Amarante', amountCents });
    const root = fields(payload), account = fields(root['26']);
    assert.equal(account['00'], 'br.gov.bcb.pix');
    assert.equal(account['01'], pixKey);
    assert.equal(root['54'], (amountCents / 100).toFixed(2));
    assert.equal(root['53'], '986');
    assert.equal(root['58'], 'BR');
    assert.equal(fields(root['62'])['05'], '***');
    assert.ok(root['59'].length <= 25 && root['60'].length <= 15);
    assert.match(payload, /^[\x20-\x7e]+$/);
    assert.equal(root['63'], crc16(payload.slice(0, -4)));
  }
}
for (const amountCents of [undefined, null, '2500', -1, 0, 1.1, NaN, Infinity, 100000001, Number.MAX_SAFE_INTEGER]) {
  assert.throws(() => createPixPayload({ pixKey: keys[0], amountCents }), /valor entre/);
}
for (const pixKey of ['', 'a'.repeat(78), 'ação@example.test', 'test\n@example.test']) {
  assert.throws(() => createPixPayload({ pixKey, amountCents: 2500 }), /chave não permite/);
}

check('Pix amount, destination, campaign authorization and rate limit', async () => {
  let cookie = '', pixRequests = 0;
  async function request(method, route, body, expected = 200, admin = false) {
    if (route.endsWith('/pix')) pixRequests++;
    const response = await fetch('http://127.0.0.1:3170' + route, {
      method, headers: { 'Content-Type': 'application/json', Cookie: admin ? cookie : '' },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    if (response.headers.get('set-cookie')) cookie = response.headers.get('set-cookie').split(';')[0];
    const data = await response.json();
    assert.equal(response.status, expected, route + ': ' + JSON.stringify(data));
    assert.equal(response.headers.get('x-frame-options'), 'DENY');
    assert.ok(response.headers.get('cache-control').includes('no-store'));
    return data;
  }
  await request('POST', '/api/auth/login', { email: 'admin@adotapet.com', password: 'admin123' });
  const animal = (await request('GET', '/api/animals')).find(a => a.status === 'disponivel');
  const body = { animalId: animal.id, title: 'Campanha fictícia para teste', description: 'Campanha fictícia exclusivamente para validar a geração do código Pix.',
    category: 'tratamento', organizer: 'Equipe de teste', beneficiary: 'Beneficiário de teste', contact: 'teste@example.test',
    pixKeyType: 'aleatoria', pixKey: keys[0], recipientConfirmed: true, goalCents: 250000, raisedCents: 0, status: 'draft' };
  let campaign = await request('POST', '/api/campaigns', body, 201, true);
  const route = '/api/campaigns/' + campaign.id + '/pix';
  await request('POST', route, { amountCents: 2500, revision: 1 }, 404);
  await request('POST', '/api/campaigns/999999/pix', { amountCents: 2500, revision: 1 }, 404);
  campaign = await request('PATCH', '/api/campaigns/' + campaign.id, { status: 'active', revision: 1 }, 200, true);
  const before = await request('GET', '/api/campaigns');
  for (const amountCents of [1, 2500, 5079, 100000000]) {
    const pix = await request('POST', route, { amountCents, revision: campaign.revision,
      pixKey: '11111111-1111-1111-1111-111111111111', beneficiary: 'Destino adulterado', raisedCents: 999999 });
    assert.equal(pix.amountCents, amountCents);
    assert.equal(pix.beneficiary, body.beneficiary);
    const parsed = fields(pix.payload);
    assert.equal(fields(parsed['26'])['01'], body.pixKey);
    assert.equal(parsed['54'], (amountCents / 100).toFixed(2));
  }
  assert.deepEqual(await request('GET', '/api/campaigns'), before, 'Generating Pix must not register donations or alter the campaign');
  for (const amountCents of [null, '25.00', 0, -1, 2.5, 100000001]) {
    await request('POST', route, { amountCents, revision: campaign.revision }, 400);
  }
  await request('POST', route, { amountCents: 2500, revision: 1 }, 409);
  await request('POST', route, { amountCents: 2500 }, 409);
  await request('PATCH', '/api/animals/' + animal.id, { status: 'indisponivel' }, 200, true);
  await request('POST', route, { amountCents: 2500, revision: campaign.revision }, 409);
  await request('PATCH', '/api/animals/' + animal.id, { status: 'disponivel' }, 200, true);
  campaign = await request('PATCH', '/api/campaigns/' + campaign.id, { status: 'closed', revision: campaign.revision }, 200, true);
  await request('POST', route, { amountCents: 2500, revision: campaign.revision }, 409);
  campaign = await request('PATCH', '/api/campaigns/' + campaign.id, { status: 'active', revision: campaign.revision,
    pixKey: '11111111-1111-1111-1111-111111111111', recipientConfirmed: true }, 200, true);
  await request('POST', route, { amountCents: 2500, revision: 2 }, 409);
  const changed = await request('POST', route, { amountCents: 2500, revision: campaign.revision });
  assert.equal(fields(fields(changed.payload)['26'])['01'], campaign.pixKey);
  while (pixRequests < 30) await request('POST', route, { amountCents: 2500, revision: campaign.revision });
  await request('POST', route, { amountCents: 2500, revision: campaign.revision }, 429);
  assert.equal((await fetch('http://127.0.0.1:3170/lib/pix.cjs')).status, 403);
  assert.equal((await fetch('http://127.0.0.1:3170/js/vendor/qrcode.min.js')).status, 200);
  console.log('OK — BCB checksum, five key types, amount bounds, server-owned destination, stale/closed campaigns, unchanged totals, 30-request limit.');
}).catch(error => { console.error(error); process.exitCode = 1; });
