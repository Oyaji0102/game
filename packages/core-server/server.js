// ✅ SUNUCU KODU - server.js
const http = require('http');
const WebSocket = require('ws');
const url = require('url');

const PORT = 4000;
const server = http.createServer();
const wss = new WebSocket.Server({ noServer: true });


const lobbyReadyMap = {};
const drawnNumbersMap = {}; 

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

    if (parsed.type === 'ping' && lobby) {
      if (parsed.user?.id === lobby.owner.id) {
        lobby.ownerLastActive = Date.now();
        console.log(`✅ Ping alındı. Sahip aktif: ${lobby.id}`);
      }
      return;
    }

   if (parsed.type === 'drawNumber') {
  const { lobbyId } = parsed;

  console.log(`📩 drawNumber çağrıldı: ${lobbyId}`); // ✅ [1] giriş kontrolü

  if (!lobbyConnections[lobbyId]) {
    console.warn(`❌ Hatalı lobbyId veya bağlantı eksik: ${lobbyId}`);
    return;
  }

  if (!drawnNumbersMap[lobbyId]) {
    drawnNumbersMap[lobbyId] = [];
  }

  const drawnNumbers = drawnNumbersMap[lobbyId];

  const availableNumbers = Array.from({ length: 90 }, (_, i) => i + 1)
    .filter(n => !drawnNumbers.includes(n));

  console.log(`🔍 ${lobbyId} için kalan sayı sayısı: ${availableNumbers.length}`); // ✅ [2] sayı kontrolü

  if (availableNumbers.length === 0) {
    console.log(`🎉 Tüm sayılar çekildi: ${lobbyId}`);
    return;
  }

  const newNumber = availableNumbers[Math.floor(Math.random() * availableNumbers.length)];
  drawnNumbers.push(newNumber);

  console.log(`🎯 Yeni sayı çekildi: ${newNumber} (Lobi: ${lobbyId})`); // ✅ [3] sonuç kontrolü

  lobbyConnections[lobbyId].forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({
        type: 'newNumber',
        number: newNumber,
        lobbyId,
      }));
     }
  });

  return;
}


    if (parsed.type === 'playerReady') {
      const { lobbyId, user } = parsed;

      if (!lobbyReadyMap[lobbyId]) {
        lobbyReadyMap[lobbyId] = [];
      }

      if (!lobbyReadyMap[lobbyId].includes(user.id)) {
        lobbyReadyMap[lobbyId].push(user.id);
      }

      const lobby = lobbies.find(l => l.id === lobbyId);
      if (!lobby) return;

      const allReady = lobby.members.every(m => lobbyReadyMap[lobbyId].includes(m.id));

      if (allReady) {
        console.log(`✅ Tüm oyuncular hazır, oyun başlatılıyor: ${lobbyId}`);
        lobbyConnections[lobbyId].forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
              type: 'start_game',
              lobbyId,
              gameId: lobby.gameId
            }));
          }
        });
      }

      if (parsed.user) {
        ws.user = parsed.user;
      }
    }

    if (parsed.type === 'playerUnready') {
      const { lobbyId, user } = parsed;

      if (lobbyReadyMap[lobbyId]) {
        lobbyReadyMap[lobbyId] = lobbyReadyMap[lobbyId].filter(id => id !== user.id);
        console.log(`↩️ Oyuncu hazırdan vazgeçti: ${user.email}`);
      }

      if (parsed.user) {
        ws.user = parsed.user;
      }
    }

     if (parsed.type === 'announceWin') {
  const { step, user, lobbyId } = parsed;

  console.log(`🏆 ${step.toUpperCase()} yapan: ${user.email}`);

  if (step === 'tombala') {
    // Oyun bitirilsin
    lobbyConnections[lobbyId]?.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: 'game_over',
          lobbyId,
          winner: user,
        }));
      }
    });
    console.log(`🎉 Oyun sona erdi. Kazanan: ${user.email}`);
  }

  if (step === 'cinko1' || step === 'cinko2') {
    lobbyConnections[lobbyId]?.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: 'player_announcement',
          step,
          user,
        }));
      }
    });
  }

  return;
}


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

   if (parsed.type === 'join') {
  const user = parsed.user;
  const password = parsed.password || null;
  const joinLobby = lobbies.find(l => l.id === parsed.lobbyId);

  if (!joinLobby) {
    ws.send(JSON.stringify({ type: 'error', message: 'Lobi bulunamadı' }));
    return;
  }

  if (joinLobby.isPrivate && joinLobby.password !== password) {
    ws.send(JSON.stringify({ type: 'error', message: 'Şifre hatalı!' }));
    return;
  }

  const existing = joinLobby.members.find(m => m.email === user.email);
  if (existing) {
    // Aynı kullanıcı tekrar giriyor, eski id'yi kullanalım
    user.id = existing.id;
  } else {
    // İlk defa giriyor, ekle
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
      delete drawnNumbersMap[lobbyId];
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

setInterval(() => {
  const now = Date.now();
  const maxInactive = 60 * 1000;

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