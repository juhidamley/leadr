import type { ConfigPlugin } from 'expo/config-plugins'
import { withPodfile } from 'expo/config-plugins'
import type { ConfigContext, ExpoConfig } from 'expo/config'

// Google Sign-In's config plugin validates iosUrlScheme at prebuild time and
// throws if it's missing. Real value comes from Google Cloud Console (see
// the Task 6 manual setup checklist) and should be set as a build-time
// GOOGLE_IOS_URL_SCHEME env var — never committed. This placeholder keeps
// prebuild/typecheck/CI working before that's configured.
const googleIosUrlScheme = process.env.GOOGLE_IOS_URL_SCHEME || 'com.googleusercontent.apps.placeholder'

// Branch (Task 14, invite deep links). Real values come from the Branch
// dashboard (see the Task 14 manual setup checklist) — a live API key and
// the link domain Branch provisions for this app (e.g. leadr.app.link).
// These placeholders keep prebuild/typecheck/CI working before that's
// configured; react-native-branch's config plugin throws at prebuild time
// on a missing/empty key, so the fallback must be non-empty.
const branchApiKey = process.env.EXPO_PUBLIC_BRANCH_KEY || 'key_test_placeholder'
const branchLinkDomain = process.env.EXPO_PUBLIC_BRANCH_LINK_DOMAIN || 'leadr.app.link'

// GoogleSignIn-iOS pulls in Firebase's AppCheckCore transitively, which is a
// Swift pod that can't link as a static library without modular headers.
// `pod install` fails with "cannot yet be integrated as static libraries"
// without this. Podfile is regenerated on every prebuild, so this has to be
// a plugin rather than a one-off manual edit.
const withGoogleSignInModularHeaders: ConfigPlugin = (config) =>
  withPodfile(config, (config) => {
    if (!config.modResults.contents.includes('use_modular_headers!')) {
      config.modResults.contents = config.modResults.contents.replace(
        /^(platform :ios.*)$/m,
        '$1\nuse_modular_headers!',
      )
    }
    return config
  })

export default ({ config }: ConfigContext): ExpoConfig =>
  withGoogleSignInModularHeaders({
    ...config,
    name: 'Leadr',
    slug: 'leadr',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    scheme: 'leadr',
    userInterfaceStyle: 'automatic',
    ios: {
      icon: './assets/expo.icon',
      bundleIdentifier: 'com.leadr.app',
      // Universal Links: iOS only opens the app (instead of Safari) for a
      // Branch link if the domain is declared here AND verified via
      // Branch's hosted apple-app-site-association file — see the setup
      // checklist.
      associatedDomains: [`applinks:${branchLinkDomain}`],
    },
    android: {
      package: 'com.leadr.app',
      adaptiveIcon: {
        backgroundColor: '#E6F4FE',
        foregroundImage: './assets/images/android-icon-foreground.png',
        backgroundImage: './assets/images/android-icon-background.png',
        monochromeImage: './assets/images/android-icon-monochrome.png',
      },
      predictiveBackGestureEnabled: false,
      // Android App Links: the equivalent of associatedDomains above,
      // verified against Branch's hosted assetlinks.json.
      intentFilters: [
        {
          action: 'VIEW',
          autoVerify: true,
          data: [{ scheme: 'https', host: branchLinkDomain }],
          category: ['BROWSABLE', 'DEFAULT'],
        },
      ],
    },
    web: {
      output: 'static',
      favicon: './assets/images/favicon.png',
    },
    plugins: [
      'expo-router',
      'expo-dev-client',
      'expo-apple-authentication',
      [
        '@react-native-google-signin/google-signin',
        {
          iosUrlScheme: googleIosUrlScheme,
        },
      ],
      [
        'expo-image-picker',
        {
          photosPermission: 'Allow Leadr to access your photos to set a profile picture.',
          cameraPermission: false,
          microphonePermission: false,
        },
      ],
      [
        'expo-splash-screen',
        {
          backgroundColor: '#208AEF',
          image: './assets/images/splash-icon.png',
          imageWidth: 76,
        },
      ],
      [
        '@config-plugins/react-native-branch',
        {
          apiKey: branchApiKey,
          iosUniversalLinkDomains: [branchLinkDomain],
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
  })
