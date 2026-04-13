import React from 'react';
import { NavigationContainer, useIsFocused } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { AskableContext } from '@askable-ui/core';
import { Askable, useAskable, useAskableScreen } from '@askable-ui/react-native';

type RootStackParamList = {
  Dashboard: undefined;
  Insights: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const dashboardCards = [
  {
    title: 'Revenue',
    value: '$128.4k',
    meta: { widget: 'revenue-card', metric: 'revenue', period: '30d' },
    text: 'Revenue card for the past 30 days',
  },
  {
    title: 'Active users',
    value: '18,240',
    meta: { widget: 'active-users-card', metric: 'active-users', period: '7d' },
    text: 'Active users card for the past 7 days',
  },
  {
    title: 'Conversion',
    value: '4.8%',
    meta: { widget: 'conversion-card', metric: 'conversion-rate' },
    text: 'Conversion rate card',
  },
] as const;

const insightActions = [
  {
    title: 'Explain drop-off',
    caption: 'Checkout abandonment is up 12% week over week.',
    meta: { panel: 'dropoff-analysis', question: 'Why is checkout abandonment increasing?' },
    text: 'Drop-off analysis panel',
  },
  {
    title: 'Summarize launch feedback',
    caption: '47% of comments mention onboarding friction.',
    meta: { panel: 'launch-feedback', question: 'Summarize launch feedback themes' },
    text: 'Launch feedback summary panel',
  },
] as const;

function PromptContextPanel({ promptContext }: { promptContext: string }) {
  return (
    <View style={styles.promptPanel}>
      <Text style={styles.promptLabel}>Prompt context</Text>
      <Text style={styles.promptBody}>
        {promptContext || 'Tap a card or switch screens to generate askable context.'}
      </Text>
    </View>
  );
}

function DashboardScreen({
  ctx,
  promptContext,
  navigateToInsights,
}: {
  ctx: AskableContext;
  promptContext: string;
  navigateToInsights: () => void;
}) {
  const isFocused = useIsFocused();

  useAskableScreen({
    ctx,
    active: isFocused,
    meta: { screen: 'Dashboard', section: 'overview' },
    text: 'Dashboard overview screen',
  });

  return (
    <ScrollView contentContainerStyle={styles.screenContent}>
      <Text style={styles.eyebrow}>React Native + askable-ui</Text>
      <Text style={styles.title}>Dashboard</Text>
      <Text style={styles.subtitle}>
        Tap a card to push focus into askable context, then inspect the prompt preview below.
      </Text>

      {dashboardCards.map((card) => (
        <Askable key={card.title} ctx={ctx} meta={card.meta} text={card.text}>
          <Pressable style={styles.card}>
            <Text style={styles.cardTitle}>{card.title}</Text>
            <Text style={styles.cardValue}>{card.value}</Text>
          </Pressable>
        </Askable>
      ))}

      <Pressable style={styles.primaryButton} onPress={navigateToInsights}>
        <Text style={styles.primaryButtonText}>Open insights screen</Text>
      </Pressable>

      <PromptContextPanel promptContext={promptContext} />
    </ScrollView>
  );
}

function InsightsScreen({
  ctx,
  promptContext,
}: {
  ctx: AskableContext;
  promptContext: string;
}) {
  const isFocused = useIsFocused();

  useAskableScreen({
    ctx,
    active: isFocused,
    meta: { screen: 'Insights', section: 'analysis' },
    text: 'Insights analysis screen',
  });

  return (
    <ScrollView contentContainerStyle={styles.screenContent}>
      <Text style={styles.eyebrow}>Navigation-aware context</Text>
      <Text style={styles.title}>Insights</Text>
      <Text style={styles.subtitle}>
        Each screen pushes its own metadata while focused. Press any action card to refine the
        context further.
      </Text>

      {insightActions.map((action) => (
        <Askable key={action.title} ctx={ctx} meta={action.meta} text={action.text}>
          <Pressable style={styles.card}>
            <Text style={styles.cardTitle}>{action.title}</Text>
            <Text style={styles.cardCaption}>{action.caption}</Text>
          </Pressable>
        </Askable>
      ))}

      <PromptContextPanel promptContext={promptContext} />
    </ScrollView>
  );
}

export default function App() {
  const { ctx, promptContext } = useAskable({ name: 'react-native-example' });

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <NavigationContainer>
        <Stack.Navigator>
          <Stack.Screen name="Dashboard">
            {({ navigation }) => (
              <DashboardScreen
                ctx={ctx}
                promptContext={promptContext}
                navigateToInsights={() => navigation.navigate('Insights')}
              />
            )}
          </Stack.Screen>
          <Stack.Screen name="Insights">
            {() => <InsightsScreen ctx={ctx} promptContext={promptContext} />}
          </Stack.Screen>
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  screenContent: {
    padding: 20,
    gap: 16,
  },
  eyebrow: {
    color: '#4f46e5',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  title: {
    color: '#0f172a',
    fontSize: 28,
    fontWeight: '800',
  },
  subtitle: {
    color: '#475569',
    fontSize: 15,
    lineHeight: 22,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 18,
    gap: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 2,
  },
  cardTitle: {
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '700',
  },
  cardValue: {
    color: '#111827',
    fontSize: 24,
    fontWeight: '800',
  },
  cardCaption: {
    color: '#475569',
    fontSize: 15,
    lineHeight: 22,
  },
  primaryButton: {
    backgroundColor: '#4f46e5',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  promptPanel: {
    backgroundColor: '#0f172a',
    borderRadius: 18,
    padding: 18,
    gap: 10,
  },
  promptLabel: {
    color: '#a5b4fc',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  promptBody: {
    color: '#e2e8f0',
    fontSize: 14,
    lineHeight: 21,
  },
});
