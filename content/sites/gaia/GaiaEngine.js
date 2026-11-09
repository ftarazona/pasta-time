console.log("PastaTime -- gaia.js: loading...");


class GaiaContentStore extends ContentStore {

    static AllowedExtensions = [".gaia"];

    getName(content) {
        if(content.objectType === "volunteer") {
            return content.firstName + " " + content.lastName;
        } else {
            return "Inconnu";
        }
    }

    getSummary(content) {
        if(content.objectType === "volunteer") {
            return "";
        } else {
            return "Illisible";
        }
    }

}

class GaiaEngine extends Engine {

    static ContentStoreClass = GaiaContentStore;

    constructor() {
        super();

        this.on("Ctrl+Alt+C", "continue")
    }

    async init() {
        await super.init();

        await this.loadPlan("gaia", "volunteer_plan.json");
        await this.loadPaths("gaia", "volunteer_paths.json");
    }

    get continueButton() {
        return this.searchElement("continueButton");
    }

    async continue() {
        await Actions.click(this.continueButton);
    }
}

const engine = new GaiaEngine;
engine.init();

console.log("PastaTime -- gaia.js: loaded");