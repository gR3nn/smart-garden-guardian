import json
import os
import time
from datetime import datetime, timezone

from awscrt import io, mqtt
from awsiot import mqtt_connection_builder
from dotenv import load_dotenv
from gpiozero import OutputDevice


load_dotenv()


def require_env(name):
    value = os.getenv(name)
    if value is None or value.strip() == "":
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value.strip()


def get_bool(name, default):
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


AWS_IOT_ENDPOINT = require_env("AWS_IOT_ENDPOINT")
CLIENT_ID = require_env("AWS_IOT_CLIENT_ID")
CERT_PATH = require_env("AWS_IOT_CERT_PATH")
KEY_PATH = require_env("AWS_IOT_KEY_PATH")
ROOT_CA_PATH = require_env("AWS_IOT_ROOT_CA_PATH")
COMMAND_TOPIC = require_env("AWS_IOT_COMMAND_TOPIC")
STATUS_TOPIC = require_env("AWS_IOT_STATUS_TOPIC")

DEVICE_ID = os.getenv("DEVICE_ID", "garden_node_01").strip()
CONTROLLER_NAME = os.getenv("CONTROLLER_NAME", "raspberry_pi_5").strip()
RELAY_GPIO = int(os.getenv("RELAY_GPIO", "17"))
RELAY_ACTIVE_LOW = get_bool("RELAY_ACTIVE_LOW", True)
MAX_WATERING_SECONDS = int(os.getenv("MAX_WATERING_SECONDS", "15"))


relay = OutputDevice(
    RELAY_GPIO,
    active_high=not RELAY_ACTIVE_LOW,
    initial_value=False,
)

mqtt_connection = None


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def publish_status(status, extra=None):
    global mqtt_connection

    payload = {
        "device_id": DEVICE_ID,
        "controller": CONTROLLER_NAME,
        "valve_status": status,
        "timestamp": now_iso(),
    }

    if extra:
        payload.update(extra)

    print(f"Publishing status: {payload}")

    mqtt_connection.publish(
        topic=STATUS_TOPIC,
        payload=json.dumps(payload),
        qos=mqtt.QoS.AT_LEAST_ONCE,
    )


def open_valve(duration_seconds, source="cloud", command_id=None):
    try:
        duration = int(duration_seconds)
    except Exception:
        duration = 0

    duration = max(0, min(duration, MAX_WATERING_SECONDS))

    if duration <= 0:
        print("Duration is 0 or invalid. Valve will stay closed.")
        close_valve(source=source, command_id=command_id)
        return

    print(f"Opening valve for {duration} seconds...")

    relay.on()

    publish_status(
        "open",
        {
            "source": source,
            "command_id": command_id,
            "duration_seconds": duration,
        },
    )

    time.sleep(duration)

    relay.off()

    print("Valve closed.")

    publish_status(
        "closed",
        {
            "source": source,
            "command_id": command_id,
            "duration_seconds": duration,
        },
    )


def close_valve(source="cloud", command_id=None):
    print("Closing valve immediately...")
    relay.off()

    publish_status(
        "closed",
        {
            "source": source,
            "command_id": command_id,
            "emergency_stop": True,
        },
    )


def handle_command(topic, payload, dup, qos, retain, **kwargs):
    try:
        message_text = payload.decode("utf-8")
        print()
        print(f"Message received on topic {topic}:")
        print(message_text)

        message = json.loads(message_text)

        command = message.get("command")
        duration = message.get("duration_seconds", 0)
        source = message.get("source", "cloud")
        command_id = message.get("command_id")

        if command == "open_valve":
            open_valve(duration, source=source, command_id=command_id)
        elif command in ["close_valve", "emergency_stop"]:
            close_valve(source=source, command_id=command_id)
        else:
            print(f"Unknown command: {command}")

    except Exception as error:
        print(f"Error handling command: {error}")


def connect_to_aws():
    global mqtt_connection

    event_loop_group = io.EventLoopGroup(1)
    host_resolver = io.DefaultHostResolver(event_loop_group)
    client_bootstrap = io.ClientBootstrap(event_loop_group, host_resolver)

    mqtt_connection = mqtt_connection_builder.mtls_from_path(
        endpoint=AWS_IOT_ENDPOINT,
        cert_filepath=CERT_PATH,
        pri_key_filepath=KEY_PATH,
        client_bootstrap=client_bootstrap,
        ca_filepath=ROOT_CA_PATH,
        client_id=CLIENT_ID,
        clean_session=False,
        keep_alive_secs=30,
    )

    print("Connecting to AWS IoT Core...")
    connect_future = mqtt_connection.connect()
    connect_future.result()
    print("Connected to AWS IoT Core.")

    print(f"Subscribing to command topic: {COMMAND_TOPIC}")
    subscribe_future, _packet_id = mqtt_connection.subscribe(
        topic=COMMAND_TOPIC,
        qos=mqtt.QoS.AT_LEAST_ONCE,
        callback=handle_command,
    )
    subscribe_future.result()
    print("Subscribed to command topic.")

    publish_status(
        "closed",
        {
            "message": "Raspberry Pi valve controller online",
        },
    )


def main():
    try:
        relay.off()
        connect_to_aws()

        print()
        print("Valve controller is running.")
        print("Waiting for AWS IoT commands...")
        print("Press CTRL+C to stop.")

        while True:
            time.sleep(1)

    except KeyboardInterrupt:
        print("Stopping valve controller...")

    finally:
        relay.off()

        if mqtt_connection:
            print("Disconnecting from AWS IoT Core...")
            disconnect_future = mqtt_connection.disconnect()
            disconnect_future.result()

        print("Stopped safely.")


if __name__ == "__main__":
    main()
