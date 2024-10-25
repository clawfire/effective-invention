const { z } = require('zod')
const { requestEscoApi } = require('./esco')

const occupations = require('../data/occupations.json')

const findOccupation = async (keywordsOrUri) => {
  if (keywordsOrUri in occupations) {
      return occupations[keywordsOrUri]
  }

  const result = await requestEscoApi({
      path: '/search',
      query: {
          text: keywordsOrUri,
          full: 'false',
          type: 'occupation',
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

  return occupations[result._embedded.results[0].uri] ?? null
}

module.exports = { findOccupation }
