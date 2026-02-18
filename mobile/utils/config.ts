// mobile/utils/config.ts
import Constants from 'expo-constants';

const DEV_API = `http://${Constants.expoConfig?.hostUri?.split(':')[0]}:3000`;
const PROD_API = Constants.expoConfig?.extra?.apiUrl;

export const API_URL = __DEV__ ? DEV_API : PROD_API;