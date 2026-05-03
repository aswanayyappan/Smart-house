const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const path = require('path');

// ==========================================
// 1. FIREBASE INITIALIZATION
// ==========================================
let serviceAccount;
try {
  serviceAccount = require('./smart-house-college-project-firebase-adminsdk-fbsvc-1e7f1f24b5.json');
} catch (error) {
  console.error("=========================================================");
  console.error("ERROR: serviceAccountKey.json not found!");
  console.error("Please download your Service Account Key from Firebase");
  console.error("Project Settings -> Service Accounts -> Generate New Private Key");
  console.error("Place it in the 'backend' folder and rename to serviceAccountKey.json");
  console.error("=========================================================");
  process.exit(1);
}

// NOTE: You must update this URL to match your project's Database URL
const DATABASE_URL = 'https://smart-house-college-project-default-rtdb.firebaseio.com/';

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: DATABASE_URL
});

const db = admin.database();
const app = express();
const port = process.env.PORT || 3000;

// ==========================================
// 2. MIDDLEWARE
// ==========================================
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Serve the web interface

// Request Logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  if (req.method === 'POST') {
    console.log('Body:', req.body);
  }
  next();
});

// ==========================================
// 3. DEFAULT DATA STRUCTURE & INITIALIZATION
// ==========================================
const DEFAULT_HOME_STATE = {
  led1: false,
  led2: false,
  fan1: { state: "off", speed: 0 },
  fan2: { state: "off", speed: 0 }
};

async function initFirebase() {
  try {
    const ref = db.ref('/home');
    const snapshot = await ref.once('value');
    
    if (!snapshot.exists()) {
      console.log('=> Firebase /home is empty or null.');
      console.log('=> Initializing with default data...');
      await ref.set(DEFAULT_HOME_STATE);
      console.log('=> Default data initialized successfully.');
    } else {
      console.log('=> Firebase /home already exists. Skipping initialization.');
    }
  } catch (error) {
    console.error('=> Error initializing Firebase:', error);
  }
}

// Check and initialize data on server startup
initFirebase();

// ==========================================
// 4. API ENDPOINTS
// ==========================================

// Helper: Boolean Validator
const isBoolean = (val) => typeof val === 'boolean';

// Helper: Fan Validators
const isValidFanState = (val) => val === 'on' || val === 'off';
const isValidFanSpeed = (val) => typeof val === 'number' && val >= 0 && val <= 100;

// GET /api/state -> Returns the current "home" object
app.get('/api/state', async (req, res) => {
  try {
    const snapshot = await db.ref('/home').once('value');
    const data = snapshot.val();
    res.status(200).json(data || DEFAULT_HOME_STATE);
  } catch (error) {
    console.error('Error fetching state:', error);
    res.status(500).json({ error: 'Server error fetching state' });
  }
});

// POST /api/led1 -> Controls led1
app.post('/api/led1', async (req, res) => {
  const { on } = req.body;
  if (!isBoolean(on)) {
    return res.status(400).json({ error: 'Invalid input. "on" must be a boolean.' });
  }
  
  try {
    await db.ref('/home').update({ led1: on }); // Partial update
    console.log(`Firebase Write -> /home/led1 updated to ${on}`);
    res.status(200).json({ success: true, led1: on });
  } catch (error) {
    console.error('Firebase Write Error (led1):', error);
    res.status(500).json({ error: 'Server error updating led1' });
  }
});

// POST /api/led2 -> Controls led2
app.post('/api/led2', async (req, res) => {
  const { on } = req.body;
  if (!isBoolean(on)) {
    return res.status(400).json({ error: 'Invalid input. "on" must be a boolean.' });
  }
  
  try {
    await db.ref('/home').update({ led2: on }); // Partial update
    console.log(`Firebase Write -> /home/led2 updated to ${on}`);
    res.status(200).json({ success: true, led2: on });
  } catch (error) {
    console.error('Firebase Write Error (led2):', error);
    res.status(500).json({ error: 'Server error updating led2' });
  }
});

// POST /api/fan1 -> Controls fan1
app.post('/api/fan1', async (req, res) => {
  const { state, speed } = req.body;
  
  if (!isValidFanState(state) || !isValidFanSpeed(speed)) {
    return res.status(400).json({ error: 'Invalid input. "state" must be "on" or "off", "speed" must be an integer 0-100.' });
  }
  
  try {
    await db.ref('/home/fan1').update({ state, speed }); // Partial update
    console.log(`Firebase Write -> /home/fan1 updated to state: ${state}, speed: ${speed}`);
    res.status(200).json({ success: true, fan1: { state, speed } });
  } catch (error) {
    console.error('Firebase Write Error (fan1):', error);
    res.status(500).json({ error: 'Server error updating fan1' });
  }
});

// POST /api/fan2 -> Controls fan2
app.post('/api/fan2', async (req, res) => {
  const { state, speed } = req.body;
  
  if (!isValidFanState(state) || !isValidFanSpeed(speed)) {
    return res.status(400).json({ error: 'Invalid input. "state" must be "on" or "off", "speed" must be an integer 0-100.' });
  }
  
  try {
    await db.ref('/home/fan2').update({ state, speed }); // Partial update
    console.log(`Firebase Write -> /home/fan2 updated to state: ${state}, speed: ${speed}`);
    res.status(200).json({ success: true, fan2: { state, speed } });
  } catch (error) {
    console.error('Firebase Write Error (fan2):', error);
    res.status(500).json({ error: 'Server error updating fan2' });
  }
});

// ==========================================
// 5. START SERVER
// ==========================================
app.listen(port, () => {
  console.log(`\n=> Server is running on http://localhost:${port}`);
  console.log('=> Web Client available at http://localhost:3000/');
});
