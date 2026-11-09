const mainMenu = document.querySelector("#main-menu");
const noMenu = document.querySelector("#no-menu");

const fileInput = document.querySelector("#file-input");
const visualizerSection = document.querySelector("#visualizer-section");
const fileListSection = document.querySelector("#file-list-section");

class SidebarApp {
    
    constructor() {
        this.tabId;
    }



    async sendToEngine(files) {
        console.log("Sidebar: Send files to engine", files);

        const response = await browser.tabs.sendMessage(
            this.tabId,
            { type: "FILES_UPLOADED", files }
        );

        this.displayResponse(response);
    }

    async getFiles() {
        console.log("Sidebar: Get files from engine");

        await browser.tabs.sendMessage(
            this.tabId,
            { type: "GET_FILES"}
        ).then(
            response => this.displayResponse(response)
        ).catch(
            _ => this.displayNoEngine()
        );
    }

    async onTabActivated(tab) {
        console.log("Sidebar: Tab opened/switched", tab);

        this.tabId = tab.tabId;
        await this.getFiles();
    }

    async init() {
        const [tab] = await browser.tabs.query({
            active: true,
            currentWindow: true
        });
        this.tabId = tab.id;
        
        fileInput.addEventListener("change", () => {
            this.sendToEngine(fileInput.files);
        })

        browser.tabs.onActivated.addListener(
            this.onTabActivated.bind(this)
        );

        browser.tabs.onCreated.addListener(
            this.onTabActivated.bind(this)
        );

        browser.runtime.onMessage.addListener(
            this.onMessage.bind(this)
        );

        await this.getFiles();
    }



    onSetFiles({content}) {
        console.log("Sidebar: Set files", content);

        this.displayFiles(content);
        return { success: true };
    }

    onSetVisualizer({content}) {
        console.log("Sidebar: Set visualizer", content);

        this.displayVisualizer(content);
        return { success: true };
    }

    async onMessage(message, sender) {
        console.log("Sidebar: message received:", message, sender);

        const type = message.type;
        this.tabId = sender.tab.id;

        const methodMatches = {
            "SET_FILES": "SetFiles",
            "SET_VISUALIZER": "SetVisualizer"
        };

        const methodName = methodMatches[type];
        const response = methodName != null
            ? (await this["on" + methodName](message))
            : ({ success: false, error: `Sidebar: Unknown message type: ${type}` })
        
        return Promise.resolve(response);
    }



    async onToggle(id) {
        await browser.tabs.sendMessage(
            this.tabId,
            { type: "TOGGLE_ID", id }
        );
        await this.getFiles();
    }

    async onRemove(id) {
        await browser.tabs.sendMessage(
            this.tabId,
            { type: "REMOVE_ID", id }
        );
        await this.getFiles();
    }

    displayNoEngine() {
        noMenu.hidden = false;
        mainMenu.hidden = true;

        fileListSection.innerHTML = "";
    }

    displayVisualizer(content) {
        console.log("Sidebar: Displaying visualizer", content);

        visualizerSection.innerHTML = "";

        for(var i = 0; i < content.length; i++) {
            const [name, value] = content[i];

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

    displayFiles(content) {
        console.log("Sidebar: Displaying files", content);
        mainMenu.hidden = false;
        noMenu.hidden = true;
        
        fileListSection.innerHTML = "";
        fileInput.value = "";

        const files = content.files;
        const selectedId = content.selectedId;

        for(const file of files) {
            const { id, name, summary } = file;

            const fileIdDiv = document.createElement("div");
            fileIdDiv.className = "file-id";
            fileIdDiv.id = "file-id-" + id;
            fileIdDiv.appendChild(document.createTextNode(id));

            const fileNameDiv = document.createElement("div");
            fileNameDiv.className = "file-name";
            fileNameDiv.id = "file-name-" + id;
            fileNameDiv.appendChild(document.createTextNode(name));

            const fileDescriptionDiv = document.createElement("div");
            fileDescriptionDiv.className = "file-description";
            fileDescriptionDiv.id = "file-description-" + id;
            fileDescriptionDiv.appendChild(fileIdDiv);
            fileDescriptionDiv.appendChild(fileNameDiv);
            fileDescriptionDiv.addEventListener(
                "click", async () => { await this.onToggle(id); }
            )

            const fileDeleteDiv = document.createElement("div");
            fileDeleteDiv.className = "file-delete";
            fileDeleteDiv.id = "file-delete-" + id;
            fileDeleteDiv.appendChild(document.createTextNode("❌"));
            fileDeleteDiv.addEventListener(
                "click", async () => { await this.onRemove(id); }
            )

            const fileDiv = document.createElement("div");
            fileDiv.className = "file-item";
            fileDiv.id = "file-item-" + id;
            fileDiv.appendChild(fileDescriptionDiv);
            fileDiv.appendChild(fileDeleteDiv);

            if(id === selectedId) {
                const fileSummaryDiv = document.createElement("div");
                fileSummaryDiv.className = "file-summary";
                fileSummaryDiv.id = "file-summary-" + id;
                fileSummaryDiv.appendChild(document.createTextNode(summary));
                
                fileDiv.appendChild(fileSummaryDiv);
            }

            fileListSection.appendChild(fileDiv);
        }
    }

    displayResponse(response) {
        if(response.success) {
            const content = response.content;
            this.displayFiles(content);
        } else {
            this.displayNoEngine();
        }
    }
}

const sidebar = new SidebarApp();
sidebar.init();