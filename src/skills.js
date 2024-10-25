const { z } = require('zod')
const { requestEscoApi } = require('./esco')

const skills = require('../data/skills.json')

const findSkill = async (keywordsOrUri) => {
  if (keywordsOrUri in skills) {
      return skills[keywordsOrUri]
  }

  const result = await requestEscoApi({
      path: '/search',
      query: {
          text: keywordsOrUri,
          full: 'false',
          type: 'skill',
          limit: '1'
      },
      schema: z.object({
          _embedded: z.object({
              results: z.array(z.object({
                  uri: z.string()
              }))
          })
      })
  })

  if (result === null) {
      return null
  }

  if (result._embedded.results.length === 0) {
      return null
  }

  return skills[result._embedded.results[0].uri] ?? null
}

module.exports = { findSkill }
