const imu = require('node-sense-hat').Imu;
const IMU = new imu.IMU();
const matrix = require('node-sense-hat').Leds;
const sense = require("sense-hat-led").sync;
const mqtt = require('mqtt');
const os = require('os');

const deviceId = process.env.deviceId || 'raspberrypi';
const mqttServer = process.env.mqttServer || 'mqtt://beam.soracom.io';

const pubMessageTopic = `devices/${deviceId}/messages/events/`;
const subMessageTopic = `devices/${deviceId}/messages/devicebound/#`;

const subTwinDesiredTopic = `$iothub/twin/PATCH/properties/desired/#`;
const pubTwinReportedTopic = `$iothub/twin/PATCH/properties/reported/?$rid=`;
const subTwinResponseTopic = `$iothub/twin/res/#`;

const subMethodTopic = '$iothub/methods/POST/#';
const pubMethodResponseTopic = `$iothub/methods/res/{status}/?$rid=`;

const client = mqtt.connect(mqttServer, {
    clientId: deviceId
});

let delay = 5000;
let sendDataTimer;

const getSensorData = () => {
    return new Promise((resolve, reject) => {
        IMU.getValue((err, data) => {
            if (err != null) {
                console.error('Could not read sensor data: ', err);
                return;
            }
            resolve(data);
        });
    });
};

client.on('message', (topic, message) => {
    console.log('message:', topic, message.toString());
    let msg = "";
    if (topic.includes("devicebound")) {
        try {
            msg = JSON.parse(message.toString());
        } catch (e) {
            console.log(e);
            return;
        }

        if (msg && msg.led) {
            let color16 = msg.led;
            if (color16[0] === "#") {
                color16 = msg.led.slice(1);
            }
            let r, g, b;
            try {
                r = parseInt(color16.slice(0, 2), 16);
                g = parseInt(color16.slice(2, 4), 16);
                b = parseInt(color16.slice(4, 6), 16);
            } catch (e) {
                console.log(e);
                return;
            }
            console.log(r, g, b);
            matrix.clear([r, g, b]);
        }
    } else if (topic.includes("$iothub/methods/POST/")) {
        const methodName = topic.split("$iothub/methods/POST/")[1].split("/")[0];
        const rid = topic.split("=")[1];
        const args = JSON.parse(message.toString());
        if (methods[methodName]) {
            methods[methodName](rid, args);
        }
    } else if (topic.includes("$iothub/twin/PATCH/properties/desired/")) {
        const version = topic.split("=")[1];
        desiredHandler(version, JSON.parse(message.toString()));
    }
});

const methods = {
    'led': (rid, args) => {
        if (!args.color) return;
        matrix.clear(args.color);
        const topic = pubMethodResponseTopic.replace("{status}", 200) + rid;
        client.publish(topic, "Changed LED color to" + args.color);
    },
    'random': (rid, args) => {
        const randInt = max => {
            return Math.floor(Math.random() * (max + 1));
        }
        const topic = pubMethodResponseTopic.replace("{status}", 200) + rid;
        client.publish(topic, JSON.stringify("Random!!"));
        for (let i = 0; i < 1000; i++) {
            x = randInt(7);
            y = randInt(7);
            r = randInt(255);
            g = randInt(255);
            b = randInt(255);
            sense.setPixel(x, y, r, g, b);
            sense.sleep(0.01);
        }
    },
    'red': (rid, args) => {
        matrix.clear([255, 0, 0]);
        const topic = pubMethodResponseTopic.replace("{status}", 200) + rid;
        client.publish(topic, "Red!!");
    },
    'white': (rid, args) => {
        matrix.clear([255, 255, 255]);
        const topic = pubMethodResponseTopic.replace("{status}", 200) + rid;
        client.publish(topic, "White!!");
    },
    'batsu': (rid, args) => {
        matrix.setPixels(cross);
        const topic = pubMethodResponseTopic.replace("{status}", 200) + rid;
        client.publish(topic, "Batsu!!");
    }
};

const desiredHandler = (version, desired) => {
    if (desired && desired["telemetry-cycle-ms"] && 100 < Number(desired["telemetry-cycle-ms"])) {
        if (sendDataTimer) clearInterval(sendDataTimer);
        delay = Number(desired["telemetry-cycle-ms"]);
        sendSensorData(delay);
        console.log('Successfully changed telemetry-cycle-ms', delay, 'to', desired["telemetry-cycle-ms"]);
        sense.setPixel(0, 1, 0, 255, 255);
        sense.sleep(0.5);
        sense.setPixel(0, 1, 0, 0, 0);
    }
};

const sendMessage = message => {
    if (typeof message != 'string') message = JSON.stringify(message);
    client.publish(pubMessageTopic, message);
    sense.setPixel(0, 0, 255, 255, 0);
    sense.sleep(0.5);
    sense.setPixel(0, 0, 0, 0, 0);
};

const sendReportProperty = message => {
    if (!message) {
        const message = {
            sample: {
                location: {
                    region: 'JP'
                }
            }
        }
    }
    client.publish(pubTwinReportedTopic + '1', JSON.stringify(reported));
};

const formatData = raw => {
    const data = {};
    data.accelX = raw.accel.x;
    data.accelY = raw.accel.y;
    data.accelZ = raw.accel.z;
    data.temperature = raw.temperature;
    data.humidity = raw.humidity;
    data.time = raw.timestamp;

    return data;
}

const sendSensorData = delay => {
    sendDataTimer = setInterval(() => {
        getSensorData().then(rawData => {
            // console.log('sensorData', sensorData);
            const sensorData = formatData(rawData);
            sendMessage(JSON.stringify(sensorData));
        });
    }, delay);
};

const getIpAdresses = () => {
    const ifs = os.networkInterfaces();
    const ipAddress = {
        ip: {}
    };
    for (let i in ifs) {
        if (!ipAddress.ip[i]) ipAddress.ip[i] = [];
        ifs[i].forEach(info => {
            ipAddress.ip[i].push(info.address);
        });
    }
    return ipAddress;
}

client.on('connect', () => {
    client.subscribe(subMessageTopic);
    client.subscribe(subTwinResponseTopic);
    client.subscribe(subTwinDesiredTopic);
    client.subscribe(subMethodTopic);
});

/////////////////////////////////////////////////////////////////////

sendSensorData(delay);
sense.showMessage("Hello!", 0.1, [255, 255, 255], [50, 50, 50]);

sendMessage(getIpAdresses());

const O = [0, 0, 0];
const X = [255, 0, 0];

const cross = [
    X, O, O, O, O, O, O, X,
    O, X, O, O, O, O, X, O,
    O, O, X, O, O, X, O, O,
    O, O, O, X, X, O, O, O,
    O, O, O, X, X, O, O, O,
    O, O, X, O, O, X, O, O,
    O, X, O, O, O, O, X, O,
    X, O, O, O, O, O, O, X,
];