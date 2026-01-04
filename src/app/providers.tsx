'use client';

import posthog from 'posthog-js';
import { PostHogProvider } from 'posthog-js/react';
import { useEffect } from 'react';

export function PHProvider({ children }: { children: React.ReactNode }) {
    useEffect(() => {
        posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
            api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
            capture_pageview: false, // Manually capture pageviews if needed, or set true
            // Privacy First Configuration
            mask_all_text: true,
            mask_all_element_attributes: true,
            persistence: 'localStorage',
        });
    }, []);

    return <PostHogProvider client={posthog}>{children}</PostHogProvider>;
}
