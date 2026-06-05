#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include "DHT.h"
#include "secrets.h"

#define DHTPIN 4
#define DHTTYPE DHT11

const int SOIL_PIN = 35;
const int RAIN_PIN = 34;

DHT dht(DHTPIN, DHTTYPE);

int soilDryValue = 3200;
int soilWetValue = 1300;

int rainDryValue = 3500;
int rainWetValue = 1200;

unsigned long lastPublishTime = 0;
const unsigned long PUBLISH_INTERVAL_MS = 15000;

WiFiClientSecure secureClient;
PubSubClient mqttClient(secureClient);

int clampValue(int value, int minValue, int maxValue) {
  if (value < minValue) return minValue;
  if (value > maxValue) return maxValue;
  return value;
}

int soilRawToPercent(int raw) {
  int percent = map(raw, soilDryValue, soilWetValue, 0, 100);
  return clampValue(percent, 0, 100);
}

int rainRawToWetnessPercent(int raw) {
  int percent = map(raw, rainDryValue, rainWetValue, 0, 100);
  return clampValue(percent, 0, 100);
}

bool isRainDetected(int rainWetnessPercent) {
  return rainWetnessPercent >= 30;
}

void connectToWiFi() {
  Serial.print("Connecting to WiFi: ");
  Serial.println(WIFI_SSID);

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;

  while (WiFi.status() != WL_CONNECTED && attempts < 40) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("WiFi connected");
    Serial.print("ESP32 IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("WiFi connection failed. Restarting...");
    delay(3000);
    ESP.restart();
  }
}

void connectToAWS() {
  secureClient.setCACert(AWS_ROOT_CA);
  secureClient.setCertificate(AWS_DEVICE_CERT);
  secureClient.setPrivateKey(AWS_PRIVATE_KEY);

  mqttClient.setServer(AWS_IOT_ENDPOINT, AWS_IOT_PORT);
  mqttClient.setKeepAlive(60);
  mqttClient.setBufferSize(1024);

  Serial.print("Connecting to AWS IoT Core");

  while (!mqttClient.connected()) {
    if (mqttClient.connect(CLIENT_ID)) {
      Serial.println();
      Serial.println("Connected to AWS IoT Core");
    } else {
      Serial.print(".");
      Serial.print(" MQTT state: ");
      Serial.println(mqttClient.state());
      delay(2000);
    }
  }
}

String buildTelemetryJson() {
  int soilRaw = analogRead(SOIL_PIN);
  int rainRaw = analogRead(RAIN_PIN);

  int soilPercent = soilRawToPercent(soilRaw);
  int rainWetnessPercent = rainRawToWetnessPercent(rainRaw);
  bool rainDetected = isRainDetected(rainWetnessPercent);

  float humidity = dht.readHumidity();
  float temperature = dht.readTemperature();

  StaticJsonDocument<512> doc;

  doc["device_id"] = DEVICE_ID;
  doc["soil_raw"] = soilRaw;
  doc["soil_moisture"] = soilPercent;
  doc["rain_raw"] = rainRaw;
  doc["rain_wetness"] = rainWetnessPercent;
  doc["rain_detected"] = rainDetected;

  if (isnan(temperature)) {
    doc["temperature"] = nullptr;
  } else {
    doc["temperature"] = round(temperature * 10) / 10.0;
  }

  if (isnan(humidity)) {
    doc["humidity"] = nullptr;
  } else {
    doc["humidity"] = round(humidity * 10) / 10.0;
  }

  doc["source"] = "esp32_direct";

  String payload;
  serializeJson(doc, payload);
  return payload;
}

void publishTelemetry() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi disconnected. Reconnecting...");
    connectToWiFi();
  }

  if (!mqttClient.connected()) {
    Serial.println("MQTT disconnected. Reconnecting...");
    connectToAWS();
  }

  String payload = buildTelemetryJson();

  Serial.println();
  Serial.println("Publishing telemetry:");
  Serial.println(payload);

  bool published = mqttClient.publish(TELEMETRY_TOPIC, payload.c_str());

  if (published) {
    Serial.println("Publish success");
  } else {
    Serial.println("Publish failed");
  }
}

void setup() {
  Serial.begin(115200);
  delay(1500);

  dht.begin();
  analogReadResolution(12);

  Serial.println();
  Serial.println("======================================");
  Serial.println("Smart Garden ESP32 -> AWS IoT Core");
  Serial.println("======================================");

  connectToWiFi();
  connectToAWS();
}

void loop() {
  mqttClient.loop();

  unsigned long now = millis();

  if (now - lastPublishTime >= PUBLISH_INTERVAL_MS) {
    lastPublishTime = now;
    publishTelemetry();
  }
}
