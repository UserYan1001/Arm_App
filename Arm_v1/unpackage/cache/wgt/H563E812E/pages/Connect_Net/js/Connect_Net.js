// 优先从localStorage读取已保存的IP，没有则用默认值（仅作为 fallback）
let SERVER_URL = localStorage.getItem('SERVER_URL') || "http://192.168.0.156";
// 同时设置到window和document对象（供当前页面和其他页面临时访问）
window.SERVER_URL = SERVER_URL;
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
                getWifiName();
            },
            function() {
                alert("请授予定位权限，否则无法获取WiFi名称");
            }
        );
    } else {
        getWifiName();
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
        let originalResult = (ip & 0xff) + "." +
                             ((ip >> 8) & 0xff) + "." +
                             ((ip >> 16) & 0xff) + "." +
                             ((ip >> 24) & 0xff);

        // 关键改动：将IP最后一位改为1
        let ipSegments = originalResult.split('.'); // 拆分IP为数组，例：["192", "168", "1", "100"]
        if (ipSegments.length === 4) { // 确保是合法的IPv4格式
			ipSegments[0] = "192";
			ipSegments[1] = "168";
			ipSegments[2] = "0";
            ipSegments[3] = "156"; // 替换最后一段为1
        }
        let result = ipSegments.join('.'); // 重新拼接，例："192.168.1.1"

        localIpElement.textContent = result || "未获取到IP";
        
        // 当成功获取到有效IP地址时，更新所有存储和全局变量
        if (result && result !== "0.0.0.0" && result !== "127.0.0.1") {
            const newServerUrl = "http://" + result;
            // 1. 更新localStorage（持久化存储，跨页面共享）
            localStorage.setItem('SERVER_URL', newServerUrl);
            // 2. 更新当前页面局部变量
            SERVER_URL = newServerUrl;
            // 3. 更新window对象（当前页面全局访问）
            window.SERVER_URL = newServerUrl;
            // 4. 更新document对象（兼容原有代码）
            document.SERVER_URL = newServerUrl;
            
            console.log('SERVER_URL已更新并持久化:', newServerUrl);
            console.log('原始IP:', originalResult, '修改后IP:', result); // 可选：打印日志验证
        }
    } catch (e) {
        localIpElement.textContent = "读取失败";
        console.error('获取IP地址失败:', e);
    }
}