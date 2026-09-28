// Signature release Android pour les builds locaux (./gradlew bundleRelease), hors EAS.
//
// android/ est régénéré par `expo prebuild` (CNG) : modifier build.gradle à la main serait perdu.
// Ce plugin injecte une signingConfig `release` qui lit la clé d'upload depuis des propriétés
// Gradle (~/.gradle/gradle.properties, jamais commitées) :
//   TV_UPLOAD_STORE_FILE, TV_UPLOAD_STORE_PASSWORD, TV_UPLOAD_KEY_ALIAS, TV_UPLOAD_KEY_PASSWORD
// Sans ces propriétés, le build release retombe sur la clé debug (comportement Expo par défaut).
const { withAppBuildGradle } = require('expo/config-plugins');

const RELEASE_SIGNING = `
        release {
            if (project.hasProperty('TV_UPLOAD_STORE_FILE')) {
                storeFile file(TV_UPLOAD_STORE_FILE)
                storePassword TV_UPLOAD_STORE_PASSWORD
                keyAlias TV_UPLOAD_KEY_ALIAS
                keyPassword TV_UPLOAD_KEY_PASSWORD
            }
        }`;

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (cfg) => {
    let gradle = cfg.modResults.contents;
    if (gradle.includes('TV_UPLOAD_STORE_FILE')) return cfg;

    gradle = gradle.replace(
      /(signingConfigs\s*\{[\s\S]*?keyPassword 'android'\s*\n\s*\})/,
      `$1${RELEASE_SIGNING}`,
    );
    gradle = gradle.replace(
      /(release\s*\{\s*\n(?:\s*\/\/.*\n)*\s*)signingConfig signingConfigs\.debug/,
      "$1signingConfig project.hasProperty('TV_UPLOAD_STORE_FILE') ? signingConfigs.release : signingConfigs.debug",
    );
    if (!gradle.includes('TV_UPLOAD_STORE_FILE')) {
      throw new Error('withReleaseSigning: build.gradle inattendu, signingConfigs introuvable.');
    }
    cfg.modResults.contents = gradle;
    return cfg;
  });
};
