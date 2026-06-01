# Mon Exam — PRD V2

## Vision
PWA + iOS/Android mobile app for BAC exam corrections in 4 African countries (Côte d'Ivoire, Sénégal, Burkina Faso, Mali). Mobile money payments (Wave/Orange Money), hidden admin panel, real-time order management.

## Key Features (V2)
1. **Pays-spécifiques** : Vraies séries BAC pour chaque pays (CIV: A/F/G · SEN: L/S/G/T · BFA: A/F/G/H · MLI: TAL/TSE/TSEco)
2. **Sessions anonymes rotatives** : nouvel ID `MEX-xxx` à chaque connexion
3. **Logo personnalisé** : "ME" en gradient orange→vert, top-left chaque page
4. **Dark mode** : toggle persistant via bouton lune/soleil
5. **Catalogue avec sujets floutés** : BlurView + cadenas + prix XOF
6. **Panier multi-sujets** + 4 forfaits (8k/13k/35k/50k XOF)
7. **Paiement Wave (+225 05 45 01 94 93) + Orange Money (+225 07 48 11 10 50)**
8. **Sécurité dual-code** :
   - `activation_code` (8 chars visible utilisateur)
   - `internal_token` (32 hex serveur uniquement, jamais exposé)
   - `code_hash` lié au user_id via SHA-256 + salt unique
9. **Compte à rebours 5 min** avec auto-expiration backend
10. **Mes Achats** : statuts paid/awaiting/refused + suppression utilisateur
11. **Admin caché** : 5 taps sur logo → login `MESSI10@@.COM` → panneau avec tabs (À valider / En attente / Validées / Refusées / Expirées) + confirmations
12. **Notifications temps réel** : badge sur icône Mes Achats, polling 10s
13. **Animations** : page transitions, fade-in, scale on press
14. **WhatsApp deep-links** auto-remplis avec ID utilisateur

## Tech
- Backend : FastAPI + MongoDB (motor) + cleanup task
- Frontend : Expo Router + Reanimated + BlurView + LinearGradient + ThemeContext
- Storage : AsyncStorage (general) + SecureStore (admin token)
