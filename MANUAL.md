# Mode d'emploi – HostReminder

## 1. Introduction
Ce projet **HostReminder** permet de gérer les réservations Airbnb, d'envoyer des rappels via WhatsApp, et d'effectuer la reconnaissance optique de caractères (OCR) sur les passeports grâce à **tesseract.js**.

## 2. Prérequis
- **Node.js** ≥ 24 (déjà spécifié dans `render.yaml`).
- **npm** ≥ 10.
- **SQLite** (pour le développement) ou une base PostgreSQL Supabase (pour la prod, configuration via `DATABASE_URL`).
- Les variables d’environnement listées dans `.env.example` doivent être renseignées.

## 3. Installation
```bash
# Clone le dépôt
git clone https://github.com/chekibjomni-design/hostreminder.git
cd hostreminder

# Installe les dépendances
npm ci   # ou npm install

# Génère le client Prisma (déjà fait par le script de build)
npx prisma generate
```

## 4. Configuration des variables d'environnement
Copiez le fichier d’exemple puis remplissez‑le :
```bash
cp .env.example .env
# éditez .env avec vos clés API, tokens WhatsApp, SMTP, etc.
```
Les variables essentielles :
- `PORT` – port d’écoute (défaut 3050).
- `DATABASE_URL` – chemin SQLite (`file:/path/to/db`) ou URL PostgreSQL.
- `SESSION_SECRET` – secret de session (≥ 32 caractères).
- `GROQ_API_KEY`, `FLIGHT_API_KEY`, `META_WHATSAPP_PHONE_NUMBER_ID`, `META_WHATSAPP_ACCESS_TOKEN`, `SMTP_*` – clés tierces.

## 5. Lancement du serveur (développement)
```bash
npm start   # écoute sur $PORT (par défaut 3050)
```
Le serveur affiche `HostReminder — http://localhost:<PORT>`.

## 6. Utilisation des API
### 6.1. Création d’une réservation (exemple)
```bash
node scripts/create-test-reservation.js   # crée une reservation avec date actuelle
node scripts/create-past-reservation.js   # crée une reservation datant de 2 jours
```
Les scripts affichent l’`ID` de la réservation créée.

### 6.2. Endpoint OCR (check‑in)
```bash
curl -X POST -F "passport=@path/to/passport.jpg" \
  http://localhost:3050/api/checkin/<RESERVATION_ID>/ocr
```
Réponse JSON :
```json
{
  "rawText": "...",
  "extractedName": "DOE JOHN" | null,
  "passportNumber": "123456789" | null,
  "confidence": 0.95
}
```
Le champ `status` de la réservation passe à `CHECKED_IN` si un nom ou un numéro est détecté.

### 6.3. Endpoint de démonstration OCR (url publique)
```bash
GET http://localhost:3050/api/ocr-demo?url=<IMAGE_URL>
```
Renvoie le même JSON que l’endpoint précédent. Idéal pour tester rapidement sans uploader de fichier.

## 7. Tests automatisés
```bash
npm test   # exécute le test Jest qui mocke tesseract.js
```
Le workflow CI (GitHub Actions) exécute ces tests à chaque push sur `master`.

## 8. Déploiement sur Render
1. Le dépôt possède le fichier `render.yaml`. Render détecte automatiquement le service.
2. Le script de build :`npm install && npm run build` (le script `build` lance `prisma generate`).
3. Après chaque push, Render déclenche un nouveau déploiement ; le fichier `redeploy.txt` force le redeploiement.

## 9. CI – GitHub Actions
Le fichier `.github/workflows/ci.yml` :
- Checkout du code.
- Installation de Node 24 avec cache npm.
- Exécution de `npm ci` puis `npm test`.
Le statut du workflow apparaît dans l’onglet **Actions** du dépôt.

## 10. Contribuer
1. Créez une branche :`git checkout -b feature/ma-fonctionnalité`.
2. Implémentez votre changement.
3. Lancez les tests (`npm test`).
4. Push & ouvrez une Pull Request.

## 11. Licence
Ce projet est sous licence **MIT**.

---
*Ce mode d'emploi a été généré le `$(date)`*