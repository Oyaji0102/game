📡 WebSocket Server (ws://192.168.x.x:4000 - Ayrı repo)
│
├── Giriş
│   ├── /lobby/:lobbyId → Her oda kendi ID’siyle açılır
│   └── Kullanıcı girişinde join/create event’i gönderilir
│
├── Lobi Yönetimi
│   ├── createLobby → Yeni lobi oluşturma (gameId dahil)
│   ├── join → Mevcut lobiye giriş (şifre kontrolü yapılır)
│   ├── deleteLobby → Admin isterse siler
│   └── allLobbies → GameID bazlı filtreli lobi listesi
│
├── Bağlı Kullanıcılar
│   ├── Kullanıcı e-posta ve ID ile takip edilir
│   ├── ping → 30 saniyede bir aktiflik kontrolü
│   └── timeout → 8 saat AFK kontrolü yapılabilir
│
└── Notlar
    ├── Lobiler context olarak tutulur
    ├── WebSocket'ler user.id ve lobbyId üzerinden eşlenir
    └── React Native tarafı bağlantı sırasında JSON gönderir:
        {
          type: 'createLobby',
          user: { id, email },
          lobbyId,
          gameId,
          ...
        }
