
import neatCsv from 'neat-csv'
import fs from 'node:fs'

const skillLevelProps = [
  {
    uri: 'Level 0 URI',
    parentUri: null,
    preferredTerm: 'Level 0 preferred term'
  },
  {
    uri: 'Level 1 URI',
    parentUri: 'Level 0 URI',
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
  const skillsHierarchyCsv = fs.readFileSync('data/esco/skillsHierarchy_en.csv')
  const skillsHierarchyRows = await neatCsv(skillsHierarchyCsv)

  const skills = {}
  for (const row of skillsHierarchyRows) {

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
        skills[skill.uri] = {
          ...skills[skill.uri],
          ...skill
        }
      }
    }
  }

  const skillsCsv = fs.readFileSync('data/esco/skillsHierarchy_en.csv')
  const skillsRows = await neatCsv(skillsCsv)

  fs.writeFileSync('data/skills.json', JSON.stringify(skills))
}

main()
