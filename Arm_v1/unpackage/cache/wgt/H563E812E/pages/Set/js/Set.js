// Set页面JavaScript - 颜色阈值设置

// 页面状态管理 - 增强存储和初始化状态跟踪
const AppState = {
    isPlusReady: false,
    currentColor: 'blue',
    colorThresholds: {
        blue: { l_min: 0, l_max: 255, a_min: 0, a_max: 255, b_min: 0, b_max: 255 },
        red: { l_min: 0, l_max: 255, a_min: 0, a_max: 255, b_min: 0, b_max: 255 },
        green: { l_min: 0, l_max: 255, a_min: 0, a_max: 255, b_min: 0, b_max: 255 }
    },
    cameraStream: null,
    isProcessing: false,
    // HTML5+环境状态跟踪
    plusInitialized: false, // 完整初始化完成标志
    pendingInitialization: false, // 是否等待初始化完成
    storageError: false, // 存储API错误标志
    // 环境信息缓存
    environment: null, // 存储环境信息
    // 性能监控
    initTime: performance.now(), // 初始化开始时间
    lastSaveTime: null, // 上次保存时间
    lastLoadTime: null // 上次加载时间
};

// 变量初始化 - 用于存储服务器视频流地址
let originalStreamUrl;  // 原始图像视频流地址
let processedStreamUrl; // 处理图像视频流地址

// 初始化服务器地址 - 根据选中颜色动态设置视频流地址
function initServerUrl() {
     console.log('初始化服务器地址...');
     let serverUrlValue = null;
     
     // 尝试从多个来源获取SERVER_URL，优先级从高到低
     // 1. 首先尝试从document.SERVER_URL获取
     if (document.SERVER_URL) {
         serverUrlValue = document.SERVER_URL;
         console.log('从document.SERVER_URL获取:', serverUrlValue);
     }
     
     // 2. 如果document.SERVER_URL不可用，尝试从持久化存储获取
     if (!serverUrlValue) {
         try {
             // 优先使用plus.storage（H5+环境）
             if (window.plus && plus.storage) {
                 const storedUrl = plus.storage.getItem('serverUrl');
                 if (storedUrl) {
                     serverUrlValue = storedUrl;
                     console.log('从plus.storage获取SERVER_URL:', serverUrlValue);
                 }
             }
             // 其次使用localStorage（浏览器环境）
             else if (typeof localStorage !== 'undefined') {
                 const storedUrl = localStorage.getItem('serverUrl');
                 if (storedUrl) {
                     serverUrlValue = storedUrl;
                     console.log('从localStorage获取SERVER_URL:', serverUrlValue);
                 }
             }
         } catch (e) {
             console.error('从存储获取SERVER_URL失败:', e);
         }
     }
     
     // 3. 如果都失败了，使用默认值
     if (!serverUrlValue) {
         serverUrlValue = "http://192.168.0.117"; // 默认地址
         console.log('使用默认SERVER_URL:', serverUrlValue);
     }
     
     console.log('最终使用的SERVER_URL:', serverUrlValue);
     
     const currentSelectedColor = AppState.currentColor;
     console.log('当前选中的颜色:', currentSelectedColor);
    // 构建完整的视频流URLs
    originalStreamUrl = `${serverUrlValue}:9090/stream?topic=/color_set/image_result`;
    // 根据当前选中的颜色动态设置处理图像的视频流地址
    processedStreamUrl = `${serverUrlValue}:9090/stream?topic=/color_${currentSelectedColor}/image_result`;
    
    console.log('原始图像视频流地址初始化完成:', originalStreamUrl);
    console.log('处理图像视频流地址初始化完成:', processedStreamUrl);
}

/**
 * 发送字符串格式的POST请求到服务器
 * @param {string} strData - 要发送的字符串数据
 */
function sendStringToServer(strData) {
    // 确保服务器地址已初始化（和你原JSON请求的校验一致）
    if (!document.SERVER_URL) {
        console.error('服务器地址未初始化');
        return;
    }

    // 发送POST请求（字符串格式）
    fetch(`${document.SERVER_URL}:8080/control`, {
        method: 'POST',
        headers: {
            'Content-Type': 'text/plain', // 关键：指定为纯文本格式（字符串）
            // 若后端需要其他请求头（如认证），可在此添加
        },
        body: strData, // 直接传字符串，无需JSON.stringify
        credentials: 'include' // 若后端需要跨域携带Cookie，保留此配置（需后端配合）
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.text(); // 按后端返回格式接收（若返回JSON则用response.json()）
    })
    .then(result => {
        console.log('字符串发送成功，服务器响应:', result);
    })
    .catch(error => {
        console.error('字符串发送失败:', error);
    });
}

// 页面加载初始化 - 优化初始化顺序，确保HTML5+环境检测优先
document.addEventListener('DOMContentLoaded', function() {
    console.log('Set页面DOM内容加载完成');
    
    // 首先确保页面内容可见
    ensureContentVisible();
    
    // 初始化服务器地址
    initServerUrl();
    
    // 检查HTML5+环境（优先级最高）- 增强环境检测和初始化可靠性
    function checkPlusEnvironment() {
        console.log('=== 开始环境检测 ===');
        
        // 记录环境信息
        const userAgent = navigator.userAgent;
        AppState.environment = {
            isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent),
            isWebview: /HBuilder|HBuilderX/i.test(userAgent),
            userAgent: userAgent
        };
        
        console.log('设备环境:', AppState.environment.isMobile ? '移动设备' : '桌面设备');
        console.log('运行环境:', AppState.environment.isWebview ? 'WebView' : '浏览器');
        console.log('UA:', userAgent);
        
        // 检测是否在HBuilder X环境中运行
        if (window.plus) {
            console.log('HTML5+环境已就绪');
            plusReady();
            initializeAppAfterPlusReady();
        } else {
            console.log('HTML5+环境未就绪，等待plusready事件');
            
            // 标记应用处于等待初始化状态
            AppState.pendingInitialization = true;
            
            document.addEventListener('plusready', function() {
                console.log('plusready事件触发');
                plusReady();
                initializeAppAfterPlusReady();
            });
            
            // 为浏览器环境设置超时，确保即使没有plus环境也能正常初始化
            setTimeout(() => {
                if (!AppState.isPlusReady && AppState.pendingInitialization) {
                    console.log('超时：HTML5+环境未准备就绪(1秒)，在浏览器环境继续初始化');
                    AppState.pendingInitialization = false;
                    initializeAppAfterPlusReady();
                }
            }, 1000);
            
            // 添加一个更保险的5秒超时
            setTimeout(() => {
                if (AppState.pendingInitialization) {
                    console.error('严重警告: HTML5+环境长时间未就绪(5秒)，强制初始化应用');
                    AppState.pendingInitialization = false;
                    initializeAppAfterPlusReady();
                }
            }, 5000);
        }
    }
    
    // HTML5+环境准备完成或浏览器环境下的应用初始化 - 增强初始化流程和错误处理
    function initializeAppAfterPlusReady() {
        console.log('=== 开始应用初始化 ===');
        
        try {
            // 标记初始化完成
            AppState.pendingInitialization = false;
            
            // 记录初始化时间
            const initDuration = performance.now() - AppState.initTime;
            console.log(`初始化耗时: ${initDuration.toFixed(2)}ms`);
            
            // 初始化UI组件
            initBackButton();
            initColorSelector();
            initSliders();
            initSaveButton();
            
            // 先执行一次简单的存储测试，确保存储功能正常
            testStorageFunctionality();
            
            // 加载保存的阈值设置
            console.log('加载保存的阈值设置...');
            // 使用setTimeout确保DOM和环境完全就绪
            setTimeout(() => {
                loadThresholdSettings();
            }, 100);
            
            const initStringData = "color_set_enter";
            sendStringToServer(initStringData);
            
            // 延迟初始化视频流，确保页面先完全渲染
            setTimeout(() => {
                initVideoStreams();
            }, 1000);
            
            console.log('=== 应用初始化完成 ===');
        } catch (error) {
            console.error('初始化过程中发生错误:', error);
            showToast('初始化失败，请刷新页面重试');
        }
    }
    
    // 测试存储功能是否正常
    function testStorageFunctionality() {
        console.log('测试存储功能...');
        
        try {
            // 测试localStorage（浏览器备用方案）
            if (typeof localStorage !== 'undefined') {
                console.log('测试localStorage功能...');
                const testKey = 'test_storage_' + Date.now();
                const testValue = 'storage_test_value';
                
                localStorage.setItem(testKey, testValue);
                const retrieved = localStorage.getItem(testKey);
                localStorage.removeItem(testKey);
                
                console.log('localStorage测试结果:', retrieved === testValue ? '成功' : '失败');
            }
            
            // 如果在HTML5+环境，额外测试plus.storage
            if (window.plus && plus.storage) {
                console.log('测试plus.storage功能...');
                const testKey = 'test_plus_storage_' + Date.now();
                const testValue = 'plus_storage_test_value';
                
                plus.storage.setItem(testKey, testValue);
                const retrieved = plus.storage.getItem(testKey);
                plus.storage.removeItem(testKey);
                
                const success = retrieved === testValue;
                console.log('plus.storage测试结果:', success ? '成功' : '失败');
                
                if (!success) {
                    console.error('plus.storage写入和读取不一致');
                    AppState.storageError = true;
                }
            }
        } catch (e) {
            console.error('存储功能测试失败:', e);
            AppState.storageError = true;
        }
    }
    
    // 启动初始化流程
    checkPlusEnvironment();
});

// 确保页面内容可见
function ensureContentVisible() {
    // 强制显示主要内容
    const contentElements = document.querySelectorAll('.container, .video-container, .controls');
    contentElements.forEach(element => {
        if (element) {
            element.style.visibility = 'visible';
            element.style.opacity = '1';
        }
    });
    
    // 隐藏可能的加载遮罩
    const loadingOverlays = document.querySelectorAll('#loading, .loading');
    loadingOverlays.forEach(overlay => {
        if (overlay) overlay.style.display = 'none';
    });
    
    console.log('确保页面内容可见完成');
}

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

// HTML5+ 环境准备完成回调 - 增强调试和环境验证
function plusReady() {
    console.log('--- HTML5+环境准备就绪 ---');
    AppState.isPlusReady = true;
    
    // 记录HTML5+版本信息
    console.log('HBuilder X版本:', plus.os.name, plus.os.version);
    console.log('设备信息:', plus.device.model, plus.device.vendor);
    
    // 验证storage API可用性
    try {
        console.log('plus.storage API检测:');
        const storageAvailable = typeof plus.storage !== 'undefined';
        console.log('plus.storage可用:', storageAvailable);
        if (storageAvailable) {
            const storageLength = plus.storage.getLength();
            console.log('plus.storage初始存储项数量:', storageLength);
            
            // 测试存储写入和读取
            const testKey = 'threshold_test';
            const testValue = 'test_' + Date.now();
            plus.storage.setItem(testKey, testValue);
            const retrievedValue = plus.storage.getItem(testKey);
            console.log('存储测试结果 - 写入:', testValue);
            console.log('存储测试结果 - 读取:', retrievedValue);
            console.log('存储测试结果 - 成功:', retrievedValue === testValue);
            
            // 清理测试数据
            plus.storage.removeItem(testKey);
        }
    } catch (e) {
        console.error('plus.storage API测试失败:', e);
        AppState.storageError = true;
    }
    
    // 配置状态栏样式
    try {
        if (plus.navigator) {
            plus.navigator.setStatusBarStyle('light');
            plus.navigator.setStatusBarBackground('#1976d2');
            console.log('状态栏配置完成');
        } else {
            console.warn('plus.navigator不可用，跳过状态栏配置');
        }
    } catch (e) {
        console.error('状态栏配置失败:', e);
    }
    
    // 锁定屏幕方向为横屏
    try {
        if (plus.screen) {
            plus.screen.lockOrientation('landscape-primary');
            console.log('屏幕方向锁定为横屏');
        } else {
            console.warn('plus.screen不可用，跳过屏幕方向锁定');
        }
    } catch (e) {
        console.error('屏幕方向锁定失败:', e);
    }
    
    // 注册硬件返回按钮事件监听器
    try {
        if (plus.key) {
            plus.key.addEventListener('backbutton', function() {
                console.log('硬件返回按钮被按下，调用goBack函数');
                goBack();
            }, false);
            console.log('返回按钮事件注册成功');
        } else {
            console.error('plus.key API不可用，无法注册返回按钮事件');
        }
    } catch (e) {
        console.error('返回按钮事件注册失败:', e);
    }
    
    // 标记初始化完成
    AppState.plusInitialized = true;
    console.log('--- HTML5+初始化完成 ---');
    
    // 如果之前已经开始加载应用，现在完成初始化
    if (AppState.pendingInitialization) {
        console.log('执行延迟初始化流程');
        initializeAppAfterPlusReady();
    }
}

// 初始化颜色选择器
function initColorSelector() {
    console.log('初始化颜色选择器...');
    const colorButtons = document.querySelectorAll('.color-btn');
    console.log('找到颜色按钮数量:', colorButtons.length);
    
    // 只处理蓝色、红色和绿色按钮
    const validColors = ['blue', 'red', 'green'];
    
    colorButtons.forEach(button => {
        const color = button.getAttribute('data-color');
        
        // 仅为有效颜色添加事件监听
        if (validColors.includes(color)) {
            console.log('为按钮添加事件监听:', color);
            button.addEventListener('click', function() {
                console.log('颜色按钮被点击:', color);
                
                // 移除所有按钮的active类
                colorButtons.forEach(btn => btn.classList.remove('active'));
                
                // 添加当前按钮的active类
                this.classList.add('active');
                
                // 更新当前颜色
                AppState.currentColor = color;
                console.log('当前颜色更新为:', AppState.currentColor);
                
                // 更新滑条值
                updateSlidersForColor(AppState.currentColor);
                
                // 刷新视频流，使用新的颜色对应的视频流地址
                refreshVideoStreams();
                
                console.log(`切换到颜色: ${AppState.currentColor}`);
            });
        } else {
            // 隐藏黄色和紫色按钮
            button.style.display = 'none';
            console.log('隐藏非有效颜色按钮:', color);
        }
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
            
            // 向服务器发送最新的阈值数据
            sendThresholdDataToServer();
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
    
    // 切换颜色后向服务器发送最新的阈值数据
    sendThresholdDataToServer();
}

// 初始化两个视频流 - 修改为异步和容错
function initVideoStreams() {
    console.log('初始化视频流...');
    
    // 确保服务器地址已初始化
    initServerUrl();
    
    // 延迟初始化视频流，确保页面先渲染完成
    setTimeout(() => {
        // 初始化原始图像视频流（添加超时控制）
        initVideoStreamWithTimeout('originalStream', originalStreamUrl, 'originalStatus', 5000);
        
        // 初始化处理图像视频流（添加超时控制）
        initVideoStreamWithTimeout('processedStream', processedStreamUrl, 'processedStatus', 5000);
    }, 500); // 延迟500ms确保页面先显示
}

// 带超时控制的视频流初始化
function initVideoStreamWithTimeout(streamElementId, streamUrl, statusElementId, timeoutMs) {
    const streamElement = document.getElementById(streamElementId);
    const statusElement = document.getElementById(statusElementId);
    
    if (!streamElement) {
        console.error(`未找到视频流元素: ${streamElementId}`);
        return;
    }
    
    statusElement.textContent = '正在连接...';
    
    // 设置超时控制
    const timeoutId = setTimeout(() => {
        console.warn(`${streamElementId} 连接超时`);
        statusElement.textContent = '连接超时';
        streamElement.style.display = 'none'; // 隐藏失败的视频流
        
        // 显示备用内容或错误提示
        showStreamFallback(streamElementId, '视频流连接超时');
    }, timeoutMs);
    
    // 改进的错误处理
    streamElement.onload = function() {
        clearTimeout(timeoutId);
        console.log(`${streamElementId} 加载成功`);
        statusElement.textContent = '已连接';
        streamElement.style.display = 'block'; // 确保显示
    };
    
    streamElement.onerror = function(e) {
        clearTimeout(timeoutId);
        console.error(`${streamElementId} 加载错误:`, e);
        statusElement.textContent = '连接失败';
        streamElement.style.display = 'none'; // 隐藏失败的视频流
        
        // 显示备用内容
        showStreamFallback(streamElementId, '无法连接视频流');
    };
    
    // 设置crossOrigin属性
    streamElement.crossOrigin = 'anonymous';
    
    // 使用新的URL避免缓存
    const timestamp = new Date().getTime();
    const uniqueUrl = streamUrl + (streamUrl.indexOf('?') > -1 ? '&' : '?') + 't=' + timestamp;
    
    console.log(`加载视频流: ${uniqueUrl}`);
    streamElement.src = uniqueUrl;
}


// 显示视频流备用内容
function showStreamFallback(streamElementId, message) {
    const container = document.getElementById(streamElementId).parentElement;
    if (!container) return;
    
    // 检查是否已经存在备用元素
    let fallbackElement = container.querySelector('.stream-fallback');
    if (!fallbackElement) {
        fallbackElement = document.createElement('div');
        fallbackElement.className = 'stream-fallback';
        fallbackElement.style.cssText = `
            width: 100%;
            height: 100%;
            background: #f0f0f0;
            display: flex;
            justify-content: center;
            align-items: center;
            color: #666;
            font-size: 14px;
            text-align: center;
            border: 1px dashed #ccc;
        `;
        container.appendChild(fallbackElement);
    }
    
    fallbackElement.innerHTML = `
        <div>
            <p>${message}</p>
            <button onclick="retryStream('${streamElementId}')" 
                    style="margin-top: 10px; padding: 5px 10px; background: #4CAF50; color: white; border: none; border-radius: 3px;">
                重试连接
            </button>
        </div>
    `;
}
// 重试视频流连接
function retryStream(streamElementId) {
    console.log(`重试视频流: ${streamElementId}`);
    
    // 移除备用元素
    const container = document.getElementById(streamElementId).parentElement;
    const fallbackElement = container.querySelector('.stream-fallback');
    if (fallbackElement) {
        container.removeChild(fallbackElement);
    }
    
    // 重新初始化服务器地址
    initServerUrl();
    
    // 根据元素ID确定要加载的流
    let streamUrl, statusElementId;
    if (streamElementId === 'originalStream') {
        streamUrl = originalStreamUrl;
        statusElementId = 'originalStatus';
    } else {
        streamUrl = processedStreamUrl;
        statusElementId = 'processedStatus';
    }
    
    // 重新加载
    initVideoStreamWithTimeout(streamElementId, streamUrl, statusElementId, 5000);
}


// 初始化单个视频流的通用函数
function initVideoStream(streamElementId, streamUrl, statusElementId) {
    const streamElement = document.getElementById(streamElementId);
    const statusElement = document.getElementById(statusElementId);
    
    statusElement.textContent = '正在连接...';
    
    // 设置crossOrigin属性解决跨域问题
    streamElement.crossOrigin = 'anonymous';
    
    // 为图像添加加载成功事件处理
    streamElement.onload = function() {
        console.log(`${streamElementId} 加载成功`);
        statusElement.textContent = '已连接';
    };
    
    // 为图像添加错误事件处理
    streamElement.onerror = function(e) {
        console.error(`${streamElementId} 加载错误:`, e);
        statusElement.textContent = '连接失败';
    };
    
    // 添加随机时间戳参数强制避免缓存

    streamElement.src = streamUrl;
}

// 刷新视频流函数 - 供刷新按钮调用
function refreshVideoStreams() {
    console.log('开始刷新视频流...');
    
    // 重新初始化服务器地址，确保使用最新的IP
    initServerUrl();
    console.log('服务器地址已更新 - 原始流:', originalStreamUrl, '处理流:', processedStreamUrl);
    
    // 重新加载两个视频流
    loadStreamWithCacheBust('originalStream', originalStreamUrl);
    loadStreamWithCacheBust('processedStream', processedStreamUrl);
    
    // 显示刷新成功提示
    setTimeout(() => {
        showToast('视频流已刷新');
    }, 500); // 延迟显示提示，确保用户看到刷新过程
}

// 使用缓存破坏方式加载视频流
function loadStreamWithCacheBust(elementId, baseUrl) {
    const element = document.getElementById(elementId);
    const statusElement = document.getElementById(elementId === 'originalStream' ? 'originalStatus' : 'processedStatus');
    
    statusElement.textContent = '重新连接...';
    
    // 添加新的时间戳和随机数以强制重新加载
    // const timestamp = new Date().getTime();
    // const random = Math.random().toString(36).substring(7);
    element.src = baseUrl;
	console.log(element.src)
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
    

    
    // 将处理后的图像数据放回canvas
    ctx.putImageData(imageData, 0, 0);
    
    // 继续处理下一帧
    requestAnimationFrame(processVideo);
}

// 处理图像的功能现在由服务器端实现，通过/dispose端点提供
// 客户端不再需要本地处理图像，只需要显示服务器处理后的图像

// 发送阈值数据到服务器的函数
function sendThresholdDataToServer() {


    const thresholds = AppState.colorThresholds[AppState.currentColor];
    
    // 确保数值是整数（修复可能的字符串类型问题）
    const data = {
        block: {
            L_min: parseInt(thresholds.l_min, 10) || 0,
            L_max: parseInt(thresholds.l_max, 10) || 255,
            A_min: parseInt(thresholds.a_min, 10) || 0,
            A_max: parseInt(thresholds.a_max, 10) || 255,
            B_min: parseInt(thresholds.b_min, 10) || 0,
            B_max: parseInt(thresholds.b_max, 10) || 255,
            color: AppState.currentColor.toLowerCase()
        }
    };
    
    // 重点：打印发送给服务器的完整数据，检查格式是否正确
    console.log('发送给服务器的完整数据：', data);
    console.log('JSON字符串格式：', JSON.stringify(data));
    
    if (!document.SERVER_URL) {
        console.error('服务器地址未初始化');
        showToast('服务器地址未配置');
        return;
    }

    fetch(`${document.SERVER_URL}:8080/set`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
    .then(response => {
        console.log('服务器响应状态:', response.status);
        // 关键：读取服务器返回的错误信息（即使400也读取）
        return response.text().then(responseText => {
            if (!response.ok) {
                // 把服务器的错误信息抛出去，前端能看到具体原因
                throw new Error(`服务器返回错误：${responseText}（状态码：${response.status}）`);
            }
            return responseText;
        });
    })
    .then(data => {
        console.log('服务器响应:', data);
        showToast('阈值设置成功！');
    })
    .catch(error => {
        // 现在能看到服务器返回的具体错误了！
        console.error('发送数据失败:', error.message);
        // showToast(`设置失败：${error.message}`);
    });
}



// 初始化保存按钮 - 增强日志和错误处理
function initSaveButton() {
    console.log('=== 初始化保存按钮 ===');
    
    try {
        // 获取保存按钮元素
        const saveButton = document.getElementById('save-btn');
        
        if (saveButton) {
            console.log('找到保存按钮元素:', saveButton);
            
            // 记录按钮的初始状态
            console.log('保存按钮初始样式类:', saveButton.className);
            console.log('保存按钮样式:', window.getComputedStyle(saveButton).display);
            console.log('保存按钮位置:', saveButton.getBoundingClientRect());
            
            // 添加点击事件监听器
            saveButton.addEventListener('click', function(event) {
                event.preventDefault();
                event.stopPropagation();
                console.log('保存按钮被点击');
                
                // 记录点击时的环境状态
                console.log('点击时环境状态:');
                console.log('- HTML5+可用:', !!window.plus);
                console.log('- plus.storage可用:', window.plus ? !!plus.storage : false);
                console.log('- 存储错误标志:', AppState.storageError);
                console.log('- 当前颜色阈值数据:', JSON.stringify(AppState.colorThresholds));
                
                // 禁用按钮防止重复点击
                saveButton.disabled = true;
                saveButton.style.opacity = '0.7';
                
                // 执行保存操作
                saveThresholdSettings();
                
                // 短暂延迟后恢复按钮状态
                setTimeout(() => {
                    saveButton.disabled = false;
                    saveButton.style.opacity = '1';
                }, 500);
            });
            
            // 添加辅助信息
            console.log('保存按钮初始化完成');
            console.log('点击此按钮将调用saveThresholdSettings函数');
            
            // 如果检测到存储错误，给用户提示
            if (AppState.storageError) {
                console.warn('检测到存储错误，可能影响保存功能');
                saveButton.title = '存储功能可能存在问题';
            }
        } else {
            console.error('严重错误: 未找到保存按钮元素(#save-btn)');
            // 尝试查找所有按钮元素进行调试
            const allButtons = document.querySelectorAll('button, .button, .save-btn-header');
            console.log('页面上找到的按钮元素数量:', allButtons.length);
            allButtons.forEach((btn, index) => {
                console.log(`按钮[${index}]:`, btn.id, btn.className, btn.textContent);
            });
        }
    } catch (error) {
        console.error('初始化保存按钮时发生错误:', error);
    }
}

// 保存阈值设置 - 增强在HTML5+环境下的可靠性
function saveThresholdSettings() {
    console.log('保存阈值设置...');
    
    // 构建保存的数据对象
    const saveData = {
        colorThresholds: AppState.colorThresholds,
        lastSaved: new Date().toISOString()
    };
    
    // 确保数据格式正确
    console.log('即将保存的数据:', JSON.stringify(saveData));
    
    // 使用更健壮的方式检测环境并保存数据
    let saveSuccess = false;
    
    try {
        // 1. 首先尝试HTML5+环境的plus.storage（针对手机预览）
        if (window.plus) {
            console.log('检测到HTML5+环境');
            if (plus.storage) {
                console.log('plus.storage可用，尝试保存设置');
                
                // 清除之前可能存在的数据，避免存储冲突
                try {
                    plus.storage.removeItem('colorThresholds');
                    console.log('已清除旧数据');
                } catch (e) {
                    console.log('清除旧数据失败（可能不存在）:', e);
                }
                
                // 保存新数据
                const settings = JSON.stringify(saveData);
                const setResult = plus.storage.setItem('colorThresholds', settings);
                console.log('plus.storage.setItem结果:', setResult);
                
                // 立即验证保存是否成功
                const saved = plus.storage.getItem('colorThresholds');
                console.log('plus.storage读取结果存在性:', !!saved);
                
                if (saved) {
                    // 验证数据完整性
                    try {
                        const parsed = JSON.parse(saved);
                        console.log('保存的数据解析成功，colorThresholds字段存在:', !!parsed.colorThresholds);
                        saveSuccess = true;
                        showToast('设置已成功保存到手机');
                    } catch (e) {
                        console.error('保存的数据格式错误:', e);
                    }
                }
            } else {
                console.error('plus.storage不可用');
            }
        } else {
            console.log('未检测到HTML5+环境');
        }
        
        // 2. 如果HTML5+保存失败或不可用，尝试localStorage（针对浏览器和备用方案）
        if (!saveSuccess && typeof localStorage !== 'undefined') {
            console.log('尝试使用localStorage保存设置');
            try {
                const settings = JSON.stringify(saveData);
                localStorage.setItem('colorThresholds', settings);
                // 验证保存是否成功
                const saved = localStorage.getItem('colorThresholds');
                if (saved) {
                    console.log('阈值设置已保存到localStorage');
                    saveSuccess = true;
                    showToast('设置已成功保存到浏览器');
                }
            } catch (e) {
                console.error('localStorage保存失败:', e);
            }
        }
        
        if (!saveSuccess) {
            console.error('无法保存设置，所有存储方式均失败');
            showToast('保存失败，请重试');
        }
    } catch (e) {
        console.error('保存阈值设置异常:', e);
        showToast('保存失败，请重试');
    }
    
    // 保存成功后也向服务器发送最新设置
    sendThresholdDataToServer();
}

// 加载阈值设置 - 增强在HTML5+环境下的可靠性
function loadThresholdSettings() {
    console.log('加载阈值设置...');
    let loadSuccess = false;
    
    // 提取通用的设置解析函数
    function parseAndApplySettings(settingsData) {
        try {
            console.log('解析设置数据，长度:', settingsData.length);
            const parsedData = JSON.parse(settingsData);
            // 兼容旧版本数据格式并过滤无效颜色
            let thresholdsToLoad = parsedData.colorThresholds || parsedData;
            // 过滤，只保留有效的蓝色、红色和绿色设置
            const filteredThresholds = {};
            ['blue', 'red', 'green'].forEach(color => {
                if (thresholdsToLoad[color]) {
                    filteredThresholds[color] = thresholdsToLoad[color];
                    console.log(`加载${color}设置:`, thresholdsToLoad[color]);
                } else {
                    // 如果没有保存的值，则使用默认值
                    filteredThresholds[color] = { l_min: 0, l_max: 255, a_min: 0, a_max: 255, b_min: 0, b_max: 255 };
                    console.log(`使用${color}默认设置`);
                }
            });
            AppState.colorThresholds = filteredThresholds;
            console.log('阈值设置已成功解析并应用');
            updateSlidersForColor(AppState.currentColor);
            showToast('设置已加载');
            return true;
        } catch (e) {
            console.error('解析设置数据失败:', e);
            return false;
        }
    }
    
    try {
        // 1. 首先尝试从HTML5+ plus.storage加载（针对手机预览）
        if (window.plus) {
            console.log('检测到HTML5+环境，尝试从plus.storage加载');
            if (plus.storage) {
                console.log('plus.storage可用，开始读取设置');
                
                // 获取plus.storage中的所有键，用于调试
                try {
                    const length = plus.storage.getLength();
                    console.log('plus.storage存储项数量:', length);
                    for (let i = 0; i < length; i++) {
                        const key = plus.storage.key(i);
                        console.log(`plus.storage键[${i}]:`, key);
                    }
                } catch (e) {
                    console.log('获取plus.storage键列表失败:', e);
                }
                
                // 尝试读取colorThresholds设置
                const settings = plus.storage.getItem('colorThresholds');
                console.log('从plus.storage读取colorThresholds结果存在性:', !!settings);
                
                if (settings && settings.trim() !== '') {
                    console.log('plus.storage中找到设置，尝试解析');
                    loadSuccess = parseAndApplySettings(settings);
                } else {
                    console.log('plus.storage中未找到有效的设置数据');
                }
            } else {
                console.error('plus.storage不可用');
            }
        } else {
            console.log('未检测到HTML5+环境');
        }
        
        // 2. 如果HTML5+加载失败或未找到设置，尝试localStorage（针对浏览器和备用方案）
        if (!loadSuccess && typeof localStorage !== 'undefined') {
            console.log('尝试从localStorage加载设置');
            try {
                const settings = localStorage.getItem('colorThresholds');
                console.log('从localStorage读取设置存在性:', !!settings);
                if (settings && settings.trim() !== '') {
                    loadSuccess = parseAndApplySettings(settings);
                } else {
                    console.log('localStorage中未找到有效的设置数据');
                }
            } catch (e) {
                console.error('localStorage读取失败:', e);
            }
        }
        
        // 如果都加载失败，使用默认值
        if (!loadSuccess) {
            console.log('所有存储方式均未找到设置，使用默认值');
            // 已经在AppState中初始化了默认值
            updateSlidersForColor(AppState.currentColor);
        }
    } catch (e) {
        console.error('加载阈值设置异常:', e);
        showToast('加载设置失败，使用默认值');
    }
}

// 返回上一页
function goBack() {
	const initStringData = "set_off"; // 替换为实际字符串
	// 2. 调用字符串请求函数
	sendStringToServer(initStringData);
	console.log(initStringData)
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




// 长按相关变量
let longPressTimer = null;
let isLongPress = false;
const LONG_PRESS_DELAY = 300; // 长按触发延迟（毫秒）
const AUTO_REPEAT_INTERVAL = 100; // 自动重复间隔（毫秒）

// 滑块微调函数
function adjustSliderValue(sliderId, delta) {
    console.log(`调整滑块 ${sliderId} 值，变化量: ${delta}`);
    const slider = document.getElementById(sliderId);
    if (!slider) {
        console.error('未找到滑块元素:', sliderId);
        return;
    }
    
    // 获取当前值并计算新值
    let currentValue = parseInt(slider.value, 10);
    let newValue = currentValue + delta;
    
    // 确保新值在有效范围内
    newValue = Math.max(parseInt(slider.min, 10), Math.min(parseInt(slider.max, 10), newValue));
    
    if (newValue !== currentValue) {
        // 更新滑块值
        slider.value = newValue;
        
        // 更新显示值
        const valueSpan = document.getElementById(`${sliderId}-value`);
        if (valueSpan) {
            valueSpan.textContent = newValue;
            console.log('更新显示值:', valueSpan.id, valueSpan.textContent);
        }
        
        // 更新当前颜色的阈值
        const thresholdType = sliderId.split('-')[0]; // l, a, b
        const minMax = sliderId.split('-')[1]; // min, max
        
        AppState.colorThresholds[AppState.currentColor][`${thresholdType}_${minMax}`] = parseInt(newValue);
        console.log('更新阈值:', AppState.currentColor, `${thresholdType}_${minMax}`, newValue);
        
        // 向服务器发送最新的阈值数据
        sendThresholdDataToServer();
    }
}

// 初始化长按功能
function initLongPressButtons() {
    // 获取所有滑块箭头按钮
    const arrowButtons = document.querySelectorAll('.slider-arrow');
    
    arrowButtons.forEach(button => {
        // 获取按钮关联的滑块ID和调整方向
        const onclickAttr = button.getAttribute('onclick');
        if (onclickAttr && onclickAttr.includes('adjustSliderValue')) {
            // 提取sliderId和delta参数
            const matches = onclickAttr.match(/adjustSliderValue\('([^']+)',\s*(-?\d+)\)/);
            if (matches && matches.length === 3) {
                const sliderId = matches[1];
                const delta = parseInt(matches[2]);
                
                // 移除原有的onclick属性，避免重复触发
                button.removeAttribute('onclick');
                
                // 添加点击事件
                button.addEventListener('click', () => {
                    adjustSliderValue(sliderId, delta);
                });
                
                // 触摸开始事件
                button.addEventListener('touchstart', (e) => {
                    e.preventDefault(); // 防止浏览器默认行为
                    
                    // 先执行一次调整
                    adjustSliderValue(sliderId, delta);
                    
                    // 设置长按定时器
                    longPressTimer = setTimeout(() => {
                        isLongPress = true;
                        // 持续调整函数
                        function repeatAdjust() {
                            if (isLongPress) {
                                adjustSliderValue(sliderId, delta);
                                longPressTimer = setTimeout(repeatAdjust, AUTO_REPEAT_INTERVAL);
                            }
                        }
                        repeatAdjust();
                    }, LONG_PRESS_DELAY);
                });
                
                // 触摸结束事件
                function handleTouchEnd() {
                    clearTimeout(longPressTimer);
                    isLongPress = false;
                }
                
                button.addEventListener('touchend', handleTouchEnd);
                button.addEventListener('touchcancel', handleTouchEnd);
            }
        }
    });
}

// 在页面加载完成后初始化长按功能
document.addEventListener('DOMContentLoaded', initLongPressButtons);

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