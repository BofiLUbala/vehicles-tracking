# Architecture — vue d'ensemble

```
Application Flutter (chauffeur)
       │
       ├── API REST
       ├── WebSocket (Socket.IO)
       └── Upload photos (multipart)
                    │
                    ▼
               API NestJS
       ├── PostgreSQL/PostGIS  (données, géométries, traces)
       ├── Redis                (OTP, BullMQ, pub/sub temps réel)
       ├── Stockage S3          (photos, URLs signées)
       ├── WhatsApp Cloud API   (OTP chauffeurs)
       ├── Service e-mail       (OTP admin)
       └── Firebase (FCM)       (notifications push)
                    │
                    ▼
        Tableau de bord Next.js (admin / super-admin)
```

Principe clé : **l'API est la seule autorité** pour valider une mission, une
collecte/dépôt ou une position. Le mobile ne décide jamais seul.

Voir le prompt original (section 4 à 12) pour le détail des flux, des
endpoints, des événements Socket.IO et des règles de validation GPS+QR+photo.
