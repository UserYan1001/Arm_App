import cv2
import threading
from http.server import BaseHTTPRequestHandler, HTTPServer
from socketserver import ThreadingMixIn
import time
import numpy as np
import socket

# 摄像头捕获类
class CameraCapture:
    def __init__(self, camera_index=0):
        self.cap = cv2.VideoCapture(0)
        if not self.cap.isOpened():
            raise Exception("无法打开摄像头")
        
        # 设置摄像头分辨率（根据实际情况调整）
        self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
        self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
        
        self.frame = None
        self.running = False
        self.lock = threading.Lock()
        self.thread = None
    
    def start(self):
        self.running = True
        self.thread = threading.Thread(target=self._capture_loop)
        self.thread.daemon = True
        self.thread.start()
        
    
    def _capture_loop(self):
        while self.running:
            ret, frame = self.cap.read()
            if ret:
                with self.lock:
                    self.frame = frame
            time.sleep(0.01)  # 短暂休眠，减少CPU占用
    
    def get_frame(self):
        with self.lock:
            if self.frame is None:
                return
            # 转换为JPEG格式
            ret, jpeg = cv2.imencode('.jpg', self.frame)
            return jpeg.tobytes()
    
    def stop(self):
        self.running = False
        if self.thread:
            self.thread.join()
        self.cap.release()

# HTTP请求处理器
class StreamHandler(BaseHTTPRequestHandler):
    def __init__(self, request, client_address, server):
        self.camera = server.camera
        super().__init__(request, client_address, server)
    
    # 处理OPTIONS请求
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
    
    # 处理GET请求
    def do_GET(self):
        if self.path == '/':
            # 提供HTML页面
            self.send_response(200)
            self.send_header('Content-type', 'text/html; charset=utf-8')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            html = """
            <html>
                <head>
                    <title>摄像头直播</title>
                    <style>
                        body { display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background-color: #f0f0f0; }
                        .container { text-align: center; }
                        h1 { color: #333; }
                        img { border: 5px solid #fff; box-shadow: 0 0 20px rgba(0,0,0,0.3); max-width: 90%; max-height: 80vh; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <h1>局域网摄像头直播</h1>
                        <img src="/stream" />
                    </div>
                </body>
            </html>
            """
            self.wfile.write(html.encode('utf-8'))
        
        elif 'stream' in self.path:
            # 视频流
            self.send_response(200)
            self.send_header('Content-type', 'multipart/x-mixed-replace; boundary=frame')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            try:
                while True:
                    frame = self.camera.get_frame()
                    if frame is None:
                        time.sleep(0.1)
                        continue
                    
                    self.wfile.write(b'--frame\r\n')
                    self.send_header('Content-type', 'image/jpeg')
                    self.send_header('Content-length', len(frame))
                    self.end_headers()
                    self.wfile.write(frame)
                    self.wfile.write(b'\r\n')
                    time.sleep(0.01)  # 控制帧率
            except Exception as e:
                print(f"客户端断开连接: {e}")
        
        elif self.path.startswith('/api/control/'):
            # GET方式的控制指令处理
            command = self.path.split('/')[-1]
            print(f"收到GET控制指令: {command}")
            
            # GET指令逻辑
            response_msg = f"GET指令 '{command}' 已接收"
            if command == 'MOVE_FORWARD':
                print("GET: 执行前进操作")
            elif command == 'MOVE_BACKWARD':
                print("GET: 执行后退操作")
            elif command == 'RELEASE':
                print("GET: 执行释放操作")
            elif command == 'MODE_1':
                print("GET: 执行模式1操作")
            else:
                response_msg = f"GET: 未知指令 {command}"
                print(response_msg)
            
            # 返回响应
            self.send_response(200)
            self.send_header('Content-type', 'text/plain; charset=utf-8')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(response_msg.encode('utf-8'))
        
        else:
            self.send_response(404)
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
    
    # 处理POST请求
    def do_POST(self):
        if self.path.startswith('/api/control/'):
            # POST方式的控制指令处理
            command = self.path.split('/')[-1]
            print(f"收到POST控制指令: {command}")
            
            # 读取POST请求数据（如果有）
            content_length = int(self.headers['Content-Length']) if 'Content-Length' in self.headers else 0
            post_data = self.rfile.read(content_length) if content_length > 0 else b''
            if post_data:
                print(f"POST请求数据: {post_data.decode('utf-8')}")
            
            # POST指令逻辑
            response_msg = f"POST指令 '{command}' 已接收"
            if command == 'MOVE_FORWARD':
                print("POST: 执行前进操作")
            elif command == 'MOVE_BACKWARD':
                print("POST: 执行后退操作")
            elif command == 'RELEASE':
                print("POST: 执行释放操作")
            elif command == 'MODE_1':
                print("POST: 执行模式1操作")
            else:
                response_msg = f"POST: 未知指令 {command}"
                print(response_msg)
            
            # 返回响应
            self.send_response(200)
            self.send_header('Content-type', 'text/plain; charset=utf-8')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(response_msg.encode('utf-8'))
        
        else:
            self.send_response(404)
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()

# 多线程HTTP服务器
class ThreadedHTTPServer(ThreadingMixIn, HTTPServer):
    """多线程HTTP服务器，支持同时处理多个客户端连接"""
    def __init__(self, server_address, RequestHandlerClass, camera):
        self.camera = camera
        super().__init__(server_address, RequestHandlerClass)

def get_local_ip():
    """获取本地IP地址"""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except:
        return "127.0.0.1"

def is_port_in_use(port):
    """检查端口是否被占用"""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(('localhost', port)) == 0

def main():
    # 摄像头初始化
    try:
        camera = CameraCapture(0)  # 0表示默认摄像头
        camera.start()
        print("摄像头初始化成功")
    except Exception as e:
        print(f"摄像头初始化失败: {e}")
        return
    
    # 服务器设置
    host = '0.0.0.0'  # 监听所有网络接口
    port = 81       # 端口号
    
    # 检查端口是否被占用，如果被占用则尝试其他端口
    if is_port_in_use(port):
        print(f"端口 {port} 已被占用，尝试使用其他端口...")
        # 尝试8001到8010之间的端口
        for i in range(1, 11):
            new_port = port + i
            if not is_port_in_use(new_port):
                port = new_port
                print(f"将使用端口 {port}")
                break
        else:
            print("8000-8010端口均被占用，无法启动服务器")
            camera.stop()
            return
    
    local_ip = get_local_ip()
    server = None  # 初始化server变量
    
    try:
        server = ThreadedHTTPServer((host, port), StreamHandler, camera)
        print(f"服务器已启动，局域网内可通过以下地址访问:")
        print(f"http://{local_ip}:{port}")
        print(f"按Ctrl+C停止服务器")
        
        # 启动服务器
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n服务器正在停止...")
    except Exception as e:
        print(f"服务器启动失败: {e}")
    finally:
        camera.stop()
        if server:  # 只有在server被成功创建后才调用close方法
            server.server_close()
        print("服务器已停止")

if __name__ == '__main__':
    main()
    