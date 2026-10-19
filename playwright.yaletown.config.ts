import {defineConfig} from '@playwright/test';
import config from './playwright.config';
export default defineConfig({...config,testMatch:'yaletown.spec.ts',workers:1,use:{...config.use,launchOptions:{executablePath:process.env.BROWSER_PATH||'/usr/bin/chromium'}},webServer:{command:'npm run start -- --port 3100',url:'http://127.0.0.1:3100',reuseExistingServer:true}});
