const http = require('http');
const WebSocket = require('ws');
const url = require('url');

const PORT = 4000;
const server = http.createServer();
const wss = new WebSocket.Server({ noServer: true });

let lobbies = [];
const lobbyConnections = {}; // lobbyId: [ws1, ws2, ...]

server.on('upgrade', (req, socket, head) => {
  const pathname = new URL(req.url, `http://${req.headers.host}`).pathname;
  const match = pathname.match(/^\/lobby\/(.+)$/);

  if (match) {
    const lobbyId = match[1];
    wss.handleUpgrade(req, socket, head, (ws) => {
      ws.lobbyId = lobbyId;
      wss.emit('connection', ws, req);
    });
  } else {
    socket.destroy();
  }
});

wss.on('connection', (ws) => {
  const lobbyId = ws.lobbyId;
  console.log(`🔌 Bağlantı alındı - Lobi: ${lobbyId}`);

  if (!lobbyConnections[lobbyId]) {
    lobbyConnections[lobbyId] = [];
  }
  lobbyConnections[lobbyId].push(ws);

  ws.on('message', (data) => {
    let parsed;
    try {
      parsed = JSON.parse(data);
    } catch (e) {
      console.warn("❗ Geçersiz JSON:", data);
      return;
    }

    console.log("📩 Mesaj geldi:", parsed);

    const lobby = lobbies.find(l => l.id === ws.lobbyId);

    // ⏱ Ping mesajı (sahip aktif kalıyor)
    if (parsed.type === 'ping' && lobby) {
      if (parsed.user?.id === lobby.owner.id) {
        lobby.ownerLastActive = Date.now();
        console.log(`✅ Ping alındı. Sahip aktif: ${lobby.id}`);
      }
      return;
    }

    // 🎯 Lobi oluştur
    if (parsed.type === 'createLobby') {
      const already = lobbies.find(l => l.owner.id === parsed.user.id);
      if (already) {
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Zaten aktif bir lobiniz var!'
        }));
        return;
      }

      const newLobby = {
        id: lobbyId,
        owner: parsed.user,
        type: parsed.lobbyType,
        isPrivate: parsed.isPrivate,
        password: parsed.password,
        startDate: parsed.eventStartDate,
        endDate: parsed.eventEndDate,
        gameId: parsed.gameId,
        members: [parsed.user],
        createdAt: new Date().toISOString(),
        lastActive: Date.now(),
        ownerLastActive: Date.now(),
      };

      lobbies.push(newLobby);

      ws.send(JSON.stringify({
        type: 'lobbyCreated',
        lobby: newLobby
      }));

      Object.values(lobbyConnections).flat().forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'allLobbies',
            lobbies
          }));
        }
      });
    }

    // 🔗 Lobiye katıl
    if (parsed.type === 'join') {
      const user = parsed.user;
      const password = parsed.password || null;
      const joinLobby = lobbies.find(l => l.id === parsed.lobbyId);

      if (!joinLobby) {
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Lobi bulunamadı'
        }));
        return;
      }

      if (joinLobby.isPrivate && joinLobby.password !== password) {
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Şifre hatalı!'
        }));
        return;
      }

      const already = joinLobby.members.find(m => m.id === user.id);
      if (!already) {
        joinLobby.members.push(user);
      }

      if (user.id === joinLobby.owner.id) {
        joinLobby.ownerLastActive = Date.now();
      }

      joinLobby.lastActive = Date.now();

      ws.send(JSON.stringify({
        type: 'lobbyJoinConfirmed',
        lobby: joinLobby
      }));
    }

    // ❌ Lobi sil
    if (parsed.type === 'deleteLobby') {
      const { user, lobbyId } = parsed;
      const lobbyIndex = lobbies.findIndex(l => l.id === lobbyId);

      if (lobbyIndex === -1) {
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Lobi bulunamadı!'
        }));
        return;
      }

      const lobby = lobbies[lobbyIndex];

      if (lobby.owner.id !== user.id) {
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Sadece lobi sahibi silebilir!'
        }));
        return;
      }

      lobbies.splice(lobbyIndex, 1);
      console.log(`🗑 Lobi silindi: ${lobbyId}`);

      Object.values(lobbyConnections).flat().forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'allLobbies',
            lobbies
          }));
        }
      });
    }
  });

  ws.on('close', () => {
    console.log(`❌ Bağlantı kapandı - Lobi: ${ws.lobbyId}`);
    lobbyConnections[ws.lobbyId] = lobbyConnections[ws.lobbyId]?.filter(client => client !== ws);
  });
});

// 🕓 Otomatik silme
setInterval(() => {
  const now = Date.now();
  const maxInactive = 60 * 1000; // 1 dakika (test için)

  lobbies = lobbies.filter(lobby => {
    const inactive = now - (lobby.ownerLastActive || 0) > maxInactive;
    if (inactive) {
      console.log(`⏱ Sahibi aktif değil, lobi silindi: ${lobby.id}`);
    }
    return !inactive;
  });

  Object.values(lobbyConnections).flat().forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({
        type: 'allLobbies',
        lobbies
      }));
    }
  });
}, 15 * 1000);

server.listen(PORT, () => {
  console.log(`🚀 Game WebSocket sunucusu ${PORT} portunda çalışıyor.`);
});
