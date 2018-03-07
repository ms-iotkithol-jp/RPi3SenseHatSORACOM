# Edge Side

## How to run in Raspberry Pi

```
npm install
npm start

# Default Device ID is 'raspberry' and MQTT broker server is 'mqtt://beam.soracom.io'
# When specifying Device ID or MQTT broker server
deviceId='<Device ID>' mqttServer='<MQTT broker server>' node app.js

# If you want to daemonize the app
npm install -g pm2
pm2 start app.js
```