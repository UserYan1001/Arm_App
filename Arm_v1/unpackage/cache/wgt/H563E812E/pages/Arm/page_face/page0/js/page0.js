// page0页面JavaScript - 颜色玩法选择

// 页面状态管理
const AppState = {
    isPlusReady: false
};

// 颜色玩法配置 - 只包含三种颜色玩法
const GameModes = [

    {
        id: 'page4',
        title: '人脸追踪',
        image: '../../../../img/face_track.jpg'
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
        const targetUrl = `../${pageName}/index.html`;
        // 使用带前缀的ID避免与其他模块冲突
        const targetId = `color_${pageName}`;
        let target = plus.webview.getWebviewById(targetId);

        if (target) {
            target.show('slide-in-right', 300);
        } else {
            target = plus.webview.create(
                targetUrl,
                targetId,
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
        window.location.href = `../${pageName}/index.html`;
    }
}



// 返回上一页
function goBack() {
    if (AppState.isPlusReady) {
        const current = plus.webview.currentWebview();
        // 获取Arm模块的page0页面
        const parent = plus.webview.getWebviewById('page0');
        if (parent) {
            console.log(parent);
            parent.show('slide-in-left', 300); // 显示上一级页面
            current.close(); // 关闭当前页面
        } else {
            console.log('未找到page0页面，创建新实例');
            // 如果找不到父页面，创建并显示Arm/page0页面
            const page0Path = '../../page0/index.html';
            const newPage0 = plus.webview.create(page0Path, 'page0');
            newPage0.show('slide-in-left', 300);
            current.close();
        }
    } else {
        // 浏览器环境下返回 - 修正路径以确保返回到与page_color同目录的page0页面
        // 路径解释：从pages/Arm/page_color/page0/js/返回到pages/Arm/page0/
        window.location.href = '../../page0/index.html';
    }
}
