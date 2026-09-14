# ADR-003: límites de YouTube y Spotify

**Estado:** aceptado.

YouTube se integra mediante un extractor de mejor esfuerzo porque su API oficial no entrega audio para retransmisión. Spotify se usa oficialmente solo para metadatos: cada servidor puede autorizar una cuenta y acceder a pistas, álbumes y playlists propias o colaborativas. Las restricciones actuales impiden prometer playlists públicas arbitrarias para un bot nuevo. Consulta los [modos de cuota de Spotify](https://developer.spotify.com/documentation/web-api/concepts/quota-modes) y [Get Playlist Items](https://developer.spotify.com/documentation/web-api/reference/get-playlists-items).

Se adopta un comportamiento híbrido: YouTube funciona sin configuración, las pistas y álbumes de Spotify degradan a búsqueda de YouTube cuando falta el vínculo y las playlists se rechazan para evitar una sustitución silenciosa incorrecta. El vínculo se administra por servidor con `/setup`; el refresh token se cifra en SQLite y los tokens de corta duración solo viven en memoria.
