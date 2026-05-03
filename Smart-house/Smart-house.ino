#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// ===== WIFI =====
const char* ssid = "main";
const char* password = "12345678";

// ===== FIREBASE =====
const char* url = "https://smart-house-college-project-default-rtdb.firebaseio.com/home.json";

WiFiClientSecure client;

// ===== LED =====
#define LED1 2
#define LED2 4

// ===== MOTOR =====
#define IN1 18
#define IN2 19
#define ENA 5

#define IN3 21
#define IN4 22
#define ENB 23

unsigned long lastUpdate = 0;
const long timeout = 15000; // Increased to 15s to prevent false motor shutoffs

// ===== WIFI CONNECT =====
void connectWiFi() {
  Serial.println("\n[WIFI] Connecting...");
  WiFi.begin(ssid, password);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
    attempts++;

    if (attempts > 20) {
      Serial.println("\n[WIFI] Retry...");
      WiFi.disconnect();
      WiFi.begin(ssid, password);
      attempts = 0;
    }
  }

  Serial.println("\n[WIFI] Connected");
  Serial.print("[WIFI] IP: ");
  Serial.println(WiFi.localIP());
}

// ===== FETCH DATA =====
String fetchData() {
  HTTPClient https;
  client.setInsecure();

  Serial.println("\n[HTTP] Requesting Firebase...");

  if (https.begin(client, url)) {
    int code = https.GET();

    Serial.print("[HTTP] Status Code: ");
    Serial.println(code);

    if (code == 200) {
      String payload = https.getString();
      Serial.println("[HTTP] Payload:");
      Serial.println(payload);
      https.end();
      return payload;
    } else {
      Serial.print("[HTTP] Error: ");
      Serial.println(https.errorToString(code));
    }

    https.end();
  } else {
    Serial.println("[HTTP] BEGIN FAILED");
  }

  return "";
}

// ===== MOTOR CONTROL =====
void setMotor(int p1, int p2, int en, String state, int speed) {

  Serial.println("\n[MOTOR] Control Request:");
  Serial.print("State: "); Serial.println(state);
  Serial.print("Speed: "); Serial.println(speed);

  int pwm = map(speed, 0, 100, 0, 255);

  if (state == "on") {
    Serial.println("[MOTOR] FORWARD");
    digitalWrite(p1, HIGH);
    digitalWrite(p2, LOW);
    ledcWrite(en, pwm);
  } else {
    Serial.println("[MOTOR] STOP");
    digitalWrite(p1, LOW);
    digitalWrite(p2, LOW);
    ledcWrite(en, 0);
  }

  Serial.print("[MOTOR] PWM Applied: ");
  Serial.println(pwm);
}

// ===== APPLY STATE =====
void applyState(JsonDocument& d) {

  Serial.println("\n[STATE] Applying...");

  bool l1 = d["led1"] | false;
  bool l2 = d["led2"] | false;

  Serial.print("[LED1] "); Serial.println(l1 ? "ON" : "OFF");
  Serial.print("[LED2] "); Serial.println(l2 ? "ON" : "OFF");

  digitalWrite(LED1, l1);
  digitalWrite(LED2, l2);

  String f1s = d["fan1"]["state"] | "off";
  int f1sp = d["fan1"]["speed"] | 0;

  String f2s = d["fan2"]["state"] | "off";
  int f2sp = d["fan2"]["speed"] | 0;

  Serial.println("\n[FAN1]");
  setMotor(IN1, IN2, ENA, f1s, f1sp);

  Serial.println("\n[FAN2]");
  setMotor(IN3, IN4, ENB, f2s, f2sp);
}

// ===== FAILSAFE =====
void failSafe() {
  Serial.println("\n[FAILSAFE] Triggered");

  digitalWrite(IN1, LOW);
  digitalWrite(IN2, LOW);
  digitalWrite(IN3, LOW);
  digitalWrite(IN4, LOW);

  ledcWrite(ENA, 0);
  ledcWrite(ENB, 0);
}

// ===== SETUP =====
void setup() {
  Serial.begin(115200);

  Serial.println("\n=== SYSTEM START ===");

  pinMode(LED1, OUTPUT);
  pinMode(LED2, OUTPUT);

  pinMode(IN1, OUTPUT);
  pinMode(IN2, OUTPUT);
  pinMode(IN3, OUTPUT);
  pinMode(IN4, OUTPUT);

  // PWM attach (new API)
  ledcAttach(ENA, 5000, 8);
  ledcAttach(ENB, 5000, 8);

  connectWiFi();
}

// ===== LOOP =====
void loop() {

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[WIFI] Lost connection");
    connectWiFi();
  }

  String data = fetchData();

  if (data != "") {
    // Use DynamicJsonDocument with larger buffer for nested strings
    DynamicJsonDocument doc(1024);
    DeserializationError err = deserializeJson(doc, data);

    if (!err) {
      Serial.println("[JSON] Parsed successfully");
      applyState(doc);
      lastUpdate = millis();
    } else {
      Serial.print("[JSON] ERROR: ");
      Serial.println(err.c_str());
    }
  }

  if (millis() - lastUpdate > timeout) {
    failSafe();
  }

  Serial.println("\n[LOOP] Cycle complete");
  delay(2000);
}