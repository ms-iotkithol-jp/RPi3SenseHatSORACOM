using System.Net;

public static async Task<HttpResponseMessage> Run(HttpRequestMessage req, TraceWriter log)
{
    log.Info("IoT Hub Device Management Sample on Azure IoT Device SDK");

    string mode = req.GetQueryNameValuePairs().FirstOrDefault(q=>string.Compare(q.Key,"mode", true)==0).Value;
    string deviceId = req.GetQueryNameValuePairs().FirstOrDefault(q=>string.Compare(q.Key,"deviceId", true)==0).Value;
    string args = req.GetQueryNameValuePairs().FirstOrDefault(q=>string.Compare(q.Key,"args", true)==0).Value;
    log.Info("received - mode="+mode+",deviceId="+deviceId);
    if (!string.IsNullOrEmpty(args))
    {
        log.Info("args="+args);
    }
    string connectionString = "HostName=EGIoTHub20180308.azure-devices.net;SharedAccessKeyName=iothubowner;SharedAccessKey=o6xQfjn5mo51NoQ23OM2VUciyLHfNfZhPld+4l5QX8k=";
    string result = "parameter format: ?mode=[regist|remove|info|c2d|desired]&deviceId=xxxxx&args=url-encoded-string";

    if ((!string.IsNullOrEmpty(mode)) && (!string.IsNullOrEmpty(deviceId)))
    {
        Microsoft.Azure.Devices.RegistryManager rm = null;
        Microsoft.Azure.Devices.Device device = null;
        Microsoft.Azure.Devices.Shared.Twin twin = null;
        switch (mode)
        {
            case "regist":
                rm = Microsoft.Azure.Devices.RegistryManager.CreateFromConnectionString(connectionString);
                await rm.OpenAsync();
                log.Info("Registry Manager Open");
                device = new Microsoft.Azure.Devices.Device(deviceId);
                try
                {
                    device = await rm.AddDeviceAsync(device);
                    var registInfo = new
                    {
                        deviceId = deviceId,
                        security = device.Authentication.SymmetricKey,
                        status = "registed"
                    };
                    result = Newtonsoft.Json.JsonConvert.SerializeObject(registInfo);
                }
                catch
                {
                    var registInfo = new
                    {
                        deviceId = deviceId,
                        status = "exception"
                    };
                    result = Newtonsoft.Json.JsonConvert.SerializeObject(registInfo);
                }
                log.Info("result:"+result);
                await rm.CloseAsync();
                log.Info("Registry Manager Close");
                break;
            case "remove":
                rm = Microsoft.Azure.Devices.RegistryManager.CreateFromConnectionString(connectionString);
                await rm.OpenAsync();
                device = await rm.GetDeviceAsync(deviceId);
                await rm.RemoveDeviceAsync(device);
                await rm.CloseAsync();
                var removeInfo = new
                {
                    deviceId = deviceId,
                    status = "removed"
                };
                result = Newtonsoft.Json.JsonConvert.SerializeObject(removeInfo);
                break;
            case "c2d":
                if (!string.IsNullOrEmpty(args))
                {
                    var sm = Microsoft.Azure.Devices.ServiceClient.CreateFromConnectionString(connectionString);
                    await sm.OpenAsync();
                    var msg = new Microsoft.Azure.Devices.Message(System.Text.Encoding.UTF8.GetBytes(args));
                    await sm.SendAsync( deviceId,msg);
                    await sm.CloseAsync();
                    var sendInfo = new { deviceId = deviceId, status = "send" };
                    result = Newtonsoft.Json.JsonConvert.SerializeObject(sendInfo);
                }
                else
                {
                    var sendInfo = new
                    {
                        deviceId = deviceId,
                        status = "args is needed"
                    };
                    result = Newtonsoft.Json.JsonConvert.SerializeObject(sendInfo);
                }
                log.Info(result);
                break;
            case "desired":
                rm = Microsoft.Azure.Devices.RegistryManager.CreateFromConnectionString(connectionString);
                await rm.OpenAsync();
                twin=await rm.GetTwinAsync(deviceId);
                var desiredTwin = "{\"properties\":{\"desired\":" + args + "}}";
                await rm.UpdateTwinAsync(deviceId, desiredTwin, twin.ETag);
                await rm.CloseAsync();
                var desiredInfo = new
                {
                    deviceId = deviceId,
                    status = "updated"
                };
                result = Newtonsoft.Json.JsonConvert.SerializeObject(desiredInfo);
                log.Info(result);
                break;
            case "info":
                rm = Microsoft.Azure.Devices.RegistryManager.CreateFromConnectionString(connectionString);
                await rm.OpenAsync();
                device = await rm.GetDeviceAsync(deviceId);
                log.Info("got device");
                twin = await rm.GetTwinAsync(deviceId);
                log.Info("got twin");
                log.Info(twin.ToJson());
                await rm.CloseAsync();
                var info = new
                {
                    deviceId = deviceId,
                    security=device.Authentication.SymmetricKey.PrimaryKey,
                    etag = twin.ETag,
                    twin = twin.ToJson()
                };
                result = Newtonsoft.Json.JsonConvert.SerializeObject(info);
                log.Info(result);
                break;
            default:
                break;
        }
    }

    return new HttpResponseMessage(HttpStatusCode.OK);
}
