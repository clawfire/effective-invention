
import neatCsv from 'neat-csv'
import fs from 'node:fs'

/**
 * Compile `data/occupations.json` lookup data from the following files:
 * - `data/esco/occupations_en.csv`
 * - `data/occupationSkills.csv`
 */
const main = async () => {
  const occupations = {}

  // Load occupations
  const occupationsCsv = fs.readFileSync('data/esco/occupations_en.csv')
  const occupationRows = await neatCsv(occupationsCsv)

  for (const row of occupationRows) {
    occupations[row.conceptUri] = {
      uri: row.conceptUri,
      name: row.preferredLabel,
      description: row.description,
      skills: [],
    }
  }

  // Load occupation skills
  const occupationSkillsCsv =
    fs.readFileSync('data/occupationSkills.csv')
  const occupationSkillRows = await neatCsv(occupationSkillsCsv, {
    separator: ';'
  })

  for (const row of occupationSkillRows) {
    const occupationUri = row['occupation_uri_combined']
    const skillUri = row['skill_uri_combined']
    if (occupations[occupationUri] !== undefined) {
      occupations[occupationUri].skills.push({
        uri: skillUri,
        priority: Number(row['Priority score'].replace(',', '.')),
        numVacancies: Number(row['times skill is required']?.replace(',', '.') ?? '0'),
        pctVacencies: Number(row['vacancies requiring skills']?.replace(',', '.') ?? '0')
      })
    }
  }

  // Order each occupation's skills
  for (const occupation of Object.values(occupations)) {
    const numGoodSkills = occupation.skills
      .reduce((count, skill) => skill.priority < 7 ? count + 1 : count, 0)

    occupation.skills =
      occupation.skills
        .filter(skill => skill.priority < (numGoodSkills >= 5 ? 7 : 8))
        .sort((a, b) => a.priority - b.priority)
        .slice(0, numGoodSkills >= 10 ? 10 : -1)
  }

  // Export the data
  fs.writeFileSync('data/occupations.json', JSON.stringify(occupations))
}

main()
