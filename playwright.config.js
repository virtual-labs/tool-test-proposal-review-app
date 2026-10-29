import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir:'tests/browser',fullyParallel:false,workers:1,timeout:60000,
  use:{baseURL:'http://127.0.0.1:3001',browserName:'chromium',channel:process.env.PLAYWRIGHT_CHANNEL||'msedge',headless:true},
  webServer:{command:'node tests/ui-server.js',url:'http://127.0.0.1:3001',reuseExistingServer:false,timeout:30000}
});
