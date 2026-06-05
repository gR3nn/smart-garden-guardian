#ifndef SMART_GARDEN_SECRETS_H
#define SMART_GARDEN_SECRETS_H

const char* WIFI_SSID = "YOUR_WIFI_NAME";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

const char* AWS_IOT_ENDPOINT = "your-endpoint-ats.iot.us-east-1.amazonaws.com";
const int AWS_IOT_PORT = 8883;

const char* CLIENT_ID = "smart-garden-esp32";
const char* DEVICE_ID = "garden_node_01";
const char* TELEMETRY_TOPIC = "smart-garden/node01/telemetry";

static const char AWS_ROOT_CA[] PROGMEM = R"EOF(
-----BEGIN CERTIFICATE-----
PASTE_AMAZON_ROOT_CA_HERE
-----END CERTIFICATE-----
)EOF";

static const char AWS_DEVICE_CERT[] PROGMEM = R"EOF(
-----BEGIN CERTIFICATE-----
PASTE_DEVICE_CERTIFICATE_HERE
-----END CERTIFICATE-----
)EOF";

static const char AWS_PRIVATE_KEY[] PROGMEM = R"EOF(
-----BEGIN PRIVATE KEY-----
PASTE_DEVICE_PRIVATE_KEY_HERE
-----END PRIVATE KEY-----
)EOF";

#endif
