/** panel.js
 * 
 * Last modification on 12/11/2026 by F. TARAZONA
 *  Refactored with port based approach
 * 
 * Script handling sidebar when opened.
 */

//Variables storing the HTML section containers.
const mainMenu = document.querySelector("#main-menu");
const noMenu = document.querySelector("#no-menu");

const fileInput = document.querySelector("#file-input");
const visualizerSection = document.querySelector("#visualizer-section");
const itemListSection = document.querySelector("#file-list-section");


/********************************/
/** REGISTRATION TO BACKGROUND **/
/********************************/

/** Handles messages received from background. */
function onBackgroundMessage(message) {
    console.debug("Sidebar: Message received from background", message);
    const type = message.type;

    if(type === Messaging.ENGINE_INFO_UPDATED) {

        //Received when an engine notifies its data store has modified
        //items or its cursor has moved
        const { itemsInfo, visualizer } = message.info;
        displayItems(itemsInfo);
        displayVisualizer(visualizer);
        
    } else if(type === Messaging.SIDEBAR_NO_ENGINE_AVAILABLE) {

        //Received when no engine is available
        displayNoEngine();

    }
}

//Initialize the port to connect with background when the sidebar is
//opened
const port = browser.runtime.connect({ name: "sidebar-port" });
port.onMessage.addListener(onBackgroundMessage);



/*************************/
/** FILE INPUT HANDLING **/
/*************************/

/** Emits a messsage to the engine through the background when files are
 * uploaded. */
function onFilesUploaded(files) {
    port.postMessage({ type: Messaging.FILES_UPLOADED, files });
}

//Setup of file input handle
fileInput.addEventListener("change", () => {
    this.onFilesUploaded(fileInput.files);
})



/*************************************/
/** ITEM SELECTION/REMOVAL HANDLING **/
/*************************************/

/** Emits a messsage to the engine through the background when an item is 
 * removed */
function onRemove(itemId) {
    port.postMessage({ type: Messaging.ITEM_REMOVED, itemId });
}

/** Emits a messsage to the engine through the background when an item is 
 * selected/deselected */
function onToggle(itemId) {
    port.postMessage({ type: Messaging.ITEM_TOGGLED, itemId});
}


/***********************/
/** DISPLAY FUNCTIONS **/
/***********************/

function displayNoEngine() {
    noMenu.hidden = false;
    mainMenu.hidden = true;

    itemListSection.innerHTML = "";
}

function displayVisualizer(visualizer=[null, null, null, null, null]) {
    visualizerSection.innerHTML = "";

    for(var i = 0; i < visualizer.length; i++) {
        if(visualizer[i] == null) visualizer[i] = [null, null];
        const [name, value] = visualizer[i];

        const itemDiv = document.createElement("div");
        itemDiv.className = "visualizer-item";
        if(i === 2)
            itemDiv.classList.add("visualizer-highlighted");

        const nameDiv = document.createElement("div");
        nameDiv.className = "visualizer-name";
        nameDiv.appendChild(document.createTextNode(name ?? "-"));

        const valueDiv = document.createElement("div");
        valueDiv.className = "visualizer-value";
        valueDiv.appendChild(document.createTextNode(value ?? ""));

        itemDiv.appendChild(nameDiv);
        itemDiv.appendChild(valueDiv);

        visualizerSection.appendChild(itemDiv);
    }
}

function displayItems(itemsInfo) {
    mainMenu.hidden = false;
    noMenu.hidden = true;
        
    itemListSection.innerHTML = "";
    fileInput.value = "";

    const items = itemsInfo.items;
    const selectedId = itemsInfo.selectedId;

    for(const item of items) {
        const { id, name, summary } = item;

        const itemIdDiv = document.createElement("div");
        itemIdDiv.className = "file-id";
        itemIdDiv.id = "file-id-" + id;
        itemIdDiv.appendChild(document.createTextNode(id));

        const itemNameDiv = document.createElement("div");
        itemNameDiv.className = "file-name";
        itemNameDiv.id = "file-name-" + id;
        itemNameDiv.appendChild(document.createTextNode(name));

        const itemDescriptionDiv = document.createElement("div");
        itemDescriptionDiv.className = "file-description";
        itemDescriptionDiv.id = "file-description-" + id;
        itemDescriptionDiv.appendChild(itemIdDiv);
        itemDescriptionDiv.appendChild(itemNameDiv);
        itemDescriptionDiv.addEventListener(
            "click", async () => { await this.onToggle(id); }
        )

        const itemDeleteDiv = document.createElement("div");
        itemDeleteDiv.className = "file-delete";
        itemDeleteDiv.id = "file-delete-" + id;
        itemDeleteDiv.appendChild(document.createTextNode("❌"));
        itemDeleteDiv.addEventListener(
            "click", async () => { await this.onRemove(id); }
        )

        const itemDiv = document.createElement("div");
        itemDiv.className = "file-item";
        itemDiv.id = "file-item-" + id;
        itemDiv.appendChild(itemDescriptionDiv);
        itemDiv.appendChild(itemDeleteDiv);

        if(id === selectedId) {
            const itemSummaryDiv = document.createElement("div");
            itemSummaryDiv.className = "file-summary";
            itemSummaryDiv.id = "file-summary-" + id;
            itemSummaryDiv.appendChild(document.createTextNode(summary));
                
            itemDiv.appendChild(itemSummaryDiv);
        }

        itemListSection.appendChild(itemDiv);
    }
}

//By default, no engine message is displayed.
displayNoEngine();