function goBack() {
    if (window.plus) {
        const current = plus.webview.currentWebview(); // 当前页面
        
        // 尝试获取上一页(page0)的webview
        const prevPage = plus.webview.getWebviewById('page0');
        
        if (prevPage) {
            // 如果找到了上一页，则显示上一页
            prevPage.show('slide-in-left', 300);
        } else {
            // 如果找不到上一页，则尝试创建并显示page0
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

// 变量初始化
let serverUrl;

// 初始化服务器地址
function initServerUrl() {
    // 优先从localStorage获取地址，如果没有则尝试从SERVER_URL构建
    let baseUrl;
    
    try {
        baseUrl = localStorage.getItem('serverIp');
        if (!baseUrl) {
            // 尝试从SERVER_URL构建
            const url = window.SERVER_URL || 'http://192.168.4.1:80';
            const urlObj = new URL(url);
            baseUrl = 'http://' + urlObj.hostname + ':8080/video';
        }
    } catch (e) {
        // 如果构建失败，使用默认地址
        baseUrl = 'http://192.168.4.1:8080/video';
    }
    
    // 确保baseUrl以http开头
    if (!baseUrl.startsWith('http')) {
        baseUrl = 'http://' + baseUrl;
    }
    
    // 保存到localStorage
    localStorage.setItem('serverIp', baseUrl.replace('/video', ''));
    
    // 构建最终的serverUrl
    serverUrl = baseUrl;
}

// 初始化服务器地址
initServerUrl();

// 显示提示信息
function showToast(message) {
    // 检查是否有plus环境
    if (window.plus) {
        plus.nativeUI.toast(message, {
            duration: 'short',
            position: 'bottom'
        });
    } else {
        // 如果没有plus环境，创建一个简单的toast
        const toast = document.createElement('div');
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            bottom: 100px;
            left: 50%;
            transform: translateX(-50%);
            padding: 10px 20px;
            background-color: rgba(0, 0, 0, 0.7);
            color: white;
            border-radius: 20px;
            z-index: 9999;
            font-size: 14px;
        `;
        
        document.body.appendChild(toast);
        
        // 2秒后移除toast
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 2000);
    }
}

// 发送开始码垛命令
function sendStartStackCommand() {
    console.log('发送开始码垛命令: stack on');
    
    // 发送开始码垛命令到服务器
    sendCommandToServer('stack on');
    
    // 显示开始码垛提示
    showToast('已发送开始码垛命令');
}

// 发送停止码垛命令
function sendStopStackCommand() {
    console.log('发送停止码垛命令: stack off');
    
    // 发送停止码垛命令到服务器
    sendCommandToServer('stack off');
    
    // 显示停止码垛提示
    showToast('已发送停止码垛命令');
}

// 发送命令到服务器
function sendCommandToServer(command) {
    if (!serverUrl) {
        initServerUrl();
    }
    
    // 构建命令发送URL
    const baseUrl = serverUrl.replace('/stream', '');
    const commandUrl = `${baseUrl}/control`; // 使用与其他页面相同的控制接口
    
    console.log('发送命令:', command);
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
    
    // 拦截硬件返回按钮事件
    if (plus.key) {
        plus.key.addEventListener('backbutton', function() {
            console.log('硬件返回按钮被按下，调用goBack函数');
            goBack();
        }, false);
        console.log('已成功注册硬件返回按钮事件监听器');
    } else {
        console.error('plus.key API不可用，无法注册返回按钮事件');
    }
}