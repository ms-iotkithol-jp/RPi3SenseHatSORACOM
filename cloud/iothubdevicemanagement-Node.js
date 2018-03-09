const iothub = require('azure-iothub');

const connectionString = '[Connection string of iothubowner]';
const registry = iothub.Registry.fromConnectionString(connectionString);

let context;

module.exports = (ctx, req) => {
    context = ctx;
    context.log('JavaScript HTTP trigger function processed a request.');
    context.log(req.query);

    if (!req.query || !req.query.mode) {
        sendResponse({
            body: "mode parametor is requied."
        });
    }

    const mode = req.query.mode;
    const args = {};
    if (req.query.deviceId) {
        args.deviceId = req.query.deviceId;
    }

    doPromise(mode, args).then(res => {
        context.log(res);
        sendResponse({ status: 200, body: res });
    }).catch(err => {
        const body = JSON.parse(err.responseBody);
        context.log('Some errors occured.', body);
        sendResponse({ status: 400, body: body });
    });
};

const doPromise = (mode, device) => {
    switch (mode) {
        case "list":
            return getAllDevices();
        case "info":
            return getDeviceInfo(device.deviceId);
        case "regist":
            return registDevice(device);
        case "remove":
            return deleteDevice(device.deviceId);
        default:
    }
}

const sendResponse = (res = { status: 200 }) => {
    context.res = {
        status: res.status,
        body: res.body
    };
    context.done();
}

const registDevice = device => {
    return new Promise((resolve, reject) => {
        registry.create(device, (err, deviceInfo, res) => {
            if (err) reject(err);
            resolve(deviceInfo);
        });
    });
}

const getAllDevices = () => {
    return new Promise((resolve, reject) => {
        registry.list((err, devices) => {
            if (err) reject(err);
            resolve(devices);
        });
    });
}

const getDeviceInfo = deviceId => {
    return new Promise((resolve, reject) => {
        registry.get(deviceId, (err, deviceInfo) => {
            if (err) reject(err);
            resolve(deviceInfo);
        });
    });
}

const deleteDevice = deviceId => {
    return new Promise((resolve, reject) => {
        registry.delete(deviceId, (err, res) => {
            if (err) reject(err);
            resolve(res);
        });
    });
};
