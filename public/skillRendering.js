/**
 * Renders a skill object into a DOM element.
 *
 * @param {Object} skill - The skill object to render.
 * @param {string} skill.name - The name of the skill.
 * @param {string} skill.description - A description of the skill.
 * @param {string} skill.broaderUri - The URI of the broader skill.
 * @param {number} skill.numVacancies - The number of vacancies for the skill.
 * @param {number} skill.pctVacencies - The percentage of vacancies for the skill.
 * @param {number} skill.priority - The priority of the skill between 0 and 8.
 * @param {string} skill.uri - The URI of the skill.
 *
 * @returns {HTMLElement} - The DOM element representing the skill.
 */
function renderSkill(skill) {
    const skillElement = document.createElement('li');
    skillElement.classList.add('skill');

    // display the skill priority if skill.priority is provided
    if (skill.priority) {
        const priorityElement = document.createElement('span');
        priorityElement.classList.add('badge');
        // add class based on priority
        // priority 0-2: green (.success), 3-5: yellow (.warning), 6-8: red (.alert)
        priorityElement.classList.add(`${skill.priority >= 0 && skill.priority <= 2?'success' : skill.priority >= 2 && skill.priority <= 5? 'warning' : 'alert'}`);
        // set priority
        priorityElement.textContent = Math.round(skill.priority);
        skillElement.appendChild(priorityElement);
    }
    // display the skill name
    const nameElement = document.createElement('span');
    nameElement.classList.add('name');
    nameElement.textContent = skill.name ? " " + skill.name + " " : " " + skill.matchedSkill.name + " ";
    skillElement.appendChild(nameElement);

    //display the skill source with a label
    const sourceElement = document.createElement('span');
    sourceElement.classList.add('label');
    // if source is AI, add label class .success, else add label class .warning
    sourceElement.classList.add(`${skill.name ? 'success' : 'info'}`);
    sourceElement.textContent = `${skill.name? ' AI' : ' ESCO'}`;
    // add icon based on source
    // if it's AI, add a i.fa-solid.fa-sparkles class, else add a i.fa-solid.fa-brain class
    sourceElement.innerHTML += ` <i class="fa ${skill.name ?'fa-solid fa-sparkles' : 'fa-solid fa-brain'}"></i>`;
    skillElement.appendChild(sourceElement);


    return skillElement;
}
