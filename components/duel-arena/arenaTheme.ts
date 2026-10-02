import { createContext, useContext } from 'react';
import { splitEditorTheme } from '../../lib/monacoThemes';

/** The app's light/dark theme, provided by CodeDuelArena so arena editors match the rest of the hub. */
export const ArenaThemeContext = createContext<'light' | 'dark'>('dark');

/** Monaco theme name for the current app theme (defined by defineSplitThemes). */
export const useArenaEditorTheme = () => splitEditorTheme(useContext(ArenaThemeContext));
