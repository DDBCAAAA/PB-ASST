import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { getLatestPlan } from '../services/api/plans';
import { checkInWorkout, logWorkout } from '../services/api/workouts';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [authToken, setAuthToken] = useState(null);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [plan, setPlan] = useState(null);
  const [workouts, setWorkouts] = useState([]);
  const [planLoaded, setPlanLoaded] = useState(false);

  const login = useCallback(({ token, user: nextUser }) => {
    setAuthToken(token);
    setUser(nextUser || null);
    setPlan(null);
    setWorkouts([]);
    setPlanLoaded(false);
  }, []);

  const logout = useCallback(() => {
    setAuthToken(null);
    setUser(null);
    setPlan(null);
    setWorkouts([]);
    setPlanLoaded(false);
  }, []);

  const updateUser = useCallback((updates) => {
    setUser((prev) => (prev ? { ...prev, ...updates } : updates));
  }, []);

  const setPlanData = useCallback((nextPlan, nextWorkouts = []) => {
    setPlan(nextPlan);
    setWorkouts(nextWorkouts);
    setPlanLoaded(true);
  }, []);

  const clearPlan = useCallback(() => {
    setPlan(null);
    setWorkouts([]);
    setPlanLoaded(true);
  }, []);

  const updateWorkoutInState = useCallback((updatedWorkout) => {
    setWorkouts((prev) => {
      if (!prev?.length) return prev;
      return prev.map((workout) =>
        workout.id === updatedWorkout.id ? { ...workout, ...updatedWorkout } : workout,
      );
    });
  }, []);

  const refreshPlan = useCallback(
    async (overrideToken) => {
      const tokenToUse = overrideToken || authToken;
      if (!tokenToUse) {
        return null;
      }

      try {
        const result = await getLatestPlan(tokenToUse);
        setPlanData(result.plan, result.workouts || []);
        return result;
      } catch (error) {
        if (error.status === 404) {
          clearPlan();
          return null;
        }
        throw error;
      }
    },
    [authToken, setPlanData, clearPlan],
  );

  const submitWorkoutCheckin = useCallback(
    async (workoutId, payload) => {
      if (!authToken) {
        throw new Error('Not authenticated');
      }

      const response = await checkInWorkout(authToken, workoutId, payload);
      if (response?.workout) {
        updateWorkoutInState(response.workout);
      }
      return response;
    },
    [authToken, updateWorkoutInState],
  );

  const submitWorkoutLog = useCallback(
    async (workoutId, payload) => {
      if (!authToken) {
        throw new Error('Not authenticated');
      }

      const response = await logWorkout(authToken, workoutId, payload);
      if (response?.workout) {
        updateWorkoutInState(response.workout);
      }
      return response;
    },
    [authToken, updateWorkoutInState],
  );

  const value = useMemo(
    () => ({
      authToken,
      user,
      isLoading,
      setIsLoading,
      login,
      logout,
      updateUser,
      setUser,
      setAuthToken,
      plan,
      workouts,
      planLoaded,
      setPlanData,
      refreshPlan,
      clearPlan,
      submitWorkoutCheckin,
      submitWorkoutLog,
    }),
    [
      authToken,
      user,
      isLoading,
      login,
      logout,
      updateUser,
      plan,
      workouts,
      planLoaded,
      refreshPlan,
      clearPlan,
      submitWorkoutCheckin,
      submitWorkoutLog,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
