import { getRequestConfig } from 'next-intl/server';

export default getRequestConfig(async ({ requestLocale }) => {
  const detected = await requestLocale;
  const current =
    !detected || !['en', 'fr'].includes(detected) ? 'fr' : detected;

  return {
    locale: current,
    messages: (await import(`../messages/${current}.json`)).default,
  };
});