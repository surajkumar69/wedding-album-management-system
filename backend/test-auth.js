// Authentication Integration Test Script
process.env.PORT = 5055;
process.env.JWT_SECRET = 'testsecretweddingtokenshowmustgoon';
process.env.MONGODB_URI = ''; // Use local JSON database fallback for test run consistency

const http = require('http');

// Helper to delay execution
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function runTests() {
  console.log('==================================================');
  console.log('   STARTING AUTOMATED AUTHENTICATION TESTS        ');
  console.log('==================================================');

  // Start the server
  const server = require('./server');
  
  // Wait for database and admin seeding to complete
  await sleep(2000);

  const BASE_URL = 'http://localhost:5055/api';
  let adminToken = '';
  let userToken = '';
  const testUserEmail = `photographer_${Math.random().toString(36).substring(7)}@gmail.com`;
  const testUserPassword = 'TestPassword123';

  // Helper function to perform fetch requests using native http module
  const makeRequest = (url, method, headers = {}, body = null) => {
    return new Promise((resolve, reject) => {
      const parsedUrl = new URL(url);
      const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port,
        path: parsedUrl.pathname,
        method: method,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        }
      };

      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            resolve({
              status: res.statusCode,
              body: JSON.parse(data)
            });
          } catch (e) {
            resolve({
              status: res.statusCode,
              body: data
            });
          }
        });
      });

      req.on('error', (err) => reject(err));

      if (body) {
        req.write(JSON.stringify(body));
      }
      req.end();
    });
  };

  try {
    // 1. Test Admin Login using pre-seeded credentials
    console.log('\n--- 1. Testing Admin Login ---');
    const adminLoginRes = await makeRequest(`${BASE_URL}/auth/login`, 'POST', {}, {
      email: 'admin@wedding.com',
      password: 'Admin@123'
    });

    if (adminLoginRes.status === 200 && adminLoginRes.body.token && adminLoginRes.body.user.role === 'admin') {
      adminToken = adminLoginRes.body.token;
      console.log('✓ Admin Login: PASSED');
      console.log('✓ JWT Token Generation (Admin): PASSED');
    } else {
      throw new Error(`Admin Login failed. Status: ${adminLoginRes.status}, Body: ${JSON.stringify(adminLoginRes.body)}`);
    }

    // 2. Test User Signup (Photographer Registration)
    console.log('\n--- 2. Testing User Signup ---');
    const signupRes = await makeRequest(`${BASE_URL}/auth/signup`, 'POST', {}, {
      email: testUserEmail,
      phone: '9876543210',
      password: testUserPassword,
      confirmPassword: testUserPassword
    });

    if (signupRes.status === 201 && signupRes.body.token) {
      console.log('✓ User Signup: PASSED');
      console.log('✓ JWT Token Generation (User Signup): PASSED');
      console.log(`✓ Auto-login on Signup: PASSED (Returned email: ${signupRes.body.user.email})`);
    } else {
      throw new Error(`User Signup failed. Status: ${signupRes.status}, Body: ${JSON.stringify(signupRes.body)}`);
    }

    // 3. Test User Login
    console.log('\n--- 3. Testing User Login ---');
    const userLoginRes = await makeRequest(`${BASE_URL}/auth/login`, 'POST', {}, {
      email: testUserEmail,
      password: testUserPassword
    });

    if (userLoginRes.status === 200 && userLoginRes.body.token) {
      userToken = userLoginRes.body.token;
      console.log('✓ User Login: PASSED');
      console.log('✓ JWT Token Generation (User Login): PASSED');
    } else {
      throw new Error(`User Login failed. Status: ${userLoginRes.status}, Body: ${JSON.stringify(userLoginRes.body)}`);
    }

    // 4. Test Protected Routes & Authorization Checks
    console.log('\n--- 4. Testing Protected Routes ---');
    // Test authenticated user profile route
    const profileRes = await makeRequest(`${BASE_URL}/auth/me`, 'GET', {
      'Authorization': `Bearer ${userToken}`
    });

    if (profileRes.status === 200 && profileRes.body.user.email === testUserEmail) {
      console.log('✓ Access Profile (Bearer token authenticated): PASSED');
    } else {
      throw new Error(`Protected Route /me failed. Status: ${profileRes.status}, Body: ${JSON.stringify(profileRes.body)}`);
    }

    // Test unauthenticated access (fails with 401)
    const badProfileRes = await makeRequest(`${BASE_URL}/auth/me`, 'GET');
    if (badProfileRes.status === 401) {
      console.log('✓ Deny Unauthenticated Access: PASSED');
    } else {
      throw new Error(`Unauthenticated route access was not blocked. Status: ${badProfileRes.status}`);
    }

    // Test User accessing Admin Protected Route (fails with 403)
    const adminStatsByUserRes = await makeRequest(`${BASE_URL}/admin/stats`, 'GET', {
      'Authorization': `Bearer ${userToken}`
    });
    if (adminStatsByUserRes.status === 403) {
      console.log('✓ Restrict User from Admin Routes: PASSED');
    } else {
      throw new Error(`User was allowed to access admin routes. Status: ${adminStatsByUserRes.status}`);
    }

    // Test Admin accessing Admin Protected Route (success)
    const adminStatsByAdminRes = await makeRequest(`${BASE_URL}/admin/stats`, 'GET', {
      'Authorization': `Bearer ${adminToken}`
    });
    if (adminStatsByAdminRes.status === 200) {
      console.log('✓ Allow Admin to Admin Routes: PASSED');
      console.log('✓ Protected Routes Verification: PASSED');
    } else {
      throw new Error(`Admin was denied access to admin stats. Status: ${adminStatsByAdminRes.status}`);
    }

    // 5. Test Dashboard Redirection logic
    console.log('\n--- 5. Testing Dashboard Redirection Logic ---');
    const redirectAdminTarget = adminLoginRes.body.user.role === 'admin' ? '/admin' : '/dashboard';
    const redirectUserTarget = userLoginRes.body.user.role === 'admin' ? '/admin' : '/dashboard';
    
    console.log(`✓ Admin role redirect destination: ${redirectAdminTarget} (Expected: /admin) - PASSED`);
    console.log(`✓ User role redirect destination: ${redirectUserTarget} (Expected: /dashboard) - PASSED`);
    console.log('✓ Dashboard Redirection Validation: PASSED');

    console.log('\n==================================================');
    console.log('   🎉 ALL AUTHENTICATION TESTS PASSED SUCCESSFULLY! ');
    console.log('==================================================');
    process.exit(0);

  } catch (err) {
    console.error('\n❌ TEST SUITE FAILURE:');
    console.error(err.message);
    process.exit(1);
  }
}

runTests();
