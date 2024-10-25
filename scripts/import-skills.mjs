
import neatCsv from 'neat-csv'
import fs from 'node:fs'

const skillLevelProps = [
  {
    uri: 'Level 0 URI',
    broaderUri: null,
    label: 'Level 0 preferred term',
    description: 'Description'
  },
  {
    uri: 'Level 1 URI',
    broaderUri: 'Level 0 URI',
    label: 'Level 1 preferred term',
    description: 'Description'
  },
  {
    uri: 'Level 2 URI',
    broaderUri: 'Level 1 URI',
    label: 'Level 2 preferred term',
    description: 'Description'
  },
  {
    uri: 'Level 3 URI',
    broaderUri: 'Level 2 URI',
    label: 'Level 3 preferred term',
    description: 'Description'
  }
]

/**
 * Compile `data/skills.json` lookup data from the following ESCO files:
 * - `data/esco/skills_en.csv`
 * - `data/esco/skillsHierarchy_en.csv`
 * - `data/esco/broaderRelationsSkillPillar_en.csv`
 */
const main = async () => {
  const skills = {}

  // Load skill hierarchy.
  const skillsHierarchyCsv = fs.readFileSync('data/esco/skillsHierarchy_en.csv')
  const skillsHierarchyRows = await neatCsv(skillsHierarchyCsv)

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

  // Load skills
  const skillsCsv = fs.readFileSync('data/esco/skills_en.csv')
  const skillsRows = await neatCsv(skillsCsv)

  for (const row of skillsRows) {
    skills[row.conceptUri] = {
      uri: row.conceptUri,
      broaderUri: null,
      label: row.preferredLabel,
      description: row.description
    }
  }

  // Load skills broader relations
  const skillsRelationsCsv =
    fs.readFileSync('data/esco/broaderRelationsSkillPillar_en.csv')
  const skillsRelationsRows = await neatCsv(skillsRelationsCsv)

  for (const row of skillsRelationsRows) {
    if (skills[row.conceptUri] !== undefined) {
      skills[row.conceptUri] = {
        ...skills[row.conceptUri],
        broaderUri: row.broaderUri
      }
    }
  }

  // Export the data
  fs.writeFileSync('data/skills.json', JSON.stringify(skills))
}

main()
