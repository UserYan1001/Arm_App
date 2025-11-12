function goBack() {
    if (window.plus) {
        const current = plus.webview.currentWebview(); // 当前页面
        const parent = plus.webview.getLaunchWebview(); // 获取首页 webview

        parent.show('slide-in-left', 300); // 显示首页
        current.close(); // 关闭当前页面
    } else {
        // 浏览器环境下返回
        window.location.href = '../../index/index.html';
    }
}

// 机械臂控制按钮数据
const controlButtons = [
    { id: 'forward', text: '前进', icon: '↑' },
    { id: 'backward', text: '后退', icon: '↓' },
    { id: 'left', text: '左转', icon: '←' },
    { id: 'right', text: '右转', icon: '→' },
    { id: 'up', text: '上升', icon: '↥' },
    { id: 'down', text: '下降', icon: '↧' },
    { id: 'grab', text: '抓取', icon: '✋' },
    { id: 'release', text: '释放', icon: '🖐️' },
    { id: 'speedUp', text: '加速', icon: '⚡' },
    { id: 'speedDown', text: '减速', icon: '🐢' },
    { id: 'stop', text: '停止', icon: '⏹️' },
    { id: 'reset', text: '复位', icon: '🔄' },
    { id: 'mode1', text: '模式1', icon: '①' },
    { id: 'mode2', text: '模式2', icon: '②' },
    { id: 'mode3', text: '模式3', icon: '③' },
    { id: 'save', text: '保存', icon: '💾' },
    { id: 'load', text: '加载', icon: '📂' },
    { id: 'calibrate', text: '校准', icon: '🎯' },
    { id: 'test', text: '测试', icon: '🧪' }
];

// 初始化页面
function initPage() {
    generateControlButtons();
    setupEventListeners();
}

// 生成控制按钮
function generateControlButtons() {
    const buttonContainer = document.getElementById('buttonContainer');
    
    controlButtons.forEach(button => {
        const buttonElement = document.createElement('button');
        buttonElement.className = 'control-btn';
        buttonElement.id = button.id;
        buttonElement.innerHTML = `
            <span class="btn-icon">${button.icon}</span>
            <span class="btn-text">${button.text}</span>
        `;
        
        buttonElement.addEventListener('click', () => {
            handleControlButtonClick(button.id);
        });
        
        buttonContainer.appendChild(buttonElement);
    });
}

// 处理控制按钮点击事件
function handleControlButtonClick(buttonId) {
    console.log(`控制按钮被点击: ${buttonId}`);
    
    // 根据按钮ID执行相应的控制操作
    switch(buttonId) {
        case 'forward':
            sendControlCommand('MOVE_FORWARD');
            break;
        case 'backward':
            sendControlCommand('MOVE_BACKWARD');
            break;
        case 'left':
            sendControlCommand('TURN_LEFT');
            break;
        case 'right':
            sendControlCommand('TURN_RIGHT');
            break;
        case 'up':
            sendControlCommand('MOVE_UP');
            break;
        case 'down':
            sendControlCommand('MOVE_DOWN');
            break;
        case 'grab':
            sendControlCommand('GRAB');
            break;
        case 'release':
            sendControlCommand('RELEASE');
            break;
        case 'speedUp':
            sendControlCommand('SPEED_UP');
            break;
        case 'speedDown':
            sendControlCommand('SPEED_DOWN');
            break;
        case 'stop':
            sendControlCommand('STOP');
            break;
        case 'reset':
            sendControlCommand('RESET');
            break;
        case 'mode1':
            sendControlCommand('MODE_1');
            break;
        case 'mode2':
            sendControlCommand('MODE_2');
            break;
        case 'mode3':
            sendControlCommand('MODE_3');
            break;
        case 'save':
            saveCurrentState();
            break;
        case 'load':
            loadSavedState();
            break;
        case 'calibrate':
            calibrateArm();
            break;
        case 'test':
            runTest();
            break;
        default:
            console.log('未知按钮:', buttonId);
    }
}

// 发送控制命令（实际HTTP请求）
function sendControlCommand(command) {
    console.log(`发送控制命令: ${command}`);
    
    // 构建控制命令的URL，使用与视频流相同的服务器地址
    let controlServerUrl = 'http://192.168.0.105';
    if (typeof SERVER_URL !== 'undefined') {
        // 从视频流URL提取基础地址
        const url = new URL(SERVER_URL);
        controlServerUrl = `${url.protocol}//${url.hostname}`;
    }
    
    // 发送实际的HTTP请求到机械臂控制接口
    fetch(`${controlServerUrl}/api/control/${command}`, { 
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP错误! 状态: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        console.log('控制响应:', data);
        //showToast(`命令 ${command} 执行成功`);
    })
    .catch(error => {
        console.error('控制错误:', error);
        //showToast(`命令 ${command} 执行失败: ${error.message}`);
    });
}

// 刷新视频流（强制重新加载）
function startStreaming() {
    const cameraStream = document.getElementById('cameraStream');
    const statusElement = document.getElementById('status');
    
    // 从Connect_Net.js获取服务器地址
    if (typeof SERVER_URL !== 'undefined') {
        serverUrl = SERVER_URL;
    } else {
        // 如果Connect_Net.js未加载，使用默认地址
        serverUrl = 'http://192.168.4.1:8000/stream';
    }
    
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

// 停止监控（已废弃，改为单次刷新模式）
function stopStreaming() {
    console.log('stopStreaming函数已废弃，请使用单次刷新模式');
}

// 更新UI状态（简化版，仅显示状态）
function updateUI() {
    // 此函数现在主要用于其他功能，视频状态由startStreaming函数直接控制
}

// 显示提示信息
function showToast(message) {
    // 创建提示元素
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    // 添加样式
    toast.style.position = 'fixed';
    toast.style.bottom = '20px';
    toast.style.left = '50%';
    toast.style.transform = 'translateX(-50%)';
    toast.style.backgroundColor = 'rgba(0,0,0,0.7)';
    toast.style.color = 'white';
    toast.style.padding = '8px 16px';
    toast.style.borderRadius = '4px';
    toast.style.zIndex = '9999';
    
    // 3秒后移除
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s';
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 300);
    }, 3000);
}

// 变量初始化
let serverUrl = localStorage.getItem('serverUrl') || 'http://192.168.4.1:8000/stream';
let isStreaming = false;
let refreshInterval = null;

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    // 初始化机械臂控制按钮
    initPage();
    
    // 图像加载错误处理
    document.getElementById('cameraStream').addEventListener('error', function(e) {
        console.error('图像加载错误:', e);
        if (isStreaming) {
            document.getElementById('status').textContent = '连接异常，重试中...';
            console.log('当前视频流地址:', serverUrl);
        }
    });
    
    // 图像加载成功处理
    document.getElementById('cameraStream').addEventListener('load', function() {
        console.log('图像加载成功');
        if (isStreaming) {
            document.getElementById('status').textContent = '监控中';
        }
    });
    
    // 图像加载中止处理
    document.getElementById('cameraStream').addEventListener('abort', function(e) {
        console.error('图像加载中止:', e);
    });
});
