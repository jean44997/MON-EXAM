# Déploiement Mon Exam sur Render

## 🎯 Vue d'ensemble
Ce projet déploie 2 services :
1. **mon-exam-api** : Backend FastAPI (Python) — gère sessions, commandes, paiements, admin
2. **mon-exam-web** : Frontend PWA (Expo export web) — interface utilisateur

## 📋 Prérequis (à faire une seule fois)

### 1. MongoDB Atlas (base de données gratuite)
1. Créez un compte sur https://www.mongodb.com/cloud/atlas/register
2. Créez un **Free Cluster** (M0, 512MB)
3. **Network Access** → Add IP : `0.0.0.0/0` (toutes IPs, requis pour Render)
4. **Database Access** → créez un user avec mot de passe (notez-les)
5. **Connect → Drivers → Python** → copiez l'URI :
   ```
   mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

### 2. Compte Render
1. Créez un compte sur https://dashboard.render.com (gratuit, OAuth GitHub)
2. Autorisez l'accès à votre dépôt `jean44997/MON-EXAM`

## 🚀 Déploiement automatique (Blueprint)

### Méthode 1 — Via Blueprint (recommandé, 1 clic)

1. Sur Render Dashboard : **New +** → **Blueprint**
2. Connectez le dépôt `jean44997/MON-EXAM`
3. Render détecte `render.yaml` à la racine → cliquez **Apply**
4. Render crée les 2 services automatiquement
5. Sur le service **mon-exam-api**, allez dans **Environment** et ajoutez :
   - `MONGO_URL` = votre URI MongoDB Atlas (depuis l'étape 1.5)
6. Cliquez **Manual Deploy → Deploy latest commit** sur les 2 services

⏱️ Premier build : ~3-5 minutes par service.

### Méthode 2 — Manuel (si Blueprint échoue)

**Backend** :
1. **New +** → **Web Service** → connectez le repo
2. Configuration :
   - **Name** : `mon-exam-api`
   - **Root Directory** : `backend`
   - **Runtime** : Python 3
   - **Build Command** : `pip install -r requirements.txt`
   - **Start Command** : `uvicorn server:app --host 0.0.0.0 --port $PORT`
   - **Plan** : Free (ou Starter 7$/mois pour éviter le sleep)
3. **Environment Variables** :
   - `MONGO_URL` = `mongodb+srv://...` (Atlas)
   - `DB_NAME` = `monexam`
   - `PYTHON_VERSION` = `3.11.9`
4. **Create Web Service** → attendez le build

**Frontend** :
1. **New +** → **Static Site** → même repo
2. Configuration :
   - **Name** : `mon-exam-web`
   - **Root Directory** : `frontend`
   - **Build Command** : `yarn install --frozen-lockfile && yarn expo export --platform web --output-dir dist`
   - **Publish Directory** : `dist`
3. **Environment Variables** :
   - `EXPO_PUBLIC_BACKEND_URL` = `https://mon-exam-api.onrender.com` (URL du backend déployé)
4. **Redirects/Rewrites** :
   - Source : `/api/*` → Destination : `https://mon-exam-api.onrender.com/api/*` → Type : Rewrite
   - Source : `/*` → Destination : `/index.html` → Type : Rewrite
5. **Create Static Site**

## 🧪 Vérifications post-déploiement

```bash
# Test backend
curl https://mon-exam-api.onrender.com/api/
# → {"app":"Mon Exam","status":"ok"}

curl https://mon-exam-api.onrender.com/api/config?country=civ
# → JSON avec countries, series, pricing
```

Frontend : visitez `https://mon-exam-web.onrender.com`
- L'app charge en mode sombre
- Sélectionnez Côte d'Ivoire → page Services
- Toggle thème (icône lune/soleil)
- Tapez 5x sur logo → admin login (`MESSI10@@.COM`)

## ⚠️ Important — Free plan

Le plan **Free** met les services en sommeil après **15 min d'inactivité** (cold start ~30s à la 1ère requête). Pour la production avec utilisateurs réels :
- Backend : passez au plan **Starter** ($7/mois) → pas de sleep
- Frontend static : reste gratuit ✓

## 🔄 Mises à jour
Chaque `git push` sur `main` déclenche un **auto-deploy** des deux services.

## 🐛 Debug
- **Logs backend** : Dashboard Render → mon-exam-api → Logs
- **Logs frontend build** : Dashboard Render → mon-exam-web → Events
- **MongoDB** : Atlas → Browse Collections (`sessions`, `orders`, `admin_sessions`, `admin_attempts`)

## 🔐 Sécurité production
Avant de partager le lien publiquement :
1. Changez `ADMIN_CODE` dans `backend/server.py` (ligne ~35) — actuellement `MESSI10@@.COM`
2. Configurez `CORS_ORIGINS` sur Render avec le vrai domaine au lieu de `*`
3. Activez HTTPS (auto sur Render ✓)

## 📱 PWA installable
Une fois en ligne, vos utilisateurs peuvent installer la PWA :
- **Android Chrome** : menu ⋮ → "Installer l'application"
- **iOS Safari** : Partager → "Sur l'écran d'accueil"
- L'app fonctionne offline pour les écrans déjà visités
