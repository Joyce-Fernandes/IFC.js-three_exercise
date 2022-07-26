import { projects } from "./static/projects.js";


// Get all cards
const projectContainer = document.getElementById("projects-container");
const projectCards = Array.from(projectContainer.children);
console.log(projectCards);

const templateProjectCard = projectCards[0];

const baseURL = '/viewer_index.html';

for(let project of projects) {

    // Create a new card
    const newCard = templateProjectCard.cloneNode(true);

    // Add project name to card
    const cardTitle = newCard.querySelector('h2');
    cardTitle.textContent = project.name;

    // Add project URL to card
    const button = newCard.querySelector('a');
    button.href = baseURL + `?id=${project.id}` ;

    // Add card to container
    projectContainer.appendChild(newCard);
}

templateProjectCard.remove();
//Sets up the IFC loading
const ifcLoader = new IFCLoader();

  const input = document.getElementById("file-input");
  input.addEventListener(
    "change",
    (changed) => {
      const ifcURL = URL.createObjectURL(changed.target.files[0]);
      ifcLoader.load(ifcURL, (ifcModel) => scene.add(ifcModel));
    },
    false
  );