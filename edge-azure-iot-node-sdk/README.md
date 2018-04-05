# Edge Side

## How to run in Raspberry Pi

Enable I2C, SPI inteface of Raspberry Pi. 

Upgrade node version by following command line execution.
pi@raspberrypi:~ $ sudo su – 
root@raspberrypi:~ # apt-get remove --purge node* npm* 
root@raspberrypi:~ # curl -sL https://deb.nodesource.com/setup_8.x | sudo bash - 
root@raspberrypi:~# apt-get install nodejs -y 
root@raspberrypi:~# node -v 

Install Azure IoT SDK for node 
```
npm install azure-iot-device 
npm install azure-iot-device-amqp 
```

Install SenseHat node libraries 
```
git clone https://github.com/rupnikj/nodeimu --recursive && cd nodeimu
sudo npm install node-gyp –g
npm install
cd ..
sudo npm install sense-hat-led
```

Clone This repository 
```
git clone https://github.com/ms-iotkithol-jp/RPi3SenseHatSORACOM.git
cd RPi3SenseHatSORACOM/extension/edge-azure-node-sdk
```

Create IoT Hub and regist one deviceId. 

```
npm install
npm app.js '<connection string for deviceId>'
