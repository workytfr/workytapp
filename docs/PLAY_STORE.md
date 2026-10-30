# Publication sur le Google Play Store

Package : `fr.workyt.app` · Projet EAS : `@nadsair/workytapp` · Catégorie : **Éducation**

## 1. Fiche du Store (textes à copier)

**Nom de l'application** (30 caractères max)
> Workyt : révisions et entraide

**Description courte** (80 caractères max)
> Cours, fiches, forum d'entraide et quiz du jour : réviser gratuitement ensemble.

**Description complète** (4 000 caractères max)

> Workyt, c'est l'école en mieux : des cours gratuits du collège au supérieur, des fiches de révision partagées par la communauté, un forum où l'on t'aide vraiment, et une aventure qui donne envie de réviser chaque jour.
>
> 📚 DES COURS GRATUITS
> Maths, français, physique-chimie, SVT, histoire-géo, philo, SES, langues… Chaque cours se suit chapitre par chapitre, leçon par leçon, avec exercices, quiz et évaluation. Ta progression est sauvegardée : tu reprends là où tu t'étais arrêté.
>
> 📝 DES FICHES DE RÉVISION
> Des milliers de fiches pour le Brevet, le Bac et le supérieur : synthèses, méthodes, formules. Filtre par matière et par niveau, enregistre tes favorites, aime celles qui t'ont aidé et partage les tiennes.
>
> 💬 UN FORUM D'ENTRAIDE
> Bloqué sur un exercice ? Pose ta question, avec photo si besoin. Des élèves et des bénévoles te répondent, formules mathématiques comprises. Aide les autres à ton tour et gagne des points.
>
> ⚔️ L'AVENTURE WORKYT
> Chaque jour, un quiz pour vaincre le monstre du jour et remplir ton calendrier de récompenses. Garde ta série 🔥, accomplis des quêtes, équipe ton héros et rejoins un clan pour la guerre de la semaine.
>
> 👥 RÉVISER ENSEMBLE
> Ajoute tes amis, lance-leur des défis, et fais-toi accompagner par un bénévole grâce au suivi personnalisé.
>
> 🧰 DES OUTILS UTILES
> Minuteur Pomodoro, calcul de ta moyenne au Bac et au Brevet, rappels de révision qui ne te dérangent pas la nuit.
>
> Workyt est porté par une association : 100 % gratuit, sans publicité.

## 2. Éléments graphiques

| Élément | Format | Fichier |
|---|---|---|
| Icône | 512 × 512 PNG | `store/icon-512.png` |
| Image de présentation | 1024 × 500 PNG/JPG | `store/feature-graphic.png` |
| Captures téléphone | 2 à 8, format 9:16 | `store/screens/*.png` |

## 3. Réponses aux formulaires de la Play Console

**Accès à l'application** : l'app demande un compte. Fournir à Google un compte de test (identifiant + mot de passe) créé pour l'occasion, sans données réelles.

**Publicités** : non, l'application ne contient pas de publicité.

**Classification du contenu** (questionnaire IARC) : catégorie « Référence, actualités ou éducation ». Contenu généré par les utilisateurs : **oui** (forum, fiches, commentaires, tchat de clan), avec signalement et modération. Pas de violence réaliste, pas de jeux d'argent, pas d'achat.

**Public cible** : le collège commence vers 11 ans. Si tu coches une tranche d'âge sous 13 ans, l'app entre dans le programme « Familles » de Google (règles renforcées sur les données des enfants). Option la plus simple : public cible **13 ans et plus**, et le dire dans la politique de confidentialité. À décider avec l'association.

**Sécurité des données** :

| Donnée | Collectée | Partagée | Pourquoi |
|---|---|---|---|
| Nom, e-mail, identifiant | oui | non | Gestion du compte |
| Photos (questions, fiches, avatar) | oui, si l'utilisateur en envoie | non | Fonctionnalités de l'app |
| Messages et contenus publiés | oui | non | Forum, fiches, tchat |
| Activité dans l'app (progression, points) | oui | non | Fonctionnalités, personnalisation |
| Identifiant de l'appareil (jeton de notification) | oui | non | Notifications |

- Données chiffrées en transit : **oui** (HTTPS).
- Suppression possible : **oui**, dans l'app (Profil → Supprimer mon compte) et sur le web : `https://workyt.fr/supprimer-mon-compte`.

**Politique de confidentialité** : `https://workyt.fr/politique-confidentialite`

## 4. Construire et envoyer

```bash
# Fichier .aab pour le Play Store (versionCode augmenté automatiquement)
npx eas-cli build -p android --profile production
```

- **Premier envoi** : à faire à la main dans la Play Console (Tests internes → Créer une version → déposer le `.aab`). Google l'exige avant tout envoi automatique.
- **Envois suivants** : `npx eas-cli submit -p android` avec une clé de compte de service Google (voir `eas.json`).
- **Compte personnel** (créé à ton nom) : test fermé obligatoire avec **12 testeurs pendant 14 jours** avant la production. Un compte **organisation** (au nom de l'association, avec numéro D-U-N-S) en est dispensé.

## 5. Après publication

- Récupérer l'empreinte SHA-256 de la clé de signature Play (Play Console → Intégrité de l'app) et l'ajouter à `ANDROID_CERT_SHA256` sur le site, à côté de celle d'EAS (séparées par une virgule) : les liens workyt.fr s'ouvriront alors directement dans l'app.
