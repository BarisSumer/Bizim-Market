import { Appearance } from 'react-native';
import { create } from 'zustand';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeState {
    theme: ThemeMode;
    resolvedTheme: 'light' | 'dark';
    setTheme: (theme: ThemeMode) => void;
}

const getSystemTheme = (): 'light' | 'dark' => {
    const colorScheme = Appearance.getColorScheme();
    return colorScheme === 'dark' ? 'dark' : 'light';
};

export const useThemeStore = create<ThemeState>((set, get) => ({
    theme: 'dark', // Default to dark mode as per requirements
    resolvedTheme: 'dark',

    setTheme: (theme: ThemeMode) => {
        const resolvedTheme = theme === 'system' ? getSystemTheme() : theme;
        set({ theme, resolvedTheme });
    },
}));

// Subscribe to system theme changes
Appearance.addChangeListener(({ colorScheme }) => {
    const state = useThemeStore.getState();
    if (state.theme === 'system') {
        useThemeStore.setState({
            resolvedTheme: colorScheme === 'dark' ? 'dark' : 'light'
        });
    }
});
