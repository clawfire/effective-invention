
import neatCsv from 'neat-csv'
import fs from 'node:fs'

const skillLevelProps = [
  {
    uri: 'Level 1 URI',
    parentUri: null,
    preferredTerm: 'Level 1 preferred term'
  },
  {
    uri: 'Level 2 URI',
    parentUri: 'Level 1 URI',
    preferredTerm: 'Level 2 preferred term'
  },
  {
    uri: 'Level 3 URI',
    parentUri: 'Level 2 URI',
    preferredTerm: 'Level 3 preferred term'
  }
]

/**
 * From `data/esco/skillsHierarchy_en.csv` compile `data/skills.json`.
 */
const main = async () => {
  const csv = fs.readFileSync('data/esco/skillsHierarchy_en.csv')
  const rows = await neatCsv(csv)

  const skills = {}
  for (const row of rows) {

    for (const skillProps of skillLevelProps) {
      const skill = {}
      let missingProps = false
      for (const [key, columnName] of Object.entries(skillProps)) {
        if (columnName === null) {
          skill[key] = null
        } else if (row[columnName]) {
          skill[key] = row[columnName]
        } else {
          missingProps = true
        }
      }

      if (!missingProps) {
        skills[skill.uri] = skill
      }
    }
  }

  fs.writeFileSync('data/skills.json', JSON.stringify(skills))
}

main()
