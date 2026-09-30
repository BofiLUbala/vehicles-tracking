# Audit UX — application mobile chauffeur (Android) — 30/09/2026

Mode **quick** (balayage heuristique, gravité la plus haute d'abord). Rapport écrit avant toute correction ; les corrections faites ensuite sont listées en fin de document.

## 1. Périmètre et base de preuves

- **Produit** : app chauffeur Tracking Vehicles (Expo / React Native), **Android uniquement**.
- **Public** : chauffeurs de camions de collecte à Kinshasa — **grand public**, pas des experts : interface en français, usage en extérieur (plein soleil), souvent d'une main, connectivité variable. Le vocabulaire technique est donc un frein, et le contraste compte plus qu'en intérieur.
- **Enjeux** : moyens. Une erreur ne coûte ni argent ni santé, mais une mission mal démarrée ou non suivie coûte une tournée et fausse le contrôle de la flotte.
- **Preuves** :
  - **Rendu réel sur émulateur Android** (Pixel 7, Android récent, navigation par gestes), captures des 29 et 30/09 : activation du compte, Accueil, Missions (carte), détail de mission, mission active.
  - **Code source** `apps/mobile` pour tous les écrans.
  - **Contrastes calculés** à partir des couleurs du thème (`src/theme/colors.ts`), pas mesurés sur écran.
- **Non vus en rendu** : Sync, Historique, Profil, parcours carburant, scan QR, photo d'étape. Les constats qui les touchent reposent sur le **code seulement**, et c'est indiqué.
- **Hors périmètre** : la bulle d'outils ⚙ visible en haut à droite des captures appartient à la version de développement (`expo-dev-client`) et n'existe pas dans la version Play Store.

## 2. Résumé

Les trois problèmes qui comptent le plus :

1. **Sur Android, le haut de 14 écrans passe sous la barre d'état** (heure, batterie). En cause : ces écrans utilisent un `SafeAreaView` qui ne fonctionne que sur iOS. Cela touche notamment la connexion, l'activation, le détail de mission, la progression de mission et le scan QR.
2. **La barre d'onglets du bas est recouverte par la barre de gestes Android.** Sa hauteur fixe empêche la navigation d'ajouter la marge système, et le trait de geste est dessiné sur les libellés.
3. **Les textes gris clair et orange sont illisibles en plein soleil** (contraste 2,6:1 et 2,2:1 pour un minimum de 4,5:1). Le gris clair est utilisé 48 fois (aides, sous-titres, onglets inactifs) ; l'orange sert aux indicateurs « en attente ».

S'y ajoute un défaut de parcours : le bouton **« Démarrer la mission » de l'Accueil et de l'onglet Missions ne démarre rien**. Il ouvre un second écran où un autre « Démarrer la mission » fait vraiment l'action.

## 3. Gains rapides

| ID | Correction | Effort |
|---|---|---|
| PLAT-01 | Utiliser le `SafeAreaView` de `react-native-safe-area-context` sur les 14 écrans | S |
| PLAT-02 | Laisser la navigation gérer la hauteur de la barre d'onglets et la marge du bas | S |
| A11Y-01 | Assombrir le gris « texte discret » à `#6D7788` (4,5:1) | S |
| A11Y-02 | Texte orange en `#B45309` (5,0:1) ; le fond orange clair reste | S |
| FLOW-01 | Libellé « Voir la mission » tant que la mission n'est pas démarrée | S |
| A11Y-03 | Libellés des gros boutons à 19 px gras, pour que blanc sur bleu ou vert passe | S |

## 4. Constats

### PLAT-01 — Le haut de 14 écrans passe sous la barre d'état Android
- **Dimension** : plateforme (touche la hiérarchie visuelle et l'accessibilité)
- **Gravité** : High · **Confiance** : Observed (rendu, 4 écrans + code, 14 écrans)
- **Emplacement** : `login`, `activate`, `reset-password`, `missions/[id]/index`, `missions/[id]/progress`, `steps/[stepId]/scan`, `steps/[stepId]/photo`, `steps/[stepId]/result`, `missions/[id]/trip`, `permissions/gps`, `fuel/index`, `fuel/.../odometer-photo`, `receipt-photo`, `result`.
- **Preuves** :
  - Sur « Mission #3A0C4940 », l'heure « 3:37 » est imprimée par-dessus la flèche retour.
  - Sur « Ma mission » (mission active), l'heure chevauche le titre.
  - Sur l'écran d'activation, le logo Task Force commence sous l'heure.
  - Dans le code, ces écrans importent `SafeAreaView` depuis `react-native`, un composant sans effet sur Android.
- **Pourquoi c'est important** : le bouton retour et le titre sont les premiers repères du chauffeur. Un retour recouvert par l'heure se touche mal, et le titre de la mission en cours se lit mal.
- **Recommandation** : importer `SafeAreaView` depuis `react-native-safe-area-context`, déjà installé et utilisé par les 5 écrans à onglets, qui s'affichent correctement.
- **Effort** : S

### PLAT-02 — La barre de gestes Android recouvre les onglets
- **Dimension** : plateforme · **Gravité** : High · **Confiance** : Observed (rendu + code)
- **Emplacement** : `app/(main)/_layout.tsx`, style `tabBar`.
- **Preuves** :
  - Sur toutes les captures avec onglets, le trait de geste Android est dessiné sur le libellé « Sync ».
  - Le style impose `height: 62` et `paddingBottom: 8` sur Android, ce qui écrase la marge automatique prévue par la navigation.
- **Pourquoi c'est important** : ces onglets sont touchés toute la journée. Un appui près du bord bas peut déclencher le geste « retour à l'accueil » d'Android au lieu de changer d'onglet.
- **Recommandation** : supprimer hauteur et marge du bas fixes, et ajouter la marge système (`useSafeAreaInsets().bottom`) à la hauteur de base.
- **Effort** : S

### A11Y-01 — Le gris « texte discret » est illisible en extérieur
- **Dimension** : accessibilité (touche le contenu) · **Gravité** : High · **Confiance** : Observed (code + calculé)
- **Emplacement** : `AppTheme.textMuted = #98A2B3`, 48 usages : aides sous les champs, sous-titres, « Bienvenue », onglets inactifs, pied de page de connexion.
- **Preuves** :
  - Contraste de 2,58:1 sur blanc et de 2,40:1 sur le fond `#F5F7FA`, pour un minimum de 4,5:1.
  - Les libellés des onglets inactifs (« Accueil », « Sync »…) sont dans cette couleur, en 11 px.
- **Pourquoi c'est important** : au soleil, un chauffeur ne distingue plus l'aide « 8 caractères minimum » ni le nom des onglets. Il appuie au hasard ou demande de l'aide.
- **Recommandation** : passer `textMuted` à `#6D7788` (4,52:1 sur blanc, même teinte). Onglets inactifs en `textSecondary` (`#667085`, 4,97:1) et libellés en 12 px.
- **Effort** : S

### A11Y-02 — Texte orange « en attente » : 2,2:1
- **Dimension** : accessibilité · **Gravité** : Medium · **Confiance** : Observed (rendu + calculé)
- **Emplacement** : `SyncStatusPill`, `ConnectivityPill`, Accueil (`index.tsx:638`), Sync (`sync/index.tsx:28`).
- **Preuves** : pastille « 3 en attente » de l'Accueil, texte `#F59E0B` sur fond orange pâle. Contraste de 2,15:1 sur blanc.
- **Pourquoi c'est important** : c'est justement le signal « des données ne sont pas encore envoyées ». S'il ne se lit pas, le chauffeur ne pense pas à se reconnecter avant de rendre le téléphone.
- **Recommandation** : texte orange en `#B45309` (5,0:1). Garder `#F59E0B` pour les pastilles et les fonds uniquement.
- **Effort** : S

### A11Y-03 — Texte blanc des boutons trop petit pour ses couleurs
- **Dimension** : accessibilité · **Gravité** : Medium · **Confiance** : Observed (code + calculé)
- **Emplacement** : `BigButton` (17 px gras) ; bouton d'action de l'onglet Missions (14 px sur `tracking`).
- **Preuves** :
  - Blanc sur `primary` : 3,62:1. Sur `success` : 3,06:1. Sur `tracking` : 4,03:1.
  - Ces rapports ne passent que pour du « grand texte » (au moins 18,7 px gras). 17 px et 14 px sont en dessous.
- **Pourquoi c'est important** : ce sont les boutons d'action principaux (« Activer mon compte », « Démarrer la mission »…). Ils doivent être lisibles d'un coup d'œil au soleil.
- **Recommandation** : libellés de `BigButton` à 19 px gras. Pour le bouton de l'onglet Missions, fond `primaryDark` `#096A99` (5,94:1).
- **Effort** : S

### FLOW-01 — « Démarrer la mission » ne démarre pas la mission
- **Dimension** : parcours principal (touche le contenu) · **Gravité** : High · **Confiance** : Observed (rendu + code)
- **Emplacement** : Accueil (`index.tsx:263-272`) et onglet Missions (`missions/index.tsx:98, 118`).
- **Preuves** : le 29/09 sur l'émulateur, l'appui sur « Démarrer la mission » a ouvert « Mission #3A0C4940 », avec un second bouton « Démarrer la mission ». Le code confirme : le premier bouton ne fait que `router.push` vers le détail.
- **Pourquoi c'est important** : le chauffeur croit avoir démarré et range son téléphone. Le suivi GPS ne commence qu'au second appui : la tournée n'est pas tracée, et le contrôle voit un camion « hors ligne ».
- **Recommandation** : tant que la mission n'est pas démarrée, libellé **« Voir la mission »**, qui dit ce que fait le bouton. « Démarrer la mission » ne reste que sur l'écran de détail, où il démarre vraiment. Une fois la mission démarrée, « Continuer la mission » reste juste.
- **Effort** : S

### COPY-01 — Jargon « rejeu » et parenthèses techniques
- **Dimension** : contenu · **Gravité** : Low · **Confiance** : Observed (rendu + code)
- **Emplacement** : `progress.tsx:228` « Analyser le trajet (vitesse, arrêts, rejeu) » ; `missions/[id]/index.tsx:156` « Vitesse, arrêts détectés, trace recalée et rejeu ».
- **Pourquoi c'est important** : « rejeu » et « trace recalée » ne veulent rien dire pour un chauffeur. Le lien est ignoré, ou ouvert par erreur pendant la conduite.
- **Recommandation** : « **Revoir mon trajet** » et « Vitesse, arrêts et parcours de la journée ».
- **Effort** : S

### COPY-02 — « 3 en attente » ne dit pas ce qui attend
- **Dimension** : contenu · **Gravité** : Low · **Confiance** : Observed (rendu + code)
- **Emplacement** : `app/(main)/index.tsx:85`, `progress.tsx:123`.
- **Pourquoi c'est important** : « 3 en attente » peut être lu comme « 3 missions en attente ». Le sens réel est « 3 données pas encore envoyées au bureau ».
- **Recommandation** : « **3 à envoyer** ».
- **Effort** : S

### NAV-01 — Carte de mission : six boutons d'icônes sans libellé
- **Dimension** : hiérarchie visuelle · **Gravité** : Medium · **Confiance** : Observed (rendu)
- **Emplacement** : `MissionMap` (onglet Missions, mission active).
- **Preuves** : colonne de droite avec filtres, calques, 3D, zoom +, zoom − et recentrage, tous en icônes seules.
- **Pourquoi c'est important** : pour un public non expert, des icônes sans texte ne s'apprennent pas d'elles-mêmes. Elles prennent aussi un tiers de la largeur utile de la carte.
- **Recommandation (opportunité, non corrigée ici)** : garder zoom et recentrage, et regrouper calques, 3D et filtres derrière un seul bouton « Options de la carte », comme sur la page de suivi de l'admin.
- **Effort** : M

## 5. Priorités

1. PLAT-01 et PLAT-02 : écrans et onglets recouverts par Android.
2. FLOW-01 : mission crue démarrée alors qu'elle ne l'est pas.
3. A11Y-01, A11Y-02, A11Y-03 : lisibilité au soleil.
4. COPY-01 et COPY-02 : libellés.
5. NAV-01 : allègement des contrôles de la carte (M, à planifier).
6. Rendre Sync, Historique, Profil, carburant et scan QR sur un appareil, pour vérifier ce que le code seul ne montre pas.

## 6. Ce qui fonctionne, et ce qui a été laissé de côté

- **Ce qui fonctionne** :
  - L'Accueil est clair : prénom, camion, état GPS et réseau en pastilles, mission en cours et bouton principal pleine largeur.
  - Les boutons font 56 px de haut, faciles à toucher d'une main.
  - L'écran d'activation va droit au but (« Bonjour Patrick »).
- **Laissé de côté** :
  - La palette de marque (bleus, navy) reste inchangée : seuls les usages en texte trop clairs sont corrigés.
  - Le style « cartes arrondies » est un choix, pas un défaut.

## 7. Questions ouvertes

- Les chauffeurs lisent-ils le français écrit sans difficulté, ou faut-il davantage d'icônes accompagnées de mots, voire du lingala ? Seule une observation sur le terrain peut le dire.
- Téléphones réellement utilisés : taille d'écran et Android avec boutons ou avec gestes. Cela change l'importance de PLAT-02.

## 8. Corrections appliquées (même journée)

PLAT-01, PLAT-02, A11Y-01, A11Y-02, A11Y-03, FLOW-01, COPY-01, COPY-02. NAV-01 reste à planifier.

**Constaté en plus pendant la correction** :
- « 1 attente » (onglet Missions) et « Hors ligne (N en attente) » deviennent « … à envoyer ».
- Le vert et le bleu de marque échouent aussi en petit texte (3,06:1 et 4,03:1). Ajout de `successText` `#188757` et `infoText` `#146FF5` (4,5:1) pour les pastilles d'état.

**Vérifié sur l'émulateur Android** après correction :
- La barre de gestes passe sous les libellés des onglets.
- L'en-tête « Ma mission » (flèche retour et titre) est sous la barre d'état.
- « Continuer la mission » est sur fond `#096A99`.
- La pastille « À jour » est lisible.

Tests mobiles (102), vérification des types et `expo-doctor` (21/21) passent.
