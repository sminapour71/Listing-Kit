import {defineConfig} from '@playwright/test';
import config from './playwright.regression.config';
export default defineConfig({...config,testMatch:'social-media.spec.ts',workers:1,timeout:240_000});
