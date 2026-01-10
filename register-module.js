// Quick script to register ESP32 module
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyCLVzBUv49X_jhGFs6knmAIk5SH1PKNVOM",
  authDomain: "greensyncv1.firebaseapp.com",
  databaseURL: "https://greensyncv1-default-rtdb.asia-southeast1.firebasedatabase.app/",
  projectId: "greensyncv1",
  storageBucket: "greensyncv1.firebasestorage.app",
  messagingSenderId: "125361090234",
  appId: "1:125361090234:web:404986ead25f5a09805c83"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const moduleId = 'GS-ESP32-0001';

console.log('Registering module:', moduleId);

(async () => {
  try {
    await set(ref(db, `modules/${moduleId}`), {
      status: 'unassigned',
      assignedTo: '',
      farmId: '',
      registeredAt: Date.now(),
      deviceType: 'ESP32',
      firmwareVersion: '2.0'
    });

    console.log('✅ Module registered successfully!');
    console.log('You can now claim it in the web dashboard');
    process.exit(0);
  } catch (error) {
    console.error('❌ Registration failed:', error.message);
    process.exit(1);
  }
})();
