function goBack() {
    if (window.plus) {
        const current = plus.webview.currentWebview(); // 当前页面
        
        // 尝试获取上一页(page0)的webview
        // 根据项目规范，page0页面的webview ID应该是'page0'
        const prevPage = plus.webview.getWebviewById('page0');
        
        if (prevPage) {
            // 如果找到了上一页，则显示上一页
            prevPage.show('slide-in-left', 300);
        } else {
            // 如果找不到上一页，则尝试创建并显示page0
            // 使用'page0'作为webview ID，保持与项目其他地方一致
            const page0Path = '../../Arm/page0/index.html';
            plus.webview.create(page0Path, 'page0').show('slide-in-left', 300);
        }
        
        current.close(); // 关闭当前页面
    } else {
        // 浏览器环境下返回
        window.location.href = '../page0/index.html';
    }
}

// 刷新视频流（强制重新加载）
function startStreaming() {
    const cameraStream = document.getElementById('cameraStream');
    const statusElement = document.getElementById('status');
    
    // 确保服务器地址已初始化
    initServerUrl();
    
    // 先停止当前可能存在的流
    cameraStream.src = '';
    
    // 强制清除缓存和重新加载
    setTimeout(() => {
        // 显示加载状态
        statusElement.textContent = '重新加载中...';
        
        // 添加随机时间戳参数强制避免缓存
        const timestamp = new Date().getTime();
        const random = Math.random().toString(36).substring(7);
        cameraStream.src = serverUrl + '?t=' + timestamp + '&r=' + random;
        
        // 设置超时检查
        setTimeout(() => {
            if (cameraStream.complete && cameraStream.naturalHeight !== 0) {
                statusElement.textContent = '加载成功';
            } else {
                statusElement.textContent = '加载失败';
                console.log('视频流加载失败，请检查服务器状态');
            }
        }, 3000);
    }, 100);
}



// 色块追踪相关变量
let isTrackingEnabled = false;
let selectedColor = null;
let colorMap = {
    red: '#ff4757',
    green: '#2ed573',
    blue: '#1e90ff'
};

// 变量初始化
let serverUrl;

// 初始化服务器地址
function initServerUrl() {
    let baseUrl = localStorage.getItem('serverBaseUrl');
    
    // 如果localStorage中没有，则从SERVER_URL提取
    if (!baseUrl && typeof SERVER_URL !== 'undefined') {
        try {
            const url = new URL(SERVER_URL);
            baseUrl = `${url.protocol}//${url.hostname}`;
            // 保存到localStorage以便后续使用
            localStorage.setItem('serverBaseUrl', baseUrl);
        } catch (e) {
            console.error('解析SERVER_URL失败:', e);
            baseUrl = 'http://192.168.4.1'; // 默认备用地址
        }
    }
    
    // 如果仍未获取到有效地址，使用默认值
    if (!baseUrl) {
        baseUrl = 'http://192.168.4.1';
    }
    
    // 构建完整的视频流URL
    serverUrl = `${baseUrl}/stream`;
    
    // 保存到localStorage
    localStorage.setItem('serverUrl', serverUrl);
}

// 初始化服务器地址
initServerUrl();

// 切换追踪开关状态
function toggleTracking(enabled) {
    isTrackingEnabled = enabled;
    
    // 如果关闭开关，清空颜色选择
    if (!enabled) {
        selectedColor = null;
        updateColorDisplay();
    }
    
    // 发送开关状态信息到服务器
    const command = enabled ? 'track on' : 'track off';
    sendTrackingCommand(command);
    
    console.log('色块追踪功能已' + (enabled ? '开启' : '关闭'));
}

// 选择颜色
function selectColor(color) {
    // 只有在开关开启时才发送信息
    if (isTrackingEnabled) {
        selectedColor = color;
        
        // 更新颜色显示框
        updateColorDisplay();
        
        // 发送颜色选择信息到服务器
        const command = `track ${color}`;
        sendTrackingCommand(command);
        
        console.log('选择了颜色:', color);
    } else {
        console.log('请先开启色块追踪开关');
    }
}

// 更新颜色显示框
function updateColorDisplay() {
    const colorDisplay = document.getElementById('currentColor');
    const colorText = document.getElementById('colorText');
    
    if (selectedColor && colorMap[selectedColor]) {
        colorDisplay.style.backgroundColor = colorMap[selectedColor];
        
        let colorName;
        switch(selectedColor) {
            case 'red':
                colorName = '红色';
                break;
            case 'green':
                colorName = '绿色';
                break;
            case 'blue':
                colorName = '蓝色';
                break;
            default:
                colorName = '未知';
        }
        
        colorText.textContent = colorName;
    } else {
        colorDisplay.style.backgroundColor = 'transparent';
        colorText.textContent = '未选择';
    }
}

// 发送追踪命令到服务器
function sendTrackingCommand(command) {
    if (!serverUrl) {
        initServerUrl();
    }
    
    // 构建命令发送URL（这里假设使用baseUrl的基础部分）
    const baseUrl = serverUrl.replace('/stream', '');
    const commandUrl = `${baseUrl}/control`;
    
    console.log('发送追踪命令:', command);
    console.log('命令发送地址:', commandUrl);
    
    // 使用fetch发送命令
    fetch(commandUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'text/plain'
        },
        body: command
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('服务器响应异常');
        }
        // 服务器返回的可能是文本
        return response.text();
    })
    .then(data => {
        console.log('命令发送成功，服务器响应:', data);
    })
    .catch(error => {
        console.error('发送命令失败:', error);
        // 这里可以添加错误处理，比如显示提示信息
    });
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    // 图像加载错误处理
    document.getElementById('cameraStream').addEventListener('error', function(e) {
        console.error('图像加载错误:', e);
        document.getElementById('status').textContent = '连接异常';
        console.log('当前视频流地址:', serverUrl);
    });
    
    // 图像加载成功处理
    document.getElementById('cameraStream').addEventListener('load', function() {
        console.log('图像加载成功');
        document.getElementById('status').textContent = '加载成功';
    });
    
    // 图像加载中止处理
    document.getElementById('cameraStream').addEventListener('abort', function(e) {
        console.error('图像加载中止:', e);
    });
    
    // 检查HTML5+环境
    if (window.plus) {
        plusReady();
    } else {
        document.addEventListener('plusready', plusReady);
    }
});

// HTML5+环境准备完成
function plusReady() {
    console.log('HTML5+环境准备完成');
    
    // 拦截硬件返回按钮事件 - 使用plus.key.addEventListener更可靠
    if (plus.key) {
        plus.key.addEventListener('backbutton', function() {
            console.log('硬件返回按钮被按下，调用goBack函数');
            // 直接调用goBack函数，plus.key环境中不需要preventDefault
            goBack();
        }, false);
        console.log('已成功注册硬件返回按钮事件监听器');
    } else {
        console.error('plus.key API不可用，无法注册返回按钮事件');
    }
}
