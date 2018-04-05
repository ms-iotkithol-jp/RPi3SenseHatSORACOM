const imu = require('node-sense-hat').Imu;
const IMU = new imu.IMU();
const matrix = require('node-sense-hat').Leds;
const sense = require("sense-hat-led").sync;
// const mqtt = require('mqtt');
const os = require('os');

const deviceId = process.env.deviceId || 'raspberrypi';
// const mqttServer = process.env.mqttServer || 'mqtt://beam.soracom.io';

// const pubMessageTopic = `devices/${deviceId}/messages/events/`;
// const subMessageTopic = `devices/${deviceId}/messages/devicebound/#`;

// const subTwinDesiredTopic = `$iothub/twin/PATCH/properties/desired/#`;
// const pubTwinReportedTopic = `$iothub/twin/PATCH/properties/reported/?$rid=`;
// const subTwinResponseTopic = `$iothub/twin/res/#`;

// const subMethodTopic = '$iothub/methods/POST/#';
// const pubMethodResponseTopic = `$iothub/methods/res/{status}/?$rid=`;

if (process.argv.length != 3) {
    console.error('node app.js <connection string for device>');
    return;
}
var connectionString = process.argv[2];
console.log('connection string :', connectionString);

// use factory function from AMQP-specific package
var clientFromConnectionString = require('azure-iot-device-amqp').clientFromConnectionString;

// AMQP-specific factory function returns Client object from core package
var client = clientFromConnectionString(connectionString);

// use Message object from core package
var Message = require('azure-iot-device').Message;


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

client.open(function(err) {
    if (err) {
        console.error('could not open IoTHub client');
    } else {
        console.log('client opened');

        client.getTwin(function(err, twin) {
            if (err) {
                console.error('could not get twin');
            } else {
                console.log('twin created');
                twin.on('properties.desired', function(twindesired) {
                    desiredHandler('1.0', twindesired);
                });
            }
        });

        for (method in methods) {
            console.log('Regist method', method);
            client.onDeviceMethod(method, methods[method]);
        }

        client.on('message', function(message) {
            console.log('message:', message.messageId, ':', message.data);
            var msgText = new Buffer(message.data).toString('ascii');
            client.complete(message, printResultFor('completed'));
            try {
                msg = JSON.parse(message.data.toString());
            } catch (e) {
                sense.showMessage(msgText, 0.1, [255, 255, 255], [50, 50, 50]);
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
        });
    }
});


const methods = {
    'led': (request, response) => {
        console.log('led is called', request.payload);
        if (!request.payload.color) return;
        matrix.clear(request.payload.color);
        response.send(200, "Changed LED color to" + request.payload.color);
    },
    'random': (request, response) => {
        console.log('random is called', request.payload);
        const randInt = max => {
            return Math.floor(Math.random() * (max + 1));
        }
        response.send(200, JSON.stringify("Random!!"));
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
    'red': (request, response) => {
        console.log('red is called', request.payload);
        matrix.clear([255, 0, 0]);
        response.send(200, "Red!!");
    },
    'white': (request, response) => {
        console.log('white is called', request.payload);
        matrix.clear([255, 255, 255]);
        response.send(200, "White!!");
    },
    'batsu': (request, response) => {
        console.log('batsu is called', request.payload);
        matrix.setPixels(cross);
        response.send(200, "Batsu!!");
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
    var msg = new Message(message);
    client.sendEvent(msg, printResultFor('send'));
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

// Helper function to print results in the console

var sendIndex = 0;

function printResultFor(op) {
    return function printResult(err, res) {
        if (err) console.log(op + ' error: ' + err.toString());
        if (res) console.log(op + ' status: ' + res.constructor.name + '[' + sendIndex++ + ']');
    };
}