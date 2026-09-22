const BASE = 'http://127.0.0.1:3001/api/v1';

(async () => {
  try {
    // Login as admin
    const login = await fetch(`${BASE}/auth/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@demo.local', password: 'ChangeMe123', deviceId: 'verify-cdp-001' }),
    });
    const loginBody = await login.json();
    console.log('LOGIN STATUS:', login.status);
    const token = loginBody.accessToken;
    console.log('TOKEN PRESENT:', Boolean(token));

    const headers = { Authorization: `Bearer ${token}` };

    const drivers = await fetch(`${BASE}/drivers`, { headers });
    const driversBody = await drivers.json();
    console.log('\n--- GET /drivers ---');
    console.log('STATUS:', drivers.status);
    console.log(JSON.stringify(driversBody, null, 2));

    const vehicles = await fetch(`${BASE}/vehicles`, { headers });
    const vehiclesBody = await vehicles.json();
    console.log('\n--- GET /vehicles ---');
    console.log('STATUS:', vehicles.status);
    console.log(JSON.stringify(vehiclesBody, null, 2));
  } catch (e) {
    console.error('ERR', e.message);
  }
})();