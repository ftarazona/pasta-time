class AidaContentStore extends ContentStore {

    getName(content) {
        if(content.objectType === "bill") {
            return "Facture";
        } else if(content.objectType === "reception") {
            return "Réception";
        } else {
            return "Inconnu";
        }
    }

    getSummary(content) {
        if(content.objectType === "bill") {
            const nTransactions = content.transactions.length;
            return `${nTransactions} transactions`;
        } else if(content.objectType === "reception") {
            const nLines = content.lines.length;
            return `${nLines} lignes`;
        } else {
            return "Illisible";
        }
    }

}

class AidaEngine extends Engine {

    static ContentStoreClass = AidaContentStore;
    static SiteName = "aida";

    static ObjectTypes = {
        "Factures": "bill",
        "Réceptions": "reception",
        "Livraisons": "shipping",
    };

    constructor() {
        super();

        this.prevObjectType = null;

        this.observer = new MutationObserver(
            this.checkPage.bind(this)
        );

        this.observer.observe(document.documentElement, {
            childList: true,
            subtree: true
        });

        this.on("Ctrl+Alt+A", "add");
        this.on("Ctrl+Alt+S", "save");
        this.on("Ctrl+Alt+C", "close");
    }

    async init() {
        await super.init();

        await this.loadPaths("general_paths.json")
    }

    get addButton()     { return this.fieldSearcher.search("addButton"); }
    get saveButton()    { return this.fieldSearcher.search("saveButton"); }
    get checkButton()   { return this.fieldSearcher.search("checkButton"); }
    get closeButton()   { return this.fieldSearcher.search("closeButton"); }

    add()   { Actions.click(this.addButton); }
    check() { Actions.click(this.checkButton); }
    save()  { this.check(); Actions.click(this.saveButton); }
    close() { Actions.click(this.closeButton); }

    get objectType() {
        const breadcrumbs = document.querySelectorAll(".s_breadcrumb_step_link");
        const text = breadcrumbs
            ?.item(breadcrumbs.length - 1)
            ?.ariaLabel;
        return AidaEngine.ObjectTypes[text] || null;
    }

    get structureType() {
        const role = document.querySelector(".s_profile_bar_textlink_role");
        if(role?.ariaLabel.includes("Epicerie"))    return "epicerie"
        else if(role?.ariaLabel.includes("CD"))     return "aa"
        else return null;
    }

    async checkPage() {
        const objectType = this.objectType;
        if(objectType === this.prevObjectType) return;

        this.prevObjectType = objectType;

        if(objectType === "bill") {
            const structureType = this.structureType;

            if(structureType === "epicerie") {

                await this.loadPlan("bill_es_plan.json");
                await this.loadPaths("bill_es_paths.json");

            } else if(structureType === "aa") {

                await this.loadPlan("bill_aa_plan.json");
                await this.loadPaths("bill_aa_paths.json");

            }

        } else if(objectType === "reception") {

            await this.loadPlan("reception_plan.json");
            await this.loadPaths("reception_paths.json");

        }

        await this.data.filter(objectType);
    }
}

const engine = new AidaEngine;
engine.init();
