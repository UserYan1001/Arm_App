// Set页面JavaScript - 颜色阈值设置

// 页面状态管理
const AppState = {
    isPlusReady: false,
    currentColor: 'black',
    colorThresholds: {
        black: { l_min: 0, l_max: 255, a_min: 0, a_max: 255, b_min: 0, b_max: 255 },
        white: { l_min: 0, l_max: 255, a_min: 0, a_max: 255, b_min: 0, b_max: 255 },
        blue: { l_min: 0, l_max: 255, a_min: 0, a_max: 255, b_min: 0, b_max: 255 },
        red: { l_min: 0, l_max: 255, a_min: 0, a_max: 255, b_min: 0, b_max: 255 },
        green: { l_min: 0, l_max: 255, a_min: 0, a_max: 255, b_min: 0, b_max: 255 }
    },
    cameraStream: null,
    isProcessing: false
};

// 页面加载初始化
document.addEventListener('DOMContentLoaded', function() {
    console.log('Set页面DOM内容加载完成');
    
    // 初始化返回按钮
    initBackButton();
    
    // 初始化颜色选择器
    initColorSelector();
    
    // 初始化滑条
    initSliders();
    
    // 初始化摄像头
    initCamera();
    
    // 初始化保存按钮
    initSaveButton();
    
    // 加载保存的阈值设置
    loadThresholdSettings();
    
    // 检查HTML5+环境
    if (window.plus) {
        plusReady();
    } else {
        document.addEventListener('plusready', plusReady);
    }
});

// 初始化返回按钮
function initBackButton() {
    console.log('初始化返回按钮...');
    const backButton = document.getElementById('back-button');
    
    if (backButton) {
        console.log('找到返回按钮，添加点击事件');
        backButton.addEventListener('click', function() {
            console.log('返回按钮被点击');
            goBack();
        });
    } else {
        console.error('找不到返回按钮元素');
    }
}

// HTML5+环境准备完成
function plusReady() {
    console.log('HTML5+环境准备完成');
    AppState.isPlusReady = true;
    
    // 设置状态栏样式
    if (plus.navigator) {
        plus.navigator.setStatusBarStyle('light');
    }
    
    // 设置横屏锁定
    if (plus.screen) {
        plus.screen.lockOrientation('landscape-primary');
    }
    
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

// 初始化颜色选择器
function initColorSelector() {
    console.log('初始化颜色选择器...');
    const colorButtons = document.querySelectorAll('.color-btn');
    console.log('找到颜色按钮数量:', colorButtons.length);
    
    colorButtons.forEach(button => {
        console.log('为按钮添加事件监听:', button.getAttribute('data-color'));
        button.addEventListener('click', function() {
            console.log('颜色按钮被点击:', this.getAttribute('data-color'));
            
            // 移除所有按钮的active类
            colorButtons.forEach(btn => btn.classList.remove('active'));
            
            // 添加当前按钮的active类
            this.classList.add('active');
            
            // 更新当前颜色
            AppState.currentColor = this.getAttribute('data-color');
            console.log('当前颜色更新为:', AppState.currentColor);
            
            // 更新滑条值
            updateSlidersForColor(AppState.currentColor);
            
            console.log(`切换到颜色: ${AppState.currentColor}`);
        });
    });
}

// 初始化滑条
function initSliders() {
    console.log('初始化滑条...');
    const sliders = document.querySelectorAll('.slider');
    console.log('找到滑条数量:', sliders.length);
    
    sliders.forEach(slider => {
        console.log('为滑条添加事件监听:', slider.id);
        slider.addEventListener('input', function() {
            console.log('滑条值变化:', this.id, this.value);
            
            // 更新显示值
            const valueSpan = document.getElementById(`${this.id}-value`);
            if (valueSpan) {
                valueSpan.textContent = this.value;
                console.log('更新显示值:', valueSpan.id, valueSpan.textContent);
            } else {
                console.error('找不到显示值元素:', `${this.id}-value`);
            }
            
            // 更新当前颜色的阈值
            const thresholdType = this.id.split('-')[0]; // l, a, b
            const minMax = this.id.split('-')[1]; // min, max
            
            AppState.colorThresholds[AppState.currentColor][`${thresholdType}_${minMax}`] = parseInt(this.value);
            console.log('更新阈值:', AppState.currentColor, `${thresholdType}_${minMax}`, this.value);
            
            // 处理图像
            processImage();
        });
    });
}

// 更新滑条值以匹配当前颜色
function updateSlidersForColor(color) {
    const thresholds = AppState.colorThresholds[color];
    
    // 更新L值滑条
    document.getElementById('l-min').value = thresholds.l_min;
    document.getElementById('l-max').value = thresholds.l_max;
    document.getElementById('l-min-value').textContent = thresholds.l_min;
    document.getElementById('l-max-value').textContent = thresholds.l_max;
    
    // 更新a值滑条
    document.getElementById('a-min').value = thresholds.a_min;
    document.getElementById('a-max').value = thresholds.a_max;
    document.getElementById('a-min-value').textContent = thresholds.a_min;
    document.getElementById('a-max-value').textContent = thresholds.a_max;
    
    // 更新b值滑条
    document.getElementById('b-min').value = thresholds.b_min;
    document.getElementById('b-max').value = thresholds.b_max;
    document.getElementById('b-min-value').textContent = thresholds.b_min;
    document.getElementById('b-max-value').textContent = thresholds.b_max;
    
    // 处理图像
    processImage();
}

// 初始化摄像头
function initCamera() {
    const cameraStream = document.getElementById('cameraStream');
    const canvas = document.getElementById('processed-canvas');
    const status = document.getElementById('status');
    
    // 从服务器获取视频流
    if (window.Connect_Net) {
        status.textContent = '正在连接...';
        
        Connect_Net.initCameraStream(
            // 成功回调
            function(streamUrl) {
                cameraStream.src = streamUrl;
                status.textContent = '已连接';
                
                // 等待图像加载完成
                cameraStream.onload = function() {
                    // 设置canvas尺寸与图像相同
                    canvas.width = cameraStream.naturalWidth;
                    canvas.height = cameraStream.naturalHeight;
                    
                    // 开始处理图像
                    AppState.isProcessing = true;
                    processImage();
                };
            },
            // 错误回调
            function(error) {
                console.error('无法连接到服务器:', error);
                status.textContent = '连接失败';
                showCameraError();
            }
        );
    } else {
        // console.error('Connect_Net模块未加载');
        // status.textContent = '模块加载失败';
        // showCameraError();
    }
}

// 显示摄像头错误信息
function showCameraError() {
    const videoContainer = document.querySelector('.video-container');
    const errorMessage = document.createElement('div');
    errorMessage.className = 'camera-error';
    errorMessage.innerHTML = `
        <p>无法连接到服务器</p>
        <p>请检查服务器连接状态</p>
    `;
    errorMessage.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        background: rgba(0, 0, 0, 0.7);
        color: white;
        text-align: center;
        padding: 20px;
    `;
    videoContainer.appendChild(errorMessage);
}

// 处理视频流
function processVideo() {
    if (!AppState.isProcessing) return;
    
    const video = document.getElementById('camera-feed');
    const canvas = document.getElementById('processed-canvas');
    const ctx = canvas.getContext('2d');
    
    // 绘制当前视频帧到canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // 获取图像数据
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // 获取当前颜色的阈值
    const thresholds = AppState.colorThresholds[AppState.currentColor];
    
    // 应用颜色阈值
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        // 转换为LAB颜色空间
        const lab = rgbToLab(r, g, b);
        
        // 检查是否在阈值范围内
        if (lab.l >= thresholds.l_min && lab.l <= thresholds.l_max &&
            lab.a >= thresholds.a_min && lab.a <= thresholds.a_max &&
            lab.b >= thresholds.b_min && lab.b <= thresholds.b_max) {
            // 在范围内，保留原色或设置为白色
            // data[i] = 255;     // R
            // data[i + 1] = 255; // G
            // data[i + 2] = 255; // B
        } else {
            // 不在范围内，设置为黑色
            data[i] = 0;     // R
            data[i + 1] = 0; // G
            data[i + 2] = 0; // B
        }
    }
    
    // 将处理后的图像数据放回canvas
    ctx.putImageData(imageData, 0, 0);
    
    // 继续处理下一帧
    requestAnimationFrame(processVideo);
}

// 处理单张图像
function processImage() {
    const cameraStream = document.getElementById('cameraStream');
    const canvas = document.getElementById('processed-canvas');
    const ctx = canvas.getContext('2d');
    
    if (!cameraStream.naturalWidth || !cameraStream.naturalHeight) return;
    
    // 绘制当前图像帧到canvas
    ctx.drawImage(cameraStream, 0, 0, canvas.width, canvas.height);
    
    // 获取图像数据
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // 获取当前颜色的阈值
    const thresholds = AppState.colorThresholds[AppState.currentColor];
    
    // 应用颜色阈值
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        // 转换为LAB颜色空间
        const lab = rgbToLab(r, g, b);
        
        // 检查是否在阈值范围内
        if (lab.l >= thresholds.l_min && lab.l <= thresholds.l_max &&
            lab.a >= thresholds.a_min && lab.a <= thresholds.a_max &&
            lab.b >= thresholds.b_min && lab.b <= thresholds.b_max) {
            // 在范围内，保留原色或设置为白色
            // data[i] = 255;     // R
            // data[i + 1] = 255; // G
            // data[i + 2] = 255; // B
        } else {
            // 不在范围内，设置为黑色
            data[i] = 0;     // R
            data[i + 1] = 0; // G
            data[i + 2] = 0; // B
        }
    }
    
    // 将处理后的图像数据放回canvas
    ctx.putImageData(imageData, 0, 0);
    
    // 继续处理下一帧
    requestAnimationFrame(processImage);
}

// RGB转LAB颜色空间
function rgbToLab(r, g, b_input) {
    // 首先将RGB转换为XYZ
    let [x, y, z] = rgbToXyz(r, g, b_input);
    
    // 然后将XYZ转换为LAB
    x = x / 95.047;  // 参考白点的X值
    y = y / 100.0;   // 参考白点的Y值
    z = z / 108.883; // 参考白点的Z值
    
    x = x > 0.008856 ? Math.pow(x, 1/3) : (7.787 * x + 16/116);
    y = y > 0.008856 ? Math.pow(y, 1/3) : (7.787 * y + 16/116);
    z = z > 0.008856 ? Math.pow(z, 1/3) : (7.787 * z + 16/116);
    
    const l = 116 * y - 16;
    const a = 500 * (x - y);
    const b = 200 * (y - z);
    
    // 将值映射到0-255范围以便于滑条控制
    return {
        l: Math.round(l * 2.55),  // 0-100映射到0-255
        a: Math.round(a + 128),   // -128到127映射到0-255
        b: Math.round(b + 128)    // -128到127映射到0-255
    };
}

// RGB转XYZ颜色空间
function rgbToXyz(r, g, b_input) {
    // 将RGB值归一化到0-1范围
    r = r / 255;
    g = g / 255;
    b = b_input / 255;
    
    // 应用gamma校正
    r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
    g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
    b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;
    
    // 应用RGB到XYZ转换矩阵
    const x = r * 0.4124 + g * 0.3576 + b * 0.1805;
    const y = r * 0.2126 + g * 0.7152 + b * 0.0722;
    const z = r * 0.0193 + g * 0.1192 + b * 0.9505;
    
    // 返回XYZ值，缩放到0-100范围
    return [
        x * 100,
        y * 100,
        z * 100
    ];
}

// 初始化保存按钮
function initSaveButton() {
    console.log('初始化保存按钮...');
    const saveButton = document.getElementById('save-btn');
    
    if (saveButton) {
        console.log('找到保存按钮，添加点击事件');
        console.log('保存按钮样式:', window.getComputedStyle(saveButton).display);
        console.log('保存按钮位置:', saveButton.getBoundingClientRect());
        saveButton.addEventListener('click', function() {
            console.log('保存按钮被点击');
            saveThresholdSettings();
            showToast('阈值设置已保存');
        });
    } else {
        console.error('找不到保存按钮元素');
    }
}

// 保存阈值设置
function saveThresholdSettings() {
    // 在HTML5+环境中，保存到本地存储
    if (AppState.isPlusReady && plus.storage) {
        try {
            const settings = JSON.stringify(AppState.colorThresholds);
            plus.storage.setItem('colorThresholds', settings);
            console.log('阈值设置已保存到本地存储');
        } catch (e) {
            console.error('保存阈值设置失败:', e);
        }
    } else {
        // 在浏览器环境中，保存到localStorage
        try {
            const settings = JSON.stringify(AppState.colorThresholds);
            localStorage.setItem('colorThresholds', settings);
            console.log('阈值设置已保存到localStorage');
        } catch (e) {
            console.error('保存阈值设置失败:', e);
        }
    }
}

// 加载阈值设置
function loadThresholdSettings() {
    // 在HTML5+环境中，从本地存储加载
    if (AppState.isPlusReady && plus.storage) {
        try {
            const settings = plus.storage.getItem('colorThresholds');
            if (settings) {
                AppState.colorThresholds = JSON.parse(settings);
                console.log('阈值设置已从本地存储加载');
                updateSlidersForColor(AppState.currentColor);
            }
        } catch (e) {
            console.error('加载阈值设置失败:', e);
        }
    } else {
        // 在浏览器环境中，从localStorage加载
        try {
            const settings = localStorage.getItem('colorThresholds');
            if (settings) {
                AppState.colorThresholds = JSON.parse(settings);
                console.log('阈值设置已从localStorage加载');
                updateSlidersForColor(AppState.currentColor);
            }
        } catch (e) {
            console.error('加载阈值设置失败:', e);
        }
    }
}

// 返回上一页
function goBack() {
    try {
        // 获取当前页面的webview
        const current = plus.webview.currentWebview();
        
        // 尝试获取上一页(page0)的webview
        const prevPage = plus.webview.getWebviewById('page0');
        
        if (prevPage) {
            // 如果找到了上一页，则显示上一页
            prevPage.show('slide-in-left', 300);
        } else {
            // 如果找不到上一页，则创建并显示page0
            const page0Path = '../Arm/page0/index.html';
            plus.webview.create(page0Path, 'page0').show('slide-in-left', 300);
        }
        
        // 关闭当前页面
        current.close();
    } catch (e) {
        console.error('页面跳转失败:', e);
        // 浏览器环境下的备用方案
        window.location.href = '../Arm/page0/index.html';
    }
}
    

// Toast消息显示
function showToast(message, duration = 2000) {
    if (AppState.isPlusReady && plus.nativeUI) {
        plus.nativeUI.toast(message, {duration: duration});
    } else {
        const toast = document.createElement('div');
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0,0,0,0.7);
            color: white;
            padding: 10px 20px;
            border-radius: 5px;
            z-index: 9999;
            font-size: 14px;
        `;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            document.body.removeChild(toast);
        }, duration);
    }
}