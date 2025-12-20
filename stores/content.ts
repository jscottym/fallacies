import { defineStore } from 'pinia'
import type { Antidote, ComplexExample, Fallacy, Topic, WarmupQuote } from '~/types'

import adHominem from '~/content/fallacies/ad-hominem.json'
import appealToAuthority from '~/content/fallacies/appeal-to-authority.json'
import causationCon from '~/content/fallacies/causation-con.json'
import falseDilemma from '~/content/fallacies/false-dilemma.json'
import slipperySlope from '~/content/fallacies/slippery-slope.json'
import strawMan from '~/content/fallacies/straw-man.json'
import whataboutism from '~/content/fallacies/whataboutism.json'

import acknowledgeSpectrum from '~/content/antidotes/acknowledge-spectrum.json'
import demandMechanism from '~/content/antidotes/demand-mechanism.json'
import separateClaimClaimant from '~/content/antidotes/separate-claim-claimant.json'
import stayInLane from '~/content/antidotes/stay-in-lane.json'
import steelmanning from '~/content/antidotes/steelmanning.json'

import cancelCulture from '~/content/topics/cancel-culture.json'
import friendGroupChats from '~/content/topics/friend-group-chats.json'
import gradesAndPressure from '~/content/topics/grades-and-pressure.json'
import housingMarket from '~/content/topics/housing-market.json'
import immigration from '~/content/topics/immigration.json'
import influencerHealth from '~/content/topics/influencer-health.json'
import politicalViolence from '~/content/topics/political-violence.json'
import prisonReform from '~/content/topics/prison-reform.json'
import screenTimeIndependence from '~/content/topics/screen-time-independence.json'

import warmupData from '~/content/warmup/quotes.json'

export const useContentStore = defineStore('content', {
  state: () => ({
    fallacies: [
      adHominem,
      strawMan,
      falseDilemma,
      appealToAuthority,
      whataboutism,
      slipperySlope,
      causationCon
    ] as Fallacy[],
    antidotes: [
      steelmanning,
      separateClaimClaimant,
      acknowledgeSpectrum,
      stayInLane,
      demandMechanism
    ] as Antidote[],
    topics: [
      immigration,
      friendGroupChats,
      cancelCulture,
      screenTimeIndependence,
      prisonReform,
      gradesAndPressure,
      influencerHealth,
      housingMarket,
      politicalViolence
    ] as Topic[],
    warmupQuotes: warmupData.simpleQuotes as WarmupQuote[],
    complexExamples: warmupData.complexExamples as ComplexExample[]
  }),

  getters: {
    getFallacyById: (state) => (id: string): Fallacy | undefined => {
      return state.fallacies.find(f => f.id === id)
    },

    getAntidoteById: (state) => (id: string): Antidote | undefined => {
      return state.antidotes.find(a => a.id === id)
    },

    getTopicById: (state) => (id: string): Topic | undefined => {
      return state.topics.find(t => t.id === id)
    },

    getFallacyByNickname: (state) => (nickname: string): Fallacy | undefined => {
      return state.fallacies.find(f => 
        f.nickname.toLowerCase() === nickname.toLowerCase()
      )
    },

    getAntidoteForFallacy: (state) => (fallacyId: string): Antidote | undefined => {
      const fallacy = state.fallacies.find(f => f.id === fallacyId)
      if (!fallacy) return undefined
      return state.antidotes.find(a => a.id === fallacy.antidoteId)
    },

    fallacyNames: (state): { id: string; name: string; nickname: string }[] => {
      return state.fallacies.map(f => ({
        id: f.id,
        name: f.name,
        nickname: f.nickname
      }))
    },

    antidoteNames: (state): { id: string; name: string }[] => {
      return state.antidotes.map(a => ({
        id: a.id,
        name: a.name
      }))
    },

    topicNames: (state): { id: string; name: string }[] => {
      return state.topics.map(t => ({
        id: t.id,
        name: t.name
      }))
    }
  }
})

