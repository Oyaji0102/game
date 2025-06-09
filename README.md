:: Game Reposu ::

Bu kısımda packages içerisinden core-server içindeki server.js dosyası ile websocket bağlantısı kurup lobi fonksiyonlarını tanımlıyoruz , tombala oynunun web sockete bağlantılıları ve de shared içerisindeki game.json dosyasıyla
mobil içindeki gamedetailmodal.js dosyasına bilgi saglıyoruz.

DOSYA ÇALIŞTIMA YOLU:

cmd terminalden : >cd game ----- npm install
cmd terminalden : >cd game/packages/core-server ------- >node server.js 

ÖNEMLİ NOT: shared içerisindeki game.json dosyasının bilgisayırnıca kurduğunuz konumunu gamecenter>packages>mobile>backend>src>routes>games.js doğru şekilde yerleştirin

Bununla beraber websocket bağlantısı oluşturuyoruz.
