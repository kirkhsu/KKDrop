const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const os = require('os');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;

// 獲取本機區網IP
function getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (const interfaceName in interfaces) {
        const interfaceInfo = interfaces[interfaceName];
        for (const alias of interfaceInfo) {
            if (alias.family === 'IPv4' && !alias.internal) {
                return alias.address;
            }
        }
    }
    return 'localhost';
}

const localIP = getLocalIP();
const serverURL = `http://${localIP}:${PORT}`;

// 確定上傳目錄路徑
// 一般開發模式沿用執行目錄下的 uploads/；打包後的執行檔（尤其開機自動啟動）
// 的工作目錄不可預期也可能不可寫，改用使用者家目錄下的固定資料夾。
function getUploadsDir() {
    if (!process.pkg) {
        return path.join(process.cwd(), 'uploads');
    }
    if (process.platform === 'win32') {
        return path.join(process.env.APPDATA || os.homedir(), 'KKDrop', 'uploads');
    }
    return path.join(os.homedir(), '.local', 'share', 'kkdrop', 'uploads');
}

const uploadsDir = getUploadsDir();

if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}
const uploadEntries = fs.readdirSync(uploadsDir);
for (const entry of uploadEntries) {
    const entryPath = path.join(uploadsDir, entry);
    fs.rmSync(entryPath, { recursive: true, force: true });
}

function normalizeOriginalName(originalname) {
    if (typeof originalname !== 'string') {
        return 'file';
    }
    const hasNonLatin1 = [...originalname].some(char => char.charCodeAt(0) > 255);
    if (hasNonLatin1) {
        return originalname;
    }
    const decoded = Buffer.from(originalname, 'latin1').toString('utf8');
    if (decoded.includes('\uFFFD')) {
        return originalname;
    }
    return decoded;
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
        cb(null, normalizeOriginalName(file.originalname));
    }
});

const upload = multer({ storage: storage });

// 處理 static 文件 - 支援 pkg 打包
const publicDir = path.join(__dirname, 'public');
app.use(express.static(publicDir));

let connectedClients = [];

function emitClientUpdates(socket, includeSelfId = false) {
    if (socket) {
        socket.emit('clientsUpdate', {
            clients: connectedClients,
            yourId: includeSelfId ? socket.id : null,
            serverURL
        });
        socket.broadcast.emit('clientsUpdate', {
            clients: connectedClients,
            yourId: null,
            serverURL
        });
    } else {
        io.emit('clientsUpdate', {
            clients: connectedClients,
            yourId: null,
            serverURL
        });
    }
}

function sanitizeDeviceName(name) {
    if (typeof name !== 'string') {
        return '';
    }
    return name.trim().slice(0, 50);
}

function sanitizeDeviceOS(osValue) {
    if (typeof osValue !== 'string') {
        return '';
    }
    return osValue.trim().slice(0, 30);
}

app.get('/', (req, res) => {
    res.sendFile(path.join(publicDir, 'index.html'));
});

app.get('/download/:filename', (req, res) => {
    const filename = req.params.filename;
    
    // 防止路徑遍歷攻擊 - 跨平台兼容
    if (filename.includes('..') || filename.includes(path.sep) || filename !== path.basename(filename)) {
        return res.status(400).json({ error: 'Invalid filename' });
    }
    
    const filePath = path.join(uploadsDir, filename);
    console.log(`Attempting to download file: ${filePath}`);
    console.log(`Uploads directory: ${uploadsDir}`);
    console.log(`File exists: ${fs.existsSync(filePath)}`);
    
    if (fs.existsSync(filePath)) {
        // 用 root 選項讓 send 只針對檔名本身做 dotfile 檢查；uploadsDir 在打包版
        // 位於使用者家目錄下（例如 ~/.local/share/kkdrop/uploads），路徑中的
        // ".local" 若把整個絕對路徑丟給 res.download 會被誤判成 dotfile 而回應失敗。
        res.download(filename, filename, { root: uploadsDir }, (err) => {
            if (err) {
                console.error('Download error:', err);
                res.status(err.status || 500).json({ error: 'Download failed' });
            }
        });
    } else {
        console.log(`File not found: ${filePath}`);
        res.status(404).json({ error: 'File not found' });
    }
});

app.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const targetClientId = req.body.targetClient;
    if (!targetClientId) {
        return res.status(400).json({ error: 'No target client specified' });
    }
    
    const normalizedOriginalName = normalizeOriginalName(req.file.originalname);
    const normalizedStoredName = normalizeOriginalName(req.file.filename);
    const fileInfo = {
        filename: normalizedStoredName,
        originalname: normalizedOriginalName,
        size: req.file.size,
        uploadTime: new Date().toISOString(),
        from: req.body.fromClient || 'unknown',
        to: targetClientId
    };
    
    io.to(targetClientId).emit('fileReceived', fileInfo);
    
    res.json({ 
        message: 'File sent successfully', 
        file: fileInfo 
    });
});

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);
    
    // Extract IPv4 address from IPv6-mapped format
    let clientIP = socket.handshake.address;
    if (clientIP.startsWith('::ffff:')) {
        clientIP = clientIP.substring(7);
    }

    if (clientIP === '::1') {
        clientIP = '127.0.0.1';
    }

    if (clientIP === "127.0.0.1") {
        clientIP = localIP;
    }
    
    const client = {
        id: socket.id,
        connectTime: new Date().toISOString(),
        ip: clientIP,
        deviceName: '',
        deviceOS: ''
    };
    
    connectedClients.push(client);
    
    emitClientUpdates(socket, true);

    socket.on('updateDeviceInfo', (payload = {}) => {
        const sanitizedName = sanitizeDeviceName(payload.deviceName || '');
        const sanitizedOS = sanitizeDeviceOS(payload.deviceOS || '');
        connectedClients = connectedClients.map(clientInfo => {
            if (clientInfo.id === socket.id) {
                return { ...clientInfo, deviceName: sanitizedName, deviceOS: sanitizedOS };
            }
            return clientInfo;
        });
        emitClientUpdates(socket, true);
    });

    socket.on('updateDeviceName', (deviceName) => {
        const sanitizedName = sanitizeDeviceName(deviceName);
        connectedClients = connectedClients.map(clientInfo => {
            if (clientInfo.id === socket.id) {
                return { ...clientInfo, deviceName: sanitizedName };
            }
            return clientInfo;
        });
        emitClientUpdates(socket, true);
    });
    
    socket.on('sendMessage', (data) => {
        const { message, targetClient, fromClient } = data;
        
        const messageInfo = {
            message: message,
            from: fromClient,
            to: targetClient,
            timestamp: new Date().toISOString()
        };
        
        io.to(targetClient).emit('messageReceived', messageInfo);
        console.log(`Message sent from ${fromClient} to ${targetClient}: ${message}`);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        connectedClients = connectedClients.filter(client => client.id !== socket.id);
        emitClientUpdates();
    });
});

function shutdown() {
    io.close();
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 2000).unref();
}

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Local access: http://localhost:${PORT}`);
    console.log(`Network access: http://${localIP}:${PORT}`);
    console.log(`Uploads directory: ${uploadsDir}`);
    console.log(`Public directory: ${publicDir}`);
    console.log(`Current working directory: ${process.cwd()}`);
    console.log(`__dirname: ${__dirname}`);

    require('./tray').initTray(serverURL, shutdown);
});
