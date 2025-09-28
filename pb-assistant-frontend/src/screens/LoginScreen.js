import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import * as AppleAuthentication from 'expo-apple-authentication';
import ScreenContainer from '../components/layout/ScreenContainer';
import { loginWithProvider } from '../services/api/auth';
import { getCurrentUser } from '../services/api/user';
import { useAppContext } from '../state/AppContext';
import { useTheme } from '../theme/ThemeProvider';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_CLIENT_IDS = {
  expoClientId: process.env.EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID,
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
};

const GOOGLE_ENABLED = Boolean(GOOGLE_CLIENT_IDS.webClientId);

const LoginScreen = () => {
  const theme = useTheme();
  const { login, updateUser, refreshPlan } = useAppContext();
  const [activeProvider, setActiveProvider] = useState(null);
  const [error, setError] = useState(null);

  const finalizeLogin = useCallback(
    async (provider, credential) => {
      if (!credential) {
        throw new Error('No authorization credential returned from provider.');
      }

      const authResponse = await loginWithProvider({ provider, code: credential });
      login(authResponse);

      try {
        const profile = await getCurrentUser(authResponse.token);
        updateUser(profile);
      } catch (profileError) {
        console.warn('Failed to refresh user profile', profileError);
      }

      try {
        await refreshPlan(authResponse.token);
      } catch (planError) {
        console.warn('Failed to load plan on login', planError);
      }
    },
    [login, updateUser],
  );

  const handleWeChatLogin = async () => {
    setError(null);
    setActiveProvider('wechat');

    try {
      const useMock =
        process.env.EXPO_PUBLIC_ENABLE_WECHAT_MOCK !== 'false' ||
        !process.env.EXPO_PUBLIC_WECHAT_APP_ID;

      if (!useMock) {
        throw new Error(
          'WeChat login requires native SDK integration. Configure the SDK and set EXPO_PUBLIC_ENABLE_WECHAT_MOCK=true for local testing.',
        );
      }

      const mockCode = `wechat-mock-${Date.now()}`;
      await finalizeLogin('wechat', mockCode);
    } catch (wechatError) {
      setError(wechatError.message || 'WeChat login failed.');
    } finally {
      setActiveProvider(null);
    }
  };

  const handleGuestLogin = async () => {
    setError(null);
    setActiveProvider('guest');

    try {
      await finalizeLogin('guest', `guest-${Date.now()}`);
    } catch (guestError) {
      setError(guestError.message || 'Guest login failed.');
    } finally {
      setActiveProvider(null);
    }
  };

  const handleAppleLogin = async () => {
    setError(null);
    setActiveProvider('apple');

    try {
      const isAvailable = await AppleAuthentication.isAvailableAsync();
      if (!isAvailable) {
        throw new Error('Apple Sign-In is only available on Apple devices.');
      }

      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      const payload = credential.authorizationCode || credential.identityToken;
      await finalizeLogin('apple', payload);
    } catch (appleError) {
      if (appleError?.code === 'ERR_REQUEST_CANCELED') {
        setError('Apple login was cancelled.');
      } else {
        setError(appleError.message || 'Apple login failed.');
      }
    } finally {
      setActiveProvider(null);
    }
  };

  const isLoggingIn = Boolean(activeProvider);

  return (
    <ScreenContainer style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>PB助手</Text>
        <Text style={styles.subtitle}>Your Personal Best Running Coach</Text>
      </View>

      <View style={styles.buttons}>
        <AuthButton
          label="Login with WeChat"
          backgroundColor="#0f6cbd"
          textColor="#ffffff"
          isActive={activeProvider === 'wechat'}
          disabled={isLoggingIn && activeProvider !== 'wechat'}
          onPress={handleWeChatLogin}
        />

        <AuthButton
          label="Continue as Guest"
          backgroundColor="#334155"
          textColor="#ffffff"
          isActive={activeProvider === 'guest'}
          disabled={isLoggingIn && activeProvider !== 'guest'}
          onPress={handleGuestLogin}
        />

        {GOOGLE_ENABLED ? (
          <GoogleLoginButton
            theme={theme}
            activeProvider={activeProvider}
            setActiveProvider={setActiveProvider}
            isLoggingIn={isLoggingIn}
            setError={setError}
            finalizeLogin={finalizeLogin}
          />
        ) : null}

        <AuthButton
          label={`Login with Apple${Platform.OS !== 'ios' ? ' (iOS only)' : ''}`}
          backgroundColor="#111827"
          textColor="#ffffff"
          isActive={activeProvider === 'apple'}
          disabled={isLoggingIn && activeProvider !== 'apple'}
          onPress={handleAppleLogin}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>
    </ScreenContainer>
  );
};

const AuthButton = ({
  label,
  backgroundColor,
  textColor,
  borderColor,
  isActive,
  disabled,
  onPress,
}) => (
  <Pressable
    style={[
      styles.button,
      {
        backgroundColor,
        borderColor: borderColor || backgroundColor,
        opacity: disabled && !isActive ? 0.7 : 1,
      },
    ]}
    onPress={onPress}
    disabled={disabled}
  >
    {isActive ? <ActivityIndicator color={textColor} style={styles.spinner} /> : null}
    <Text style={[styles.buttonLabel, { color: textColor }]}>{label}</Text>
  </Pressable>
);

const GoogleLoginButton = ({
  theme,
  activeProvider,
  setActiveProvider,
  isLoggingIn,
  setError,
  finalizeLogin,
}) => {
  const googleRequestConfig = useMemo(() => {
    const config = {
      responseType: Google.ResponseType.Code,
      selectAccount: true,
    };

    Object.entries(GOOGLE_CLIENT_IDS).forEach(([key, value]) => {
      if (value) {
        config[key] = value;
      }
    });

    return config;
  }, []);

  const [googleRequest, googleResponse, promptGoogleAuth] = Google.useAuthRequest(googleRequestConfig);

  useEffect(() => {
    if (activeProvider !== 'google') {
      return;
    }

    if (!googleResponse) {
      return;
    }

    if (googleResponse.type === 'success') {
      const credential =
        googleResponse.params?.code ||
        googleResponse.authentication?.idToken ||
        googleResponse.authentication?.accessToken;

      (async () => {
        try {
          await finalizeLogin('google', credential);
        } catch (loginError) {
          setError(loginError.message);
        } finally {
          setActiveProvider(null);
        }
      })();
    } else if (googleResponse.type === 'dismiss') {
      setActiveProvider(null);
    } else if (googleResponse.type === 'error') {
      setError(googleResponse.error?.message || 'Google login failed.');
      setActiveProvider(null);
    }
  }, [googleResponse, activeProvider, finalizeLogin, setActiveProvider, setError]);

  const handleGoogleLogin = async () => {
    setError(null);

    if (!googleRequest) {
      setError('Google Sign-In is not available. Check your configuration.');
      return;
    }

    setActiveProvider('google');
    const result = await promptGoogleAuth();

    if (result?.type === 'cancel') {
      setActiveProvider(null);
    }
  };

  return (
    <AuthButton
      label="Login with Google"
      backgroundColor="#ffffff"
      textColor={theme.palette.text}
      borderColor="#e2e8f0"
      isActive={activeProvider === 'google'}
      disabled={isLoggingIn && activeProvider !== 'google'}
      onPress={handleGoogleLogin}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#101a22',
  },
  content: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 48,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 18,
    color: '#cbd5f5',
    textAlign: 'center',
  },
  buttons: {
    width: '100%',
    gap: 16,
  },
  button: {
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  spinner: {
    marginRight: 12,
  },
  error: {
    color: '#f87171',
    textAlign: 'center',
    marginTop: 8,
  },
});

export default LoginScreen;
