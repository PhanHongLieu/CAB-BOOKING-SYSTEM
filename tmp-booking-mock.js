const http = require('http');
const customerId = '69a2896bf08db9cc6d089833';
const driverId = '69a289b80d82feb8bf64bb43';
const server = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url.startsWith('/api/bookings/')) {
    const bookingId = req.url.split('/').pop();
    const body = { success: true, data: { _id: bookingId, customerId, driverId, status: 'completed' } };
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(body));
  }
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ success: false, error: 'Not Found' }));
});
server.listen(3002, () => console.log('mock booking up'));
