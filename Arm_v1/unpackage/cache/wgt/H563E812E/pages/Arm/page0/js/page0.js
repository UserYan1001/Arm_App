// page0页面JavaScript - 机械臂玩法选择

// 页面状态管理
const AppState = {
    isPlusReady: false
};

// 玩法配置
const GameModes = [
    {
        id: 'page1',
        title: '机体遥控',
        image: '../../../img/jtyk.jpg'
    },
    {
        id: 'page_color',
        title: '色块玩法',
        image: '../../../img/color_playing.jpg'
    },
    {
        id: 'page_code',
        title: '码块玩法',
        image: '../../../img/label_playing.jpg'
    },
    {
        id: 'page_num',
        title: '数块玩法',
        image: '../../../img/num_playing.jpg'
    },
    {
        id: 'page_face',
        title: '人脸识别玩法',
        image: '../../../img/face_track.jpg'
    }
];

// 页面加载初始化
document.addEventListener('DOMContentLoaded', function() {
    // 初始化玩法选择界面
    initGameModes();
    
    // 检查HTML5+环境
    if (window.plus) {
        plusReady();
    } else {
        document.addEventListener('plusready', plusReady);
    }
});

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
}

// 初始化玩法选择界面
function initGameModes() {
    const gameModesList = document.querySelector('.game-modes-list');
    const listWrapper = document.querySelector('.game-modes-wrapper');
    
    // 清空现有内容
    gameModesList.innerHTML = '';
    
    // 创建玩法选择项
    GameModes.forEach((mode, index) => {
        const modeItem = document.createElement('div');
        modeItem.className = 'game-mode-item';
        modeItem.setAttribute('data-page', mode.id);
        modeItem.style.animationDelay = `${index * 0.1}s`;
        
        modeItem.innerHTML = `
            <img src="${mode.image}" class="game-mode-image" alt="${mode.title}">
            <div class="game-mode-info">
                <h3 class="game-mode-title">${mode.title}</h3>
            </div>
        `;
        
        modeItem.addEventListener('click', function() {
            navigateToGameMode(mode.id);
        });
        
        gameModesList.appendChild(modeItem);
    });
    
    // 检查内容是否超出容器宽度，决定是否启用滚动模式
    setTimeout(() => {
        const itemWidth = 200;
        const gap = 40;
        const totalWidth = (itemWidth * GameModes.length) + (gap * (GameModes.length - 1));
        
        if (totalWidth > listWrapper.clientWidth) {
            listWrapper.classList.add('scrollable');
        }
    }, 0);
}

// 页面导航函数
function navigateToGameMode(pageName) {
    if (AppState.isPlusReady) {
        const current = plus.webview.currentWebview();
        // 根据pageName判断目标URL
        const targetUrl = pageName === "page1" 
            ? `../${pageName}/index.html` 
            : `../${pageName}/page0/index.html`;
            
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

        current.hide('auto');
    } else {
        // 非plus环境下同样应用路径判断
        const targetUrl = pageName === "page1" 
            ? `../${pageName}/index.html` 
            : `../${pageName}/page0/index.html`;
        window.location.href = targetUrl;
    }
}
// 导航到设置页面
function navigateToSettings() {
    console.log('导航到设置页面');
    
    if (AppState.isPlusReady) {
        const current = plus.webview.currentWebview();
        const targetUrl = '../../Set/index.html';
        let target = plus.webview.getWebviewById('Set');

        if (target) {
            target.show('slide-in-right', 300);
        } else {
            target = plus.webview.create(
                targetUrl,
                'Set',
                {
                    top: '0px',
                    bottom: '0px',
                    scrollIndicator: 'none',
                    hardwareAccelerated: true
                }
            );
            target.show('slide-in-right', 300);
        }

        current.hide('auto');
    } else {
        window.location.href = '../../Set/index.html';
    }
}




// 返回上一页
function goBack() {
    if (AppState.isPlusReady) {
        const current = plus.webview.currentWebview();
        const parent = plus.webview.getLaunchWebview(); // 获取首页 webview

        parent.show('slide-in-left', 300); // 显示首页
        current.close(); // 关闭当前页面
    } else {
        // 浏览器环境下返回
        window.location.href = '../../index/index.html';
    }
}
