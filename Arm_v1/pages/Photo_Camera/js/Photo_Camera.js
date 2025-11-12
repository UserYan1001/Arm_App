// 相册页面JavaScript

// 页面状态管理
const AppState = {
    isPlusReady: false,
    photos: []
};

// HTML5+环境准备完成
function plusReady() {
    AppState.isPlusReady = true;
    
    // 设置状态栏样式
    if (plus.navigator) {
        plus.navigator.setStatusBarStyle('light');
    }
    
    // 设置横屏锁定
    if (plus.screen) {
        plus.screen.lockOrientation('landscape-primary');
    }
    
    // 拦截硬件返回按钮事件
    if (plus.key) {
        plus.key.addEventListener('backbutton', goBack, false);
    }
    
    // 加载照片
    loadPhotos();
}

// 返回上一页
function goBack() {
    if (AppState.isPlusReady) {
        const current = plus.webview.currentWebview();
        const parent = plus.webview.getLaunchWebview(); // 获取首页 webview
        
        if (parent) {
            parent.show('slide-in-left', 300); // 显示首页
        } else {
            // 如果找不到父页面，直接返回上一页
            history.back();
        }
        current.close(); // 关闭当前页面
    } else {
        // 浏览器环境下返回
        history.back();
    }
}

// 加载照片
function loadPhotos() {
    const galleryContent = document.getElementById('galleryContent');
    const noPhotos = document.getElementById('noPhotos');
    
    // 先尝试从localStorage加载照片，因为在某些情况下，即使HTML5+环境存在，照片也可能保存在localStorage中
    try {
        const savedPhotos = JSON.parse(localStorage.getItem('arm_app_photos') || '[]');
        console.log('从localStorage读取到', savedPhotos.length, '张照片');
        
        if (savedPhotos.length > 0) {
            // 如果localStorage中有照片，优先使用
            // 按时间戳倒序排序（最新的在前）
            savedPhotos.sort((a, b) => b.timestamp - a.timestamp);
            
            // 更新AppState.photos数组
            AppState.photos = savedPhotos;
            
            // 调用displayPhotos显示照片
            displayPhotos();
            return; // 直接返回，不尝试从文件系统加载
        }
    } catch (e) {
        console.error('读取localStorage照片失败:', e);
    }
    
    // 如果localStorage中没有照片，且在HTML5+环境下，尝试从文件系统加载
    if (AppState.isPlusReady) {
        console.log('HTML5+环境，尝试从文件系统加载照片');
        plus.io.requestFileSystem(plus.io.PUBLIC_DOCUMENTS, (fs) => {
            // 打开photo目录
            fs.root.getDirectory('photo', {create: false}, (dir) => {
                const reader = dir.createReader();
                reader.readEntries((entries) => {
                    // 过滤出jpg文件并按时间排序
                    AppState.photos = entries
                        .filter(entry => entry.name.endsWith('.jpg'))
                        .sort((a, b) => b.name.localeCompare(a.name)); // 按文件名倒序排列（最新的在前）
                    
                    displayPhotos();
                }, (e) => {
                    console.error('读取目录失败:', e);
                    noPhotos.style.display = 'block';
                });
            }, (e) => {
                console.log('photo目录不存在或无法访问:', e);
                noPhotos.style.display = 'block';
            });
        }, (e) => {
            console.error('无法访问文件系统:', e);
            noPhotos.style.display = 'block';
        });
    } else {
        // 如果不在HTML5+环境且localStorage中没有照片，显示无照片提示
        console.log('无照片可显示');
        noPhotos.style.display = 'block';
    }
}

// 显示照片
function displayPhotos() {
    const galleryContent = document.getElementById('galleryContent');
    const noPhotos = document.getElementById('noPhotos');
    
    console.log('开始显示照片，AppState.photos.length:', AppState.photos.length);
    console.log('AppState.isPlusReady:', AppState.isPlusReady);
    
    // 清空现有内容
    galleryContent.innerHTML = '';
    
    if (AppState.photos.length === 0) {
        // 如果没有照片，显示提示
        console.log('没有照片可显示，显示无照片提示');
        galleryContent.appendChild(noPhotos);
        noPhotos.style.display = 'block';
    } else {
        // 隐藏无照片提示
        noPhotos.style.display = 'none';
        
        // 添加照片到相册
        console.log('开始添加照片到相册');
        AppState.photos.forEach((photo, index) => {
            console.log('添加照片', index + 1, '/', AppState.photos.length);
            
            // 检查照片对象结构
            const isEntryObject = photo.isFile && photo.fullPath;
            const hasDataURL = photo.dataURL && photo.name;
            console.log('照片结构检查 - isEntryObject:', isEntryObject, 'hasDataURL:', hasDataURL);
            
            // 无论在什么环境，只要照片有dataURL和name，就使用localStorage方式显示
            if (hasDataURL) {
                console.log('使用localStorage方式显示照片:', photo.name);
                addPhotoToGallery(photo.dataURL, photo.name);
            } else if (isEntryObject) {
                // 如果是entry对象，使用HTML5+方式显示
                console.log('使用HTML5+方式显示照片:', photo.name);
                addPhotoToGallery(photo, photo.name);
            }
        });
        console.log('照片添加完成');
    }
}

// 添加照片到相册
function addPhotoToGallery(filePath, fileName) {
    console.log('开始添加照片到相册 - fileName:', fileName);
    console.log('filePath类型:', typeof filePath);
    
    const galleryContent = document.getElementById('galleryContent');
    if (!galleryContent) {
        console.error('找不到galleryContent元素');
        return;
    }
    
    // 创建照片项元素
    const photoItem = document.createElement('div');
    photoItem.className = 'photo-item';
    
    // 创建图片元素
    const img = document.createElement('img');
    
    // 检查是否是dataURL（以data:image开头）
    const isDataURL = typeof filePath === 'string' && filePath.startsWith('data:image');
    console.log('照片类型检查 - isDataURL:', isDataURL);
    
    if (isDataURL) {
        // 如果是dataURL，直接使用
        console.log('使用dataURL作为图片源');
        img.src = filePath;
    } else if (AppState.isPlusReady) {
        // HTML5+环境处理
        console.log('HTML5+环境处理图片加载');
        let correctPath = filePath;
        
        // 检查是否是Entry对象
        if (filePath.isFile && filePath.fullPath) {
            correctPath = filePath.fullPath;
            console.log('使用Entry对象的fullPath:', correctPath);
        } else if (typeof filePath === 'string') {
            console.log('原始字符串路径:', filePath);
            if (!correctPath.startsWith('_documents/photo/') && !correctPath.startsWith('storage/emulated/0/Android/data/io.dcloud.HBuilder/documents/photo/')) {
                correctPath = '_documents/photo/' + correctPath;
                console.log('修正后的路径:', correctPath);
            }
        }
        
        try {
            const convertedPath = plus.io.convertLocalFileSystemURL(correctPath);
            console.log('加载图片路径:', convertedPath);
            img.src = convertedPath;
        } catch (e) {
            console.error('路径转换失败:', e);
            img.src = correctPath;
        }
    } else {
        // 其他情况，直接使用路径
        console.log('直接使用路径作为图片源:', filePath);
        img.src = filePath;
    }
    
    console.log('设置img.src完成');
    img.alt = fileName;
    
    // 图片加载成功处理
    img.onload = function() {
        console.log('图片加载成功:', fileName, '尺寸:', img.width, 'x', img.height);
    };
    
    // 图片加载错误处理
    img.onerror = function() {
        console.error('图片加载失败:', fileName, '源:', img.src);
        img.style.backgroundColor = 'rgba(255, 0, 0, 0.2)';
        img.alt = '加载失败: ' + fileName;
    };
    
    // 图片加载超时处理
    setTimeout(() => {
        if (!img.complete) {
            console.warn('图片加载可能超时:', fileName, '源:', img.src);
        }
    }, 5000);
    
    // 从文件名提取日期时间
    const dateStr = parseDateFromFileName(fileName);
    
    // 提取文件名前缀
    let prefix = '';
    if (fileName.includes('机体遥控')) {
        prefix = '机体遥控';
    } else if (fileName.includes('snapshot_')) {
        prefix = '快照';
    }
    
    // 组合显示文本：前缀+时间
    const displayText = prefix + (dateStr !== '未知日期' ? dateStr : '');
    
    // 创建日期元素
    const dateElement = document.createElement('div');
    dateElement.className = 'photo-date';
    dateElement.textContent = displayText || dateStr;
    
    // 组装照片项
    photoItem.appendChild(img);
    photoItem.appendChild(dateElement);
    
    // 添加点击事件查看大图
    photoItem.addEventListener('click', function() {
        openImageViewer(img.src);
    });
    
    // 添加长按删除功能
    let longPressTimer;
    
    // 触摸开始
    photoItem.addEventListener('touchstart', function() {
        longPressTimer = setTimeout(() => {
            // 传递entry对象和文件名，让deletePhoto函数处理路径
            showDeleteConfirmation(filePath, fileName, photoItem);
        }, 800); // 1000毫秒长按触发
    });
    
    // 触摸结束或移动时取消长按
    photoItem.addEventListener('touchend', cancelLongPress);
    photoItem.addEventListener('touchmove', cancelLongPress);
    photoItem.addEventListener('touchcancel', cancelLongPress);
    
    function cancelLongPress() {
        if (longPressTimer) {
            clearTimeout(longPressTimer);
            longPressTimer = null;
        }
    }
    
    // 也需要支持鼠标长按
    photoItem.addEventListener('mousedown', function() {
        longPressTimer = setTimeout(() => {
            // 传递entry对象和文件名，让deletePhoto函数处理路径
            showDeleteConfirmation(filePath, fileName, photoItem);
        }, 1000);
    });
    photoItem.addEventListener('mouseup', function() {
        clearTimeout(longPressTimer);
    });
    photoItem.addEventListener('mouseleave', function() {
        clearTimeout(longPressTimer);
    });
    
    // 添加到相册内容
    galleryContent.appendChild(photoItem);
}

// 显示删除确认对话框
function showDeleteConfirmation(filePath, fileName, photoElement) {
    // 创建确认对话框元素
    const confirmDialog = document.createElement('div');
    confirmDialog.className = 'delete-confirm-dialog';
    
    confirmDialog.innerHTML = `
        <div class="delete-dialog-content">
            <div class="delete-dialog-icon">⚠️</div>
            <div class="delete-dialog-text">确定要删除这张照片吗？</div>
            <div class="delete-dialog-buttons">
                <button class="delete-dialog-btn cancel-btn" id="cancelDelete">取消</button>
                <button class="delete-dialog-btn delete-btn" id="confirmDelete">删除</button>
            </div>
        </div>
    `;
    
    // 添加到页面
    document.body.appendChild(confirmDialog);
    
    // 添加动画效果
    setTimeout(() => {
        confirmDialog.classList.add('show');
        confirmDialog.querySelector('.delete-dialog-content').classList.add('show');
    }, 10);
    
    // 取消删除
    document.getElementById('cancelDelete').addEventListener('click', () => {
        closeDeleteDialog(confirmDialog);
    });
    
    // 确认删除
    document.getElementById('confirmDelete').addEventListener('click', () => {
        deletePhoto(filePath, fileName, photoElement);
        closeDeleteDialog(confirmDialog);
    });
    
    // 点击外部关闭
    confirmDialog.addEventListener('click', (e) => {
        if (e.target === confirmDialog) {
            closeDeleteDialog(confirmDialog);
        }
    });
}

// 关闭删除确认对话框
function closeDeleteDialog(dialogElement) {
    dialogElement.classList.remove('show');
    const content = dialogElement.querySelector('.delete-dialog-content');
    content.classList.remove('show');
    
    // 等待动画完成后移除元素
    setTimeout(() => {
        if (dialogElement.parentNode) {
            dialogElement.parentNode.removeChild(dialogElement);
        }
    }, 300);
}

// 删除照片
function deletePhoto(filePath, fileName, photoElement) {
    console.log('开始删除照片:', fileName);
    console.log('filePath类型:', typeof filePath);
    console.log('AppState.isPlusReady:', AppState.isPlusReady);
    
    // 检查照片是否是localStorage类型（有dataURL属性）
    const isLocalStoragePhoto = typeof filePath === 'string' && filePath.startsWith('data:image');
    const isFromLocalStorage = AppState.photos.some(photo => 
        photo.name === fileName && photo.dataURL
    );
    console.log('照片分析 - isLocalStoragePhoto:', isLocalStoragePhoto, 'isFromLocalStorage:', isFromLocalStorage);
    
    // 如果照片来自localStorage，优先从localStorage删除
    if (isLocalStoragePhoto || isFromLocalStorage) {
        console.log('选择从localStorage删除照片:', fileName);
        try {
            // 获取现有照片
            let savedPhotos = JSON.parse(localStorage.getItem('arm_app_photos') || '[]');
            console.log('localStorage中现有照片数量:', savedPhotos.length);
            
            // 过滤掉要删除的照片
            const newPhotos = savedPhotos.filter(photo => photo.name !== fileName);
            console.log('删除后剩余照片数量:', newPhotos.length);
            
            // 保存回localStorage
            localStorage.setItem('arm_app_photos', JSON.stringify(newPhotos));
            console.log('照片已从localStorage删除');
            
            // 从UI中移除照片
            if (photoElement.parentNode) {
                photoElement.parentNode.removeChild(photoElement);
            }
            
            // 更新AppState中的photos数组
            AppState.photos = AppState.photos.filter(photo => photo.name !== fileName);
            
            // 检查是否还有照片
            const noPhotos = document.getElementById('noPhotos');
            const galleryContent = document.getElementById('galleryContent');
            if (AppState.photos.length === 0) {
                // 添加安全检查，确保元素存在且noPhotos是有效的DOM节点
                if (galleryContent && noPhotos && noPhotos.nodeType === Node.ELEMENT_NODE) {
                    // 检查noPhotos是否已经在galleryContent中，避免重复appendChild
                    if (noPhotos.parentNode !== galleryContent) {
                        galleryContent.appendChild(noPhotos);
                    }
                    noPhotos.style.display = 'block';
                    console.log('显示无照片提示');
                } else {
                    console.warn('无法显示无照片提示：元素不存在或不是有效的DOM节点');
                }
            }
            
            // 显示删除成功提示
            if (window.plus && plus.nativeUI) {
                plus.nativeUI.toast('删除成功');
            } else {
                alert('删除成功');
            }
        } catch (e) {
            console.error('从localStorage删除照片失败:', e);
            if (window.plus && plus.nativeUI) {
                plus.nativeUI.toast('删除失败');
            } else {
                alert('删除失败');
            }
        }
    } else if (AppState.isPlusReady) {
        // HTML5+环境下尝试从文件系统删除
        console.log('选择从文件系统删除照片:', fileName);
        plus.io.requestFileSystem(plus.io.PUBLIC_DOCUMENTS, (fs) => {
            fs.root.getFile('photo/' + fileName, {}, (fileEntry) => {
                fileEntry.remove(() => {
                    console.log('照片从文件系统删除成功:', fileName);
                    
                    // 从UI中移除照片
                    if (photoElement.parentNode) {
                        photoElement.parentNode.removeChild(photoElement);
                    }
                    
                    // 从AppState中移除照片
                    AppState.photos = AppState.photos.filter(entry => entry.name !== fileName);
                    
                    // 检查是否还有照片
                    const noPhotos = document.getElementById('noPhotos');
                    if (AppState.photos.length === 0) {
                        const galleryContent = document.getElementById('galleryContent');
                        // 添加安全检查，确保元素存在且noPhotos是有效的DOM节点
                        if (galleryContent && noPhotos && noPhotos.nodeType === Node.ELEMENT_NODE) {
                            // 检查noPhotos是否已经在galleryContent中，避免重复appendChild
                            if (noPhotos.parentNode !== galleryContent) {
                                galleryContent.appendChild(noPhotos);
                            }
                            noPhotos.style.display = 'block';
                            console.log('显示无照片提示');
                        } else {
                            console.warn('无法显示无照片提示：元素不存在或不是有效的DOM节点');
                        }
                    }
                    
                    // 显示删除成功提示
                    if (window.plus && plus.nativeUI) {
                        plus.nativeUI.toast('删除成功');
                    }
                }, (e) => {
                    console.error('删除文件失败:', e);
                    if (window.plus && plus.nativeUI) {
                        plus.nativeUI.toast('删除失败');
                    }
                });
            }, (e) => {
                console.error('获取文件失败:', e);
                // 如果文件不存在，尝试从localStorage删除（作为备份方案）
                console.warn('文件不存在于文件系统，尝试从localStorage删除作为备份方案');
                try {
                    let savedPhotos = JSON.parse(localStorage.getItem('arm_app_photos') || '[]');
                    const newPhotos = savedPhotos.filter(photo => photo.name !== fileName);
                    localStorage.setItem('arm_app_photos', JSON.stringify(newPhotos));
                    
                    // 从UI和AppState中移除
                    if (photoElement.parentNode) {
                        photoElement.parentNode.removeChild(photoElement);
                    }
                    AppState.photos = AppState.photos.filter(photo => photo.name !== fileName);
                    
                    // 检查是否还有照片，如果没有则显示无照片提示
                    if (AppState.photos.length === 0) {
                        const noPhotos = document.getElementById('noPhotos');
                        const galleryContent = document.getElementById('galleryContent');
                        // 添加安全检查，确保元素存在且noPhotos是有效的DOM节点
                        if (galleryContent && noPhotos && noPhotos.nodeType === Node.ELEMENT_NODE) {
                            // 检查noPhotos是否已经在galleryContent中，避免重复appendChild
                            if (noPhotos.parentNode !== galleryContent) {
                                galleryContent.appendChild(noPhotos);
                            }
                            noPhotos.style.display = 'block';
                            console.log('显示无照片提示');
                        } else {
                            console.warn('无法显示无照片提示：元素不存在或不是有效的DOM节点');
                        }
                    }
                    
                    if (window.plus && plus.nativeUI) {
                        plus.nativeUI.toast('文件不存在，但已从相册移除');
                    }
                } catch (backupError) {
                    console.error('备份删除方案也失败:', backupError);
                    if (window.plus && plus.nativeUI) {
                        plus.nativeUI.toast('文件不存在');
                    }
                }
            });
        }, (e) => {
            console.error('无法访问文件系统:', e);
        });
    }
}

// 从文件名解析日期时间
function parseDateFromFileName(fileName) {
    // 支持文件名格式: 机体遥控YYYYMMDDHHmmSS.jpg 或 snapshot_YYYYMMDDHHmmSS.jpg
    // 正则表达式同时匹配两种格式
    const match = fileName.match(/(机体遥控|snapshot_)?(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/);
    if (match) {
        // 注意索引调整，因为现在match[1]是前缀，实际日期部分从match[2]开始
        const [, , year, month, day, hour, minute, second] = match;
        return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
    }
    return '未知日期';
}

// 打开图片查看器
function openImageViewer(imageSrc) {
    const imageViewer = document.getElementById('imageViewer');
    const viewedImage = document.getElementById('viewedImage');
    
    viewedImage.src = imageSrc;
    imageViewer.style.display = 'flex';
    
    // 禁止背景滚动
    document.body.style.overflow = 'hidden';
}

// 关闭图片查看器
function closeImageViewer() {
    const imageViewer = document.getElementById('imageViewer');
    imageViewer.style.display = 'none';
    
    // 恢复背景滚动
    document.body.style.overflow = '';
}

// 点击图片查看器外部关闭
function handleImageViewerClick(event) {
    const imageViewer = document.getElementById('imageViewer');
    const imageViewerContent = document.querySelector('.image-viewer-content');
    
    // 如果点击的是查看器背景而不是内容
    if (event.target === imageViewer) {
        closeImageViewer();
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    console.log('相册页面加载完成');
    
    // 添加图片查看器点击事件
    const imageViewer = document.getElementById('imageViewer');
    imageViewer.addEventListener('click', handleImageViewerClick);
    
    // 检查HTML5+环境
    if (window.plus) {
        plusReady();
    } else {
        document.addEventListener('plusready', plusReady);
        
        // 浏览器环境下，延迟加载模拟数据
        setTimeout(() => {
            if (!AppState.isPlusReady) {
                loadPhotos();
            }
        }, 1000);
    }
});

// 导出截取图片的函数，供其他页面调用
window.captureImageFromCamera = function(cameraElement) {
    return new Promise((resolve, reject) => {
        if (!cameraElement || !cameraElement.complete || cameraElement.naturalHeight === 0) {
            reject(new Error('摄像头图片未加载完成'));
            return;
        }
        
        try {
            // 创建canvas用于截图
            const canvas = document.createElement('canvas');
            canvas.width = cameraElement.offsetWidth;
            canvas.height = cameraElement.offsetHeight;
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
            const fileName = `snapshot_${timestamp}.jpg`;
            
            // 获取base64数据
            const base64Data = canvas.toDataURL('image/jpeg', 0.9);
            
            resolve({ fileName, base64Data });
        } catch (error) {
            reject(error);
        }
    });
};