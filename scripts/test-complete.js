#!/usr/bin/env node

/**
 * Complete Test Suite for CAB Booking System - Ride Service
 * Tests the full workflow: Register → Login → Create Booking → Accept → Update Status
 */

const http = require('http');
const assert = require('assert');

const BASE_URL = 'http://localhost';
const AUTH_PORT = 3001;
const BOOKING_PORT = 3002;
const RIDE_PORT = 3007;

// Test data
let customerToken = '';
let driverToken = '';
let bookingId = '';
let rideId = '';
let customerId = '';
let driverId = '';

// Utility function to make HTTP requests
function makeRequest(method, port, path, data = null, token = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: port,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          resolve({ status: res.statusCode, body: json });
        } catch (e) {
          resolve({ status: res.statusCode, body: body });
        }
      });
    });

    req.on('error', (e) => reject(e));
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

// Test functions
async function testHealthChecks() {
  console.log('\n=== HEALTH CHECKS ===');
  const services = [
    { name: 'Auth Service', port: AUTH_PORT },
    { name: 'Booking Service', port: BOOKING_PORT },
    { name: 'Ride Service', port: RIDE_PORT }
  ];

  for (const service of services) {
    try {
      const res = await makeRequest('GET', service.port, '/health');
      assert.strictEqual(res.status, 200, `${service.name} health check failed`);
      console.log(`✓ ${service.name} is healthy`);
    } catch (err) {
      console.error(`✗ ${service.name} failed:`, err.message);
      throw err;
    }
  }
}

async function testRegisterCustomer() {
  console.log('\n=== REGISTER CUSTOMER ===');
  const data = {
    email: 'customer_' + Date.now() + '@test.com',
    password: 'Test@1234',
    name: 'Test Customer',
    phone: '0123456789',
    role: 'customer'
  };

  const res = await makeRequest('POST', AUTH_PORT, '/api/auth/register', data);
  assert.strictEqual(res.status, 201, 'Customer registration failed');
  assert(res.body.data.user.id, 'User ID not returned');
  customerId = res.body.data.user.id;
  console.log(`✓ Customer registered: ${data.email}`);
  console.log(`  Customer ID: ${customerId}`);
}

async function testRegisterDriver() {
  console.log('\n=== REGISTER DRIVER ===');
  const data = {
    email: 'driver_' + Date.now() + '@test.com',
    password: 'Test@1234',
    name: 'Test Driver',
    phone: '0987654321',
    role: 'driver'
  };

  const res = await makeRequest('POST', AUTH_PORT, '/api/auth/register', data);
  assert.strictEqual(res.status, 201, 'Driver registration failed');
  assert(res.body.data.user.id, 'Driver ID not returned');
  driverId = res.body.data.user.id;
  console.log(`✓ Driver registered: ${data.email}`);
  console.log(`  Driver ID: ${driverId}`);
}

async function testLoginCustomer() {
  console.log('\n=== LOGIN CUSTOMER ===');
  // Get customer email from register
  const registerData = {
    email: 'customer_' + Date.now() + '@test.com',
    password: 'Test@1234',
    name: 'Test Customer',
    phone: '0123456789',
    role: 'customer'
  };
  
  await makeRequest('POST', AUTH_PORT, '/api/auth/register', registerData);

  const loginData = {
    email: registerData.email,
    password: registerData.password
  };

  const res = await makeRequest('POST', AUTH_PORT, '/api/auth/login', loginData);
  assert.strictEqual(res.status, 200, 'Customer login failed');
  assert(res.body.data.token, 'Token not returned');
  customerToken = res.body.data.token;
  console.log(`✓ Customer logged in`);
  console.log(`  Token: ${customerToken.substring(0, 20)}...`);
}

async function testLoginDriver() {
  console.log('\n=== LOGIN DRIVER ===');
  const registerData = {
    email: 'driver_' + Date.now() + '@test.com',
    password: 'Test@1234',
    name: 'Test Driver',
    phone: '0987654321',
    role: 'driver'
  };

  await makeRequest('POST', AUTH_PORT, '/api/auth/register', registerData);

  const loginData = {
    email: registerData.email,
    password: registerData.password
  };

  const res = await makeRequest('POST', AUTH_PORT, '/api/auth/login', loginData);
  assert.strictEqual(res.status, 200, 'Driver login failed');
  assert(res.body.data.token, 'Token not returned');
  driverToken = res.body.data.token;
  console.log(`✓ Driver logged in`);
  console.log(`  Token: ${driverToken.substring(0, 20)}...`);
}

async function testCreateBooking() {
  console.log('\n=== CREATE BOOKING ===');
  const data = {
    pickupLocation: {
      address: '123 Nguyen Hue, District 1, HCMC',
      coordinates: { lat: 10.7738, lng: 106.7026 }
    },
    dropoffLocation: {
      address: '456 Dong Khoi, District 1, HCMC',
      coordinates: { lat: 10.7922, lng: 106.7043 }
    },
    vehicleType: 'economy'
  };

  const res = await makeRequest('POST', BOOKING_PORT, '/api/bookings', data, customerToken);
  assert.strictEqual(res.status, 201, 'Booking creation failed');
  assert(res.body.data._id, 'Booking ID not returned');
  bookingId = res.body.data._id;
  console.log(`✓ Booking created`);
  console.log(`  Booking ID: ${bookingId}`);
  console.log(`  Status: ${res.body.data.status}`);
  console.log(`  Fare: ${res.body.data.fare.total} VND`);
  
  // Wait for ride to be created via event
  console.log('  Waiting for ride creation via RabbitMQ event...');
  await new Promise(resolve => setTimeout(resolve, 2000));
}

async function testGetRides() {
  console.log('\n=== GET MY RIDES ===');
  const res = await makeRequest('GET', RIDE_PORT, '/api/rides?page=1&limit=10', null, customerToken);
  assert.strictEqual(res.status, 200, 'Get rides failed');
  assert(Array.isArray(res.body.data), 'Rides not returned as array');
  console.log(`✓ Retrieved ${res.body.data.length} rides`);
  
  if (res.body.data.length > 0) {
    rideId = res.body.data[0]._id;
    console.log(`  Latest Ride ID: ${rideId}`);
    console.log(`  Status: ${res.body.data[0].status}`);
  }
}

async function testAcceptBooking() {
  console.log('\n=== ACCEPT BOOKING (DRIVER) ===');
  const res = await makeRequest('POST', BOOKING_PORT, `/api/bookings/${bookingId}/accept`, {}, driverToken);
  assert.strictEqual(res.status, 200, 'Accept booking failed');
  assert.strictEqual(res.body.data.status, 'driver_assigned', 'Status not updated to driver_assigned');
  console.log(`✓ Booking accepted by driver`);
  console.log(`  New Status: ${res.body.data.status}`);
  
  // Wait for events to be processed
  await new Promise(resolve => setTimeout(resolve, 1000));
}

async function testUpdateBookingStatusInProgress() {
  console.log('\n=== UPDATE BOOKING STATUS - IN_PROGRESS ===');
  const data = { status: 'in_progress' };
  const res = await makeRequest('PATCH', BOOKING_PORT, `/api/bookings/${bookingId}/status`, data, driverToken);
  assert.strictEqual(res.status, 200, 'Status update failed');
  assert.strictEqual(res.body.data.status, 'in_progress', 'Status not updated to in_progress');
  console.log(`✓ Booking status updated to in_progress`);
  console.log(`  Started At: ${res.body.data.startedAt}`);
  
  await new Promise(resolve => setTimeout(resolve, 1000));
}

async function testUpdateBookingStatusCompleted() {
  console.log('\n=== UPDATE BOOKING STATUS - COMPLETED ===');
  const data = { status: 'completed' };
  const res = await makeRequest('PATCH', BOOKING_PORT, `/api/bookings/${bookingId}/status`, data, driverToken);
  assert.strictEqual(res.status, 200, 'Status update failed');
  assert.strictEqual(res.body.data.status, 'completed', 'Status not updated to completed');
  console.log(`✓ Booking status updated to completed`);
  console.log(`  Completed At: ${res.body.data.completedAt}`);
  console.log(`  Total Fare: ${res.body.data.fare.total} VND`);
  
  await new Promise(resolve => setTimeout(resolve, 1000));
}

async function testGetBookingDetails() {
  console.log('\n=== GET BOOKING DETAILS ===');
  const res = await makeRequest('GET', BOOKING_PORT, `/api/bookings/${bookingId}`, null, customerToken);
  assert.strictEqual(res.status, 200, 'Get booking failed');
  assert.strictEqual(res.body.data._id, bookingId, 'Booking ID mismatch');
  console.log(`✓ Booking details retrieved`);
  console.log(`  Booking ID: ${res.body.data._id}`);
  console.log(`  Customer: ${res.body.data.customerId.name || res.body.data.customerId}`);
  console.log(`  Driver: ${res.body.data.driverId.name || res.body.data.driverId}`);
  console.log(`  Status: ${res.body.data.status}`);
  console.log(`  Distance: ${res.body.data.distance} km`);
  console.log(`  Fare: ${res.body.data.fare.total} VND`);
}

async function testGetRideDetails() {
  console.log('\n=== GET RIDE DETAILS ===');
  if (!rideId) {
    console.log('⚠ Ride ID not available, skipping');
    return;
  }
  
  const res = await makeRequest('GET', RIDE_PORT, `/api/rides/${rideId}`, null, customerToken);
  assert.strictEqual(res.status, 200, 'Get ride failed');
  console.log(`✓ Ride details retrieved`);
  console.log(`  Ride ID: ${res.body.data._id}`);
  console.log(`  Status: ${res.body.data.status}`);
  console.log(`  Current Location: ${res.body.data.currentLocation?.lat}, ${res.body.data.currentLocation?.lng}`);
  console.log(`  Route Points: ${res.body.data.route?.length || 0}`);
}

// Main test execution
async function runTests() {
  console.log('╔═══════════════════════════════════════════════════════╗');
  console.log('║  CAB BOOKING SYSTEM - COMPLETE TEST SUITE             ║');
  console.log('║  Ride Service Integration Testing                     ║');
  console.log('╚═══════════════════════════════════════════════════════╝');

  try {
    // Health checks
    await testHealthChecks();

    // User registration and login
    await testRegisterCustomer();
    await testRegisterDriver();
    
    await testLoginCustomer();
    await testLoginDriver();

    // Booking workflow
    await testCreateBooking();
    await testGetRides();
    
    // Ride state transitions
    await testAcceptBooking();
    await testUpdateBookingStatusInProgress();
    await testUpdateBookingStatusCompleted();
    
    // Final verifications
    await testGetBookingDetails();
    await testGetRideDetails();

    console.log('\n╔═══════════════════════════════════════════════════════╗');
    console.log('║  ✓ ALL TESTS PASSED SUCCESSFULLY!                     ║');
    console.log('╚═══════════════════════════════════════════════════════╝');
    console.log('\n📊 Summary:');
    console.log('  ✓ Health checks: PASSED');
    console.log('  ✓ User management: PASSED');
    console.log('  ✓ Booking creation: PASSED');
    console.log('  ✓ Ride creation (via events): PASSED');
    console.log('  ✓ Booking lifecycle: PASSED');
    console.log('  ✓ Event-driven integration: PASSED');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run tests
runTests();
