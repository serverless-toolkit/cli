import type { PlaywrightTestConfig } from '@playwright/test';

export default {
    use: {
        baseURL: `https://${process.env.PROJECTNAME}.${process.env.DOMAINNAME}`
    }
} as PlaywrightTestConfig;