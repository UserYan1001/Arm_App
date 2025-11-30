// index页面JavaScript - 横屏图片导航

// 页面状态管理
const AppState = {
    currentPage: 'index',
    isPlusReady: false
};

// 页面配置 - 测试单个图片时可以只保留一个对象
const PageConfig = [
    {
        id: 'Arm',
        image: '../../img/img1.jpg'
    }
    // ,
    // {
    //     id: 'Car', 
    //     image: '../../img/img2.jpg'
    // }
];

// 打开相册页面
function openGallery() {
    if (window.plus) {
        // HTML5+环境中打开相册页面
        plusReady();
        const galleryPage = plus.webview.create('../Photo_Camera/index.html', 'gallery', {
            scrollIndicator: 'none',
            backButtonAutoControl: 'close'
        });
        galleryPage.show('slide-in-right', 300);
    } else {
        // 普通浏览器环境
        window.location.href = '../Photo_Camera/index.html';
    }
}

// 页面加载初始化
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM内容加载完成');
    
    // 初始化横向图片导航
    initImageNavigation();
    
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
    AppState.isPlusReady = true;
    
    // —— 强制固定首页 webview id（非常重要）
    try {
        const thisWebview = plus.webview.currentWebview();
        // 打印原始 id（用于调试）
        console.log("原始首页 webview id:", thisWebview.id);
        // 强制设为固定 id，便于子页面统一使用
        thisWebview.id = 'index';
        console.log("已将首页 webview id 设为: 'index'");
    } catch (err) {
        console.error("设置首页 webview id 失败：", err);
    }
    // 设置状态栏样式
    if (plus.navigator) {
        plus.navigator.setStatusBarStyle('light');
    }
    
    // 设置横屏锁定
    if (plus.screen) {
        plus.screen.lockOrientation('landscape-primary');
    }
    
    // 拦截硬件返回按钮事件 - 首页通常需要确认退出
    if (plus.key) {
        plus.key.addEventListener('backbutton', function() {
            console.log('首页硬件返回按钮被按下，显示退出确认');
            // 显示确认对话框
            if (plus.nativeUI) {
                plus.nativeUI.confirm(
                    "确定要退出应用吗？",
                    function(e) {
                        if (e.index === 0) { // 确定按钮
                            console.log('用户确认退出应用');
                            plus.runtime.quit(); // 退出应用
                        } else { // 取消按钮
                            console.log('用户取消退出');
                        }
                    },
                    "退出确认",
                    ["确定", "取消"]
                );
            } else {
                // 如果nativeUI不可用，使用浏览器确认对话框
                if (confirm("确定要退出应用吗？")) {
                    plus.runtime.quit();
                }
            }
        }, false);
        console.log('已成功注册首页硬件返回按钮事件监听器');
    } else {
        console.error('plus.key API不可用，无法注册返回按钮事件');
    }
}

// 初始化横向图片导航
function initImageNavigation() {
    const imageList = document.querySelector('.image-list');
    const listWrapper = document.querySelector('.image-list-wrapper');
    
    // 清空现有内容
    imageList.innerHTML = '';
    
    // 创建图片导航项
    PageConfig.forEach((page, index) => {
        const navItem = document.createElement('div');
        navItem.className = 'image-nav-item';
        navItem.setAttribute('data-page', page.id);
        navItem.style.animationDelay = `${index * 0.1}s`;
        
        navItem.innerHTML = `
            <img src="${page.image}" class="nav-image" alt="图片">
        `;
        
        navItem.addEventListener('click', function() {
            navigateToPage(page.id);
        });
        
        imageList.appendChild(navItem);
    });
    
    // 检查内容是否超出容器宽度，决定是否启用滚动模式
    setTimeout(() => {
        // 计算内容总宽度（包括间距）
        const itemWidth = 280; // 每个项的固定宽度
        const gap = 30; // 间距
        const totalWidth = (itemWidth * PageConfig.length) + (gap * (PageConfig.length - 1));
        
        // 如果内容总宽度超过容器宽度，则启用滚动
        if (totalWidth > listWrapper.clientWidth) {
            listWrapper.classList.add('scrollable');
        }
    }, 0);
}

// 页面导航函数
function navigateToPage(pageName) {
    if (AppState.isPlusReady) {
        const current = plus.webview.currentWebview();
        const targetUrl = `../../pages/${pageName}/page0/index.html`;
        let target = plus.webview.getWebviewById(pageName);

        if (target) {
            target.show('slide-in-right', 300);
        } else {
            target = plus.webview.create(
                targetUrl,
                pageName,
                {
                    top: '0px',
                    bottom: '0px',
                    scrollIndicator: 'none',
                    hardwareAccelerated: true
                }
            );
            target.show('slide-in-right', 300);
        }

        current.hide('auto'); //  必须改这里
    } else {
        window.location.href = `../../pages/${pageName}/page0/index.html`;
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


// 获取元素
const declarationImg = document.querySelector('.declaration-img');
const networkImg = document.querySelector('.network-img');
const modal = document.getElementById('declarationModal');
const modalContent = modal?.querySelector('.modal-content');

// 点击声明图片显示弹窗
declarationImg?.addEventListener('click', (e) => {
    e.stopPropagation(); // 阻止冒泡到body
    modal.style.display = 'flex';
});

// 点击弹窗外部关闭
document.addEventListener('click', (e) => {
    if (e.target === modal) {
        modal.style.display = 'none';
    }
});

// 点击弹窗内部不关闭
modalContent?.addEventListener('click', (e) => {
    e.stopPropagation();
});

// 点击网络图片跳转
networkImg?.addEventListener('click', () => {
    if (window.plus) {
        // APP环境下：打开子页面
        plus.webview.open(
            '../Connect_Net/index.html',     // 子页面路径
            'connect-net',                   // 子页面 ID（随便起）
            { animation: 'slide-in-right', duration: 300 } // 动画
        );
    } else {
        // 浏览器环境
        window.location.href = '../Connect_Net/index.html';
    }
});
