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

if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname);
    }
});

const upload = multer({ storage: storage });

app.use(express.static('public'));

let connectedClients = [];

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/download/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, 'uploads', filename);
    
    if (fs.existsSync(filePath)) {
        res.download(filePath);
    } else {
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
    
    const fileInfo = {
        filename: req.file.filename,
        originalname: req.file.originalname,
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

    if(clientIP == "127.0.0.1"){
        clientIP = localIP;
    }
    
    const client = {
        id: socket.id,
        connectTime: new Date().toISOString(),
        ip: clientIP
    };
    
    connectedClients.push(client);
    
    socket.emit('clientsUpdate', {
        clients: connectedClients,
        yourId: socket.id,
        serverURL: `http://${localIP}:${PORT}`
    });
    socket.broadcast.emit('clientsUpdate', {
        clients: connectedClients,
        yourId: null,
        serverURL: `http://${localIP}:${PORT}`
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
        io.emit('clientsUpdate', {
            clients: connectedClients,
            yourId: null,
            serverURL: `http://${localIP}:${PORT}`
        });
    });
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Local access: http://localhost:${PORT}`);
    console.log(`Network access: http://${localIP}:${PORT}`);
});