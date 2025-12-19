export default defineNuxtConfig({
  compatibilityDate: '2025-06-18',
  
  future: {
    compatibilityVersion: 4
  },

  modules: [
    '@nuxt/ui',
    '@pinia/nuxt',
    '@vueuse/nuxt'
  ],

  css: ['~/assets/css/main.css'],

  devtools: { enabled: true },

  runtimeConfig: {
    openaiApiKey: process.env.OPENAI_API_KEY || ''
  },

  nitro: {
    experimental: {
      websocket: true
    }
  },

  app: {
    head: {
      title: 'Logic & Truth',
      meta: [
        { name: 'description', content: 'An interactive family session for teaching logical fallacies and sound reasoning' }
      ]
    }
  }
})

