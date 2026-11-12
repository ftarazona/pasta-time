class GaiaContentStore extends ContentStore {

    getName(item) {
        return item.objectType === "volunteer"
            ? item.firstName + " " + item.lastName
            : "Inconnu";
    }

    getSummary(item) {
        return item.objectType === "volunteer"
            ? ""
            : "Illisible";
    }

}

class GaiaEngine extends Engine {

    static ContentStoreClass = GaiaContentStore;
    static SiteName = "gaia";

    constructor() {
        super();

        this.on("Ctrl+Alt+C", "continue")
    }

    init() {
        super.init();

        this.loadPlan("volunteer_plan.json");
        this.loadPaths("volunteer_paths.json");
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
