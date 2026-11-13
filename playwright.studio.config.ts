import {defineConfig} from '@playwright/test';
import config from './playwright.regression.config';
export default defineConfig({...config,projects:[{name:'desktop',use:{viewport:{width:1440,height:1100}}}],testMatch:'brochure-studio.spec.ts',workers:1});
