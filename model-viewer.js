import { projects } from "./static/projects.js";

// Get the current project ID from the URL parameter
const currentUrl = window.location.href; 
const url = new URL(currentUrl);
const currentProjectID = url.searchParams.get("id");

// Get the current project
const currentProject = projects.find(project => project.id === currentProjectID);

// Add the project URL to the iframe
const iframe = document.getElementById('model-iframe');
iframe.src = currentProject.url;
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