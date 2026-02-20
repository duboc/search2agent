/**
 * GA4 Analytics utility
 * Centralized event tracking for the agent flow.
 */

export function trackEvent(eventName, params = {}) {
  if (typeof window.gtag === 'function') {
    window.gtag('event', eventName, params);
  }
}
