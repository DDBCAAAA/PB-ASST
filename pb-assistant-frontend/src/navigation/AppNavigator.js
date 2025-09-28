import React, { useEffect, useMemo } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import LoginScreen from '../screens/LoginScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import GoalSetupScreen from '../screens/GoalSetupScreen';
import PlanOverviewScreen from '../screens/PlanOverviewScreen';
import { useAppContext } from '../state/AppContext';
import ScreenContainer from '../components/layout/ScreenContainer';
import { useTheme } from '../theme/ThemeProvider';

const Stack = createNativeStackNavigator();

const PlanLoadingScreen = () => {
  const theme = useTheme();
  return (
    <ScreenContainer style={styles.loadingScreen}>
      <ActivityIndicator size="large" color={theme.palette.primary} />
      <Text style={styles.loadingText}>Fetching your training plan…</Text>
    </ScreenContainer>
  );
};

const AppNavigator = () => {
  const { authToken, user, plan, planLoaded, refreshPlan } = useAppContext();
  const isAuthenticated = Boolean(authToken);
  const needsOnboarding =
    isAuthenticated &&
    user &&
    (!user?.heightCm || !user?.weightKg || !user?.weeklyTrainingDays);

  const shouldLoadPlan = isAuthenticated && !needsOnboarding && !planLoaded;
  const hasPlan = Boolean(plan);
  const needsGoal = isAuthenticated && !needsOnboarding && planLoaded && !hasPlan;

  useEffect(() => {
    if (shouldLoadPlan) {
      refreshPlan().catch((error) => {
        console.warn('Failed to load plan', error);
      });
    }
  }, [shouldLoadPlan, refreshPlan]);

  const navigationKey = useMemo(() => {
    return [
      isAuthenticated ? 'auth' : 'guest',
      needsOnboarding ? 'onboarding' : 'profiled',
      planLoaded ? 'planLoaded' : 'planLoading',
      hasPlan ? 'hasPlan' : 'noPlan',
    ].join('-');
  }, [isAuthenticated, needsOnboarding, planLoaded, hasPlan]);

  return (
    <NavigationContainer key={navigationKey}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated && <Stack.Screen name="Login" component={LoginScreen} />}

        {isAuthenticated && needsOnboarding && (
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        )}

        {isAuthenticated && !needsOnboarding && !planLoaded && (
          <Stack.Screen name="PlanLoading" component={PlanLoadingScreen} />
        )}

        {isAuthenticated && !needsOnboarding && planLoaded && needsGoal && (
          <Stack.Screen
            name="GoalSetup"
            component={GoalSetupScreen}
            options={{ headerShown: true, title: 'Set Your Goal' }}
          />
        )}

        {isAuthenticated && !needsOnboarding && planLoaded && hasPlan && (
          <Stack.Screen
            name="PlanOverview"
            component={PlanOverviewScreen}
            options={{ headerShown: false }}
          />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingScreen: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 15,
    color: '#475569',
  },
});

export default AppNavigator;
