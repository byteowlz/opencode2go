// Theme system matching opencode TUI themes exactly
export interface ThemeDefinition {
  name: string;
  displayName: string;
  defs: Record<string, string>;
  theme: {
    primary: { dark: string; light: string };
    secondary: { dark: string; light: string };
    accent: { dark: string; light: string };
    error: { dark: string; light: string };
    warning: { dark: string; light: string };
    success: { dark: string; light: string };
    info: { dark: string; light: string };
    text: { dark: string; light: string };
    textMuted: { dark: string; light: string };
    background: { dark: string; light: string };
    backgroundPanel: { dark: string; light: string };
    backgroundElement: { dark: string; light: string };
    border: { dark: string; light: string };
    borderActive: { dark: string; light: string };
    borderSubtle: { dark: string; light: string };
  };
}

export interface ResolvedTheme {
  name: string;
  displayName: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    error: string;
    warning: string;
    success: string;
    info: string;
    text: string;
    textMuted: string;
    background: string;
    backgroundPanel: string;
    backgroundElement: string;
    border: string;
    borderActive: string;
    borderSubtle: string;
  };
}

// Resolve theme references to actual color values
function resolveTheme(theme: ThemeDefinition, mode: 'dark' | 'light' = 'dark'): ResolvedTheme {
  const resolveColor = (colorRef: string): string => {
    // If it's already a hex color, return as-is
    if (colorRef.startsWith('#')) {
      return colorRef;
    }
    // Otherwise, look it up in defs
    return theme.defs[colorRef] || colorRef;
  };

  return {
    name: theme.name,
    displayName: theme.displayName,
    colors: {
      primary: resolveColor(theme.theme.primary[mode]),
      secondary: resolveColor(theme.theme.secondary[mode]),
      accent: resolveColor(theme.theme.accent[mode]),
      error: resolveColor(theme.theme.error[mode]),
      warning: resolveColor(theme.theme.warning[mode]),
      success: resolveColor(theme.theme.success[mode]),
      info: resolveColor(theme.theme.info[mode]),
      text: resolveColor(theme.theme.text[mode]),
      textMuted: resolveColor(theme.theme.textMuted[mode]),
      background: resolveColor(theme.theme.background[mode]),
      backgroundPanel: resolveColor(theme.theme.backgroundPanel[mode]),
      backgroundElement: resolveColor(theme.theme.backgroundElement[mode]),
      border: resolveColor(theme.theme.border[mode]),
      borderActive: resolveColor(theme.theme.borderActive[mode]),
      borderSubtle: resolveColor(theme.theme.borderSubtle[mode]),
    },
  };
}

// All available themes matching TUI exactly
export const themes: Record<string, ThemeDefinition> = {
  dracula: {
    name: 'dracula',
    displayName: 'Dracula',
    defs: {
      background: '#282a36',
      currentLine: '#44475a',
      selection: '#44475a',
      foreground: '#f8f8f2',
      comment: '#6272a4',
      cyan: '#8be9fd',
      green: '#50fa7b',
      orange: '#ffb86c',
      pink: '#ff79c6',
      purple: '#bd93f9',
      red: '#ff5555',
      yellow: '#f1fa8c',
    },
    theme: {
      primary: { dark: 'purple', light: 'purple' },
      secondary: { dark: 'pink', light: 'pink' },
      accent: { dark: 'cyan', light: 'cyan' },
      error: { dark: 'red', light: 'red' },
      warning: { dark: 'yellow', light: 'yellow' },
      success: { dark: 'green', light: 'green' },
      info: { dark: 'orange', light: 'orange' },
      text: { dark: 'foreground', light: '#282a36' },
      textMuted: { dark: 'comment', light: '#6272a4' },
      background: { dark: '#282a36', light: '#f8f8f2' },
      backgroundPanel: { dark: '#21222c', light: '#e8e8e2' },
      backgroundElement: { dark: 'currentLine', light: '#d8d8d2' },
      border: { dark: 'currentLine', light: '#c8c8c2' },
      borderActive: { dark: 'purple', light: 'purple' },
      borderSubtle: { dark: '#191a21', light: '#e0e0e0' },
    },
  },

  gruvbox: {
    name: 'gruvbox',
    displayName: 'Gruvbox',
    defs: {
      darkBg0: '#282828',
      darkBg1: '#3c3836',
      darkBg2: '#504945',
      darkBg3: '#665c54',
      darkFg0: '#fbf1c7',
      darkFg1: '#ebdbb2',
      darkGray: '#928374',
      darkRed: '#cc241d',
      darkGreen: '#98971a',
      darkYellow: '#d79921',
      darkBlue: '#458588',
      darkPurple: '#b16286',
      darkAqua: '#689d6a',
      darkOrange: '#d65d0e',
      darkRedBright: '#fb4934',
      darkGreenBright: '#b8bb26',
      darkYellowBright: '#fabd2f',
      darkBlueBright: '#83a598',
      darkPurpleBright: '#d3869b',
      darkAquaBright: '#8ec07c',
      darkOrangeBright: '#fe8019',
      lightBg0: '#fbf1c7',
      lightBg1: '#ebdbb2',
      lightBg2: '#d5c4a1',
      lightBg3: '#bdae93',
      lightFg0: '#282828',
      lightFg1: '#3c3836',
      lightGray: '#7c6f64',
      lightRed: '#9d0006',
      lightGreen: '#79740e',
      lightYellow: '#b57614',
      lightBlue: '#076678',
      lightPurple: '#8f3f71',
      lightAqua: '#427b58',
      lightOrange: '#af3a03',
    },
    theme: {
      primary: { dark: 'darkBlueBright', light: 'lightBlue' },
      secondary: { dark: 'darkPurpleBright', light: 'lightPurple' },
      accent: { dark: 'darkAquaBright', light: 'lightAqua' },
      error: { dark: 'darkRedBright', light: 'lightRed' },
      warning: { dark: 'darkOrangeBright', light: 'lightOrange' },
      success: { dark: 'darkGreenBright', light: 'lightGreen' },
      info: { dark: 'darkYellowBright', light: 'lightYellow' },
      text: { dark: 'darkFg1', light: 'lightFg1' },
      textMuted: { dark: 'darkGray', light: 'lightGray' },
      background: { dark: 'darkBg0', light: 'lightBg0' },
      backgroundPanel: { dark: 'darkBg1', light: 'lightBg1' },
      backgroundElement: { dark: 'darkBg2', light: 'lightBg2' },
      border: { dark: 'darkBg3', light: 'lightBg3' },
      borderActive: { dark: 'darkFg1', light: 'lightFg1' },
      borderSubtle: { dark: 'darkBg2', light: 'lightBg2' },
    },
  },

  tokyonight: {
    name: 'tokyonight',
    displayName: 'Tokyo Night',
    defs: {
      darkStep1: '#1a1b26',
      darkStep2: '#1e2030',
      darkStep3: '#222436',
      darkStep4: '#292e42',
      darkStep5: '#3b4261',
      darkStep6: '#545c7e',
      darkStep7: '#737aa2',
      darkStep8: '#9099b2',
      darkStep9: '#82aaff',
      darkStep10: '#89b4fa',
      darkStep11: '#828bb8',
      darkStep12: '#c8d3f5',
      darkRed: '#ff757f',
      darkOrange: '#ff966c',
      darkYellow: '#ffc777',
      darkGreen: '#c3e88d',
      darkCyan: '#86e1fc',
      darkPurple: '#c099ff',
      lightStep1: '#e1e2e7',
      lightStep2: '#d5d6db',
      lightStep3: '#c8c9ce',
      lightStep4: '#b9bac1',
      lightStep5: '#a8aecb',
      lightStep6: '#9699a8',
      lightStep7: '#737a8c',
      lightStep8: '#5a607d',
      lightStep9: '#2e7de9',
      lightStep10: '#1a6ce7',
      lightStep11: '#8990a3',
      lightStep12: '#3760bf',
      lightRed: '#f52a65',
      lightOrange: '#b15c00',
      lightYellow: '#8c6c3e',
      lightGreen: '#587539',
      lightCyan: '#007197',
      lightPurple: '#9854f1',
    },
    theme: {
      primary: { dark: 'darkStep9', light: 'lightStep9' },
      secondary: { dark: 'darkPurple', light: 'lightPurple' },
      accent: { dark: 'darkOrange', light: 'lightOrange' },
      error: { dark: 'darkRed', light: 'lightRed' },
      warning: { dark: 'darkOrange', light: 'lightOrange' },
      success: { dark: 'darkGreen', light: 'lightGreen' },
      info: { dark: 'darkStep9', light: 'lightStep9' },
      text: { dark: 'darkStep12', light: 'lightStep12' },
      textMuted: { dark: 'darkStep11', light: 'lightStep11' },
      background: { dark: 'darkStep1', light: 'lightStep1' },
      backgroundPanel: { dark: 'darkStep2', light: 'lightStep2' },
      backgroundElement: { dark: 'darkStep3', light: 'lightStep3' },
      border: { dark: 'darkStep7', light: 'lightStep7' },
      borderActive: { dark: 'darkStep8', light: 'lightStep8' },
      borderSubtle: { dark: 'darkStep6', light: 'lightStep6' },
    },
  },

  catppuccin: {
    name: 'catppuccin',
    displayName: 'Catppuccin',
    defs: {
      lightRosewater: '#dc8a78',
      lightFlamingo: '#dd7878',
      lightPink: '#ea76cb',
      lightMauve: '#8839ef',
      lightRed: '#d20f39',
      lightMaroon: '#e64553',
      lightPeach: '#fe640b',
      lightYellow: '#df8e1d',
      lightGreen: '#40a02b',
      lightTeal: '#179299',
      lightSky: '#04a5e5',
      lightSapphire: '#209fb5',
      lightBlue: '#1e66f5',
      lightLavender: '#7287fd',
      lightText: '#4c4f69',
      lightSubtext1: '#5c5f77',
      lightSubtext0: '#6c6f85',
      lightOverlay2: '#7c7f93',
      lightOverlay1: '#8c8fa1',
      lightOverlay0: '#9ca0b0',
      lightSurface2: '#acb0be',
      lightSurface1: '#bcc0cc',
      lightSurface0: '#ccd0da',
      lightBase: '#eff1f5',
      lightMantle: '#e6e9ef',
      lightCrust: '#dce0e8',
      darkRosewater: '#f5e0dc',
      darkFlamingo: '#f2cdcd',
      darkPink: '#f5c2e7',
      darkMauve: '#cba6f7',
      darkRed: '#f38ba8',
      darkMaroon: '#eba0ac',
      darkPeach: '#fab387',
      darkYellow: '#f9e2af',
      darkGreen: '#a6e3a1',
      darkTeal: '#94e2d5',
      darkSky: '#89dceb',
      darkSapphire: '#74c7ec',
      darkBlue: '#89b4fa',
      darkLavender: '#b4befe',
      darkText: '#cdd6f4',
      darkSubtext1: '#bac2de',
      darkSubtext0: '#a6adc8',
      darkOverlay2: '#9399b2',
      darkOverlay1: '#7f849c',
      darkOverlay0: '#6c7086',
      darkSurface2: '#585b70',
      darkSurface1: '#45475a',
      darkSurface0: '#313244',
      darkBase: '#1e1e2e',
      darkMantle: '#181825',
      darkCrust: '#11111b',
    },
    theme: {
      primary: { dark: 'darkBlue', light: 'lightBlue' },
      secondary: { dark: 'darkMauve', light: 'lightMauve' },
      accent: { dark: 'darkPink', light: 'lightPink' },
      error: { dark: 'darkRed', light: 'lightRed' },
      warning: { dark: 'darkYellow', light: 'lightYellow' },
      success: { dark: 'darkGreen', light: 'lightGreen' },
      info: { dark: 'darkTeal', light: 'lightTeal' },
      text: { dark: 'darkText', light: 'lightText' },
      textMuted: { dark: 'darkSubtext1', light: 'lightSubtext1' },
      background: { dark: 'darkBase', light: 'lightBase' },
      backgroundPanel: { dark: 'darkMantle', light: 'lightMantle' },
      backgroundElement: { dark: 'darkCrust', light: 'lightCrust' },
      border: { dark: 'darkSurface0', light: 'lightSurface0' },
      borderActive: { dark: 'darkSurface1', light: 'lightSurface1' },
      borderSubtle: { dark: 'darkSurface2', light: 'lightSurface2' },
    },
  },

  nord: {
    name: 'nord',
    displayName: 'Nord',
    defs: {
      nord0: '#2E3440',
      nord1: '#3B4252',
      nord2: '#434C5E',
      nord3: '#4C566A',
      nord4: '#D8DEE9',
      nord5: '#E5E9F0',
      nord6: '#ECEFF4',
      nord7: '#8FBCBB',
      nord8: '#88C0D0',
      nord9: '#81A1C1',
      nord10: '#5E81AC',
      nord11: '#BF616A',
      nord12: '#D08770',
      nord13: '#EBCB8B',
      nord14: '#A3BE8C',
      nord15: '#B48EAD',
    },
    theme: {
      primary: { dark: 'nord10', light: 'nord10' },
      secondary: { dark: 'nord15', light: 'nord15' },
      accent: { dark: 'nord8', light: 'nord8' },
      error: { dark: 'nord11', light: 'nord11' },
      warning: { dark: 'nord13', light: 'nord13' },
      success: { dark: 'nord14', light: 'nord14' },
      info: { dark: 'nord9', light: 'nord9' },
      text: { dark: 'nord6', light: 'nord0' },
      textMuted: { dark: 'nord4', light: 'nord3' },
      background: { dark: 'nord0', light: 'nord6' },
      backgroundPanel: { dark: 'nord1', light: 'nord5' },
      backgroundElement: { dark: 'nord2', light: 'nord4' },
      border: { dark: 'nord3', light: 'nord3' },
      borderActive: { dark: 'nord10', light: 'nord10' },
      borderSubtle: { dark: 'nord1', light: 'nord5' },
    },
  },

  monokai: {
    name: 'monokai',
    displayName: 'Monokai',
    defs: {
      background: '#272822',
      backgroundAlt: '#1e1f1c',
      backgroundPanel: '#3e3d32',
      foreground: '#f8f8f2',
      comment: '#75715e',
      red: '#f92672',
      orange: '#fd971f',
      lightOrange: '#e69f66',
      yellow: '#e6db74',
      green: '#a6e22e',
      cyan: '#66d9ef',
      blue: '#66d9ef',
      purple: '#ae81ff',
      pink: '#f92672',
    },
    theme: {
      primary: { dark: 'cyan', light: 'cyan' },
      secondary: { dark: 'purple', light: 'purple' },
      accent: { dark: 'pink', light: 'pink' },
      error: { dark: 'red', light: 'red' },
      warning: { dark: 'orange', light: 'orange' },
      success: { dark: 'green', light: 'green' },
      info: { dark: 'blue', light: 'blue' },
      text: { dark: 'foreground', light: '#272822' },
      textMuted: { dark: 'comment', light: '#75715e' },
      background: { dark: 'background', light: '#f8f8f2' },
      backgroundPanel: { dark: 'backgroundAlt', light: '#e8e8e2' },
      backgroundElement: { dark: 'backgroundPanel', light: '#d8d8d2' },
      border: { dark: 'comment', light: '#c8c8c2' },
      borderActive: { dark: 'cyan', light: 'cyan' },
      borderSubtle: { dark: 'backgroundAlt', light: '#e0e0e0' },
    },
  },

  onedark: {
    name: 'onedark',
    displayName: 'One Dark',
    defs: {
      darkBg: '#282c34',
      darkBgAlt: '#21252b',
      darkBgPanel: '#353b45',
      darkFg: '#abb2bf',
      darkFgMuted: '#5c6370',
      darkPurple: '#c678dd',
      darkBlue: '#61afef',
      darkRed: '#e06c75',
      darkGreen: '#98c379',
      darkYellow: '#e5c07b',
      darkOrange: '#d19a66',
      darkCyan: '#56b6c2',
      lightBg: '#fafafa',
      lightBgAlt: '#f0f0f1',
      lightBgPanel: '#eaeaeb',
      lightFg: '#383a42',
      lightFgMuted: '#a0a1a7',
      lightPurple: '#a626a4',
      lightBlue: '#0184bc',
      lightRed: '#e45649',
      lightGreen: '#50a14f',
      lightYellow: '#c18401',
      lightOrange: '#986801',
      lightCyan: '#0997b3',
    },
    theme: {
      primary: { dark: 'darkBlue', light: 'lightBlue' },
      secondary: { dark: 'darkPurple', light: 'lightPurple' },
      accent: { dark: 'darkCyan', light: 'lightCyan' },
      error: { dark: 'darkRed', light: 'lightRed' },
      warning: { dark: 'darkYellow', light: 'lightYellow' },
      success: { dark: 'darkGreen', light: 'lightGreen' },
      info: { dark: 'darkOrange', light: 'lightOrange' },
      text: { dark: 'darkFg', light: 'lightFg' },
      textMuted: { dark: 'darkFgMuted', light: 'lightFgMuted' },
      background: { dark: 'darkBg', light: 'lightBg' },
      backgroundPanel: { dark: 'darkBgAlt', light: 'lightBgAlt' },
      backgroundElement: { dark: 'darkBgPanel', light: 'lightBgPanel' },
      border: { dark: 'darkFgMuted', light: 'lightFgMuted' },
      borderActive: { dark: 'darkBlue', light: 'lightBlue' },
      borderSubtle: { dark: 'darkBgPanel', light: 'lightBgPanel' },
    },
  },

  solarized: {
    name: 'solarized',
    displayName: 'Solarized',
    defs: {
      base03: '#002b36',
      base02: '#073642',
      base01: '#586e75',
      base00: '#657b83',
      base0: '#839496',
      base1: '#93a1a1',
      base2: '#eee8d5',
      base3: '#fdf6e3',
      yellow: '#b58900',
      orange: '#cb4b16',
      red: '#dc322f',
      magenta: '#d33682',
      violet: '#6c71c4',
      blue: '#268bd2',
      cyan: '#2aa198',
      green: '#859900',
    },
    theme: {
      primary: { dark: 'blue', light: 'blue' },
      secondary: { dark: 'violet', light: 'violet' },
      accent: { dark: 'cyan', light: 'cyan' },
      error: { dark: 'red', light: 'red' },
      warning: { dark: 'yellow', light: 'yellow' },
      success: { dark: 'green', light: 'green' },
      info: { dark: 'orange', light: 'orange' },
      text: { dark: 'base0', light: 'base00' },
      textMuted: { dark: 'base01', light: 'base1' },
      background: { dark: 'base03', light: 'base3' },
      backgroundPanel: { dark: 'base02', light: 'base2' },
      backgroundElement: { dark: 'base01', light: 'base1' },
      border: { dark: 'base01', light: 'base1' },
      borderActive: { dark: 'blue', light: 'blue' },
      borderSubtle: { dark: 'base02', light: 'base2' },
    },
  },
};

// Theme utilities
export function getTheme(name: string, mode: 'dark' | 'light' = 'dark'): ResolvedTheme {
  const theme = themes[name] || themes.dracula;
  return resolveTheme(theme, mode);
}

export function getThemeNames(): string[] {
  return Object.keys(themes);
}

export function applyTheme(theme: ResolvedTheme): void {
  const root = document.documentElement;
  
  // Apply CSS custom properties
  root.style.setProperty('--color-primary', theme.colors.primary);
  root.style.setProperty('--color-secondary', theme.colors.secondary);
  root.style.setProperty('--color-accent', theme.colors.accent);
  root.style.setProperty('--color-error', theme.colors.error);
  root.style.setProperty('--color-warning', theme.colors.warning);
  root.style.setProperty('--color-success', theme.colors.success);
  root.style.setProperty('--color-info', theme.colors.info);
  root.style.setProperty('--color-text', theme.colors.text);
  root.style.setProperty('--color-text-muted', theme.colors.textMuted);
  root.style.setProperty('--color-bg', theme.colors.background);
  root.style.setProperty('--color-bg-panel', theme.colors.backgroundPanel);
  root.style.setProperty('--color-bg-element', theme.colors.backgroundElement);
  root.style.setProperty('--color-border', theme.colors.border);
  root.style.setProperty('--color-border-active', theme.colors.borderActive);
  root.style.setProperty('--color-border-subtle', theme.colors.borderSubtle);
}

export default {
  themes,
  getTheme,
  getThemeNames,
  applyTheme,
};