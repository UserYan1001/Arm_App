function goBack() {
	const initStringData = "uart_close"; // 替换实际字符串
	// 2. 调用字符串请求函数
	sendStringToServer(initStringData);
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

// 关节值数组，存储6个关节的当前值，范围500-2500
let jointValues = [1500, 1500, 1500, 1500, 1500, 1500];

// 长按相关变量
let longPressTimers = [];
let isPressed = [];

// 更新关节值显示
function updateJointValue(jointIndex, value) {
    jointValues[jointIndex] = parseInt(value);
    const valueElement = document.getElementById(`value${jointIndex}`);
    if (valueElement) {
        valueElement.textContent = `${value}`;
    }
    // 发送命令到服务器控制机械臂
    sendJointCommand(jointIndex, value);
}

// 通过加减按钮调整关节值
function adjustJointValue(jointIndex, step) {
    let newValue = jointValues[jointIndex] + step;
    // 确保值在有效范围内 500-2500
    newValue = Math.max(500, Math.min(2500, newValue));
    
    // 更新滑条位置
    const slider = document.getElementById(`slider${jointIndex}`);
    if (slider) {
        slider.value = newValue;
    }
    
    // 更新显示并发送命令
    updateJointValue(jointIndex, newValue);
}

// 发送箭头按钮控制命令到服务器
function sendArrowCommand(jointIndex, direction, state) {
    // 根据用户要求的格式构建命令
    let angleValue = 3000; // 默认值，用于松开状态
    
    if (state === 'on') {
        if (direction === 'right') {
            angleValue = 2400; // 按下右箭头
        } else if (direction === 'left') {
            angleValue = 600; // 按下左箭头
        }
    } else if (state === 'off' || direction === 'all') {
        angleValue = 3000; // 松开按钮（无论左右）
    }
    
    console.log(`发送关节${jointIndex + 1}控制命令: joint=${jointIndex + 1}, angle=${angleValue}`);
    
    // 每次发送命令前都重新初始化服务器地址，确保使用最新的IP
    initServerUrl();
    
    // 从视频流URL中提取基础URL
    let serverUrlValue = document.SERVER_URL;
    const commandUrl = `${serverUrlValue}:8080/joint`;
    
    // 构建命令数据
    const commandData = {
        joint: jointIndex + 1,  // 关节编号从1开始
        angle: angleValue
    };
    
    // 发送实际的HTTP请求到机械臂控制接口
    fetch(commandUrl, { 
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(commandData)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP错误! 状态: ${response.status}`);
        }
        return response.text();
    })
    .then(data => {
        console.log('控制响应:', data);
        if (data === "OK") {
            console.log("命令执行成功");
        }
    })
    .catch(error => {
        console.error('控制错误:', error);
    });
}

// 处理按钮按下事件
function handleButtonDown(jointIndex, step) {
    if (!isPressed[jointIndex]) {
        isPressed[jointIndex] = true;
        // 确定方向（step为正表示right，为负表示left）
        const direction = step > 0 ? 'right' : 'left';
        // 发送按下命令
        sendArrowCommand(jointIndex, direction, 'on');
    }
}

// 处理按钮释放事件
function handleButtonUp(jointIndex) {
    isPressed[jointIndex] = false;
    if (longPressTimers[jointIndex]) {
        clearInterval(longPressTimers[jointIndex]);
    }
    
    // 找到与该关节相关的按钮，确定方向
    const minusBtn = document.getElementById(`minus${jointIndex}`);
    const plusBtn = document.getElementById(`plus${jointIndex}`);
    
    // 检查哪个按钮被释放（通过isPressed状态和事件触发）
    // 这里简化处理，分别尝试发送两种方向的off命令
    // 实际应用中可以更精确地记录哪个按钮被按下
    sendArrowCommand(jointIndex, 'all', 'off');

}

// 一键复位所有关节
function resetAllJoints() {
	// 循环更新所有6个关节到中心位置（1500）
	for (let i = 0; i < 6; i++) {
		const slider = document.getElementById(`slider${i}`);
		if (slider) {
			slider.value = 1500;
		}
	}
    
    // 发送全局复位命令（如果需要）
    sendJointCommand(254, 1500);
    
    // 更新关节值数组
    jointValues = [1500, 1500, 1500, 1500, 1500, 1500];
    
    showToast('所有关节已复位');
}

// 发送关节控制命令到服务器
function sendJointCommand(jointIndex, value) {
    console.log(`发送关节${jointIndex + 1}控制命令: ${value}度`);
    
    // 每次发送命令前都重新初始化服务器地址，确保使用最新的IP
    initServerUrl();
    
    // 从视频流URL中提取基础URL
	let serverUrlValue = document.SERVER_URL;
    const commandUrl = `${serverUrlValue}:8080/joint`;
    
    // 构建命令数据
    const commandData = {
        joint: jointIndex + 1,  // 关节编号从1开始
        angle: value
    };
    
    // 发送实际的HTTP请求到机械臂控制接口
    fetch(commandUrl, { 
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(commandData)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP错误! 状态: ${response.status}`);
        }
        // 服务器返回的是文本"OK"，而不是JSON，所以使用text()方法解析
        return response.text();
    })
    .then(data => {
        console.log('控制响应:', data); // 这里会输出"OK"
        // 可以添加额外的成功处理逻辑
        if (data === "OK") {
            console.log("命令执行成功");
            // 例如：显示成功提示给用户
        }
    })
    .catch(error => {
        console.error('控制错误:', error);
        // 可以添加错误处理逻辑，如显示错误提示
    });
}


// 显示拍照成功弹窗
function showSuccessModal() {
    const modal = document.getElementById('successModal');
    if (modal) {
        modal.style.display = 'flex';
        // 为弹窗内容添加动画效果
        setTimeout(() => {
            modal.querySelector('.modal-content').classList.add('show');
        }, 10);
    }
}

// 关闭拍照成功弹窗
function closeSuccessModal() {
    const modal = document.getElementById('successModal');
    if (modal) {
        const modalContent = modal.querySelector('.modal-content');
        modalContent.classList.remove('show');
        // 等待动画完成后隐藏弹窗
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300);
    }
}

// 截取摄像头画面并保存
function captureImage() {
    // 声明变量在函数顶部，避免作用域问题
    const cameraElement = document.getElementById('cameraStream');
    const statusElement = document.getElementById('status');
    
    try {
        // 检查是否有可用的摄像头元素
        if (!cameraElement || !cameraElement.complete || cameraElement.naturalHeight === 0) {
            console.log('摄像头画面不可用');
            if (statusElement) {
                statusElement.textContent = '请先开始视频流';
                setTimeout(() => {
                    statusElement.textContent = '加载成功';
                }, 2000);
            }
            return;
        }
        
        // 创建canvas用于截图
        const canvas = document.createElement('canvas');
        canvas.width = cameraElement.naturalWidth || cameraElement.offsetWidth;
        canvas.height = cameraElement.naturalHeight || cameraElement.offsetHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(cameraElement, 0, 0, canvas.width, canvas.height);
        
        // 生成当前时间作为文件名
        const now = new Date();
        const timestamp = now.getFullYear() + 
                        String(now.getMonth() + 1).padStart(2, '0') + 
                        String(now.getDate()).padStart(2, '0') + 
                        String(now.getHours()).padStart(2, '0') + 
                        String(now.getMinutes()).padStart(2, '0') + 
                        String(now.getSeconds()).padStart(2, '0');
        const fileName = `机体遥控${timestamp}.jpg`;
        const fullPath = '_documents/photo/' + fileName;
        
        // 获取canvas的dataURL，处理可能的安全错误
        let dataURL, base64;
        try {
            dataURL = canvas.toDataURL('image/jpeg', 0.9);
            base64 = dataURL.replace('data:image/jpeg;base64,', '');
        } catch (securityError) {
            console.error('Canvas安全错误，无法导出图片:', securityError);
            
            // 显示错误状态
            if (statusElement) {
                statusElement.textContent = '截图失败：安全限制';
                setTimeout(() => {
                    statusElement.textContent = '加载成功';
                }, 2000);
            }
            
            // 创建一个简单的灰色占位图作为降级方案
            const placeholderCanvas = document.createElement('canvas');
            placeholderCanvas.width = canvas.width;
            placeholderCanvas.height = canvas.height;
            const placeholderCtx = placeholderCanvas.getContext('2d');
            placeholderCtx.fillStyle = '#cccccc';
            placeholderCtx.fillRect(0, 0, canvas.width, canvas.height);
            
            // 添加错误文字
            placeholderCtx.fillStyle = '#ff0000';
            placeholderCtx.font = '16px Arial';
            placeholderCtx.textAlign = 'center';
            placeholderCtx.fillText('截图失败：安全限制', canvas.width / 2, canvas.height / 2);
            
            // 使用占位图
            dataURL = placeholderCanvas.toDataURL('image/jpeg');
            base64 = dataURL.replace('data:image/jpeg;base64,', '');
        }
        
        // 尝试在HTML5+环境中保存图片，失败则自动降级到浏览器模式
        try {
            // 增强的环境检测，确保在移动设备上正确识别
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            console.log('设备检测 - 是否移动设备:', isMobile, '是否有plus对象:', !!window.plus);
            
            // 检查是否在HTML5+环境中或移动设备中
            if (window.plus || isMobile) {
                console.log('HTML5+环境或移动设备环境可用，优先尝试保存到相册');
                
                // 优先尝试使用plus.gallery.saveImageToGallery保存到系统相册
                if (window.plus && plus.gallery && typeof plus.gallery.saveImageToGallery === 'function') {
                    console.log('尝试使用plus.gallery.saveImageToGallery保存到系统相册');
                    
                    // 先将图片保存到临时文件
                    if (plus.io && typeof plus.io.writeFile === 'function') {
                        plus.io.writeFile(fullPath, base64, 'base64', function() {
                            console.log('临时文件保存成功:', fullPath);
                            
                            // 然后保存到相册
                            plus.gallery.saveImageToGallery(fullPath, function() {
                                console.log('图片已保存到系统相册');
                                
                                // 显示状态反馈
                                if (statusElement) {
                                    statusElement.textContent = '截图已保存到相册';
                                    setTimeout(() => {
                                        statusElement.textContent = '加载成功';
                                    }, 2000);
                                }
                                
                                // 显示拍照成功弹窗
                                setTimeout(() => {
                                    try {
                                        showSuccessModal();
                                    } catch (modalError) {
                                        console.error('显示弹窗失败:', modalError);
                                    }
                                }, 100);
                            }, function(error) {
                                console.error('保存到相册失败:', error);
                                // 即使保存到相册失败，也提示截图成功
                                if (statusElement) {
                                    statusElement.textContent = '截图成功';
                                    setTimeout(() => {
                                        statusElement.textContent = '加载成功';
                                    }, 2000);
                                }
                                showSuccessModal();
                            });
                        }, function(e) {
                            console.error('保存临时文件失败:', e);
                            // 显示状态反馈，不抛出错误避免触发浏览器下载
                            if (statusElement) {
                                statusElement.textContent = '保存失败';
                                setTimeout(() => {
                                    statusElement.textContent = '加载成功';
                                }, 2000);
                            }
                            return;
                        });
                    } else {
                        // 显示状态反馈，不抛出错误避免触发浏览器下载
                        console.error('plus.io.writeFile API不可用');
                        if (statusElement) {
                            statusElement.textContent = '保存失败';
                            setTimeout(() => {
                                statusElement.textContent = '加载成功';
                            }, 2000);
                        }
                        return;
                    }
                } else if (window.plus && plus.io && typeof plus.io.writeFile === 'function') {
                    // 如果gallery API不可用，回退到文件保存
                    console.log('plus.gallery API不可用，使用plus.io.writeFile保存图片');
                    
                    plus.io.writeFile(fullPath, base64, 'base64', function() {
                        console.log('图片保存成功:', fullPath);
                        
                        // 显示状态反馈
                        if (statusElement) {
                            statusElement.textContent = '截图成功';
                            setTimeout(() => {
                                statusElement.textContent = '加载成功';
                            }, 2000);
                        }
                        
                        // 显示拍照成功弹窗
                        setTimeout(() => {
                            try {
                                showSuccessModal();
                            } catch (modalError) {
                                console.error('显示弹窗失败:', modalError);
                            }
                        }, 100);
                    }, function(e) {
                        console.error('plus.io.writeFile失败:', e);
                        // 显示状态反馈，不抛出错误避免触发浏览器下载
                        if (statusElement) {
                            statusElement.textContent = '保存失败';
                            setTimeout(() => {
                                statusElement.textContent = '加载成功';
                            }, 2000);
                        }
                        return;
                    });
                } else {
                    // HTML5+ API不完整或移动设备但无plus
                    console.log('移动设备但HTML5+ API不完整，使用localStorage保存以便相册查看');
                    
                    try {
                        // 保存到localStorage以便相册页面可以访问
                        const photoData = {
                            name: fileName,
                            dataURL: dataURL,
                            timestamp: new Date().getTime()
                        };
                        
                        let savedPhotos = JSON.parse(localStorage.getItem('arm_app_photos') || '[]');
                        savedPhotos.push(photoData);
                        if (savedPhotos.length > 50) {
                            savedPhotos = savedPhotos.slice(-50);
                        }
                        
                        localStorage.setItem('arm_app_photos', JSON.stringify(savedPhotos));
                        console.log('照片已保存到localStorage:', fileName);
                        
                        // 显示状态反馈
                        if (statusElement) {
                            statusElement.textContent = '截图已保存到相册';
                            setTimeout(() => {
                                statusElement.textContent = '加载成功';
                            }, 2000);
                        }
                        
                        // 显示拍照成功弹窗
                        setTimeout(() => {
                            try {
                                showSuccessModal();
                            } catch (modalError) {
                                console.error('显示弹窗失败:', modalError);
                            }
                        }, 100);
                    } catch (e) {
                        console.error('移动设备上localStorage保存失败:', e);
                        if (statusElement) {
                            statusElement.textContent = '保存失败';
                            setTimeout(() => {
                                statusElement.textContent = '加载成功';
                            }, 2000);
                        }
                    }
                    return;
                }
                
                // 直接返回，确保在HTML5+环境下不会执行到浏览器下载逻辑
                return;
            }
        } catch (error) {
            console.error('HTML5+环境处理失败:', error);
            // 不抛出错误，避免触发浏览器下载逻辑
            if (statusElement) {
                statusElement.textContent = '保存失败';
                setTimeout(() => {
                    statusElement.textContent = '加载成功';
                }, 2000);
            }
            return;
        }
        
        // 只在非移动设备的浏览器环境中执行下载逻辑
        console.log('非移动设备浏览器环境，执行下载逻辑')
            
            // 任何错误都继续执行浏览器下载逻辑
            try {
                // 保存到localStorage以便相册页面可以访问
                try {
                    // 创建照片对象
                    const photoData = {
                        name: fileName,
                        dataURL: dataURL,
                        timestamp: new Date().getTime()
                    };
                    
                    // 获取现有照片
                    let savedPhotos = JSON.parse(localStorage.getItem('arm_app_photos') || '[]');
                    
                    // 添加新照片（限制最多保存50张，超过则移除最旧的）
                    savedPhotos.push(photoData);
                    if (savedPhotos.length > 50) {
                        savedPhotos = savedPhotos.slice(-50);
                    }
                    
                    // 保存回localStorage
                    localStorage.setItem('arm_app_photos', JSON.stringify(savedPhotos));
                    console.log('照片已保存到localStorage:', fileName);
                } catch (e) {
                    console.error('保存到localStorage失败:', e);
                }
                
                const link = document.createElement('a');
                link.href = dataURL;
                link.download = fileName;
                document.body.appendChild(link);
                // 对于移动设备，可能需要使用触摸事件触发
                if ('ontouchstart' in window) {
                    const touchEvent = new MouseEvent('click', { 
                        view: window, 
                        bubbles: true, 
                        cancelable: true 
                    });
                    link.dispatchEvent(touchEvent);
                } else {
                    link.click();
                }
                
                // 延迟移除元素，确保下载事件触发
                setTimeout(() => {
                    document.body.removeChild(link);
                }, 100);
                
                // 显示状态反馈
                if (statusElement) {
                    statusElement.textContent = '截图成功，已保存到相册和下载文件夹';
                    setTimeout(() => {
                        statusElement.textContent = '加载成功';
                    }, 2000);
                }
                
                // 显示拍照成功弹窗
                showSuccessModal();
            } catch (e) {
                console.error('浏览器下载失败:', e);
                if (statusElement) {
                    statusElement.textContent = '截图失败';
                    setTimeout(() => {
                        statusElement.textContent = '加载成功';
                    }, 2000);
                }
            }
    } catch (error) {
        console.error('截图过程中发生错误:', error);
        
        // 显示错误状态
        if (statusElement) {
            statusElement.textContent = '截图失败';
            setTimeout(() => {
                statusElement.textContent = '加载成功';
            }, 2000);
        }
    }
}

// 刷新视频流（强制重新加载）
function startStreaming() {
    const cameraStream = document.getElementById('cameraStream');
    const statusElement = document.getElementById('status');
    
    // 确保服务器地址已初始化
    initServerUrl();
    
    // 设置crossOrigin属性解决canvas污染问题
    cameraStream.crossOrigin = 'anonymous';
    
    // 先停止当前可能存在的流
    cameraStream.src = '';
    
    // 强制清除缓存和重新加载
    setTimeout(() => {
        // 显示加载状态
        statusElement.textContent = '重新加载中...';
        
        // 添加随机时间戳参数强制避免缓存
        const timestamp = new Date().getTime();
        const random = Math.random().toString(36).substring(7);
        cameraStream.src = serverUrl;
        
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
let serverUrl;

// 初始化服务器地址
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
    
    // 构建完整的视频流URL
    serverUrl = `${serverUrlValue}:9090/stream?topic=/joint/image_raw`;
    console.log('视频流地址初始化完成:', serverUrl);
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

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    // 初始化服务器地址
    initServerUrl();
    // 初始化完成，无需额外操作（HTML中已定义好所有控件）
	console.log('刷新视频流');
    startStreaming();
    // 为所有滑条设置范围为500-2500（
    for (let i = 0; i < 6; i++) {
        const slider = document.getElementById(`slider${i}`);
        if (slider) {
            slider.min = 500;
            slider.max = 2500;
            slider.value = 1500;
        }
        
        // 初始化按钮事件监听器
        const minusBtn = document.getElementById(`minus${i}`);
        const plusBtn = document.getElementById(`plus${i}`);
        
        if (minusBtn) {
            minusBtn.addEventListener('touchstart', (e) => {
                e.preventDefault(); // 阻止默认触摸行为
                handleButtonDown(i, -1);
            }, { passive: false }); // 允许preventDefault
            minusBtn.addEventListener('touchend', (e) => {
                e.preventDefault(); // 阻止默认触摸行为
                handleButtonUp(i);
            });
            minusBtn.addEventListener('mousedown', () => handleButtonDown(i, -1));
            minusBtn.addEventListener('mouseup', () => handleButtonUp(i));
            minusBtn.addEventListener('mouseleave', () => handleButtonUp(i));
        }
        
        if (plusBtn) {
            plusBtn.addEventListener('touchstart', (e) => {
                e.preventDefault(); // 阻止默认触摸行为
                handleButtonDown(i, 1);
            }, { passive: false }); // 允许preventDefault
            plusBtn.addEventListener('touchend', (e) => {
                e.preventDefault(); // 阻止默认触摸行为
                handleButtonUp(i);
            });
            plusBtn.addEventListener('mousedown', () => handleButtonDown(i, 1));
            plusBtn.addEventListener('mouseup', () => handleButtonUp(i));
            plusBtn.addEventListener('mouseleave', () => handleButtonUp(i));
        }
    }
    
	const initStringData = "uart_open"; // 替换实际字符串
	// 2. 调用字符串请求函数
	sendStringToServer(initStringData);
	
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
