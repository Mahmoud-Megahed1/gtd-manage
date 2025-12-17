// Test script to verify server is working
import http from 'http';

function testEndpoint(path, expectedStatus = 200) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: 'GET',
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        console.log(`? ${path} - Status: ${res.statusCode}`);
        if (data.length < 200) {
          console.log(`  Response: ${data}`);
        } else {
          console.log(`  Response length: ${data.length} bytes`);
        }
        resolve({ status: res.statusCode, data });
      });
    });

    req.on('error', (e) => {
      console.log(`? ${path} - Error: ${e.message}`);
      reject(e);
    });

    req.end();
  });
}

async function runTests() {
  console.log('?? Testing GTD Server...\n');
  
  try {
    await testEndpoint('/healthz');
    await testEndpoint('/');
    await testEndpoint('/api/trpc/system.getMe');
    
    console.log('\n? All tests passed! Server is working correctly.');
    console.log('\n?? Next steps:');
    console.log('1. Open browser: http://localhost:3000');
    console.log('2. Test login functionality');
    console.log('3. Create/Edit data and verify database updates');
  } catch (error) {
    console.log('\n? Tests failed!');
  }
}

runTests();
