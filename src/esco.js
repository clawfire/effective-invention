const escoApiBaseUrl = 'https://ec.europa.eu/esco/api'
const escoApiUserAgent = 'https://github.com/clawfire/effective-invention'

const requestEscoApi = async (query) => {
  let url = escoApiBaseUrl + query.path
  if (query.query !== undefined) {
      const queryPart = new URLSearchParams(query.query).toString()
      if (queryPart !== '') {
          url += '?' + queryPart
      }
  }

  let response = null
  try {
      response = await fetch(url, {
          method: query.method ?? 'GET',
          headers: [
              ['Accept', 'application/json'],
              ['Accept-Language', 'en'],
              ['User-Agent', escoApiUserAgent]
          ]
      })
  } catch (error) {
      console.error('lookupOccupation: Fetch error', url, error)
      return null
  }

  if (response === null || !response.ok) {
      console.log('lookupOccupation: Unexpected response', response?.status)
      return null
  }

  try {
      const rawResult = await response.json()
      return query.schema === undefined
          ? rawResult
          : query.schema.parse(rawResult)
  } catch (error) {
      console.log('lookupOccupation: Unexpected JSON result', error)
      return null
  }
}

module.exports = { requestEscoApi }
