export const trackingEvents = ["page_load", "start_register", "submit_info", "view_consequences", "view_courses", "view_cta_bottom", "view_hero", "view_modules", "view_pricing", "view_problem"] as const;
export const trackingSources = ["direct", "facebook", "zalo", "fanpage", "google", "other"] as const;
export function trackingSource(value: string | null) {
    return trackingSources.includes(value as typeof trackingSources[number]) ? value! : "other";
}
