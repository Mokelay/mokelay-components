export type ThemeMode = 'light' | 'dark';
export type GlobalSettingLanguage = 'zh' | 'en';
export type GlobalSettingKey = 'theme' | 'language';

export type MokelaySettings = {
  getTheme: () => ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  getLanguage: () => GlobalSettingLanguage;
  setLanguage: (language: GlobalSettingLanguage) => void;
};

declare global {
  interface Window {
    $mokelaySettings: MokelaySettings;
  }
}

declare module 'vue' {
  interface ComponentCustomProperties {
    $mokelaySettings: MokelaySettings;
  }
}
