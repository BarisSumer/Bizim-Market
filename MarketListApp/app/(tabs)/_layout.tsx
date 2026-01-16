import { useThemeStore } from '@/store/useThemeStore';
import { Tabs } from 'expo-router';
import { Home, PieChart, Plus, Settings } from 'lucide-react-native';

export default function TabLayout() {
  const resolvedTheme = useThemeStore((state) => state.resolvedTheme);
  const isDark = resolvedTheme === 'dark';

  const colors = {
    // Midnight Gold (Dark) / Navy Accent (Light) Theme
    background: isDark ? '#0B1120' : '#F0F4F8',
    card: isDark ? '#0B1120' : '#FFFFFF',
    text: isDark ? '#FFFFFF' : '#0B1120',
    textMuted: isDark ? '#64748B' : '#64748B',
    primary: isDark ? '#FFC107' : '#0B1120',  // Yellow (dark) / Navy (light)
    border: isDark ? '#1E293B' : '#D1D9E6',
  };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 85,
          paddingBottom: 25,
          paddingTop: 10,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
        sceneStyle: {
          backgroundColor: colors.background,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Liste',
          tabBarIcon: ({ color }) => (
            <Home color={color} size={24} />
          ),
        }}
      />
      <Tabs.Screen
        name="add"
        options={{
          title: 'Ekle',
          tabBarIcon: ({ color }) => (
            <Plus color={color} size={24} />
          ),
        }}
      />
      <Tabs.Screen
        name="statistics"
        options={{
          title: 'İstatistikler',
          tabBarIcon: ({ color }) => (
            <PieChart color={color} size={24} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Ayarlar',
          tabBarIcon: ({ color }) => (
            <Settings color={color} size={24} />
          ),
        }}
      />
    </Tabs>
  );
}
