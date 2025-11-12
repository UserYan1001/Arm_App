const SERVER_URL = "http://192.168.4.1/stream";
// 供其他页面使用的全局常量
document.SERVER_URL = SERVER_URL;
document.addEventListener('DOMContentLoaded', function() {
    if (window.plus) {
        plusReady();
    } else {
        document.addEventListener('plusready', plusReady, false);
    }
});

function plusReady() {
    // 申请必要权限（只需要定位权限用于读取 WiFi 名称）
    if (plus.os.name === "Android") {
        plus.android.requestPermissions(
            ["android.permission.ACCESS_FINE_LOCATION"],
            function() {
                getNetworkInfo();
            },
            function() {
                alert("请授予定位权限，否则无法获取WiFi名称");
            }
        );
    } else {
        getNetworkInfo();
    }
    
    // 硬件返回按钮拦截
    if (plus.key) {
        plus.key.addEventListener('backbutton', function() {
            console.log('硬件返回按钮被按下，调用goBack()函数');
            goBack();
        }, false);
    }
}

// 返回主页面
function goBack() {
    if (window.plus) {
        const current = plus.webview.currentWebview();
        const parent = plus.webview.getLaunchWebview();
        parent.show('slide-in-left', 300);
        current.close();
    } else {
        window.location.href = '../index/index.html';
    }
}

// 刷新
function refreshNetworkInfo() {
    document.getElementById('wifiName').textContent = '刷新中...';
    document.getElementById('localIp').textContent = '刷新中...';
    getNetworkInfo();
}

// 统一获取网络信息
function getNetworkInfo() {
    getWifiName();
    getWifiLocalIP();
}

function getWifiName() {
    const wifiNameElement = document.getElementById('wifiName');

    if (!window.plus) {
        wifiNameElement.textContent = '请在APP中运行';
        return;
    }

    try {
        let Context = plus.android.importClass("android.content.Context");
        let WifiManager = plus.android.importClass("android.net.wifi.WifiManager");
        let wifiManager = plus.android.runtimeMainActivity().getSystemService(Context.WIFI_SERVICE);
        plus.android.importClass(wifiManager);
        let info = wifiManager.getConnectionInfo();
        plus.android.importClass(info);

        let ssid = info.getSSID();
        // 去掉引号
        if (ssid) ssid = ssid.replace(/"/g, "");

        wifiNameElement.textContent = ssid || "未连接WiFi";

    } catch (e) {
        wifiNameElement.textContent = "读取失败";
    }
}

function getWifiLocalIP() {
    const localIpElement = document.getElementById('localIp');

    if (!window.plus) {
        localIpElement.textContent = '请在APP中运行';
        return;
    }

    try {
        let Context = plus.android.importClass("android.content.Context");
        let WifiManager = plus.android.importClass("android.net.wifi.WifiManager");
        let wifiManager = plus.android.runtimeMainActivity().getSystemService(Context.WIFI_SERVICE);
        plus.android.importClass(wifiManager);
        let info = wifiManager.getConnectionInfo();
        plus.android.importClass(info);

        // 获取 int 类型 IP → 转换为正常格式
        let ip = info.getIpAddress();
        let result = (ip & 0xff) + "." +
                     ((ip >> 8) & 0xff) + "." +
                     ((ip >> 16) & 0xff) + "." +
                     ((ip >> 24) & 0xff);

        localIpElement.textContent = result || "未获取到IP";
    } catch (e) {
        localIpElement.textContent = "读取失败";
    }
}
