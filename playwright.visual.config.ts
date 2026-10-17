import {defineConfig} from '@playwright/test';
import config from './playwright.config';
export default defineConfig({...config,testIgnore:['**/agent-accounts.spec.ts','**/property-publishing.spec.ts'],webServer:{...config.webServer as object,command:'npm run start -- --port 3100',url:'http://127.0.0.1:3100',reuseExistingServer:true}});
