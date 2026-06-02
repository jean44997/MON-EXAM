# Guide de Déploiement : Mon Exam (V2) sur Vercel & Supabase

Ce guide explique étape par étape comment configurer votre base de données Supabase, connecter votre PWA Expo, et la déployer sur Vercel sans bug et en toute sécurité.

---

## Étape 1 : Configurer la base de données Supabase (Backend)

Puisque nous avons migré le backend de Python à Supabase, toute la logique métier et la sécurité sont gérées de manière ultra-fluide et sécurisée directement dans votre base de données PostgreSQL.

1. Rendez-vous sur [Supabase](https://supabase.com) et créez un projet gratuit.
2. Une fois le projet prêt, allez dans le menu **SQL Editor** (l'icône de feuille avec `SQL` dans le menu de gauche).
3. Cliquez sur **New query** (Nouvelle requête).
4. Ouvrez le fichier [supabase_schema.sql](file:///c:/Users/DELL/Downloads/MON-EXAM-main/MON-EXAM-main/supabase_schema.sql) à la racine de ce dossier, copiez l'intégralité du code et collez-le dans l'éditeur de Supabase.
5. Cliquez sur **Run** (Exécuter) en bas à droite.
   > **Note :** Cela créera les tables `sessions` et `orders`, ainsi que toutes les fonctions sécurisées de paiement, de commande et d'administration.

---

## Étape 2 : Récupérer vos clés API Supabase

Dans le tableau de bord de votre projet Supabase, allez dans **Project Settings** (Paramètres du projet) -> **API** :
*   Copiez l'**Project URL** (ex: `https://xxxx.supabase.co`).
*   Copiez la clé **Anon Key** (Clé publique `eyJhbGciOi...`).

---

## Étape 3 : Déploiement sur Vercel

Pour déployer votre PWA Expo sur Vercel, connectez votre dépôt GitHub à Vercel ou utilisez la CLI Vercel.

### Paramètres de build à configurer dans Vercel :

Lors de l'importation de votre projet sur Vercel, configurez les options suivantes dans l'interface de déploiement :

*   **Root Directory** (Dossier racine) : `frontend` (très important !)
*   **Framework Preset** (Configuration prédéfinie) : `Other` (Autre)
*   **Build Command** (Commande de build) : `npm run build` (ou `npx expo export`)
*   **Output Directory** (Dossier de sortie) : `dist`

### Variables d'environnement à ajouter dans Vercel :

Dans la section **Environment Variables** de Vercel, ajoutez les deux variables suivantes avec les clés récupérées à l'étape 2 :

1.  **Key** : `EXPO_PUBLIC_SUPABASE_URL`  
    **Value** : *(Votre URL Supabase)*
2.  **Key** : `EXPO_PUBLIC_SUPABASE_ANON_KEY`  
    **Value** : *(Votre clé Anon Supabase)*

Cliquez ensuite sur **Deploy**. Vercel va compiler automatiquement votre PWA Expo et la mettre en ligne.

---

## Pourquoi ce nouveau backend est bien meilleur ?

1.  **Zéro configuration serveur** : Plus besoin de lancer de script Python en arrière-plan ou de gérer des conteneurs MongoDB compliqués à déployer sur Vercel.
2.  **Performance maximale** : L'application communique directement avec Supabase depuis le navigateur du client.
3.  **Sécurité Blindée (Dual-code)** : Toutes les actions critiques (création de commande, hash du code d'activation, validation de paiement) sont exécutées à l'intérieur de fonctions PostgreSQL `SECURITY DEFINER` isolées. Les tables ne sont pas exposées publiquement en accès direct.
4.  **Temps Réel Fluide** : La synchronisation entre les actions des utilisateurs (checkout/simulate) et la page d'administration est immédiate.
5.  **Mode Hors-ligne (Offline-first)** : La configuration des matières et séries est stockée localement dans l'application pour un chargement instantané.
