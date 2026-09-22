(async () => {
  const res = await fetch('http://127.0.0.1:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@demo.local', password: 'ChangeMe123', deviceId: 'cdp-test-x' }),
  });
  const text = await res.text();
  console.log('STATUS', res.status);
  console.log('BODY', text.slice(0, 600));
})();